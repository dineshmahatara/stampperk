# Phase 5 — Production readiness

Built on top of Phases 0–4.

## Delivered

1. **Camera QR scanning** — Expo `CameraView` barcode scan on merchant Scan tab (with paste + offline fallback)
2. **Push notifications** — device token registration + Expo Push dispatch from API on stamp/reward/offer events
3. **OAuth hooks** — `POST /api/auth/oauth` for Google/Apple (demo mode locally; token verify when `OAUTH_DEMO_MODE=false`)
4. **EAS store config** — `apps/mobile/eas.json` for development / preview / production builds + submit stubs
5. **UI polish** — coral hero cards, stamp dots on wallet, campaign hero, login social buttons
6. **Postgres path** — see `docs/postgres.md`

## Run mobile on a device

```bash
npm run dev:api
npm run dev:mobile
# scan QR with Expo Go; set EXPO_PUBLIC_API_URL to your LAN IP
```

## Store builds

```bash
cd apps/mobile
npx eas-cli login
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```

## OAuth production

Set in `apps/api/.env`:

```
OAUTH_DEMO_MODE=false
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Wire `expo-auth-session` Google/Apple providers in `LoginScreen` to pass real `idToken`.
