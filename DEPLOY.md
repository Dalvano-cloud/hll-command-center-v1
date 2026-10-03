# HLL Command Center — production deployment

## Supabase

The production database is already migrated. Use the current Supabase project and current migrations; do not use the legacy one-off SQL as a deployment step.

The frontend requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.

Never use a service_role or other secret key in Vercel frontend variables.

## Vercel

Import the GitHub repository and deploy the main branch.

Set the two environment variables above for Production (and Preview/Development when needed).

After environment changes, redeploy the latest main commit.

## Supabase Auth

Set the production Vercel domain as the Site URL and add the required redirect URL(s).

For production password security, enable leaked-password protection in Supabase Auth.

## Release check

GitHub Actions must show a green Build workflow for the release commit.

Then verify in the browser: sign in/out, clan onboarding, member approval, operation creation, attendance, squad assignment, strategy, stage maps, briefings and acknowledgement, READY/ACTIVE lifecycle, calendar, wiki, AAR and cross-clan isolation.
