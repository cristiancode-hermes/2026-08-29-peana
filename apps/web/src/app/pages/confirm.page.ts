import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ShopService } from '../core/shop.service';
import { Order, STATUS_LABEL, eur } from '../shared/models';

@Component({
  selector: 'app-confirm',
  imports: [RouterLink],
  template: `
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error() || !order()) {
      <div class="state-screen"><h2>No encontramos ese pedido</h2><a class="btn btn-primary" routerLink="/mis-pedidos">Mis pedidos</a></div>
    } @else {
      <h1>Pedido cobrado</h1>
      <p class="lede">Enseña este QR en el mostrador. No hay reloj de 15 minutos: ya está pagado.</p>
      <p class="code">{{ order()!.code }}</p>
      <p>{{ labels[order()!.status] || order()!.status }} · {{ money(order()!.totalEur) }}</p>
      <div class="qr" [innerHTML]="qr()"></div>
      <p><a [href]="order()!.qrUrl">{{ order()!.qrUrl }}</a></p>
      <a class="btn btn-secondary" [routerLink]="['/mis-pedidos', order()!.id]">Ver detalle</a>
    }
  `,
})
export class ConfirmPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  protected order = signal<Order | null>(null);
  protected qr = signal<SafeHtml>('');
  protected loading = signal(true);
  protected error = signal(false);
  readonly money = eur;
  readonly labels = STATUS_LABEL;
  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code') || '';
    this.shop.ticket(code).subscribe({
      next: (o) => {
        this.order.set(o);
        this.qr.set(this.sanitizer.bypassSecurityTrustHtml(o.qrSvg));
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
