# API — Peana

Prefijo `/api`. Puerto 3078.

## Auth

| Method | Path | Body |
|--------|------|------|
| POST | /api/auth/register | username, email, password |
| POST | /api/auth/login | identifier / usernameOrEmail / login + password |
| GET | /api/auth/me | Bearer → `{ user, points }` |

## Catálogo

GET `/api/ranges`, `/api/ranges/:slug`, `/api/products`, `/api/products/:id`

POST `/api/products/:id/reviews` → 409 ALREADY_REVIEWED

## Carrito / pedidos

GET/POST/PATCH/DELETE `/api/cart…`

POST `/api/orders/checkout` → Order + qrSvg + qrUrl; 409 NO_STOCK / KIT_INCOMPLETE

GET `/api/orders`, `/api/orders/:id`, `/api/orders/ticket/:code` (público)

POST `/api/orders/:id/cancel` → 409 TOO_LATE

## Staff / admin

POST `/api/staff/scan` `{ codeOrUrl }` → 409 ALREADY_PICKED_UP / NOT_FOUND

GET `/api/staff/queue`, `/api/admin/stats`

PATCH `/api/admin/products/:id/stock`
