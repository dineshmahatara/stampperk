# PostgreSQL for staging / production

Local development uses **SQLite** (`file:./dev.db`) so the stack runs without Docker.

## Switch to Postgres

1. Start Postgres:

```bash
docker compose up -d postgres redis
```

2. In `apps/api/prisma/schema.prisma` change:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Set env:

```
DATABASE_URL=postgresql://stampperk:stampperk@localhost:5432/stampperk?schema=public
```

4. Optional: store staff permissions as a native enum array again:

```prisma
permissions StaffPermission[]
```

(and update merchants/qr/loyalty services to use arrays instead of JSON strings)

5. Apply:

```bash
npm run db:generate
npx prisma migrate dev --name postgres_init -w @stampperk/api
npm run db:seed
```

## Staging compose

```bash
# After switching schema provider to postgresql
docker compose --profile staging up -d --build
```
