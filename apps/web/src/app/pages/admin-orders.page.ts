import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Order, STATUS_LABEL, eur } from '../shared/models';

@Component({
  selector: 'app-admin-orders',
  imports: [RouterLink],
  template: `
    <p><a routerLink="/admin">← Admin</a></p>
    <h1>Pedidos</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar pedidos</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else {
      <div class="list">
        @for (o of rows(); track o.id) {
          <div class="card card-body"><strong class="code">{{ o.code }}</strong> · {{ labels[o.status] }} · {{ money(o.totalEur) }}</div>
        }
      </div>
    }
  `,
})
export class AdminOrdersPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected rows = signal<Order[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  readonly money = eur;
  readonly labels = STATUS_LABEL;
  ngOnInit() { this.load(); }
  load() {
    this.shop.queue().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
