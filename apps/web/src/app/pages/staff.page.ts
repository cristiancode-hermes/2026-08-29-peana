import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Order, STATUS_LABEL, eur } from '../shared/models';

@Component({
  selector: 'app-staff',
  imports: [RouterLink],
  template: `
    <h1>Cola del mostrador</h1>
    <p><a class="btn btn-secondary" routerLink="/staff/scan">Escanear QR</a></p>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar la cola</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else if (!rows().length) {
      <div class="state-screen"><h2>No hay pedidos en cola hoy</h2><p class="lede">Cuando alguien pague, aparece aquí.</p></div>
    } @else {
      <div class="list">
        @for (o of rows(); track o.id) {
          <div class="card card-body">
            <strong class="code">{{ o.code }}</strong>
            <p>{{ labels[o.status] }} · {{ money(o.totalEur) }}</p>
          </div>
        }
      </div>
    }
  `,
})
export class StaffPageComponent implements OnInit {
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
