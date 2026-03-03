# Project Guidelines

## Code Style
- Stack: Next.js 14 App Router + TypeScript + Tailwind (`package.json`, `tsconfig.json`, `app/globals.css`).
- Keep strict TypeScript compatibility (`strict: true`) and use path alias imports like `@/lib/db` (`tsconfig.json`).
- Follow existing route handler style: validate input early, return `NextResponse.json(...)`, and wrap in `try/catch` (`app/api/submit/route.ts`, `app/api/admin/settings/route.ts`).
- Preserve server/client boundaries: server components fetch data directly; interactive UI lives in `'use client'` components (`app/page.tsx`, `app/donu/DonuClient.tsx`, `app/admin/page.tsx`).
- Keep UI changes consistent with existing Tailwind-first styling in `app/*` and avoid introducing new styling systems.

## Architecture
- Core data source is Neon Postgres via `@neondatabase/serverless`, not JSON files (`lib/db.ts`).
- SQL schema lives in `lib/schema.sql` and defines `settings`, `events`, `editions`, and `submissions`.
- Page/API code should query event and edition data directly from `lib/db.ts` (`getEvents`, `getEditions`) and map to view shapes locally when needed.
- Public pages (`/`, `/donu`, `/rezultoj`, `/pri`) consume DB-backed data; homepage revalidates every 60s (`app/page.tsx`).
- Admin UI is a large client page calling admin APIs with a `secret` query param (`app/admin/page.tsx`).

## Build and Test
- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Production build/start: `npm run build` then `npm start`
- Required env for runtime:
  - `DATABASE_URL` (used in `lib/db.ts`)
  - `ADMIN_SECRET` (template in `.env.example`)
- Before first deploy/environment, apply `lib/schema.sql` to the Neon database.

## Project Conventions
- Ranking scores are numeric and fixed: `1 | 2 | 3 | 4`; keep API validation aligned (`app/api/submit/route.ts`).
- Moderation flow uses `'approved' | 'pending'` for both submission and comments (`lib/db.ts`, admin routes).
- Edit flow uses `editToken`; submission fetch endpoint intentionally omits returning token (`app/api/submission/route.ts`).
- Duplicate handling uses `flagDuplicate` and `flagDuplicateIp` fields in submissions (`app/api/submit/route.ts`, `lib/db.ts`).
- Note: some markdown docs still mention legacy JSON storage; prefer current runtime code as source of truth.

## Integration Points
- DB integration: all persistence/queries go through `lib/db.ts`.
- API surface is under `app/api/**` (public: rankings/submit/comments/submission; admin: events/editions/settings/submissions/export/upload-logo).
- Event logos are served from `public/event-logos/`; admin upload endpoint updates logo paths (`app/api/admin/upload-logo/route.ts`).

## Security
- Never hardcode production secrets; keep defaults only for local/dev bootstrap (`.env.example`).
- Treat `editToken`, IP, and comment content as sensitive data; do not expose extra fields in API responses.
- When changing admin or submission routes, keep auth and validation checks as the first branch in handlers.
