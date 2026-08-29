import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CartItem, Product } from '../entities/entities';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem) private readonly items: Repository<CartItem>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async getCart(userId: string) {
    const rows = await this.items.find({ where: { userId } });
    return this.decorate(rows);
  }

  async addItem(userId: string, productId: string, qty: number) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const want = Math.max(1, Math.floor(qty || 1));
    const existing = await this.items.findOne({ where: { userId, productId } });
    const nextQty = Math.min(product.stock, (existing?.qty || 0) + want);
    if (product.stock <= 0) {
      if (existing) await this.items.remove(existing);
      return this.getCart(userId);
    }
    if (existing) {
      existing.qty = Math.max(1, nextQty);
      await this.items.save(existing);
    } else {
      await this.items.save({ userId, productId, qty: Math.max(1, Math.min(want, product.stock)) } as any);
    }
    return this.getCart(userId);
  }

  async patchItem(userId: string, id: string, qty: number) {
    const row = await this.items.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Línea no encontrada');
    const product = await this.products.findOne({ where: { id: row.productId } });
    const stock = product?.stock ?? 0;
    const next = Math.max(0, Math.floor(qty));
    if (next <= 0 || stock <= 0) {
      await this.items.remove(row);
    } else {
      row.qty = Math.min(stock, next);
      await this.items.save(row);
    }
    return this.getCart(userId);
  }

  async removeItem(userId: string, id: string) {
    const row = await this.items.findOne({ where: { id, userId } });
    if (row) await this.items.remove(row);
    return this.getCart(userId);
  }

  async clear(userId: string) {
    const rows = await this.items.find({ where: { userId } });
    if (rows.length) await this.items.remove(rows);
  }

  private async decorate(rows: CartItem[]) {
    if (!rows.length) return { items: [], liveTotal: 0 };
    const products = await this.products.find({ where: { id: In(rows.map((r) => r.productId)) } });
    const byId = new Map(products.map((p) => [p.id, p]));
    const items = rows.map((r) => {
      const p = byId.get(r.productId);
      const unit = p?.priceEur ?? 0;
      const stock = p?.stock ?? 0;
      const qty = Math.min(r.qty, Math.max(0, stock));
      return {
        id: r.id,
        productId: r.productId,
        qty: r.qty,
        clampedQty: qty,
        name: p?.name ?? 'SKU',
        photoUrl: p?.photoUrl ?? '',
        kind: p?.kind ?? 'mini',
        unitPriceEur: unit,
        stock,
        lineTotalEur: Math.round(unit * qty * 100) / 100,
        outOfStock: stock <= 0,
      };
    });
    const liveTotal = Math.round(items.reduce((s, i) => s + i.lineTotalEur, 0) * 100) / 100;
    return { items, liveTotal };
  }
}
