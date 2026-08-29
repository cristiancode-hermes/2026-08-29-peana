import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Product } from '../shared/models';

@Component({
  selector: 'app-admin-products',
  imports: [FormsModule, RouterLink],
  template: `
    <p><a routerLink="/admin">← Admin</a></p>
    <h1>Stock</h1>
    @if (loading()) { <div class="skeleton"></div> }
    @else {
      <div class="list">
        @for (p of rows(); track p.id) {
          <div class="card card-body">
            <strong>{{ p.name }}</strong>
            <input class="qty" type="number" min="0" [ngModel]="p.stock" (change)="save(p, $event)" />
          </div>
        }
      </div>
    }
  `,
})
export class AdminProductsPageComponent implements OnInit {
  private readonly shop = inject(ShopService);
  protected rows = signal<Product[]>([]);
  protected loading = signal(true);
  ngOnInit() {
    this.shop.listProducts().subscribe({ next: (r) => { this.rows.set(r); this.loading.set(false); } });
  }
  save(p: Product, ev: Event) {
    const n = Number((ev.target as HTMLInputElement).value);
    this.shop.setStock(p.id, n).subscribe();
  }
}
