import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Product, Range, eur, KIND_LABEL } from '../shared/models';

@Component({
  selector: 'app-range-detail',
  imports: [RouterLink],
  template: `
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error() || !range()) {
      <div class="state-screen"><h2>Gama no encontrada</h2><a class="btn btn-primary" routerLink="/gamas">Ver gamas</a></div>
    } @else {
      <p><a routerLink="/gamas">← Gamas</a></p>
      <h1>{{ range()!.name }}</h1>
      <p class="lede">{{ range()!.blurb }}</p>
      <div class="grid">
        @for (p of products(); track p.id) {
          <a class="card" [routerLink]="['/producto', p.id]">
            <img [src]="p.photoUrl" [alt]="p.name" />
            <div class="card-body">
              <h3>{{ p.name }}</h3>
              <p class="muted">{{ money(p.priceEur) }}</p>
              @if (p.stock > 0) { <p class="stock-ok">{{ p.stock }} uds</p> } @else { <p class="stock-out">Sin stock</p> }
            </div>
          </a>
        }
      </div>
    }
  `,
})
export class RangeDetailPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  private readonly route = inject(ActivatedRoute);
  protected range = signal<Range | null>(null);
  protected products = signal<Product[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  readonly money = eur;
  readonly kind = KIND_LABEL;
  ngOnInit() {
    this.route.paramMap.subscribe(() => this.load());
  }
  load() {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loading.set(true);
    this.shop.getRange(slug).subscribe({
      next: (r) => { this.range.set(r); this.products.set(r.products || []); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
