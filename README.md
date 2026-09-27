# The Mahjong Room

A mobile-first booking MVP built as one full-stack Next.js app with Supabase for PostgreSQL, admin authentication, and private receipt storage.

## Setup

1. Create a Supabase project and run `supabase/migrations/001_initial.sql` in its SQL editor.
2. Create an admin in Supabase Authentication, then insert the matching user into `public.admins`.
3. Copy `.env.example` to `.env.local` and fill in the three Supabase values.
4. Run `npm install`, then `npm run dev`.

The service-role key is server-only. Never prefix it with `NEXT_PUBLIC_`.

## Booking notifications

To receive a Telegram message whenever someone books:

1. In Telegram, message `@BotFather`, create a bot, and copy the bot token.
2. Message your new bot once.
3. Visit `https://api.telegram.org/botYOUR_TOKEN/getUpdates` and copy your `chat.id`.
4. Add these environment variables locally and in Vercel:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `NEXT_PUBLIC_SITE_URL` with your deployed site URL

If the Telegram variables are missing, booking still works without notifications.

## Payment proof cleanup

Payment proof files are deleted automatically 7 days after they are reviewed as confirmed or rejected. On Vercel, `vercel.json` schedules `/api/maintenance/payment-proofs` once per day. Add a `CRON_SECRET` environment variable in production so only the scheduler can call it.

## Routes

- `/book` — customer booking flow
- `/booking/{reference}` — public-safe booking status and receipt upload
- `/admin/login` — venue admin access
- `/admin` — dashboard, bookings, calendar, and settings

Overlap prevention is enforced by both an atomic PostgreSQL function and an exclusion constraint, so concurrent requests cannot reserve the same table time.
