import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShopService } from '../core/shop.service';
import { Order, STATUS_LABEL, eur, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-staff-scan',
  imports: [FormsModule, RouterLink],
  template: `
    <p><a routerLink="/staff">← Cola</a></p>
    <h1>Escanear</h1>
    <p class="lede">Pega el código PEA-… o la URL completa del pedido.</p>
    <form (ngSubmit)="scan()">
      <input [ngModel]="code()" (ngModelChange)="code.set($event)" name="code" autocomplete="off" placeholder="PEA-… o URL" />
      <div id="pay-action">
        @if (err()) { <p class="hold-error">{{ err() }}</p> }
        <button class="btn btn-primary" type="submit">Escanear</button>
      </div>
    </form>
    @if (order(); as o) {
      <div class="card card-body">
        <p class="code">{{ o.code }}</p>
        <p>{{ labels[o.status] }} · {{ money(o.totalEur) }}</p>
      </div>
    }
  `,
})
export class StaffScanPageComponent {
  private readonly shop = inject(ShopService);
  protected code = signal('');
  protected err = signal('');
  protected order = signal<Order | null>(null);
  readonly money = eur;
  readonly labels = STATUS_LABEL;
  scan() {
    this.err.set('');
    this.shop.scan(this.code()).subscribe({
      next: (o) => this.order.set(o),
      error: (e) => {
        this.err.set(humanizeApiError(e).message);
        document.getElementById('pay-action')?.scrollIntoView({ block: 'center' });
      },
    });
  }
}
