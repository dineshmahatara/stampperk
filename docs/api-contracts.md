# Stamp Perk API contracts (summary)

Base URL: `http://localhost:4000/api`  
Auth: `Authorization: Bearer <token>`  
Docs: `http://localhost:4000/docs`

## Auth
- `POST /auth/register` `{ email, password, name, role? }`
- `POST /auth/login` `{ email, password }`
- `GET /auth/me`

## Merchants
- `POST /merchants` create business
- `GET /merchants/me` · `PATCH /merchants/me`
- `GET /merchants/me/dashboard`
- `POST /merchants/me/staff` · `POST /merchants/me/branches`
- `GET /merchants/public/:slug`

## Loyalty / QR
- `POST /loyalty/programs` · `GET /loyalty/programs`
- `POST /loyalty/programs/:id/enroll` · `GET /loyalty/cards/me`
- `POST /loyalty/redeem` `{ cardId, customerQrToken? }`
- `GET /qr/me` · `POST /qr/scan` · `POST /qr/sync-offline`

## Campaigns / Billing / Admin / Privacy / Discovery
- `GET|POST /campaigns` · `POST /campaigns/:id/publish`
- `GET /billing/plans` · `POST /billing/checkout` · `POST /billing/iap/{apple|google}`
- `GET /admin/overview|merchants|users|subscriptions`
- `POST /privacy/export` · `DELETE /privacy/account` · `POST /privacy/consent`
- `GET /discovery/search` · `GET /discovery/categories`
