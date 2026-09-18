# PostgreSQL (default for Stamp Perk)

Prisma uses **PostgreSQL**. Local Docker:

```bash
docker compose up -d postgres redis
```

Default connection string:

```
DATABASE_URL=postgresql://stampperk:stampperk@localhost:5433/stampperk?schema=public
```

Apply schema + seed:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Render

1. Create a **PostgreSQL** database on Render.
2. Copy the **Internal Database URL** (or External) into the API service env as `DATABASE_URL`.
3. Ensure the API build runs `prisma generate` and `prisma migrate deploy` / `db push` (your existing nest build already runs generate if configured).
4. Redeploy the API after setting `DATABASE_URL`.

## Staging compose (full stack)

```bash
docker compose --profile staging up -d --build
```

## Notes

- Old SQLite file `apps/api/prisma/dev.db` is unused after this switch (safe to delete locally).
- Staff `permissions` remain a JSON string for compatibility; native `StaffPermission[]` can be a later migration.
