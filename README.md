# Amortentia — MVP Print on Demand

Plataforma e-commerce POD con **Medusa v2**, **Next.js**, **Gelato**, **PayPal**, **Supabase Postgres** y emails **Resend**.

## Arquitectura

- `apps/backend` — Medusa API, admin, webhooks Gelato, importador catálogo
- `apps/storefront` — Next.js (español, EUR, España)
- `packages/gelato-client` — Cliente Gelato + modo mock
- `supabase/migrations` — Tablas auxiliares (`gelato_orders`, `webhook_logs`, …)

## Requisitos

- Node.js 20+
- PostgreSQL (Supabase o `docker compose up -d`)

## Configuración rápida

```bash
cp .env.example .env
# Edita DATABASE_URL y secretos

docker compose up -d   # opcional: Postgres local

npm install
npm run build:gelato-client

cd apps/backend
cp ../../.env.example .env
npx medusa db:migrate
npm run seed:mvp
npm run dev
```

En otra terminal:

```bash
cd apps/storefront
cp ../../.env.example .env.local
# NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY desde el log del seed
npm run dev
```

- Storefront: http://localhost:8000/es  
- Admin Medusa: http://localhost:9000/app  
- Webhook Gelato: `POST http://localhost:9000/webhooks/gelato`

## Modo desarrollo sin credenciales

| Variable | Valor |
|----------|--------|
| `GELATO_MOCK` | `true` |
| PayPal vacío | Usa `pp_system_default` (pago manual) en checkout |
| `RESEND_API_KEY` vacío | Emails se loguean en consola |

Simular webhooks Gelato:

```bash
cd apps/backend
npm run simulate:gelato-webhook -- <medusa_order_id>
```

## Rutas storefront (español)

| Ruta | Destino |
|------|---------|
| `/tienda` | `/es/store` |
| `/carrito` | `/es/cart` |
| `/producto/...` | `/es/products/...` |
| `/es/order/:id/estado` | Estado + tracking |

## Admin Gelato

- Menú **Gelato** — importar catálogo, dry-run, logs
- Widget en pedido — reintentar envío a Gelato

## Deploy

| Componente | Plataforma |
|------------|------------|
| Storefront | Vercel |
| Backend | Railway / Render |
| Postgres | Supabase |

Configura en Gelato Dashboard el webhook → `https://tu-backend/webhooks/gelato` con el secreto `GELATO_WEBHOOK_SECRET`.

## Checklist MVP (PRD §21)

- [ ] Compra: producto → carrito → checkout → pedido pagado
- [ ] Fulfillment: pedido pagado → Gelato → `gelato_order_id`
- [ ] Import: sync idempotente, productos en `draft`
- [ ] Webhooks: idempotentes, estados y tracking
- [ ] Seguridad: sin secrets en frontend, admin protegido
- [ ] Usuario: confirmación, estado, email/log tracking

## Scripts

```bash
npm run backend:dev
npm run storefront:dev
npm run backend:seed
```
