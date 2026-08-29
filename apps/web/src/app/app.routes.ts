import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent) },
  { path: 'entrar', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPageComponent) },
  { path: 'registro', loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPageComponent) },
  { path: 'pedido/:code', loadComponent: () => import('./pages/public-order.page').then((m) => m.PublicOrderPageComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent) },
      { path: 'gamas', loadComponent: () => import('./pages/ranges.page').then((m) => m.RangesPageComponent) },
      { path: 'gamas/:slug', loadComponent: () => import('./pages/range-detail.page').then((m) => m.RangeDetailPageComponent) },
      { path: 'producto/:id', loadComponent: () => import('./pages/product.page').then((m) => m.ProductPageComponent) },
      { path: 'carrito', canActivate: [authGuard], loadComponent: () => import('./pages/cart.page').then((m) => m.CartPageComponent) },
      { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPageComponent) },
      { path: 'confirmacion/:code', canActivate: [authGuard], loadComponent: () => import('./pages/confirm.page').then((m) => m.ConfirmPageComponent) },
      { path: 'mis-pedidos', canActivate: [authGuard], loadComponent: () => import('./pages/orders.page').then((m) => m.OrdersPageComponent) },
      { path: 'mis-pedidos/:id', canActivate: [authGuard], loadComponent: () => import('./pages/order-detail.page').then((m) => m.OrderDetailPageComponent) },
      { path: 'favoritos', canActivate: [authGuard], loadComponent: () => import('./pages/favorites.page').then((m) => m.FavoritesPageComponent) },
      { path: 'staff', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPageComponent) },
      { path: 'staff/scan', canActivate: [authGuard, roleGuard(['staff', 'admin'])], loadComponent: () => import('./pages/staff-scan.page').then((m) => m.StaffScanPageComponent) },
      { path: 'admin', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPageComponent) },
      { path: 'admin/pedidos', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/admin-orders.page').then((m) => m.AdminOrdersPageComponent) },
      { path: 'admin/productos', canActivate: [authGuard, roleGuard(['admin'])], loadComponent: () => import('./pages/admin-products.page').then((m) => m.AdminProductsPageComponent) },
      { path: '**', loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPageComponent) },
    ],
  },
];
