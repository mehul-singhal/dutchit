# Dutch It! 💸

> **Split smart. Settle faster.**

A modern, open-source expense splitting app built for the Indian market. Think Splitwise, but with a beautiful Liquid Dark design, native UPI payment integration, personal finance tracking, and buttery-smooth animations.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-cyan?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## ✨ Features

### Group Expense Splitting
- **Group management** — Create groups for trips, home, friends, work, or couples; invite via 6-character code
- **6 split types** — Equal, exact amounts, percentage, shares, adjustment, settle-up
- **Debt simplification** — Algorithm minimises the number of transactions needed to clear all balances
- **Group analytics** — Category breakdown, top spender, monthly trend, settlement stats
- **CSV export** — Download all group expenses, balances, and settlements

### UPI Payments (India-native)
- **One-tap payment** — Deep links open GPay, PhonePe, Paytm, or BHIM pre-filled with amount and UPI ID
- **QR code** — Scan-to-pay fallback for any UPI app
- **Settlement flow** — Two-step confirm: payer marks paid → payee confirms → balances update + confetti 🎉
- **Auto-detection** — Identifies the recipient's UPI app from their VPA handle

### Personal Finance
- **Income tracking** — Log earnings by source: salary, freelance, rental, investment, gift
- **Expense tracking** — Personal expenses with categories, and optional "paid from income/savings" tag
- **Savings tracking** — Log contributions with a monthly savings goal and progress bar
- **Cash flow summary** — Always-visible card showing Income / Spent / Saved, animated flow bar, savings rate pill (green ≥20% / amber ≥5% / red <5%), and free cash
- **Analytics tab** — 6-month income vs. spending trend chart, category breakdown pie, and budget tracker
- **Budget tracker** — Set monthly budgets per category with over-budget alerts

### App Experience
- **PWA** — Installable on iPhone and Android ("Add to Home Screen")
- **Offline support** — Service worker caches the app shell; stale data served from React Query cache on poor signal
- **Dark & light themes** — Toggle in sidebar (desktop) or header (mobile), persisted to localStorage
- **Responsive layout** — Desktop sidebar + mobile bottom nav with context-aware center FAB
- **Smooth animations** — Framer Motion spring animations, shared layout transitions, staggered lists
- **Open source** — MIT license, clean codebase, deployable on Vercel free tier

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack) + TypeScript |
| Styling | Tailwind CSS v4 + custom glassmorphism design system |
| UI Components | shadcn/ui (Radix primitives, heavily customised) |
| Animations | Framer Motion + canvas-confetti |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth — email/password + Google OAuth |
| Real-time | Supabase Realtime (expenses, settlements, members) |
| Data fetching | TanStack React Query v5 (`networkMode: 'offlineFirst'`) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Notifications | Sonner toast |
| PWA | Web App Manifest + custom Service Worker |
| Deployment | Vercel |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (optional, for deployment)

### 1. Clone & install

```bash
git clone https://github.com/mehul-singhal/dutchit
cd "Dutch It!"
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Then run `supabase/rls-policies.sql`
4. If setting up fresh, also run `supabase/migrations/add-income-savings.sql` (included in schema.sql for new installs; only needed separately when upgrading an existing DB)
5. Enable **Google OAuth**: Auth → Providers → Google → Enable (add credentials from [Google Console](https://console.developers.google.com))
6. Copy your **Project URL** and **anon key** from Settings → API

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel

Push to GitHub, connect at [vercel.com/new](https://vercel.com/new), add the three env vars, deploy. The free tier covers everything.

---

## 📁 Project Structure

```
dutch-it/
├── app/
│   ├── (auth)/                   # Login, signup, onboarding (3 steps)
│   ├── (app)/                    # Protected routes (requires auth + onboarding)
│   │   ├── layout.tsx            # Shared shell: sidebar, header, bottom nav
│   │   ├── dashboard/            # Greeting, balance stats, groups summary, activity
│   │   ├── groups/
│   │   │   ├── page.tsx          # Groups list
│   │   │   └── [id]/             # Group detail: expenses, balances, settlements, analytics
│   │   ├── personal/             # Personal finance dashboard
│   │   └── profile/              # Settings, avatar, UPI ID
│   ├── layout.tsx                # Root layout: fonts, metadata, PWA, theme
│   └── globals.css               # Design tokens, glassmorphism utilities, themes
├── components/
│   ├── animations/               # CountUp number animation
│   ├── dashboard/                # Stats cards, activity feed, groups summary, quick actions
│   ├── expenses/                 # Add expense sheet, split type UI, category metadata
│   ├── finance/                  # Personal finance: dashboard, income, savings, charts, budgets
│   ├── groups/                   # Group list/detail/balances/members/analytics/settings
│   ├── layout/                   # Sidebar, mobile header, bottom nav, logo, theme toggle
│   ├── onboarding/               # 3-step onboarding flow
│   ├── profile/                  # Profile settings, avatar upload
│   ├── settlements/              # UPI payment sheet, QR code display, app grid
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── auth.ts                   # React cache() wrapper for getAuthUser() — deduplicates per render
│   ├── theme.tsx                 # ThemeProvider + useTheme hook
│   ├── supabase/                 # Browser client, server client, middleware
│   └── utils/
│       ├── debt-simplifier.ts    # Greedy debt minimisation algorithm
│       ├── split-calculator.ts   # Equal, exact, percentage, shares, adjustment splits
│       ├── upi.ts                # Deep links, QR string builder, app detection, validation
│       └── formatters.ts         # formatINR, formatMonthYear, getInitials
├── supabase/
│   ├── schema.sql                # Full DB schema (tables, enums, triggers, indexes)
│   ├── rls-policies.sql          # Row Level Security policies for all tables
│   └── migrations/
│       └── add-income-savings.sql # Migration: income, savings, finance settings tables
├── types/
│   └── database.ts               # TypeScript types for all DB tables and derived types
└── public/
    ├── manifest.json             # PWA manifest
    ├── sw.js                     # Service worker (cache-first static, network-first nav)
    ├── icon-192.png              # App icon (teal ÷ on dark)
    ├── icon-512.png
    └── apple-touch-icon.png
```

---

## 🗄️ Database Schema

Key tables and their purpose:

| Table | Purpose |
|-------|---------|
| `users` | Extended profiles: full name, avatar, UPI ID, onboarding status |
| `groups` | Group name, category, invite code, archived flag |
| `group_members` | Membership with role (admin/member) |
| `expenses` | Group expenses with category, paid_by, splits |
| `expense_splits` | Per-user split amounts (supports 5 split types) |
| `settlements` | UPI payment records with confirmation status |
| `personal_expenses` | Personal spending log with optional `paid_from` source tag |
| `personal_income` | Income entries by source, stored as month/year |
| `personal_savings` | Savings contributions by date |
| `personal_finance_settings` | Per-user monthly savings goal |
| `budgets` | Monthly category budgets |

All tables have Row Level Security enforced. Group policies use `security definer` helper functions (`is_group_member`, `is_group_admin`) to avoid RLS recursion.

---

## 💳 UPI Payment Flow

Dutch It! uses **pure UPI deep links** — no payment gateway or merchant account required:

1. Open the "Settle Up" sheet for a debt
2. Recipient's UPI ID and QR code are shown
3. Tap GPay / PhonePe / Paytm / BHIM → native app opens pre-filled
4. Complete payment in the UPI app, copy the transaction reference
5. Return to Dutch It!, confirm payment (optionally paste the UPI ref)
6. Settlement is recorded as `pending_confirmation`
7. Recipient confirms in their activity feed → balances update

---

## 📱 PWA & Offline

Dutch It! is a fully installable PWA:

- **Install:** Safari → Share → Add to Home Screen (iOS) / Chrome → Install app (Android)
- **Icon:** Teal gradient rounded square with ÷ symbol (separate `any` and `maskable` entries)
- **Offline:** Service worker caches the app shell (HTML, JS, CSS). React Query's `networkMode: 'offlineFirst'` serves stale data when offline. An amber banner appears when the connection drops.
- **Limits:** Write operations (adding expenses, settling) require connectivity. Full offline-first sync (with local SQLite + PowerSync) is planned — see `OFFLINE_SYNC_NOTES.md`.

---

## 🎨 Design System

The "Liquid Dark" design system:

| Token | Value |
|-------|-------|
| Background | `#0a0f1e` (deep navy) |
| Primary | `#00d4aa` (teal) |
| Secondary | `#6366f1` (indigo) |
| Glass card | `backdrop-filter: blur(8px)` + semi-transparent dark fill |
| Glass strong | `blur(12px)` — used on header and bottom nav |
| Brand mark | ÷ (division sign) in teal gradient rounded square |
| Font | DM Sans |

Light theme is fully supported via `html.light` CSS class, toggled by the sun/moon button.

CSS utility classes: `.glass`, `.glass-strong`, `.gradient-teal`, `.text-gradient`, `.balance-positive`, `.balance-negative`, `.skeleton-shimmer`

---

## ⚡ Performance Notes

- **`lib/auth.ts`** wraps `getAuthUser()` in React's `cache()` — the layout and every page Server Component share one Supabase auth call per render request instead of firing separately
- **Blur radius** is 8px (desktop) / 6px (mobile) — halved from the original 16px for GPU performance on mobile
- **`will-change: transform`** on `.glass-strong` elements; `translateZ(0)` on the mobile bottom nav forces compositor layer promotion
- **Stagger delays** are capped across all list components so animations complete in <200ms

---

## 🗺️ Roadmap

- [ ] Push notifications for new expenses and settlement confirmations
- [ ] Full offline-first sync (PowerSync + local SQLite) — see `OFFLINE_SYNC_NOTES.md`
- [ ] Settlement confirmation UX for the payee (in-app prompt)
- [ ] WhatsApp / SMS notifications
- [ ] Group invite deep link with OG preview
- [ ] Recurring expenses (rent, subscriptions)
- [ ] Multi-currency with live exchange rates
- [ ] AI receipt scanning
- [ ] React Native mobile app

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push and open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

*Dutch It! — Because "going Dutch" should be effortless.*
