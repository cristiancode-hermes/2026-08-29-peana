import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Product, eur } from '../shared/models';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink],
  template: `
    <h1>Favoritos</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar favoritos</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else if (!rows().length) {
      <div class="state-screen"><h2>Ninguna peana marcada</h2><a class="btn btn-primary" routerLink="/">Catálogo</a></div>
    } @else {
      <div class="grid">
        @for (p of rows(); track p.id) {
          <a class="card" [routerLink]="['/producto', p.id]">
            <img [src]="p.photoUrl" [alt]="p.name" />
            <div class="card-body"><h3>{{ p.name }}</h3><p>{{ money(p.priceEur) }}</p></div>
          </a>
        }
      </div>
    }
  `,
})
export class FavoritesPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected rows = signal<Product[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  readonly money = eur;
  ngOnInit() { this.load(); }
  load() {
    this.shop.favorites().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
