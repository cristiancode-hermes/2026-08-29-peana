import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API, Cart, Order, Product, Range, Review } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http = inject(HttpClient);
  readonly cartCount = signal(0);

  listRanges() {
    return this.http.get<Range[]>(`${API}/ranges`);
  }
  getRange(slug: string) {
    return this.http.get<Range>(`${API}/ranges/${slug}`);
  }
  listProducts(params?: { q?: string; category?: string; rangeId?: string }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.category) qs.set('category', params.category);
    if (params?.rangeId) qs.set('rangeId', params.rangeId);
    const s = qs.toString();
    return this.http.get<Product[]>(`${API}/products${s ? '?' + s : ''}`);
  }
  getProduct(id: string) {
    return this.http.get<Product>(`${API}/products/${id}`);
  }
  addReview(id: string, rating: number, body: string) {
    return this.http.post<Review>(`${API}/products/${id}/reviews`, { rating, body });
  }
  getCart() {
    return this.http.get<Cart>(`${API}/cart`);
  }
  addToCart(productId: string, qty: number) {
    return this.http.post<Cart>(`${API}/cart/items`, { productId, qty });
  }
  patchCart(id: string, qty: number) {
    return this.http.patch<Cart>(`${API}/cart/items/${id}`, { qty });
  }
  removeCart(id: string) {
    return this.http.delete<Cart>(`${API}/cart/items/${id}`);
  }
  checkout(paymentNonce = 'sim') {
    return this.http.post<Order>(`${API}/orders/checkout`, { paymentNonce });
  }
  myOrders() {
    return this.http.get<Order[]>(`${API}/orders`);
  }
  myOrder(id: string) {
    return this.http.get<Order>(`${API}/orders/${id}`);
  }
  cancel(id: string) {
    return this.http.post<Order>(`${API}/orders/${id}/cancel`, {});
  }
  ticket(code: string) {
    return this.http.get<Order>(`${API}/orders/ticket/${code}`);
  }
  favorites() {
    return this.http.get<Product[]>(`${API}/favorites`);
  }
  addFav(id: string) {
    return this.http.post<{ ok: boolean }>(`${API}/favorites/${id}`, {});
  }
  delFav(id: string) {
    return this.http.delete<{ ok: boolean }>(`${API}/favorites/${id}`);
  }
  scan(codeOrUrl: string) {
    return this.http.post<Order>(`${API}/staff/scan`, { codeOrUrl });
  }
  queue() {
    return this.http.get<Order[]>(`${API}/staff/queue`);
  }
  setStatus(id: string, status: string) {
    return this.http.patch<Order>(`${API}/staff/orders/${id}/status`, { status });
  }
  stats() {
    return this.http.get<{ series: { day: string; eur: number }[]; axes: { x: string; y: string } }>(
      `${API}/admin/stats`,
    );
  }
  setStock(id: string, stock: number) {
    return this.http.patch<Product>(`${API}/admin/products/${id}/stock`, { stock });
  }

  rememberCount(cart: Cart) {
    this.cartCount.set(cart.items.reduce((s, i) => s + i.qty, 0));
  }
}
