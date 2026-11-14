# Same Page

**One shared planner for the two of you.** Same Page is a daily and weekly planner that a couple shares: the kids' practices and doctor's appointments, the plumber coming Thursday, trash night, the bills, and the chores. Both partners see the same page, so nobody has to carry it all in their head.

It works on phones and computers. It's a web app you can install on a phone's Home Screen, built with Next.js and Supabase.

## What's in it

**Planner core (this release)**

- **Today first.** Opens to today: the schedule (events, in time order), what's on your plate, what's on your partner's plate, and anything carried over. The rest of the week is below it (or beside it on a computer).
- **Week view.** Seven days at a glance. On a computer the days sit side by side like a paper planner spread; on a phone they're stacked. Go back and forth by week, and filter to **Everyone**, **Me**, your partner, or one child.
- **Three kinds of items:**
  - **Events** happen at a time and place (soccer 5–6:30 PM at Riverside Park, dentist at 9:30, plumber Thursday at 10). Repeating events (practice every Tue & Thu) show on every date.
  - **Tasks** are to-dos you check off (pay the water bill Friday). They can repeat.
  - **Chores** are household routines (trash every Tuesday, laundry). They're checked off too. Upcoming repeats show faintly in the week ahead so you can plan.
- **Kids' profiles.** Each child gets a name and a color. Tag events, tasks and chores with one or more kids, and filter the week to just them. Kids don't need an account.
- **Areas of ownership** stay at the center (the Fair Play idea): responsibilities are grouped into areas like Kids' Activities, House or Finances, and owning one means handling it end to end. Items in an area go to its owner by default. Hand an area over any time; the hand-off is recorded. Pick from a catalog of ~45 areas, now including **School**, **Kids' Activities** and **Kids' Health & Care**.
- **Quick add**: one text box (tap **+** anywhere, or **Add to the planner** on a computer). It guesses the date, time, repeat, area, whether it's an event, task or chore, and which kids it's for. You can adjust any of it before adding.
  - `Emma soccer practice every Tuesday 5pm` → a weekly event for Emma
  - `plumber coming Thursday 10am` → an event
  - `take out the trash every tuesday` → a weekly chore
  - `pay water bill friday #finances` → a task in Finances
  - `oil change every 6 months after it's done @alex` → a repeating task for Alex

  It works with iPhone dictation, where saying "hashtag car" gives `#car`.
- Sign in with a 6-digit email code. Create a household, invite your partner with a link, add the kids.
- An **API** for a Siri Shortcut or a future native app (see below).

**Roadmap**

- **Reminders**: push notifications (on iPhone, once the app is on the Home Screen) and email: a reminder before events and when to-dos are due, plus a morning summary.
- **Shared lists**: a live grocery list, packing lists and more that both partners edit.
- **Calendar sync**: two-way sync with Google, Apple and Outlook calendars.
- **Subscriptions**: a monthly or yearly plan per household with a free trial (Stripe), plus a public sign-up page.
- Later: App Store and Google Play versions.

---

## One-time setup

You'll create two free accounts (Supabase and Vercel), copy three keys between them, and you're done. Plan for about 30 minutes.

### 1. Put the code on GitHub

The code lives in this GitHub repository. Vercel deploys straight from it.

### 2. Create the Supabase project (database + login)

1. Go to <https://supabase.com>, sign up, and click **New project**.
   - Name: `same-page`. Choose a strong database password and save it in your password manager.
   - Region: **East US (Ohio)** or the region closest to you.
   - Plan: **Free**.
2. When it's ready, open **SQL Editor** → **New query**. Paste the entire contents of each file in
   [`supabase/migrations/`](supabase/migrations/), oldest first, and click **Run** after each one. You should see "Success. No rows returned."
   - [`20261012000001_phase1_core.sql`](supabase/migrations/20261012000001_phase1_core.sql): households, areas, tasks
   - [`20261114000001_same_page_planner.sql`](supabase/migrations/20261114000001_same_page_planner.sql): events, chores, kids' profiles

   Each future release may add a new file. Run each new file the same way, in order.
3. **Turn on sign-in codes.** Go to **Authentication → Emails → Templates**:
   - Open **Magic Link**. Set the subject to `Your Same Page sign-in code` and replace the body with the contents of
     [`supabase/templates/sign-in-code.html`](supabase/templates/sign-in-code.html). Save.
   - Do the same for **Confirm signup**.

   These templates make the email show a code (`{{ .Token }}`) instead of a link. A link would open in Safari, which doesn't share a login with the Home Screen app.
4. **Authentication → URL Configuration**: set **Site URL** to your Vercel address once you have it (step 3), e.g. `https://same-page-yourname.vercel.app`.
5. **Make sure both of you can receive emails.** Supabase's built-in email service only sends to members of your Supabase team, a few times per hour. Pick one option:
   - **Simplest (just the two of you, for testing):** in Supabase, go to **Organization settings → Team** and invite your partner's email address. They don't need to do anything else. You stay signed in for a long time, so the hourly limit rarely matters.
   - **Needed before other couples can sign up:** set up email sending with [Resend](https://resend.com) (needs a domain you own). Then add its details under **Authentication → Emails → SMTP Settings**.
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

4. Click **Deploy**. When it finishes, you get an address like `https://same-page-xyz.vercel.app`. Go back to Supabase step 2.4 and set it as the Site URL.

From now on, every push to the `main` branch redeploys automatically.

### 4. Start using it

1. Open the Vercel address in **Safari** on your iPhone (or any browser on a computer) and sign in with your email. The code arrives by email; iOS often offers to fill it in.
2. The setup walks through: your names and your kids' names → invite link (text it to your partner) → choose areas and owners → keep or skip starter tasks → install on the Home Screen.
3. Your partner opens the invite link, signs in with their email, and taps **Join household**. Any areas marked as theirs are already waiting for them.
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
npm test          # date / repeat / quick-add / planner tests
npm run test:db   # database and row-level security tests (needs a local Postgres; set PGHOST etc.)
```

## API (for a Siri Shortcut later)

In the app, go to **Settings → Shortcuts & API → Create a key**. Requests send `Authorization: Bearer <key>`.

| Method | Path | Body | What it does |
|---|---|---|---|
| `POST` | `/api/v1/quick-add` | `{"text": "pay water bill friday"}` | Same as the quick-add box. Returns the item and a sentence to read back. |
| `GET` | `/api/v1/tasks?scope=today\|upcoming\|all&mine=true` | | Lists open items |
| `POST` | `/api/v1/tasks` | `{"kind": "event", "title": "...", "dueDate": "2026-11-03", "dueTime": "17:00", "endTime": "18:30", "location": "...", "kidIds": ["..."], "areaId": "...", "recurrence": "FREQ=WEEKLY;BYDAY=TU"}` | Creates an item. `kind` is `task` (default), `chore` or `event`. |
| `POST` | `/api/v1/tasks/:id/complete` | | Completes a task or chore (and schedules the next one if it repeats). Events can't be completed. |

**A Siri Shortcut in 2 minutes:** in the Shortcuts app, create a shortcut with three actions:

1. **Dictate Text**
2. **Get Contents of URL**: URL `https://YOUR-APP.vercel.app/api/v1/quick-add`, Method `POST`. Add a header `Authorization` = `Bearer sp_…`, and a JSON request body with key `text` = *Dictated Text*.
3. **Speak Text**: *Get Dictionary Value* `message` from the result.

Name it "Add to Same Page". Then say "Hey Siri, add to Same Page".

A future native app (Expo/React Native) can call the same endpoints with a Supabase login token instead of a personal key.

## How the code is organized

```
supabase/migrations/   Database schema + row-level security (one file per phase)
supabase/templates/    Sign-in email template
src/lib/core/          The core logic: items (tasks, chores, events), kids, areas, invites, API keys.
                       Pages, server actions and the API all call this, so a future
                       native app or AI assistant layer can reuse it.
src/lib/quick-add.ts   Natural-language parsing (chrono-node + our own repeat parser)
src/lib/recurrence.ts  Repeat rules (standard RRULE format), next due dates
src/lib/planner.ts     Lays items out by day: repeating events, upcoming repeats, filters
src/lib/catalog.ts     The catalog of areas and starter tasks. Edit this to change suggestions.
src/app/               Screens (Next.js App Router) and /api/v1 routes
tests/db/              Database security tests
```

**Data and security.** Every row belongs to a household, and Postgres row-level security means people can only see or change their own household's data, even if the app code had a bug. Owners and assignees must be household members (enforced by the database). Invite links are random, stored only as hashes, single-use, and expire after 30 days. API keys are also stored only as hashes.

**Multi-household from day one.** Any number of couples can sign up and each gets an isolated household. Each household is capped at two members today (`households.max_members`). That can be raised later without schema changes.

## Costs

- **Supabase Free**: database, login and (later) realtime. Free projects pause after a week with no activity. Daily use (and the Phase 2 reminder job, which runs every few minutes) keeps it awake.
- **Vercel Hobby**: free for personal, non-commercial use. **Selling Same Page requires Vercel Pro** ($20/month).
- **Supabase Pro** ($25/month) is worth it once paying customers rely on it: no pausing, daily backups.
- **Email** (Resend): free up to 3,000 emails a month, then $20/month.
- No other paid services yet. Subscriptions will add Stripe's per-payment fees.
