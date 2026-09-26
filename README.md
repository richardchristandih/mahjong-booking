# The Mahjong Room

A mobile-first booking MVP built as one full-stack Next.js app with Supabase for PostgreSQL, admin authentication, and private receipt storage.

## Setup

1. Create a Supabase project and run `supabase/migrations/001_initial.sql` in its SQL editor.
2. Create an admin in Supabase Authentication, then insert the matching user into `public.admins`.
3. Copy `.env.example` to `.env.local` and fill in the three Supabase values.
4. Run `npm install`, then `npm run dev`.

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_`.

## Routes

- `/book` — customer booking flow
- `/booking/{reference}` — public-safe booking status and receipt upload
- `/admin/login` — venue admin access
- `/admin` — dashboard, bookings, calendar, and settings

Overlap prevention is enforced by both an atomic PostgreSQL function and an exclusion constraint, so concurrent requests cannot reserve the same table time.
