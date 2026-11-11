# EECOH Team Hub: handoff for Claude Code

## What it is
The EECOH Team Hub task app (tasks, Gantt, board, calendar, milestones, approvals, hours, chat), moved off claude.ai so the team can sign in without Claude accounts.

- Live app: https://eecoh-team-hub.netlify.app (Netlify project `eecoh-team-hub`, team `arron-sc-arik`, site id 55f99fb9-9139-4f61-94c4-c0aa9e3d0eee)
- Repo: `arron-eecoh/eecoh-team-hub` (branch `main`, no build step, publish dir = repo root; push to main deploys in about 30 s)
- Database: Supabase project `eecoh-team-hub`, id `dbehrnapvfopqyxucidz`, region sa-east-1, org EECOH Living
- Old hub (being retired): https://claude.ai/artifact/KJYXBSqqvsSjD4xBuSTAk4

## How the code is built
- `index.html` is the original claude.ai artifact hub, nearly unchanged. It still calls `window.claude.use("db" | "user" | "room" | "mcp")`.
- `shim.js` supplies that API on top of Supabase:
  - Sign-in screen (tap name, then password) using Supabase email/password auth. Session persists per device.
  - `db`: an in-memory mirror of the `public.docs` table with Firestore-style `collection().onSnapshot / orderBy / limit / add` and `doc().set / delete / onSnapshot`. Live updates via Supabase Realtime `postgres_changes`. Full reload on reconnect and whenever the app becomes visible again (phones pause sockets).
  - `user`: `id()` returns the person's name (Arron, Lucia, Florencia, Luciana, Jo). `isOwner()` and `canEdit()` are true for Arron only.
  - `room`: presence via a Supabase Realtime presence channel.
  - `mcp`: returns null. In-page Gmail sends and Sheet backup/restore are off; the scheduled sender does both.
  - Account panel: anyone changes their own password (`auth.updateUser`). Arron and Lucia can reset a teammate's password through edge function `admin-reset`.
- `supabase.js` is the supabase-js 2.45.4 UMD bundle (served locally, no CDN). `sw.js` is network-first with an offline fallback. `manifest.webmanifest` and the icons make it installable. `netlify.toml` sets no-cache.

## Database
One table: `public.docs (col text, id text, data jsonb, updated_at, updated_by, primary key (col, id))`.
- `col` is the collection path, e.g. `tasks`, `meta`, `time/Lucia/entries`. `id` is the doc id. `data` is the document.
- RLS: any signed-in team member can read and write. Anonymous users get nothing.
- Realtime publication includes `docs`, with replica identity full.
- Collections: people, tasks, milestones, requests, notify, comments, ideas, flags, dates, colors, log, meta (clients, trackers, needed, sender, backup), time/<Name>/entries.

Edge function `admin-reset` (verify_jwt off; it checks the caller's token itself): POST `{email, password}`. Only arron@eecoh.ca and lucia@eecoh.ca may call it, and only for the five team emails.

## Logins
Five Supabase auth users: arron@, lucia@, florencia@, luciana@, joanna@ (all eecoh.ca). Initial passwords were given to Arron in chat. Users can change their own.

## Status (Nov 11, 2026)
- Done: schema, data import (69 tasks, 17 dates, people, meta, log), auth users, app, Account panel, Netlify site, repo.
- Pending in the repo: replace `shim.js` with the version that has the Account panel, if that isn't pushed yet.

## Remaining steps before the team switches
1. Arron signs in on the live app and checks the tasks load and the status shows Live.
2. Re-copy data from the old hub on switch day. The team kept editing it after the first copy (e.g. task t10 changed). Read every collection with the ArtifactData tool (works from a claude.ai or Cowork chat), then upsert into `public.docs`.
3. Rebuild the email sender. The scheduled task "EECOH Team Hub sender" (trig_01BxjGzVNtWvAZRrNpDYxqaz, weekdays 07:07 to 20:07 Toronto) still reads the old hub through ArtifactData. Scheduled tasks keep the connectors they were created with, and this one predates the Supabase connector. Delete it and create a new one with the same steps and schedule, with these changes:
   - Read and write `public.docs` with Supabase `execute_sql` on project `dbehrnapvfopqyxucidz` instead of ArtifactData (no if_version; use `update ... set data = data || '{...}'::jsonb`).
   - The hub link in emails becomes https://eecoh-team-hub.netlify.app.
   - The sender now also covers the instant notification emails and the Sheet backup (Sheet 1NiEbr70Sfcf0jJgxNqbVQeXxYaF-hBTE78HTNt7NMm8) that the in-page code used to do.
4. Welcome message to the team in English and Spanish: link, how to sign in, how to install on a phone, the Account button.
5. Leave the old hub read-only for a week, then retire it.

## Notes
- The repo was public when last checked. Consider making it private. Netlify keeps deploying either way.
- Supabase advisor: leaked-password protection is off (optional to enable).
- Free Supabase projects pause after 7 days with no activity. Daily use and the sender keep it awake.
