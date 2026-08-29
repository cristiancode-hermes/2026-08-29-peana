import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { CartService } from '../cart/cart.service';
import {
  CartItem,
  EmailLog,
  KitBom,
  Order,
  OrderLine,
  Product,
  User,
} from '../entities/entities';

function conflict(code: string, message: string): never {
  throw new HttpException({ code, message }, HttpStatus.CONFLICT);
}

let lock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cart: CartService,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderLine) private readonly lines: Repository<OrderLine>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  webOrigin() {
    return (process.env.WEB_ORIGIN || 'https://peana.proyectos.cristiancode.dev').replace(/\/$/, '');
  }

  async checkout(userId: string, _paymentNonce?: string) {
    return withLock(() => this.checkoutLocked(userId));
  }

  private async checkoutLocked(userId: string) {
    const cart = await this.cart.getCart(userId);
    const payable = cart.items.filter((i) => i.clampedQty > 0 && !i.outOfStock);
    if (!payable.length) {
      conflict('NO_STOCK', 'Ya no quedan unidades de este SKU. Quita la línea o baja la cantidad.');
    }

    const productIds = payable.map((i) => i.productId);
    const supportsLock = this.dataSource.options.type !== 'better-sqlite3';

    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const bomRepo = manager.getRepository(KitBom);
      const locked: Product[] = [];
      for (const id of productIds) {
        const qb = productRepo.createQueryBuilder('p').where('p.id = :id', { id });
        const p = supportsLock ? await qb.setLock('pessimistic_write').getOne() : await qb.getOne();
        if (!p) throw new NotFoundException('Producto no encontrado');
        locked.push(p);
      }
      const byId = new Map(locked.map((p) => [p.id, p]));

      const kitIds = locked.filter((p) => p.kind === 'kit').map((p) => p.id);
      const bomRows = kitIds.length
        ? await bomRepo.find({ where: { kitProductId: In(kitIds) } })
        : [];
      const need: Record<string, number> = {};
      for (const line of payable) {
        const product = byId.get(line.productId)!;
        const qty = line.clampedQty;
        if (product.stock < qty) {
          conflict(
            'NO_STOCK',
            `Ya no quedan unidades de ${product.name}. Quita esa línea o baja la cantidad.`,
          );
        }
        need[product.id] = (need[product.id] || 0) + qty;
        if (product.kind === 'kit') {
          const parts = bomRows.filter((b) => b.kitProductId === product.id);
          for (const part of parts) {
            need[part.componentProductId] = (need[part.componentProductId] || 0) + part.qty * qty;
          }
        }
      }

      const extraIds = Object.keys(need).filter((id) => !byId.has(id));
      for (const id of extraIds) {
        const qb = productRepo.createQueryBuilder('p').where('p.id = :id', { id });
        const p = supportsLock ? await qb.setLock('pessimistic_write').getOne() : await qb.getOne();
        if (!p) throw new NotFoundException('Componente de kit no encontrado');
        byId.set(p.id, p);
      }

      for (const [id, qty] of Object.entries(need)) {
        const p = byId.get(id)!;
        if (p.stock < qty) {
          const isKitLine = payable.some((l) => {
            const prod = byId.get(l.productId);
            return prod?.kind === 'kit' && l.productId !== id;
          });
          if (isKitLine && !payable.some((l) => l.productId === id)) {
            conflict(
              'KIT_INCOMPLETE',
              `Este kit no se puede armar: falta ${p.name}.`,
            );
          }
          conflict(
            'NO_STOCK',
            `Ya no quedan unidades de ${p.name}. Quita esa línea o baja la cantidad.`,
          );
        }
      }

      for (const [id, qty] of Object.entries(need)) {
        const p = byId.get(id)!;
        p.stock -= qty;
        await productRepo.save(p);
      }

      const totalEur =
        Math.round(payable.reduce((s, i) => s + i.unitPriceEur * i.clampedQty, 0) * 100) / 100;
      const pointsAwarded = Math.floor(totalEur);
      const code = 'PEA-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      const qrUrl = `${this.webOrigin()}/pedido/${code}`;
      const rawSvg = await QRCode.toString(qrUrl, { type: 'svg', margin: 1, width: 240 });
      const qrSvg = rawSvg.replace('</svg>', `<desc>${qrUrl}</desc></svg>`);
      const now = new Date();

      const order = (await manager.getRepository(Order).save({
        userId,
        code,
        status: 'paid',
        totalEur,
        pointsAwarded,
        qrSvg,
        qrUrl,
        paidAt: now,
        createdAt: now,
      } as any)) as Order;

      for (const line of payable) {
        await manager.getRepository(OrderLine).save({
          orderId: order.id,
          productId: line.productId,
          nameSnapshot: line.name,
          unitPriceEur: line.unitPriceEur,
          qty: line.clampedQty,
          lineTotalEur: Math.round(line.unitPriceEur * line.clampedQty * 100) / 100,
        } as any);
      }

      const user = await manager.getRepository(User).findOne({ where: { id: userId } });
      if (user) {
        user.points = (user.points || 0) + pointsAwarded;
        await manager.getRepository(User).save(user);
      }

      const cartRows = await manager.getRepository(CartItem).find({ where: { userId } });
      if (cartRows.length) await manager.getRepository(CartItem).remove(cartRows);

      await manager.getRepository(EmailLog).save({
        userId,
        orderId: order.id,
        kind: 'paid',
        toEmail: user?.email || '',
        body: `Pedido ${code} pagado. Recoge en mostrador con el QR.`,
      } as any);

      const full = await manager.getRepository(Order).findOne({
        where: { id: order.id },
        relations: { lines: true },
      });
      return this.serialize(full!);
    });
  }

  async listMine(userId: string) {
    const rows = await this.orders.find({
      where: { userId },
      relations: { lines: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((o) => this.serialize(o));
  }

  async getMine(userId: string, id: string) {
    const row = await this.orders.findOne({
      where: { id, userId },
      relations: { lines: true },
    });
    if (!row) throw new NotFoundException('Pedido no encontrado');
    return this.serialize(row);
  }

  async getByCode(code: string) {
    const cleaned = this.extractCode(code);
    const row = await this.orders.findOne({
      where: { code: cleaned },
      relations: { lines: true },
    });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'No hay un pedido con ese código.' });
    return this.serialize(row);
  }

  async cancel(userId: string, id: string) {
    return withLock(() => this.cancelLocked(userId, id));
  }

  private async cancelLocked(userId: string, id: string) {
    const order = await this.orders.findOne({
      where: { id, userId },
      relations: { lines: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === 'cancelled') return this.serialize(order);
    if (order.status === 'ready' || order.status === 'picked_up') {
      conflict('TOO_LATE', 'Ya está listo o pasaron 24 h.');
    }
    const age = Date.now() - new Date(order.createdAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      conflict('TOO_LATE', 'Ya está listo o pasaron 24 h.');
    }
    if (order.status !== 'paid' && order.status !== 'preparing') {
      conflict('TOO_LATE', 'Ya está listo o pasaron 24 h.');
    }

    await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const bomRepo = manager.getRepository(KitBom);
      for (const line of order.lines || []) {
        const p = await productRepo.findOne({ where: { id: line.productId } });
        if (!p) continue;
        p.stock += line.qty;
        await productRepo.save(p);
        if (p.kind === 'kit') {
          const parts = await bomRepo.find({ where: { kitProductId: p.id } });
          for (const part of parts) {
            const c = await productRepo.findOne({ where: { id: part.componentProductId } });
            if (c) {
              c.stock += part.qty * line.qty;
              await productRepo.save(c);
            }
          }
        }
      }
      order.status = 'cancelled';
      await manager.getRepository(Order).save(order);
      const user = await manager.getRepository(User).findOne({ where: { id: userId } });
      if (user) {
        user.points = Math.max(0, (user.points || 0) - order.pointsAwarded);
        await manager.getRepository(User).save(user);
      }
    });
    const fresh = await this.orders.findOne({ where: { id }, relations: { lines: true } });
    return this.serialize(fresh!);
  }

  extractCode(input: string) {
    const raw = (input || '').trim();
    const m = raw.match(/PEA-[A-Z0-9]+/i);
    if (m) return m[0].toUpperCase();
    const parts = raw.split('/').filter(Boolean);
    return (parts[parts.length - 1] || raw).toUpperCase();
  }

  serialize(order: Order) {
    const lines = (order.lines || []).map((l) => ({
      id: l.id,
      productId: l.productId,
      nameSnapshot: l.nameSnapshot,
      unitPriceEur: l.unitPriceEur,
      qty: l.qty,
      lineTotalEur: l.lineTotalEur,
    }));
    const sum = Math.round(lines.reduce((s, l) => s + l.lineTotalEur, 0) * 100) / 100;
    return {
      id: order.id,
      userId: order.userId,
      code: order.code,
      status: order.status,
      totalEur: sum,
      pointsAwarded: order.pointsAwarded,
      qrSvg: order.qrSvg,
      qrUrl: order.qrUrl,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      lines,
    };
  }
}
