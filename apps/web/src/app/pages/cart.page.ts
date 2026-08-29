import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShopService } from '../core/shop.service';
import { Cart, eur } from '../shared/models';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, FormsModule],
  template: `
    <h1>Carrito</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar el carrito</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else if (!cart() || !cart()!.items.length) {
      <div class="state-screen">
        <h2>El carrito está vacío</h2>
        <p class="lede">Elige una peana o un kit y vuelve aquí a pagar.</p>
        <a class="btn btn-primary" routerLink="/">Ver catálogo</a>
      </div>
    } @else {
      <div class="list">
        @for (i of cart()!.items; track i.id) {
          <div class="card card-body">
            <strong>{{ i.name }}</strong>
            <p class="muted">{{ money(i.unitPriceEur) }} · {{ i.stock }} uds</p>
            @if (i.outOfStock) { <p class="stock-out">Sin stock</p> }
            <input class="qty" type="number" min="0" [ngModel]="i.qty" (ngModelChange)="patch(i.id, +$event)" />
            <span>{{ money(i.lineTotalEur) }}</span>
            <button class="btn btn-ghost" type="button" (click)="remove(i.id)">Quitar</button>
          </div>
        }
      </div>
      <p><strong>Total {{ money(cart()!.liveTotal) }}</strong></p>
      <a class="btn btn-primary" routerLink="/checkout">Ir a pagar</a>
    }
  `,
})
export class CartPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected cart = signal<Cart | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  readonly money = eur;
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set(false);
    this.shop.getCart().subscribe({
      next: (c) => { this.cart.set(c); this.shop.rememberCount(c); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
  patch(id: string, qty: number) {
    this.shop.patchCart(id, qty).subscribe((c) => { this.cart.set(c); this.shop.rememberCount(c); });
  }
  remove(id: string) {
    this.shop.removeCart(id).subscribe((c) => { this.cart.set(c); this.shop.rememberCount(c); });
  }
}
