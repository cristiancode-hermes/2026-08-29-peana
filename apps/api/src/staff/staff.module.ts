import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { EmailLog, KitBom, Order, Product } from '../entities/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, StaffGuard } from '../auth/current-user';
import { OrdersService } from '../orders/orders.service';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

const FLOW: Array<Order['status']> = ['paid', 'preparing', 'ready', 'picked_up'];

@Injectable()
export class StaffService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ordersSvc: OrdersService,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(KitBom) private readonly boms: Repository<KitBom>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
  ) {}

  async scan(codeOrUrl: string) {
    const code = this.ordersSvc.extractCode(codeOrUrl);
    const order = await this.orders.findOne({ where: { code }, relations: { lines: true } });
    if (!order) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'No hay un pedido con ese código.' },
        HttpStatus.CONFLICT,
      );
    }
    if (order.status === 'cancelled') {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'No hay un pedido con ese código.' },
        HttpStatus.CONFLICT,
      );
    }
    if (order.status === 'picked_up') {
      throw new HttpException(
        { code: 'ALREADY_PICKED_UP', message: 'Este pedido ya salió del mostrador.' },
        HttpStatus.CONFLICT,
      );
    }
    const idx = FLOW.indexOf(order.status);
    const next = FLOW[Math.min(idx + 1, FLOW.length - 1)];
    order.status = next;
    await this.orders.save(order);
    if (next === 'ready') {
      await this.emails.save({
        userId: order.userId,
        orderId: order.id,
        kind: 'ready',
        toEmail: '',
        body: `Pedido ${order.code} listo para recoger.`,
      } as any);
    }
    const fresh = await this.orders.findOne({ where: { id: order.id }, relations: { lines: true } });
    return this.ordersSvc.serialize(fresh!);
  }

  async setStatus(id: string, status: Order['status']) {
    const order = await this.orders.findOne({ where: { id }, relations: { lines: true } });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === 'picked_up' && status === 'picked_up') {
      throw new HttpException(
        { code: 'ALREADY_PICKED_UP', message: 'Este pedido ya salió del mostrador.' },
        HttpStatus.CONFLICT,
      );
    }
    order.status = status;
    await this.orders.save(order);
    const fresh = await this.orders.findOne({ where: { id }, relations: { lines: true } });
    return this.ordersSvc.serialize(fresh!);
  }

  async queue() {
    const rows = await this.orders.find({
      where: { status: In(['paid', 'preparing', 'ready']) },
      relations: { lines: true },
      order: { createdAt: 'ASC' },
    });
    const start = startOfMadridDay(new Date());
    return rows
      .filter((o) => new Date(o.paidAt || o.createdAt).getTime() >= start.getTime())
      .map((o) => this.ordersSvc.serialize(o));
  }

  async stats() {
    const paid = await this.orders.find({
      where: { status: In(['paid', 'preparing', 'ready', 'picked_up']) },
    });
    const days: { day: string; eur: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = madridDateKey(d);
      const eur = paid
        .filter((o) => o.paidAt && madridDateKey(new Date(o.paidAt)) === key)
        .reduce((s, o) => s + o.totalEur, 0);
      days.push({ day: key, eur: Math.round(eur * 100) / 100 });
    }
    return { series: days, axes: { x: 'fecha', y: 'EUR' } };
  }

  async setStock(id: string, stock: number) {
    const p = await this.products.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    p.stock = Math.max(0, Math.floor(stock));
    await this.products.save(p);
    return p;
  }

  async setBom(id: string, items: { componentProductId: string; qty: number }[]) {
    const kit = await this.products.findOne({ where: { id } });
    if (!kit) throw new NotFoundException('Kit no encontrado');
    const existing = await this.boms.find({ where: { kitProductId: id } });
    if (existing.length) await this.boms.remove(existing);
    const saved: KitBom[] = [];
    for (const item of items) {
      saved.push(
        (await this.boms.save({
          kitProductId: id,
          componentProductId: item.componentProductId,
          qty: Math.max(1, item.qty),
        } as any)) as KitBom,
      );
    }
    return saved;
  }
}

function madridDateKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function startOfMadridDay(now: Date) {
  const key = madridDateKey(now);
  return new Date(key + 'T00:00:00+02:00');
}

class ScanDto {
  @IsString()
  codeOrUrl!: string;
}

class StatusDto {
  @IsString()
  status!: 'paid' | 'preparing' | 'ready' | 'picked_up';
}

class StockDto {
  @IsInt()
  @Min(0)
  stock!: number;
}

class BomItemDto {
  @IsString()
  componentProductId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

class BomDto {
  @IsArray()
  items!: BomItemDto[];
}

@ApiTags('staff')
@ApiBearerAuth()
@Controller()
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Post('staff/scan')
  @UseGuards(JwtAuthGuard, StaffGuard)
  scan(@Body() dto: ScanDto) {
    return this.staff.scan(dto.codeOrUrl);
  }

  @Patch('staff/orders/:id/status')
  @UseGuards(JwtAuthGuard, StaffGuard)
  status(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.staff.setStatus(id, dto.status);
  }

  @Get('staff/queue')
  @UseGuards(JwtAuthGuard, StaffGuard)
  queue() {
    return this.staff.queue();
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  stats() {
    return this.staff.stats();
  }

  @Patch('admin/products/:id/stock')
  @UseGuards(JwtAuthGuard, AdminGuard)
  stock(@Param('id') id: string, @Body() dto: StockDto) {
    return this.staff.setStock(id, dto.stock);
  }

  @Patch('admin/products/:id/bom')
  @UseGuards(JwtAuthGuard, AdminGuard)
  bomPutAlias(@Param('id') id: string, @Body() dto: BomDto) {
    return this.staff.setBom(id, dto.items || []);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, KitBom, EmailLog]),
    AuthModule,
    OrdersModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
