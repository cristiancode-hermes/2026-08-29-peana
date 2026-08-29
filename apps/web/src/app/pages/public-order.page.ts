import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ShopService } from '../core/shop.service';
import { Order, STATUS_LABEL, eur } from '../shared/models';

@Component({
  selector: 'app-public-order',
  imports: [RouterLink],
  template: `
    <div class="wrap" style="padding:32px 0">
      @if (loading()) { <div class="skeleton"></div> }
      @else if (error() || !order()) {
        <div class="state-screen"><h1>Pedido no encontrado</h1><p class="lede">Ese código no está en el mostrador.</p><a class="btn btn-primary" routerLink="/">Inicio</a></div>
      } @else {
        <h1>{{ order()!.code }}</h1>
        <p>{{ labels[order()!.status] || order()!.status }} · {{ money(order()!.totalEur) }}</p>
        <ul>
          @for (l of order()!.lines; track l.id) {
            <li>{{ l.nameSnapshot }} × {{ l.qty }} — {{ money(l.lineTotalEur) }}</li>
          }
        </ul>
        <div class="qr" [innerHTML]="qr()"></div>
      }
    </div>
  `,
})
export class PublicOrderPageComponent implements OnInit {
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
