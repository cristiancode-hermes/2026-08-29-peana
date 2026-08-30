import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShopService } from '../core/shop.service';
import { KIND_LABEL, Product, eur } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  template: `
    <section class="hero">
      <div>
        <h1>La peana se pinta en mesa, no en un hueco de hoy</h1>
        <p class="lede">Gamas de miniaturas, botes y kits con lista de materiales. Pagas y recoges con QR en el mostrador.</p>
        <a class="btn btn-primary" routerLink="/gamas">Ver gamas</a>
      </div>
      <figure class="hero-visual">
        <img src="/assets/gamas/mesnada.svg" alt="Peanas de la mesnada ibérica" />
        <figcaption class="hero-caption">Mesnada ibérica</figcaption>
      </figure>
    </section>
    <input class="search" placeholder="Buscar SKU" [ngModel]="q()" (ngModelChange)="q.set($event); load()" />
    <div class="chips">
      @for (c of cats; track c.id) {
        <button class="chip" type="button" [class.active]="cat() === c.id" (click)="cat.set(c.id); load()">{{ c.label }}</button>
      }
    </div>
    @if (loading()) {
      <div class="grid">@for (i of [1,2,3,4,5,6,7,8]; track i) { <div class="skeleton"></div> }</div>
    } @else if (error()) {
      <div class="state-screen">
        <h2>No pudimos cargar el catálogo</h2>
        <p class="lede">Revisa la conexión y vuelve a intentarlo.</p>
        <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
      </div>
    } @else if (!items().length) {
      <div class="state-screen">
        <h2>{{ q() || cat() ? 'Ningún SKU con ese filtro' : 'El mostrador está vacío' }}</h2>
        <p class="lede">Prueba otra gama o limpia el filtro.</p>
        <button class="btn btn-secondary" type="button" (click)="q.set(''); cat.set(''); load()">Limpiar</button>
      </div>
    } @else {
      <div class="grid">
        @for (p of items(); track p.id) {
          <a class="card" [routerLink]="['/producto', p.id]">
            <img [src]="p.photoUrl" [alt]="p.name" />
            <div class="card-body">
              <h3>{{ p.name }}</h3>
              <p class="muted">{{ kind(p.kind) }} · {{ money(p.priceEur) }}</p>
              @if (p.stock > 0) { <p class="stock-ok">{{ p.stock }} uds</p> } @else { <p class="stock-out">Sin stock</p> }
            </div>
          </a>
        }
      </div>
    }
  `,
})
export class HomePageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected items = signal<Product[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  protected q = signal('');
  protected cat = signal('');
  readonly cats = [
    { id: '', label: 'Todas' },
    { id: 'mini', label: 'Miniaturas' },
    { id: 'paint', label: 'Pinturas' },
    { id: 'dice', label: 'Dados' },
    { id: 'kit', label: 'Kits' },
  ];
  readonly kind = (k: string) => KIND_LABEL[k] || k;
  readonly money = eur;
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true); this.error.set(false);
    this.shop.listProducts({ q: this.q() || undefined, category: this.cat() || undefined }).subscribe({
      next: (rows) => { this.items.set(rows); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
