import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShopService } from '../core/shop.service';
import { AuthService } from '../core/auth.service';
import { KIND_LABEL, Product, eur, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-product',
  imports: [RouterLink, FormsModule],
  template: `
    @if (loading()) { <div class="skeleton"></div> }
    @else if (error() || !p()) {
      <div class="state-screen"><h2>Producto no encontrado</h2><a class="btn btn-primary" routerLink="/">Catálogo</a></div>
    } @else {
      <p><a routerLink="/">← Catálogo</a></p>
      <div class="hero">
        <img [src]="p()!.photoUrl" [alt]="p()!.name" style="border:1px solid var(--color-border);border-radius:4px;height:320px;object-fit:cover;width:100%" />
        <div>
          <p class="muted">{{ kinds[p()!.kind] || p()!.kind }}</p>
          <h1>{{ p()!.name }}</h1>
          <p class="lede">{{ p()!.description }}</p>
          <p><strong>{{ money(p()!.priceEur) }}</strong></p>
          @if (p()!.stock > 0) { <p class="stock-ok">{{ p()!.stock }} uds</p> } @else { <p class="stock-out">Sin stock</p> }
          @if (p()!.bom?.length) {
            <h3>Lista de materiales</h3>
            <ul>
              @for (b of p()!.bom!; track $index) {
                <li>{{ b.qty }} × {{ b.component?.name }} @if (b.component && b.component.stock < b.qty) { <span class="stock-out">falta</span> }</li>
              }
            </ul>
          }
          <button class="btn btn-primary" type="button" [disabled]="p()!.stock <= 0" (click)="add()">
            {{ p()!.stock <= 0 ? 'Sin stock' : 'Añadir al carrito' }}
          </button>
          @if (auth.getToken()) {
            <button class="btn btn-ghost" type="button" (click)="fav()">Favorito</button>
          }
          @if (msg()) { <p class="muted">{{ msg() }}</p> }
        </div>
      </div>
      <h2>Reseñas</h2>
      @if (p()!.avgRating) { <p>Media {{ p()!.avgRating }}</p> }
      @for (r of p()!.reviews || []; track r.id) { <p>{{ r.rating }}/5 — {{ r.body }}</p> }
      @if (auth.getToken()) {
        <form (ngSubmit)="review()">
          <label>Nota 1–5</label>
          <input class="qty" type="number" min="1" max="5" [ngModel]="rating()" (ngModelChange)="rating.set(+$event)" name="rating" />
          <input [ngModel]="body()" (ngModelChange)="body.set($event)" name="body" placeholder="Cómo pinta esta peana" />
          @if (revErr()) { <p class="hold-error">{{ revErr() }}</p> }
          <button class="btn btn-secondary" type="submit">Publicar reseña</button>
        </form>
      }
    }
  `,
})
export class ProductPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public auth = inject(AuthService);
  protected p = signal<Product | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  protected msg = signal('');
  protected rating = signal(5);
  protected body = signal('');
  protected revErr = signal('');
  readonly money = eur;
  readonly kinds = KIND_LABEL;
  ngOnInit() { this.route.paramMap.subscribe(() => this.load()); }
  load() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.loading.set(true);
    this.shop.getProduct(id).subscribe({
      next: (p) => { this.p.set(p); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
  add() {
    if (!this.auth.getToken()) { void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } }); return; }
    const prod = this.p(); if (!prod) return;
    this.shop.addToCart(prod.id, 1).subscribe({
      next: (c) => { this.shop.rememberCount(c); this.msg.set('En el carrito'); },
      error: () => this.msg.set('No se pudo añadir'),
    });
  }
  fav() {
    const prod = this.p(); if (!prod) return;
    this.shop.addFav(prod.id).subscribe({ next: () => this.msg.set('Guardado en favoritos') });
  }
  review() {
    const prod = this.p(); if (!prod) return;
    this.revErr.set('');
    this.shop.addReview(prod.id, this.rating(), this.body()).subscribe({
      next: () => this.load(),
      error: (e) => this.revErr.set(humanizeApiError(e).message),
    });
  }
}
