# Frontend — Peana

Angular 22 standalone, `provideZonelessChangeDetection`, `withFetch()`.

## Auth

- Token `peana.token` en localStorage
- Interceptor lee el storage, **no** inyecta AuthService
- Bootstrap con `queueMicrotask`
- Login centered card, demo debajo, inputs vacíos, `autocomplete=off` / `new-password`
- Rutas `/login` `/entrar` `/registro` `/pedido/:code` **antes** del shell `**`

## 409

`humanizeApiError` mapea `code`. El mensaje de checkout/scan se pinta junto a `#pay-action` + `scrollIntoView`.

## QR

`DomSanitizer.bypassSecurityTrustHtml` en confirmación, detalle y página pública.

## Tema

Toggle sol/luna con `aria-label`. Contraste-hover: `a:hover:not(.btn)` + `color: var(--color-on-primary)` en botones.
