# IB Dealflow Tracker

A full-stack investment banking deal workflow management application. Built with Next.js 14, Supabase, and Tailwind CSS. Designed for a single user (one banker) with a Bloomberg-inspired dark navy UI.

## Features

- **Companies** — Coverage universe with sector, status, tags, CSV import/export
- **Contacts** — People CRM with relationship tiers, linked companies, email integration
- **Meetings** — Log all calls, in-person meetings, and events with attendees and notes
- **Follow-ups** — Task tracker with priority/status, due date alerts, overdue highlighting
- **Live Deals** — Pipeline tracker with Kanban board + table view by stage
- **Projects** — Internal workstreams with subtask checklists
- **Dashboard** — Summary KPIs, pipeline by stage, overdue tasks, upcoming meetings
- **Global Search** — Search across all modules from the top nav
- **Excel Export** — Download any module as .xlsx
- **Weekly Digest** — Email yourself a summary of tasks due this week (via Resend)

---

## Deployment Guide (Step by Step)

### Step 1 — Set up Supabase (free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**, name it `ib-dealflow`, choose a region, set a database password
3. Once the project is created, go to **SQL Editor** (left sidebar)
4. Paste the entire contents of `supabase/schema.sql` and click **Run**
5. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 2 — Generate your password hash

You need to hash your app password before putting it in the environment variables.

Run this in your terminal:

```bash
node -e "const b = require('bcryptjs'); console.log(b.hashSync('YOUR_PASSWORD_HERE', 10));"
```

Copy the output hash — this goes in `APP_USER_PASSWORD`.

### Step 3 — Generate a NextAuth secret

```bash
openssl rand -base64 32
```

Copy the output — this goes in `NEXTAUTH_SECRET`.

### Step 4 — Deploy to Vercel (free)

1. Push this repo to GitHub (or fork it)
2. Go to [vercel.com](https://vercel.com) and click **New Project**
3. Import your GitHub repository
4. In the **Environment Variables** section, add all of the following:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXTAUTH_SECRET` | Output from `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel deployment URL (e.g. `https://my-app.vercel.app`) |
| `APP_USER_EMAIL` | Your email address |
| `APP_USER_PASSWORD` | The bcrypt hash from Step 2 |

5. Click **Deploy**

### Step 5 (Optional) — Set up weekly email digest

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day)
2. Add and verify your sending domain, or use the sandbox address
3. Get your API key from Resend dashboard
4. Add to Vercel environment variables:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key |
| `EMAIL_FROM` | `digest@yourdomain.com` |

Then click **"Send Weekly Digest"** on the Dashboard to email yourself all tasks due in the next 7 days.

---

## Local Development

```bash
# 1. Clone the repo
git clone <repo-url>
cd ib-dealflow-tracker

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in all values in .env.local

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
src/
├── app/
│   ├── (app)/          # Protected app routes (requires login)
│   │   ├── page.tsx    # Dashboard
│   │   ├── companies/
│   │   ├── contacts/
│   │   ├── meetings/
│   │   ├── follow-ups/
│   │   ├── deals/
│   │   ├── projects/
│   │   └── search/
│   ├── api/            # REST API routes
│   │   ├── auth/       # NextAuth
│   │   ├── companies/
│   │   ├── contacts/
│   │   ├── meetings/
│   │   ├── followups/
│   │   ├── deals/
│   │   ├── projects/
│   │   ├── search/
│   │   ├── export/     # Excel download
│   │   └── digest/     # Weekly email
│   └── login/
├── components/
│   ├── ui/             # Shared UI primitives
│   ├── Dashboard/
│   ├── Companies/
│   ├── Contacts/
│   ├── Meetings/
│   ├── FollowUps/
│   ├── Deals/
│   └── Projects/
├── lib/
│   ├── supabase.ts     # Supabase client
│   ├── auth.ts         # NextAuth config
│   ├── export.ts       # XLSX helpers
│   └── utils.ts        # Date/currency formatters
├── types/
│   └── index.ts        # All TypeScript types
supabase/
└── schema.sql          # Full database schema + triggers
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS (dark navy theme)
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js with bcrypt credentials
- **Export:** SheetJS (xlsx)
- **Email:** Resend API
- **Deployment:** Vercel + Supabase
