# Peana

Tienda B2C de miniaturas (Angular 22 + NestJS). Catálogo, carrito, cobro atómico y QR de recogida. **No** hay hold de 15 minutos.

## Demo

- Cliente: `vecina` / `vecina@peana.test` / `peana-demo-2026`
- Staff: `staff@peana.test` / `peana-demo-2026`
- Admin: `admin@peana.test` / `peana-demo-2026`

## Stack

- Frontend: Angular 22, signals, zoneless, CSS propio
- API: NestJS 11, TypeORM, SQLite (Neon-ready), JWT
- Puerto API: 3078

## Decision Record

- Núcleo B2C: **pedido-pago**
- Loop hueco+hold+QR: **no** (Bancal/Gambito/Huella)
- QR real: sí | url `/pedido/:code`
- Login: centered card, creds debajo, inputs vacíos
