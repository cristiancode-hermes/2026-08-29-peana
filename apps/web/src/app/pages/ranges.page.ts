import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Range } from '../shared/models';

@Component({
  selector: 'app-ranges',
  imports: [RouterLink],
  template: `
    <h1>Gamas</h1>
    <p class="lede">Cuatro líneas. Elige la peana, no un hueco de agenda.</p>
    @if (loading()) { <div class="grid">@for (i of [1,2,3,4]; track i) { <div class="skeleton"></div> }</div> }
    @else if (error()) {
      <div class="state-screen"><h2>No pudimos cargar las gamas</h2><button class="btn btn-primary" type="button" (click)="load()">Reintentar</button></div>
    } @else if (!rows().length) {
      <div class="state-screen"><h2>El mostrador está vacío</h2><a class="btn btn-primary" routerLink="/">Volver</a></div>
    } @else {
      <div class="grid">
        @for (r of rows(); track r.id) {
          <a class="card" [routerLink]="['/gamas', r.slug]">
            <img [src]="r.photoUrl" [alt]="r.name" />
            <div class="card-body"><h3>{{ r.name }}</h3><p class="muted">{{ r.blurb }}</p></div>
          </a>
        }
      </div>
    }
  `,
})
export class RangesPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected rows = signal<Range[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set(false);
    this.shop.listRanges().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
