import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Favorite, KitBom, Product, Range, Review } from '../entities/entities';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Range) private readonly ranges: Repository<Range>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(KitBom) private readonly boms: Repository<KitBom>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Favorite) private readonly favorites: Repository<Favorite>,
  ) {}

  listRanges() {
    return this.ranges.find({ order: { name: 'ASC' } });
  }

  async getRange(slug: string) {
    const range = await this.ranges.findOne({ where: { slug } });
    if (!range) throw new NotFoundException('Gama no encontrada');
    const products = await this.products.find({ where: { rangeId: range.id } });
    return { ...range, products: products.map((p) => this.publicProduct(p)) };
  }

  async listProducts(q?: string, category?: string, rangeId?: string) {
    let items = await this.products.find({ order: { name: 'ASC' } });
    if (rangeId) items = items.filter((p) => p.rangeId === rangeId);
    if (category) items = items.filter((p) => p.kind === category);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle),
      );
    }
    return items.map((p) => this.publicProduct(p));
  }

  async getProduct(id: string) {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const bomRows = await this.boms.find({ where: { kitProductId: id } });
    const componentIds = bomRows.map((b) => b.componentProductId);
    const comps =
      componentIds.length > 0
        ? await this.products.find({ where: { id: In(componentIds) } })
        : [];
    const byId = new Map(comps.map((c) => [c.id, c]));
    const bom = bomRows.map((b) => ({
      qty: b.qty,
      component: byId.get(b.componentProductId)
        ? this.publicProduct(byId.get(b.componentProductId)!)
        : null,
    }));
    const reviews = await this.reviews.find({ where: { productId: id } });
    const avg =
      reviews.length === 0
        ? 0
        : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
    return { ...this.publicProduct(product), bom, reviews, avgRating: avg };
  }

  listReviews(productId: string) {
    return this.reviews.find({ where: { productId }, order: { createdAt: 'DESC' } });
  }

  async addReview(userId: string, productId: string, rating: number, body: string) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const existing = await this.reviews.findOne({ where: { userId, productId } });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_REVIEWED',
        message: 'Ya reseñaste esta peana.',
      });
    }
    const clamped = Math.max(1, Math.min(5, Math.round(rating)));
    return (await this.reviews.save({
      userId,
      productId,
      rating: clamped,
      body: (body || '').trim(),
    } as any)) as Review;
  }

  async listFavorites(userId: string) {
    const favs = await this.favorites.find({ where: { userId } });
    if (!favs.length) return [];
    const products = await this.products.find({
      where: { id: In(favs.map((f) => f.productId)) },
    });
    return products.map((p) => this.publicProduct(p));
  }

  async addFavorite(userId: string, productId: string) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const existing = await this.favorites.findOne({ where: { userId, productId } });
    if (!existing) {
      await this.favorites.save({ userId, productId } as any);
    }
    return { ok: true };
  }

  async removeFavorite(userId: string, productId: string) {
    await this.favorites.delete({ userId, productId });
    return { ok: true };
  }

  publicProduct(p: Product) {
    return {
      id: p.id,
      rangeId: p.rangeId,
      kind: p.kind,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceEur: p.priceEur,
      stock: p.stock,
      photoUrl: p.photoUrl,
      paintNotes: p.paintNotes,
      kitTags: p.kitTags,
    };
  }
}
