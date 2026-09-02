# HLL Command Center v1

Serious clan operations hub for Hell Let Loose.

## Features

- Dashboard
- Operations / matches
- Operation detail workspace
- Calendar
- Roster & squads
- Strategy builder
- Stage map editor
- Player briefing center
- Clan wiki
- After Action Review
- Supabase authentication
- First-clan onboarding
- Shared per-clan workspace state
- Vercel deployment config
- Supabase relational schema for the next iteration

## Run locally

    npm install
    npm run dev

Without Supabase environment variables, the app runs in demo/local mode.

With Supabase configured, it uses Supabase Auth and shared clan state.

See `DEPLOY.md` for the exact production deployment steps.
