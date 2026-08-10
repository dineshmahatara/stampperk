# Stampz

Worldwide digital loyalty & rewards platform — **React Native (Expo)**, Next.js, NestJS.

## Stack

- **Mobile:** Expo React Native SDK 54 (Android + iOS / Expo Go)
- **Web:** Next.js (marketing, merchant dashboard, admin)
- **API:** NestJS + Prisma
- **Local DB:** SQLite (`apps/api/prisma/dev.db`) so you can run without Docker
- **Staging/Prod DB:** PostgreSQL via `docker-compose` (switch Prisma provider when ready)
- **Billing:** Stripe (web) + Apple/Google IAP hooks (mobile)

## Quick start

```bash
npm install
npm run build -w @stampz/shared
npm run db:generate
npm run db:migrate
npm run db:seed

# separate terminals
npm run dev:api
npm run dev:web
npm run dev:mobile
```

- API: http://localhost:4000/api · Swagger http://localhost:4000/docs
- Web: http://localhost:3000
- Mobile: Expo Dev Tools (`npm run dev:mobile`)

## Demo accounts (after seed)

| Role     | Email               | Password   |
|----------|---------------------|------------|
| Admin    | admin@stampz.app    | Stampz123! |
| Merchant | merchant@stampz.app | Stampz123! |
| Customer | customer@stampz.app | Stampz123! |
| Staff    | staff@stampz.app    | Stampz123! |

Public demo business: http://localhost:3000/b/brew-bliss

## Phase 5

See [docs/phase-5.md](docs/phase-5.md) for camera QR, push, OAuth, and EAS store builds.

## i18n

Web translations use **i18next** + **react-i18next**. See [docs/i18n.md](docs/i18n.md).
Locales: `en`, `ne`, `hi`, `es`, `fr`, `de`, `zh` in `apps/web/src/locales/`.

## Workspace

```text
apps/api       NestJS API
apps/web       Next.js
apps/mobile    Expo React Native
packages/shared Shared Zod schemas & plan limits
docs/          Product & API docs
references/    Design references
```
