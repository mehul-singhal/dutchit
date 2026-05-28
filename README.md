# DutchIt 💸

> **Split smart. Settle faster.**

A modern, open-source expense splitting app built for the Indian market. Think Splitwise, but with a beautiful Liquid Dark design, instant UPI payment integration, and buttery-smooth animations.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-cyan?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## ✨ Features

- **Group Expense Tracking** — Create groups for trips, home, friends, work, or couples
- **6 Split Types** — Equal, exact amounts, percentage, shares, adjustment, or settle-up
- **Balance Intelligence** — Debt simplification algorithm minimizes number of transactions
- **UPI Payment Flow** — Deep links to GPay, PhonePe, Paytm, BHIM + QR code generation
- **Settlement Confirmation** — Two-step confirm flow with pending/confirmed/disputed states
- **Personal Finance** — Track individual spending, set budgets, view analytics
- **Real-time Activity** — Live feed of group expenses and settlements via Supabase Realtime
- **Receipt Upload** — Attach receipt photos to any expense
- **Beautiful Design** — "Liquid Dark" aesthetic with glassmorphism, teal accents, spring animations
- **Fully Responsive** — Desktop sidebar + mobile bottom nav with center FAB
- **PWA Ready** — Installable on any device
- **Open Source** — MIT license, clean codebase, ready to self-host

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + Framer Motion |
| UI | shadcn/ui (Radix primitives) |
| Backend | Next.js API Routes + Server Actions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Real-time | Supabase Realtime |
| Charts | Recharts |
| QR Code | qrcode |
| State | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| Notifications | Sonner |
| Animations | Framer Motion + canvas-confetti |
| Deployment | Vercel |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier, optional)

### 1. Clone & install

```bash
git clone https://github.com/yourusername/dutchit
cd dutchit
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Then run the contents of `supabase/rls-policies.sql`
4. Enable **Google OAuth**: Auth → Providers → Google → Enable
5. Add your OAuth credentials (from [Google Console](https://console.developers.google.com))
6. Copy your **Project URL** and **API keys** from Settings → API

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
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

Push to GitHub, connect your repo at [vercel.com/new](https://vercel.com/new), add the env variables, and deploy.

**Free tier is more than enough:**
- Vercel: Unlimited deploys, 100GB bandwidth/month
- Supabase: 500MB DB, 1GB storage, 50K active users/month

---

## 📁 Project Structure

```
dutchit/
├── app/
│   ├── (auth)/               # Login, signup, onboarding
│   ├── (app)/                # Protected routes
│   │   ├── dashboard/        # Overview + stats
│   │   ├── groups/[id]/      # Group expenses, balances, members
│   │   ├── personal/         # Personal finance dashboard
│   │   └── profile/          # Settings, UPI ID
│   └── auth/callback/        # OAuth callback
├── components/
│   ├── animations/           # CountUp and reusable motion
│   ├── dashboard/            # Dashboard widgets
│   ├── expenses/             # Add expense, split types
│   ├── finance/              # Personal finance charts
│   ├── groups/               # Group list, detail, balances
│   ├── layout/               # Sidebar, bottom nav, header, logo
│   ├── onboarding/           # 3-step onboarding flow
│   ├── profile/              # Profile settings
│   ├── settlements/          # UPI payment sheet, QR code
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── supabase/             # Browser client, server client, middleware
│   └── utils/
│       ├── debt-simplifier.ts  # Greedy debt minimization
│       ├── split-calculator.ts # 5 split type calculations
│       ├── upi.ts              # UPI deep links, QR, validation
│       └── formatters.ts       # INR, dates, initials
├── supabase/
│   ├── schema.sql            # Full DB schema with triggers
│   └── rls-policies.sql      # Row Level Security policies
└── types/
    └── database.ts           # Full TypeScript database types
```

---

## 💳 UPI Payment Flow

DutchIt uses **pure UPI deep links** — no payment gateway required:

1. Click "Pay Now" on a balance
2. Bottom sheet shows recipient's UPI ID + QR code
3. Tap GPay / PhonePe / Paytm / BHIM to open the native app
4. Confirm payment, optionally add UPI transaction reference
5. Settlement recorded as `pending_confirmation`
6. Recipient confirms → balances update + confetti 🎉

**Supported UPI apps:** Google Pay, PhonePe, Paytm, BHIM, any generic UPI app

---

## 🗺️ Roadmap

- [ ] Real UPI payment gateway (Razorpay/Cashfree)
- [ ] WhatsApp notifications for settlements
- [ ] React Native mobile app
- [ ] Multi-currency support with live exchange rates
- [ ] Recurring expenses (rent, subscriptions)
- [ ] AI-powered receipt scanning
- [ ] Spending insights with Claude AI
- [ ] Export to PDF/Excel

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

*DutchIt — Because "going Dutch" should be effortless.*
