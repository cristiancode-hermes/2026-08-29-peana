import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { ShopService } from '../core/shop.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <div class="wrap header-inner">
        <a class="brand" routerLink="/">Peana</a>
        <button class="nav-toggle" type="button" (click)="open.update(v => !v)" aria-label="Abrir menú">
          <span></span><span></span><span></span>
        </button>
        <nav class="nav" [class.open]="open()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="open.set(false)">Inicio</a>
          <a routerLink="/gamas" routerLinkActive="active" (click)="open.set(false)">Gamas</a>
          <a routerLink="/carrito" routerLinkActive="active" (click)="open.set(false)">Carrito @if (shop.cartCount()) { <span class="badge">{{ shop.cartCount() }}</span> }</a>
          @if (auth.getToken()) {
            <a routerLink="/mis-pedidos" routerLinkActive="active" (click)="open.set(false)">Pedidos</a>
            <a routerLink="/favoritos" routerLinkActive="active" (click)="open.set(false)">Favoritos</a>
          }
          @if (auth.isStaff()) {
            <a routerLink="/staff" routerLinkActive="active" (click)="open.set(false)">Staff</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active" (click)="open.set(false)">Admin</a>
          }
        </nav>
        <div class="header-actions">
          @if (auth.user(); as u) {
            <span class="who">{{ u.username }} · {{ u.points }} pts</span>
            <button class="btn btn-ghost" type="button" (click)="auth.logout()">Salir</button>
          } @else {
            <a class="btn btn-secondary" routerLink="/login">Entrar</a>
          }
          <button class="theme-toggle" type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'">
            {{ theme.isDark() ? '☀' : '☾' }}
          </button>
        </div>
      </div>
    </header>
    <main class="site-main"><div class="wrap"><router-outlet /></div></main>
    <footer class="site-footer"><div class="wrap">La peana se paga, no se retiene. · Madrid</div></footer>
  `,
})
export class ShellComponent {
  public auth = inject(AuthService);
  public theme = inject(ThemeService);
  public shop = inject(ShopService);
  protected open = signal(false);
}
