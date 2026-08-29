import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';

@Component({
  selector: 'app-admin',
  imports: [RouterLink],
  template: `
    <h1>Tendero</h1>
    <p><a routerLink="/admin/pedidos">Pedidos</a> · <a routerLink="/admin/productos">Productos</a></p>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar las ventas</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else {
      <h2>Ventas 14 días</h2>
      <svg class="chart" viewBox="0 0 560 200" role="img" aria-label="Ventas de 14 días">
        <line x1="40" y1="170" x2="540" y2="170" stroke="currentColor" />
        <line x1="40" y1="20" x2="40" y2="170" stroke="currentColor" />
        @for (p of pts(); track p.day) {
          <rect [attr.x]="p.x" [attr.y]="p.y" width="28" [attr.height]="p.h" fill="var(--color-primary)">
            <title>{{ p.day }}: {{ p.eur }} EUR</title>
          </rect>
          <text [attr.x]="p.x + 14" y="188" text-anchor="middle" font-size="9">{{ p.label }}</text>
        }
        @for (g of yTicks(); track g.label) {
          <line x1="40" [attr.y1]="g.y" x2="540" [attr.y2]="g.y" stroke="currentColor" opacity="0.15" />
          <text x="36" [attr.y]="g.y + 3" text-anchor="end" font-size="9">{{ g.label }}</text>
        }
        <text x="8" y="14" font-size="10">EUR</text>
      </svg>
    }
  `,
})
export class AdminPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected pts = signal<{ day: string; eur: number; x: number; y: number; h: number; label: string }[]>([]);
  protected yTicks = signal<{ y: number; label: string }[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  ngOnInit() { this.load(); }
  load() {
    this.shop.stats().subscribe({
      next: (s) => {
        const max = Math.max(...s.series.map((d) => d.eur), 1);
        this.yTicks.set([0.25, 0.5, 0.75, 1].map((f) => ({ y: 170 - f * 140, label: String(Math.round(max * f)) })));
        this.pts.set(s.series.map((d, i) => {
          const h = Math.max(2, (d.eur / max) * 140);
          return { day: d.day, eur: d.eur, x: 48 + i * 35, h, y: 170 - h, label: d.day.slice(5) };
        }));
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
