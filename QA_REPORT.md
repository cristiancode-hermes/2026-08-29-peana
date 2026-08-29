# QA Report — 2026-08-29 peana

**Project:** Peana — tienda B2C de miniaturas (carrito, cobro atómico, QR de recogida)
**Stack:** Angular 22 + NestJS 11 + TypeORM + SQLite (Neon-ready)
**Author:** Hermes Daily Builder
**Port:** 3078
**Subdomain:** https://peana.proyectos.cristiancode.dev

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc` / dist/main.js | ✅ | NestJS boot + seed `vecina@peana.test` |
| Web `ng build` production | ✅ | `apps/web/dist/web/browser/index.html`, `baseHref: /` |
| Design lock | ✅ | `DESIGN_FREE` (proyecto nuevo) |

## ✅ 2. Test Results

19/19 Jest (`apps/api/src/peana.spec.ts`) — ALL PASSED

Cubre: login username/email, clamp carrito, checkout atómico + QR URL en SVG, lista↔detalle, puntos derivados, 409 `NO_STOCK`, 409 `KIT_INCOMPLETE`, GET público, staff scan URL, 409 `ALREADY_PICKED_UP`, cancel <24h, 409 `TOO_LATE`, 409 `ALREADY_REVIEWED`, stats 14 días, favoritos, stock admin.

New tests: existing coverage adequate (19 ≥ 18).

## ✅ 3. Binary / Runtime Verification

| Mode | Output | Status |
|------|--------|--------|
| Endpoint smoke | 23/23 | ✅ |
| Browser (Puppeteer 1280 + 390) | 20/20 | ✅ |
| Auth login/register/me | 201 + 200 + 401 sin token | ✅ |
| QR real `/pedido/:code` | SVG contiene URL absoluta | ✅ |
| Totales lista ↔ detalle | 21 == 21 | ✅ |

Auth DTO: `{ username, email, password }` / login `identifier`. Token `accessToken`. Frontend `TOKEN_KEY = peana.token`. Interceptor Bearer concatenado (sin `***`).

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Auth `/login` `/registro` `/entrar` antes de `**` | PASS | |
| Creds demo debajo, inputs vacíos | PASS | `vecina` / `vecina@peana.test` / `peana-demo-2026` |
| Contraste-hover AA light+dark | PASS | on-primary/primary 11.16; hover CSS fija on-primary; `a:hover:not(.btn)` |
| contraste-hover | PASS | regla 2026-08-19 |
| 409 humano junto al CTA `#pay-action` | PASS | `humanizeApiError` + scroll |
| QR real | PASS | `qrcode` SVG + `/pedido/:code` público 200 |
| Gráfico admin 14 días | PASS | ejes + fechas + `<title>` tooltips + grid Y (fix QA) |
| Capa de valor | PASS | cobro atómico + BOM kits + anti doble-venta |
| Fotos vertical miniaturas | PASS | peanas/botes SVG, no gym/hielo |
| Rutas `/producto/:id` `/gamas/:slug` `/pedido/:code` `/mis-pedidos/:id` | PASS | no blanco, no NG0 |
| Mobile 390 sin overflow | PASS | `scrollWidth == 390` |
| Login username OR email | PASS | |
| Decision Record QR | sí \| url: `/pedido/:code` | |

### Minor Issues

| Issue | Severity | Suggestion |
|-------|----------|------------|
| Caption del hero en 390px recorta «Mesnada ibérica» → «da ibérica» | menor | Ajustar overlay/padding de la ilustración de gama |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| JWT en header Bearer | PASS |
| `/api/auth/me` sin token | 401 |
| Admin stats como customer | 403 |
| `.env` gitignored | PASS |
| Seed `passwordHash` mapea a columna entity | PASS |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | ✅ | `peana.proyectos.cristiancode.dev` → dist + `/api*` :3078, cert LE |
| manage-apis.sh | ✅ | 3078 / peana / 2026-08-29-peana alineado 63 |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-08-29-peana |
| Landing | ✅ | `name:'peana'` en proyectos.cristiancode.dev |
| Portfolio es/en/pt | ✅ | slug `peana`, accordion 239 |
| Excel | ✅ | fila 95 / #94 Completado |
| Capture config | ✅ | `peana.token` + loginField identifier |

## Summary

**OVERALL: PASS ✅**

Jest 19/19 · smoke 23/23 · browser 20/20 · enlaces href/link2/link3 200 · QR real · contraste-hover PASS.
