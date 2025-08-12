# ApexStruct (v3.0) – Cloud-Native PEB & LGS Design Platform

A modern Next.js app with Prisma/PostgreSQL, BullMQ for background analysis, and Three.js for 3D.

## Stack
- Next.js (App Router)
- Tailwind CSS
- Prisma + PostgreSQL
- NextAuth (placeholder)
- BullMQ + Redis
- Three.js via @react-three/fiber
- @react-pdf/renderer

## Quick start
1. Copy env
```
cp .env.example .env
```
2. Install deps
```
pnpm i # or npm i / yarn
```
3. Start database and redis (example with Docker)
```
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

docker run -d --name redis -p 6379:6379 redis:7
```
4. Migrate
```
pnpm prisma:generate && pnpm prisma:migrate --name init
```
5. Dev
```
pnpm dev
```
6. Worker (separate terminal)
```
pnpm worker
```

Visit http://localhost:3000
