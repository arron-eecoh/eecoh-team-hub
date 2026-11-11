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

## Hub feedback (added Nov 11, 2026)
- A Feedback button sits at the bottom right of every screen, including on top of an open task or dialog. It records where the person was (view, open task or dialog, phone or computer) with their note.
- Notes live in the `feedback` collection: kind (dislike, idea, like, bug), text, weight 1 to 3, by, at, status (new, planned, done, declined), votes ("me too"), where, panel, taskId, device, reply.
- The Feedback tab lists them by area. Arron and Lucia set a status and an optional note back. "Copy batch for Claude" copies every Next batch note as a brief to paste into Claude Code. "Mark batch done" closes the batch and messages each author.

## Email sender
- Old task "EECOH Team Hub sender" (trig_01BxjGzVNtWvAZRrNpDYxqaz) still runs against the old claude.ai hub. Leave it until switch day, because the team still works there.
- New task "EECOH Team Hub sender (Supabase)" (trig_0117duC4BvTch5JhhUoMQymP), same schedule, reads and writes `public.docs`. It is PAUSED: it was created from Claude Code, which could not attach connectors. It needs Supabase, Gmail, Google Sheets and Zapier added in claude.ai (or recreate it there with the same prompt), then enable it.
- `meta/sender.mode` controls what it does. "trial" (current): only notification emails from the new hub, plus a morning line to Arron and Lucia about new feedback. "live": also the full digest, time trackers and Sheet backup.

## Status (Nov 11, 2026)
- Done: schema, data import (69 tasks, 17 dates, people, meta, log), auth users, app, Account panel, Netlify site, repo, feedback feature, new sender prompt.
- The imported copy is stale: 57 of 58 open tasks are past their due date. Re-copy or re-plan before the team sees it.

## Remaining steps before the team switches
1. Arron signs in on the live app and checks the tasks load and the status shows Live.
2. Add connectors to the new sender task and enable it (trial mode).
3. Trial: team uses the new hub and sends feedback. Old hub stays the source of truth.
4. Switch day: re-copy data from the old hub (read every collection with the ArtifactData tool from a claude.ai or Cowork chat, upsert into `public.docs`, keeping the `feedback` collection), set `meta/sender.mode` to "live", delete the old sender task, and repoint the `eecoh-team-hub` chat skill at Supabase.
5. Welcome message to the team in English and Spanish: link, how to sign in, how to install on a phone, the Account and Feedback buttons.
6. Leave the old hub read-only for a week, then retire it.

## Notes
- The repo was public when last checked. Consider making it private. Netlify keeps deploying either way.
- Supabase advisor: leaked-password protection is off (optional to enable).
- Free Supabase projects pause after 7 days with no activity. Daily use and the sender keep it awake.
