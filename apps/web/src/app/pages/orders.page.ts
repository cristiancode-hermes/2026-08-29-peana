import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Order, STATUS_LABEL, eur } from '../shared/models';

@Component({
  selector: 'app-orders',
  imports: [RouterLink],
  template: `
    <h1>Mis pedidos</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar los pedidos</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else if (!rows().length) {
      <div class="state-screen"><h2>Aún no hay pedidos</h2><p class="lede">Pinta primero el carrito.</p><a class="btn btn-primary" routerLink="/">Catálogo</a></div>
    } @else {
      <div class="list">
        @for (o of rows(); track o.id) {
          <a class="card card-body" [routerLink]="['/mis-pedidos', o.id]">
            <strong class="code">{{ o.code }}</strong>
            <p>{{ labels[o.status] || o.status }} · {{ money(o.totalEur) }} · {{ o.lines.length }} líneas</p>
          </a>
        }
      </div>
    }
  `,
})
export class OrdersPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected rows = signal<Order[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  readonly money = eur;
  readonly labels = STATUS_LABEL;
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.shop.myOrders().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
