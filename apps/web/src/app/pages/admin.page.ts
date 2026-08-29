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
          <rect [attr.x]="p.x" y="20" width="28" [attr.y]="p.y" [attr.height]="p.h" fill="var(--color-primary)">
            <title>{{ p.day }}: {{ p.eur }} EUR</title>
          </rect>
          <text [attr.x]="p.x + 14" y="188" text-anchor="middle" font-size="9">{{ p.label }}</text>
        }
        <text x="8" y="30" font-size="10">EUR</text>
      </svg>
    }
  `,
})
export class AdminPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected pts = signal<{ day: string; eur: number; x: number; y: number; h: number; label: string }[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  ngOnInit() { this.load(); }
  load() {
    this.shop.stats().subscribe({
      next: (s) => {
        const max = Math.max(...s.series.map((d) => d.eur), 1);
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
