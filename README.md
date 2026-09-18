# Stamp Perk

Worldwide digital loyalty & rewards platform — **React Native (Expo)**, Next.js, NestJS.

## Stack

- **Mobile:** Expo React Native SDK 57 (`expo@57.0.9`, Android + iOS / Expo Go)
- **Web:** Next.js (marketing, merchant dashboard, admin)
- **API:** NestJS + Prisma
- **Local DB:** SQLite (`apps/api/prisma/dev.db`) so you can run without Docker
- **Staging/Prod DB:** PostgreSQL via `docker-compose` (switch Prisma provider when ready)
- **Billing:** Stripe (web) + Apple/Google IAP hooks (mobile)

## Quick start

```bash
npm install
npm run build -w @stampperk/shared
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
| Admin    | admin@stampperk.app    | StampPerk123! |
| Merchant | merchant@stampperk.app | StampPerk123! |
| Customer | customer@stampperk.app | StampPerk123! |
| Staff    | staff@stampperk.app    | StampPerk123! |

## Google Sign-In

1. Google Cloud Console → OAuth consent screen + **Web** OAuth client.
2. Authorized JavaScript origins: `http://localhost:3000`
3. For Expo Go / mobile, add the Expo auth redirect URI Google shows when using the Web client (or create iOS/Android clients for store builds).
4. Put the Web client ID in:
   - `apps/api/.env` → `GOOGLE_CLIENT_ID` (and optionally `GOOGLE_CLIENT_IDS` for web+iOS+Android)
   - `apps/web/.env.local` → `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `apps/mobile/.env` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
5. Keep `OAUTH_DEMO_MODE=false`. When `GOOGLE_CLIENT_ID` is set, Google tokens are always verified (demo Google tokens are rejected).
6. Restart API, web, and mobile after changing env, then use **Continue with Google**.

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
