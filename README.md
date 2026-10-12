# Life Partner

A shared household app for couples, based on the **Fair Play** idea: responsibilities are grouped into **areas**, and owning an area means handling it end to end (noticing, planning, doing). The app does the reminding, so neither partner has to.

It's a web app you install on your iPhone's Home Screen. It's built with Next.js + Supabase and costs $0/month at our scale.

## What's built so far

**Phase 1 (this release)**

- Sign in with a 6-digit email code. Create a household, then invite your partner with a link.
- **Areas**: owner, icon, a written "minimum standard", hand-offs (recorded with date and note). You pick from a catalog of ~40 areas couples share, including the business ones.
- **Tasks**: area, assignee (defaults to the area's owner), due date and optional time, notes. Who completed each one and when is recorded.
- **Repeating tasks**: "monthly on the 20th", "every other Friday", "quarterly", "every 6 months, counted from when it's done". Completing one schedules the next.
- **Quick add**: one text box (tap **+** anywhere), with a live preview of what it understood. Examples:
  - `pay water bill friday`
  - `renew car registration Nov 3 #car`
  - `pay credit card monthly on the 20th`
  - `oil change every 6 months after it's done`
  - `order cushion fabric @allie`

  It works with iPhone dictation, where saying "hashtag car" gives `#car`. Saying a name doesn't assign the task ("buy flowers for Allie" stays yours). Assigning someone takes `@allie` or "assign to Allie".
- **Starter tasks** for each area. You keep or skip each one during setup, and the rest stay available later under "Suggested tasks" on the area page.
- **Checklists**: "New order" (business) and "Plan a trip" (travel) create a set of dated tasks counted back from a ship-by or departure date, each sent to whoever owns that area.
- **Today** (your overdue + today + this week + a glance at the household), **Areas**, **Calendar** (the next six weeks, everyone or just you), **Settings**.
- **API** for a future Siri Shortcut or native app (see below).

**Coming next**

- **Phase 2**: push notifications, escalating nudges (only ever to the assignee), morning digest, quiet hours.
- **Phase 3**: live shared grocery list, weekly review sheet with history.
- **Phase 4**: Google Calendar: push tasks to each person's calendar and show your events in the in-app calendar.

---

## One-time setup

You'll create two free accounts (Supabase and Vercel), copy three keys between them, and you're done. Plan for about 30 minutes.

### 1. Put the code on GitHub

The code lives in this GitHub repository. Vercel deploys straight from it.

### 2. Create the Supabase project (database + login)

1. Go to <https://supabase.com>, sign up, and click **New project**.
   - Name: `life-partner`. Choose a strong database password and save it in your password manager.
   - Region: **East US (Ohio)** or the region closest to you.
   - Plan: **Free**.
2. When it's ready, open **SQL Editor** → **New query**. Paste the entire contents of
   [`supabase/migrations/20261012000001_phase1_core.sql`](supabase/migrations/20261012000001_phase1_core.sql) and click **Run**. You should see "Success. No rows returned."
   (Each future phase adds a new file in `supabase/migrations/`. Run each new file the same way, in order.)
3. **Turn on sign-in codes.** Go to **Authentication → Emails → Templates**:
   - Open **Magic Link**. Set the subject to `Your Life Partner sign-in code` and replace the body with the contents of
     [`supabase/templates/sign-in-code.html`](supabase/templates/sign-in-code.html). Save.
   - Do the same for **Confirm signup**.

   These templates make the email show a code (`{{ .Token }}`) instead of a link. A link would open in Safari, which doesn't share a login with the Home Screen app.
4. **Authentication → URL Configuration**: set **Site URL** to your Vercel address once you have it (step 3), e.g. `https://life-partner-yourname.vercel.app`.
5. **Make sure both of you can receive emails.** Supabase's built-in email service only sends to members of your Supabase team, a few times per hour. Pick one option:
   - **Simplest:** in Supabase, go to **Organization settings → Team** and invite Allie's email address. She doesn't need to do anything else. You stay signed in for a long time, so the hourly limit rarely matters.
   - **More robust (optional):** set up free email sending with [Resend](https://resend.com) (needs a domain you own). Then add its details under **Authentication → Emails → SMTP Settings**.
6. Collect your keys from **Project Settings → API Keys**:
   - **Project URL** (also under Project Settings → Data API), like `https://abcd1234.supabase.co`
   - **Publishable key** (starts with `sb_publishable_`)
   - **Secret key** (starts with `sb_secret_`). Treat it like a password.

### 3. Deploy to Vercel (hosting)

1. Go to <https://vercel.com>, sign up with GitHub (the free **Hobby** plan is enough), and click **Add New → Project**.
2. Import this repository. Leave the framework (Next.js) and build settings as they are.
3. Expand **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable key |
   | `SUPABASE_SECRET_KEY` | your secret key |

4. Click **Deploy**. When it finishes, you get an address like `https://life-partner-xyz.vercel.app`. Go back to Supabase step 2.4 and set it as the Site URL.

From now on, every push to the `main` branch redeploys automatically.

### 4. Start using it

1. **Andy** opens the Vercel address in **Safari** on his iPhone and signs in with his email. The code arrives by email; iOS often offers to fill it in.
2. The setup walks through: your names → invite link (text it to Allie) → choose areas and owners → keep or skip starter tasks → install on the Home Screen.
3. **Allie** opens the invite link in Safari, signs in with her email, and taps **Join household**. Any areas marked as hers are already waiting for her.
4. Each of you installs it: **Share → Add to Home Screen → Add**, then opens it from the Home Screen and signs in once more. (The installed app keeps its own login.)

---

## Running it on a computer (optional, for development)

You need [Node.js 22+](https://nodejs.org).

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run dev                    # http://localhost:3000
```

To run a completely local Supabase instead (needs Docker), use `npx supabase start`. It prints a URL and keys for `.env.local`. Sign-in emails appear at <http://127.0.0.1:54324>.

Checks:

```bash
npm run typecheck
npm run lint
npm test          # date / repeat / quick-add parsing tests
npm run test:db   # row-level security tests (needs a local Postgres; set PGHOST etc.)
```

## API (for a Siri Shortcut later)

In the app, go to **Settings → Shortcuts & API → Create a key**. Requests send `Authorization: Bearer <key>`.

| Method | Path | Body | What it does |
|---|---|---|---|
| `POST` | `/api/v1/quick-add` | `{"text": "pay water bill friday"}` | Same as the quick-add box. Returns the task and a sentence to read back. |
| `GET` | `/api/v1/tasks?scope=today\|upcoming\|all&mine=true` | | Lists open tasks |
| `POST` | `/api/v1/tasks` | `{"title": "...", "dueDate": "2026-11-03", "areaId": "...", "recurrence": "FREQ=MONTHLY;BYMONTHDAY=20"}` | Creates a task |
| `POST` | `/api/v1/tasks/:id/complete` | | Completes a task (and schedules the next one if it repeats) |

**A Siri Shortcut in 2 minutes:** in the Shortcuts app, create a shortcut with three actions:

1. **Dictate Text**
2. **Get Contents of URL**: URL `https://YOUR-APP.vercel.app/api/v1/quick-add`, Method `POST`. Add a header `Authorization` = `Bearer lp_…`, and a JSON request body with key `text` = *Dictated Text*.
3. **Speak Text**: *Get Dictionary Value* `message` from the result.

Name it "Add a task". Then say "Hey Siri, add a task".

A future native app (Expo/React Native) can call the same endpoints with a Supabase login token instead of a personal key.

## How the code is organized

```
supabase/migrations/   Database schema + row-level security (one file per phase)
supabase/templates/    Sign-in email template
src/lib/core/          The core logic: tasks, areas, invites, API keys.
                       Pages, server actions and the API all call this, so a future
                       native app or AI assistant layer can reuse it.
src/lib/quick-add.ts   Natural-language parsing (chrono-node + our own repeat parser)
src/lib/recurrence.ts  Repeat rules (standard RRULE format), next due dates
src/lib/catalog.ts     The catalog of areas and starter tasks. Edit this to change suggestions.
src/app/               Screens (Next.js App Router) and /api/v1 routes
tests/db/              Database security tests
```

**Data and security.** Every row belongs to a household, and Postgres row-level security means people can only see or change their own household's data, even if the app code had a bug. Owners and assignees must be household members (enforced by the database). Invite links are random, stored only as hashes, single-use, and expire after 30 days. API keys are also stored only as hashes.

**Multi-household from day one.** Any number of couples can sign up and each gets an isolated household. Each household is capped at two members today (`households.max_members`). That can be raised later without schema changes.

## Costs

- **Supabase Free**: database, login and (later) realtime. Free projects pause after a week with no activity. Daily use (and the Phase 2 reminder job, which runs every few minutes) keeps it awake.
- **Vercel Hobby**: free for personal, non-commercial use. If you start selling it, move to Vercel Pro ($20/month).
- No other paid services.
