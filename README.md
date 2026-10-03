# HLL Command Center

Production-oriented clan operations hub for Hell Let Loose.

## Core workflow

Clan → Members → Squads → Operation → Attendance → Strategy → Stage Maps → Briefings → READY → ACTIVE → AAR

The live web app uses Supabase Auth/Postgres and Vercel. Real clans do not depend on the bundled demo seed; a new clan starts with its own empty workspace.

## Current production features

- Supabase authentication and password reset
- Create Clan / Join Clan by invite
- Membership approval, activation and role control
- Commander / CO / Squad Lead / Player / Recruit permissions
- Player callsign and profile
- Member preferences, private command notes and training records
- Default clan Squad Hub plus flexible per-operation squad assignments
- Operation workspace with attendance, strategy, stage maps, briefings and AAR
- Explicit operation lifecycle: DRAFT → READY → ACTIVE → ARCHIVED
- Deployment readiness gates
- Player My Operation console
- Briefing read / acknowledge receipts
- Live Command Room and Command Feed
- Live Calendar with operation links
- Clan Wiki / SOP knowledge base
- Realtime updates for shared workspace, activity, members, calendar and wiki
- Relational Supabase records for operations, squads, roster assignments, strategy, maps, briefings, receipts and AAR
- Production build verification through GitHub Actions

## Local development

Run `npm install` and then `npm run dev`.

Create a local `.env` with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. Use a publishable/anon frontend key only. Never put a service_role or other secret key in the browser.

## Production deployment

Vercel should point at the `main` branch.

Required Vercel environment variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Set them for the environments you use, then redeploy the latest `main` commit.

Supabase Auth URL configuration must contain the final Vercel site URL and its callback/redirect URL.

## Database

The live Supabase project already contains the current schema and hardening migrations. Do not run the old one-off `PRODUCTION-FIX.sql` against the production database unless you are deliberately rebuilding a fresh project.

Database security is enforced with RLS and clan-scoped policies. The application has been tested for cross-clan isolation.

## Verification

Every push to `main` runs dependency installation, JSX syntax validation and the production build.

Keep GitHub Actions green before treating a change as releasable.

## Important Auth setting

Supabase Auth still reports Leaked Password Protection as disabled. Enable it in Supabase Authentication / password security for the production project.
