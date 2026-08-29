import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as QRCode from 'qrcode';
import {
  KitBom,
  Order,
  OrderLine,
  Product,
  Range,
  Review,
  User,
} from '../entities/entities';

const DEMO_PASS = 'peana-demo-2026';
const ORIGIN = (process.env.WEB_ORIGIN || 'https://peana.proyectos.cristiancode.dev').replace(
  /\/$/,
  '',
);

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Range) private readonly ranges: Repository<Range>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(KitBom) private readonly boms: Repository<KitBom>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderLine) private readonly lines: Repository<OrderLine>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    const n = await this.users.count();
    if (n > 0) return;
    await this.seed();
  }

  async seed() {
    this.log.log('Seeding Peana…');
    const hash = await bcrypt.hash(DEMO_PASS, 10);

    const vecina = (await this.users.save({
      username: 'vecina',
      email: 'vecina@peana.test',
      passwordHash: hash,
      role: 'customer',
      points: 0,
    } as any)) as User;
    await this.users.save({
      username: 'mostrador',
      email: 'staff@peana.test',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any);
    await this.users.save({
      username: 'tendero',
      email: 'admin@peana.test',
      passwordHash: hash,
      role: 'admin',
      points: 0,
    } as any);

    const rangeDefs = [
      {
        slug: 'mesnada',
        name: 'Mesnada ibérica',
        blurb: 'Alférez, alabarderos y peanas de tierra seca para la frontera medieval.',
        photoUrl: '/assets/gamas/mesnada.svg',
      },
      {
        slug: 'trincheras',
        name: 'Trincheras del Ebro',
        blurb: 'Soldados de 1938, barro, cascos y banderines de lona.',
        photoUrl: '/assets/gamas/trincheras.svg',
      },
      {
        slug: 'orbita',
        name: 'Órbita Cero',
        blurb: 'Exploradoras de vacío, visores y peanas de resina lunar.',
        photoUrl: '/assets/gamas/orbita.svg',
      },
      {
        slug: 'bestias',
        name: 'Bestias de yeso',
        blurb: 'Brutos, gárgolas y peanas de musgo para la vitrina.',
        photoUrl: '/assets/gamas/bestias.svg',
      },
    ];
    const rangeBySlug: Record<string, Range> = {};
    for (const def of rangeDefs) {
      rangeBySlug[def.slug] = (await this.ranges.save(def as any)) as Range;
    }

    const productDefs: Array<Partial<Product> & { slug: string }> = [
      {
        slug: 'alferez-mesnada',
        rangeId: rangeBySlug.mesnada.id,
        kind: 'mini',
        name: 'Alférez de mesnada',
        description: 'Oficial con pendón, 32 mm. Peana ovalada de tierra tostada.',
        priceEur: 12,
        stock: 8,
        photoUrl: '/assets/peanas/alferez.svg',
        paintNotes: [{ hex: '#7A4E0E', label: 'Latón' }, { hex: '#0F3D2A', label: 'Óxido' }],
      },
      {
        slug: 'alabardero',
        rangeId: rangeBySlug.mesnada.id,
        kind: 'mini',
        name: 'Alabardero',
        description: 'Pica larga y morrión. Ideal para filas de 5.',
        priceEur: 10,
        stock: 6,
        photoUrl: '/assets/peanas/alabardero.svg',
      },
      {
        slug: 'soldado-ebro',
        rangeId: rangeBySlug.trincheras.id,
        kind: 'mini',
        name: 'Soldado del Ebro',
        description: 'Casco Adrian, manta enrollada, peana de barro agrietado.',
        priceEur: 11,
        stock: 9,
        photoUrl: '/assets/peanas/ebro.svg',
      },
      {
        slug: 'exploradora-orbita',
        rangeId: rangeBySlug.orbita.id,
        kind: 'mini',
        name: 'Exploradora de Órbita',
        description: 'Visor partido y peana de resina pálida.',
        priceEur: 14,
        stock: 5,
        photoUrl: '/assets/peanas/exploradora.svg',
      },
      {
        slug: 'bruto-yeso',
        rangeId: rangeBySlug.bestias.id,
        kind: 'mini',
        name: 'Bruto de yeso',
        description: 'Bestia de 40 mm. Peana de musgo y piedra.',
        priceEur: 16,
        stock: 4,
        photoUrl: '/assets/peanas/bruto.svg',
      },
      {
        slug: 'bote-oxido',
        rangeId: null,
        kind: 'paint',
        name: 'Bote óxido 17 ml',
        description: 'Acrílico mate para peanas y armaduras.',
        priceEur: 3.5,
        stock: 12,
        photoUrl: '/assets/peanas/bote-oxido.svg',
        paintNotes: [{ hex: '#7A4E0E', label: 'Óxido' }],
      },
      {
        slug: 'bote-musgo',
        rangeId: null,
        kind: 'paint',
        name: 'Bote verde musgo 17 ml',
        description: 'Lavado para césped y capas de bestias.',
        priceEur: 3.5,
        stock: 10,
        photoUrl: '/assets/peanas/bote-musgo.svg',
        paintNotes: [{ hex: '#0F3D2A', label: 'Musgo' }],
      },
      {
        slug: 'd20-laton',
        rangeId: null,
        kind: 'dice',
        name: 'D20 de latón',
        description: 'Dado pesado. Agotado esta semana.',
        priceEur: 4,
        stock: 0,
        photoUrl: '/assets/peanas/d20.svg',
      },
      {
        slug: 'cesped-tuft',
        rangeId: null,
        kind: 'tuft',
        name: 'Césped tuft',
        description: 'Mechones para peanas de campo.',
        priceEur: 5,
        stock: 15,
        photoUrl: '/assets/peanas/tuft.svg',
      },
      {
        slug: 'pinza',
        rangeId: null,
        kind: 'tool',
        name: 'Pinza de modelar',
        description: 'Acero fino para transferencias y calcas.',
        priceEur: 6.5,
        stock: 7,
        photoUrl: '/assets/peanas/pinza.svg',
      },
      {
        slug: 'kit-mesnada',
        rangeId: rangeBySlug.mesnada.id,
        kind: 'kit',
        name: 'Kit Mesnada',
        description: 'Alférez + óxido + césped. Solo se vende si el BOM está completo.',
        priceEur: 28,
        stock: 4,
        photoUrl: '/assets/peanas/kit-mesnada.svg',
        kitTags: ['inicio', 'mesnada'],
      },
      {
        slug: 'kit-orbita',
        rangeId: rangeBySlug.orbita.id,
        kind: 'kit',
        name: 'Kit Órbita',
        description: 'Exploradora + musgo + pinza.',
        priceEur: 32,
        stock: 3,
        photoUrl: '/assets/peanas/kit-orbita.svg',
        kitTags: ['sci-fi'],
      },
    ];

    const bySlug: Record<string, Product> = {};
    for (const def of productDefs) {
      bySlug[def.slug] = (await this.products.save(def as any)) as Product;
    }

    await this.boms.save({
      kitProductId: bySlug['kit-mesnada'].id,
      componentProductId: bySlug['alferez-mesnada'].id,
      qty: 1,
    } as any);
    await this.boms.save({
      kitProductId: bySlug['kit-mesnada'].id,
      componentProductId: bySlug['bote-oxido'].id,
      qty: 2,
    } as any);
    await this.boms.save({
      kitProductId: bySlug['kit-mesnada'].id,
      componentProductId: bySlug['cesped-tuft'].id,
      qty: 1,
    } as any);
    await this.boms.save({
      kitProductId: bySlug['kit-orbita'].id,
      componentProductId: bySlug['exploradora-orbita'].id,
      qty: 1,
    } as any);
    await this.boms.save({
      kitProductId: bySlug['kit-orbita'].id,
      componentProductId: bySlug['bote-musgo'].id,
      qty: 1,
    } as any);
    await this.boms.save({
      kitProductId: bySlug['kit-orbita'].id,
      componentProductId: bySlug['pinza'].id,
      qty: 1,
    } as any);

    const orderSpecs = [
      {
        code: 'PEA-MESNADA1',
        status: 'picked_up' as const,
        daysAgo: 5,
        items: [
          { slug: 'alferez-mesnada', qty: 1 },
          { slug: 'bote-oxido', qty: 2 },
        ],
      },
      {
        code: 'PEA-ORBITA1',
        status: 'ready' as const,
        daysAgo: 1,
        items: [{ slug: 'kit-orbita', qty: 1 }],
      },
      {
        code: 'PEA-BESTIA1',
        status: 'paid' as const,
        daysAgo: 0,
        items: [
          { slug: 'bruto-yeso', qty: 1 },
          { slug: 'cesped-tuft', qty: 1 },
        ],
      },
    ];

    let points = 0;
    for (const spec of orderSpecs) {
      const paidAt = new Date();
      paidAt.setDate(paidAt.getDate() - spec.daysAgo);
      const lines = spec.items.map((it) => {
        const p = bySlug[it.slug];
        const unit = p.priceEur;
        return {
          productId: p.id,
          nameSnapshot: p.name,
          unitPriceEur: unit,
          qty: it.qty,
          lineTotalEur: Math.round(unit * it.qty * 100) / 100,
        };
      });
      const totalEur = Math.round(lines.reduce((s, l) => s + l.lineTotalEur, 0) * 100) / 100;
      const pointsAwarded = Math.floor(totalEur);
      points += pointsAwarded;
      const qrUrl = `${ORIGIN}/pedido/${spec.code}`;
      const rawSvg = await QRCode.toString(qrUrl, { type: 'svg', margin: 1, width: 240 });
      const qrSvg = rawSvg.replace('</svg>', `<desc>${qrUrl}</desc></svg>`);
      const order = (await this.orders.save({
        userId: vecina.id,
        code: spec.code,
        status: spec.status,
        totalEur,
        pointsAwarded,
        qrSvg,
        qrUrl,
        paidAt,
        createdAt: paidAt,
      } as any)) as Order;
      for (const line of lines) {
        await this.lines.save({ orderId: order.id, ...line } as any);
      }
    }

    vecina.points = points;
    await this.users.save(vecina);

    await this.reviews.save({
      userId: vecina.id,
      productId: bySlug['alferez-mesnada'].id,
      rating: 5,
      body: 'La peana llega limpia y el pendón no viene doblado.',
    } as any);

    this.log.log('Seed ready. Demo vecina@peana.test / peana-demo-2026');
  }
}
