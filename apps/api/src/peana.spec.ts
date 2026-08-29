import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { HttpException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  ALL_ENTITIES,
  CartItem,
  KitBom,
  Order,
  Product,
  User,
} from './entities/entities';
import { AuthService } from './auth/auth.service';
import { CartService } from './cart/cart.service';
import { OrdersService } from './orders/orders.service';
import { CatalogService } from './catalog/catalog.service';
import { StaffService } from './staff/staff.module';

describe('Peana', () => {
  let ds: DataSource;
  let auth: AuthService;
  let cart: CartService;
  let orders: OrdersService;
  let catalog: CatalogService;
  let staff: StaffService;
  let alice: User;
  let bob: User;
  let staffUser: User;
  let mini: Product;
  let kit: Product;
  let paint: Product;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1d' } }),
      ],
      providers: [AuthService, CartService, OrdersService, CatalogService, StaffService],
    }).compile();

    ds = moduleRef.get(DataSource);
    auth = moduleRef.get(AuthService);
    cart = moduleRef.get(CartService);
    orders = moduleRef.get(OrdersService);
    catalog = moduleRef.get(CatalogService);
    staff = moduleRef.get(StaffService);

    const hash = await bcrypt.hash('peana-demo-2026', 10);
    alice = (await ds.getRepository(User).save({
      username: 'alice',
      email: 'alice@peana.test',
      passwordHash: hash,
      role: 'customer',
      points: 0,
    } as any)) as User;
    bob = (await ds.getRepository(User).save({
      username: 'bob',
      email: 'bob@peana.test',
      passwordHash: hash,
      role: 'customer',
      points: 0,
    } as any)) as User;
    staffUser = (await ds.getRepository(User).save({
      username: 'mostrador',
      email: 'staff@peana.test',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;

    paint = (await ds.getRepository(Product).save({
      rangeId: null,
      kind: 'paint',
      name: 'Bote óxido',
      slug: 'bote-oxido',
      description: '17 ml',
      priceEur: 3.5,
      stock: 10,
      photoUrl: '/assets/peanas/bote-oxido.svg',
    } as any)) as Product;

    mini = (await ds.getRepository(Product).save({
      rangeId: null,
      kind: 'mini',
      name: 'Alférez',
      slug: 'alferez',
      description: '32 mm',
      priceEur: 12,
      stock: 1,
      photoUrl: '/assets/peanas/alferez.svg',
    } as any)) as Product;

    const tuft = (await ds.getRepository(Product).save({
      rangeId: null,
      kind: 'tuft',
      name: 'Césped',
      slug: 'cesped',
      description: 'tuft',
      priceEur: 5,
      stock: 8,
      photoUrl: '/assets/peanas/tuft.svg',
    } as any)) as Product;

    kit = (await ds.getRepository(Product).save({
      rangeId: null,
      kind: 'kit',
      name: 'Kit Mesnada',
      slug: 'kit-mesnada',
      description: 'BOM',
      priceEur: 28,
      stock: 2,
      photoUrl: '/assets/peanas/kit-mesnada.svg',
    } as any)) as Product;

    await ds.getRepository(KitBom).save({
      kitProductId: kit.id,
      componentProductId: mini.id,
      qty: 1,
    } as any);
    await ds.getRepository(KitBom).save({
      kitProductId: kit.id,
      componentProductId: paint.id,
      qty: 2,
    } as any);
    await ds.getRepository(KitBom).save({
      kitProductId: kit.id,
      componentProductId: tuft.id,
      qty: 1,
    } as any);
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('login acepta username', async () => {
    const res = await auth.login({ identifier: 'alice', password: 'peana-demo-2026' });
    expect(res.accessToken).toBeTruthy();
    expect(res.user.email).toBe('alice@peana.test');
  });

  it('login acepta email', async () => {
    const res = await auth.login({ identifier: 'alice@peana.test', password: 'peana-demo-2026' });
    expect(res.user.username).toBe('alice');
  });

  it('carrito clampa al stock', async () => {
    await cart.addItem(alice.id, paint.id, 99);
    const c = await cart.getCart(alice.id);
    const line = c.items.find((i) => i.productId === paint.id);
    expect(line.qty).toBeLessThanOrEqual(10);
    expect(c.liveTotal).toBeGreaterThan(0);
  });

  it('checkout atómico descuenta stock y genera QR con URL', async () => {
    await ds.getRepository(CartItem).delete({ userId: alice.id });
    await cart.addItem(alice.id, paint.id, 2);
    const order = await orders.checkout(alice.id, 'nonce');
    expect(order.status).toBe('paid');
    expect(order.code.startsWith('PEA-')).toBe(true);
    expect(order.qrUrl).toContain('/pedido/' + order.code);
    expect(order.qrSvg).toContain(order.qrUrl);
    expect(order.qrSvg).toContain('<svg');
    expect(order.totalEur).toBe(7);
    expect(order.pointsAwarded).toBe(7);
    const p = await ds.getRepository(Product).findOne({ where: { id: paint.id } });
    expect(p.stock).toBe(8);
    const empty = await cart.getCart(alice.id);
    expect(empty.items.length).toBe(0);
  });

  it('lista y detalle suman las mismas líneas', async () => {
    const list = await orders.listMine(alice.id);
    expect(list.length).toBeGreaterThan(0);
    const one = await orders.getMine(alice.id, list[0].id);
    const sumList = list[0].lines.reduce((s, l) => s + l.lineTotalEur, 0);
    const sumDet = one.lines.reduce((s, l) => s + l.lineTotalEur, 0);
    expect(Math.round(sumList * 100) / 100).toBe(list[0].totalEur);
    expect(Math.round(sumDet * 100) / 100).toBe(one.totalEur);
    expect(one.totalEur).toBe(list[0].totalEur);
  });

  it('puntos derivados de euros pagados', async () => {
    const me = await auth.me(alice.id);
    expect(me.points).toBe(Math.floor(me.user.points));
    expect(me.points).toBeGreaterThan(0);
  });

  it('segundo checkout de la última unidad → 409 NO_STOCK', async () => {
    await ds.getRepository(CartItem).delete({ userId: alice.id });
    await ds.getRepository(CartItem).delete({ userId: bob.id });
    await cart.addItem(alice.id, mini.id, 1);
    await cart.addItem(bob.id, mini.id, 1);
    const first = await orders.checkout(alice.id, 'n1');
    expect(first.status).toBe('paid');
    try {
      await orders.checkout(bob.id, 'n2');
      fail('expected 409');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(409);
      const body = (e as HttpException).getResponse() as { code: string };
      expect(body.code).toBe('NO_STOCK');
    }
    const leftover = await ds.getRepository(Order).find({ where: { userId: bob.id } });
    expect(leftover.length).toBe(0);
  });

  it('kit con componente a 0 → 409 KIT_INCOMPLETE', async () => {
    await ds.getRepository(Product).update({ id: mini.id }, { stock: 0 });
    await ds.getRepository(CartItem).delete({ userId: bob.id });
    await cart.addItem(bob.id, kit.id, 1);
    try {
      await orders.checkout(bob.id, 'kit');
      fail('expected 409');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(409);
      const body = (e as HttpException).getResponse() as { code: string; message: string };
      expect(body.code).toBe('KIT_INCOMPLETE');
      expect(body.message).toContain('Alférez');
    }
    await ds.getRepository(Product).update({ id: mini.id }, { stock: 2 });
  });

  it('GET público por código', async () => {
    const list = await orders.listMine(alice.id);
    const pub = await orders.getByCode(list[0].code);
    expect(pub.code).toBe(list[0].code);
    expect(pub.qrSvg).toContain(pub.qrUrl);
  });

  it('scan extrae código de URL y avanza estado', async () => {
    const list = await orders.listMine(alice.id);
    const paid = list.find((o) => o.status === 'paid') || list[0];
    const scanned = await staff.scan(`https://peana.proyectos.cristiancode.dev/pedido/${paid.code}`);
    expect(['preparing', 'ready', 'picked_up']).toContain(scanned.status);
  });

  it('segundo picked_up → 409 ALREADY_PICKED_UP', async () => {
    const list = await orders.listMine(alice.id);
    const order = list[0];
    await staff.setStatus(order.id, 'picked_up');
    try {
      await staff.scan(order.code);
      fail('expected 409');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(409);
      const body = (e as HttpException).getResponse() as { code: string };
      expect(body.code).toBe('ALREADY_PICKED_UP');
    }
  });

  it('cancelar paid < 24h libera stock', async () => {
    const before = (await ds.getRepository(Product).findOne({ where: { id: paint.id } }))!.stock;
    await ds.getRepository(CartItem).delete({ userId: bob.id });
    await cart.addItem(bob.id, paint.id, 1);
    const order = await orders.checkout(bob.id, 'c');
    const mid = (await ds.getRepository(Product).findOne({ where: { id: paint.id } }))!.stock;
    expect(mid).toBe(before - 1);
    const cancelled = await orders.cancel(bob.id, order.id);
    expect(cancelled.status).toBe('cancelled');
    const after = (await ds.getRepository(Product).findOne({ where: { id: paint.id } }))!.stock;
    expect(after).toBe(before);
  });

  it('cancelar ready → 409 TOO_LATE', async () => {
    await ds.getRepository(CartItem).delete({ userId: bob.id });
    await cart.addItem(bob.id, paint.id, 1);
    const order = await orders.checkout(bob.id, 'late');
    await staff.setStatus(order.id, 'ready');
    try {
      await orders.cancel(bob.id, order.id);
      fail('expected 409');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(409);
      const body = (e as HttpException).getResponse() as { code: string };
      expect(body.code).toBe('TOO_LATE');
    }
  });

  it('segunda reseña → 409 ALREADY_REVIEWED', async () => {
    await catalog.addReview(alice.id, paint.id, 5, 'Cubre bien la peana.');
    try {
      await catalog.addReview(alice.id, paint.id, 4, 'otra');
      fail('expected 409');
    } catch (e) {
      const body = (e as HttpException).getResponse() as { code: string };
      expect(body.code).toBe('ALREADY_REVIEWED');
    }
  });

  it('stats 14 días con ejes y fechas', async () => {
    const s = await staff.stats();
    expect(s.series.length).toBe(14);
    expect(s.axes.x).toBe('fecha');
    expect(s.series[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof s.series[13].eur).toBe('number');
  });

  it('código inexistente NOT_FOUND', async () => {
    try {
      await orders.getByCode('PEA-NADA');
      fail('expected 404');
    } catch (e) {
      expect(e).toBeTruthy();
    }
  });

  it('favoritos roundtrip', async () => {
    await catalog.addFavorite(alice.id, paint.id);
    const favs = await catalog.listFavorites(alice.id);
    expect(favs.some((p) => p.id === paint.id)).toBe(true);
    await catalog.removeFavorite(alice.id, paint.id);
    const empty = await catalog.listFavorites(alice.id);
    expect(empty.some((p) => p.id === paint.id)).toBe(false);
  });

  it('stock admin no negativo', async () => {
    const p = await staff.setStock(paint.id, 4);
    expect(p.stock).toBe(4);
  });

  it('QR payload es URL absoluta del pedido', async () => {
    const list = await orders.listMine(alice.id);
    const o = list[0];
    expect(o.qrUrl.startsWith('http')).toBe(true);
    expect(o.qrSvg.includes(o.qrUrl)).toBe(true);
  });
});
