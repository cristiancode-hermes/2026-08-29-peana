import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ShopService } from '../core/shop.service';
import { Order, STATUS_LABEL, eur, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink],
  template: `
    <p><a routerLink="/mis-pedidos">← Pedidos</a></p>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error() || !order()) {
      <div class="state-screen"><h2>Pedido no encontrado</h2><a class="btn btn-primary" routerLink="/mis-pedidos">Volver</a></div>
    } @else {
      <h1 class="code">{{ order()!.code }}</h1>
      <p>{{ labels[order()!.status] || order()!.status }}</p>
      <ul>
        @for (l of order()!.lines; track l.id) {
          <li>{{ l.nameSnapshot }} × {{ l.qty }} — {{ money(l.lineTotalEur) }}</li>
        }
      </ul>
      <p><strong>Total {{ money(order()!.totalEur) }}</strong></p>
      <div class="qr" [innerHTML]="qr()"></div>
      @if (canCancel()) {
        @if (err()) { <p class="hold-error">{{ err() }}</p> }
        <button class="btn btn-danger" type="button" (click)="cancel()">Cancelar pedido</button>
      }
    }
  `,
})
export class OrderDetailPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  protected order = signal<Order | null>(null);
  protected qr = signal<SafeHtml>('');
  protected loading = signal(true);
  protected error = signal(false);
  protected err = signal('');
  readonly money = eur;
  readonly labels = STATUS_LABEL;
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.shop.myOrder(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.qr.set(this.sanitizer.bypassSecurityTrustHtml(o.qrSvg));
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
  canCancel() {
    const o = this.order();
    return o && (o.status === 'paid' || o.status === 'preparing');
  }
  cancel() {
    const o = this.order(); if (!o) return;
    this.err.set('');
    this.shop.cancel(o.id).subscribe({
      next: (n) => { this.order.set(n); this.qr.set(this.sanitizer.bypassSecurityTrustHtml(n.qrSvg)); },
      error: (e) => this.err.set(humanizeApiError(e).message),
    });
  }
}
