import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Cart, eur, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [RouterLink],
  template: `
    <p><a routerLink="/carrito">← Carrito</a></p>
    <h1>Checkout</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar el resumen</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else if (!cart() || !cart()!.items.length) {
      <div class="state-screen"><h2>Nada que cobrar</h2><a class="btn btn-primary" routerLink="/">Catálogo</a></div>
    } @else {
      <div class="checkout">
        <div class="list">
          @for (i of cart()!.items; track i.id) {
            <div class="card card-body">
              <strong>{{ i.name }}</strong> × {{ i.clampedQty }}
              <span>{{ money(i.lineTotalEur) }}</span>
              @if (i.outOfStock) { <p class="stock-out">Sin stock</p> }
            </div>
          }
        </div>
        <aside class="summary">
          <h2>Resumen</h2>
          <ul>
            @for (i of cart()!.items; track i.id) {
              <li><span>{{ i.name }} × {{ i.clampedQty }}</span><span>{{ money(i.lineTotalEur) }}</span></li>
            }
            <li><strong>Total</strong><strong>{{ money(cart()!.liveTotal) }}</strong></li>
          </ul>
          <div id="pay-action">
            @if (payErr()) { <p class="hold-error">{{ payErr() }}</p> }
            <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="pay()">
              {{ busy() ? 'Cobrando…' : 'Pagar ahora' }}
            </button>
          </div>
        </aside>
      </div>
    }
  `,
})
export class CheckoutPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  private readonly router = inject(Router);
  protected cart = signal<Cart | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  protected payErr = signal('');
  protected busy = signal(false);
  readonly money = eur;
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.shop.getCart().subscribe({
      next: (c) => { this.cart.set(c); this.shop.rememberCount(c); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
  pay() {
    this.payErr.set('');
    this.busy.set(true);
    this.shop.checkout('sim').subscribe({
      next: (o) => { this.busy.set(false); void this.router.navigate(['/confirmacion', o.code]); },
      error: (e) => {
        this.busy.set(false);
        this.payErr.set(humanizeApiError(e).message);
        document.getElementById('pay-action')?.scrollIntoView({ block: 'center' });
      },
    });
  }
}
