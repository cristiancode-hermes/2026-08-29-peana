# Architecture — Peana

Monorepo `apps/api` (NestJS) + `apps/web` (Angular 22 zoneless).

## Módulos API

- `auth` — JWT async (ConfigService), login identifier/username/email
- `catalog` — gamas, productos, reseñas, favoritos
- `cart` — líneas clamp 1..stock
- `orders` — checkout atómico + mutex + QR `qrcode`
- `staff` — scan, cola, stats 14d, stock
- `seed` — vecina + 4 gamas + kits BOM + 3 pedidos, puntos derivados

## Transacción de cobro

`withLock` serializa checkouts en SQLite. Dentro: lock condicional (`FOR UPDATE` solo si no es better-sqlite3), BOM de kits, decremento, `Order`+`OrderLine`, puntos `floor(totalEur)`, vacía carrito, email simulado.

## QR

`QRCode.toString(WEB_ORIGIN + '/pedido/' + code, { type: 'svg' })`. Público `GET /api/orders/ticket/:code`.
