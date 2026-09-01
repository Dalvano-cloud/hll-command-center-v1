# HLL Command Center — publiceren

## 1. Supabase

De bestaande database moet éénmalig `supabase/PRODUCTION-FIX.sql` krijgen via **Supabase → SQL Editor → Run**.

De frontend gebruikt alleen:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Gebruik nooit een `service_role` of secret key in de frontend.

## 2. GitHub

Maak op GitHub een nieuwe repository, bijvoorbeeld `hll-command-center`.
Upload de inhoud van deze map naar de repository.

## 3. Vercel

Importeer de GitHub repository in Vercel.
Vercel detecteert Vite automatisch.

Voeg bij **Project Settings → Environment Variables** toe:

```text
VITE_SUPABASE_URL=https://JOUW-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Gebruik de variabelen voor Production, Preview en Development als je alle omgevingen wilt laten werken.

Daarna **Redeploy**.

## 4. Supabase Auth URL

Na de eerste Vercel-deploy:

Supabase → Authentication → URL Configuration

- Site URL: je echte Vercel-domein
- Redirect URLs: voeg hetzelfde Vercel-domein toe

## 5. Eerste login

Open de website → CREATE ACCOUNT → bevestig e-mail indien gevraagd → SIGN IN → maak de clan aan.

## 6. Wat deze versie al doet

- dashboard
- operations
- operation detail
- kalender
- roster
- squads
- strategy/orders
- interactieve stage maps
- individuele briefings
- wiki/SOPs
- AAR
- Supabase-authenticatie
- gedeelde cloud workspace per clan
- live synchronisatie van de gedeelde workspace
- onboarding voor een nieuwe clan

## 7. Belangrijk

De huidige v1 bewaart het actieve workspace-model als één JSON-document per clan (`clan_app_state`). De relationele tabellen zijn al aanwezig voor de volgende stap: fijnmazige squad/player/operation-permissies, uitnodigingen en echte genormaliseerde CRUD.
