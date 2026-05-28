# Contributing to Dutch It!

Thanks for your interest in contributing! Dutch It! is open source and welcomes contributions of all kinds.

## Getting Started

1. Fork the repository and clone it locally
2. Follow the setup guide in [README.md](README.md) to get the project running
3. Create a new branch for your change: `git checkout -b feature/your-feature`

## Development Workflow

```bash
npm run dev    # local development
npm run build  # check for build errors before submitting
npm run lint   # lint
```

## What to Contribute

- **Bug fixes** — check the Issues tab for open bugs
- **New features** — check the Roadmap in README.md or open an issue to discuss first
- **UI improvements** — design contributions are very welcome
- **Documentation** — improve the README, add inline comments where logic is non-obvious
- **Tests** — we'd love more test coverage

## Code Style

- TypeScript throughout — avoid `any` unless absolutely necessary (and comment why)
- Validate all user inputs with Zod
- Client components must be marked `'use client'`
- All currency display uses `formatINR()` from `lib/utils/formatters.ts`
- Glass card pattern: `className="glass rounded-2xl p-4"` (or `glass-strong` for nav/header elements)
- Animations use Framer Motion — keep stagger delays ≤ `i * 0.04` so lists animate in under 200ms
- New Supabase tables need RLS policies in `supabase/rls-policies.sql` and types in `types/database.ts`

## Important Technical Notes

These will save you debugging time:

- **Next.js version is 16** — APIs may differ from your training data or docs. Check `node_modules/next/dist/docs/` if something behaves unexpectedly.
- **`unstable_cache` + Supabase** don't mix — `cookies()` from `next/headers` is request-scoped and throws inside `unstable_cache`. Use React's `cache()` from `lib/auth.ts` for per-request deduplication instead.
- **`typeof window !== 'undefined'`** is unreliable in Next.js 16 Turbopack prerender — it simulates `window`. Use `'use client'` + `useEffect` patterns for browser-only code.
- **`PersistQueryClientProvider`** from `@tanstack/react-query-persist-client` is incompatible with this setup — it crashes during Vercel prerender. Do not reintroduce without resolving the SSR context gap. See `OFFLINE_SYNC_NOTES.md`.
- **RLS recursion** — Group membership policies use `security definer` helper functions (`is_group_member`, `is_group_admin`) to avoid infinite recursion. Follow the same pattern for any new group-scoped policies.

## Database Migrations

When adding new tables or columns:

1. Update `supabase/schema.sql` (source of truth for new installs)
2. Create a file in `supabase/migrations/` for upgrading existing DBs
3. Add RLS policies to `supabase/rls-policies.sql`
4. Add TypeScript types to `types/database.ts`

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Write a clear description of what changed and why
- Reference related issues: `Closes #123`
- Screenshots or screen recordings for UI changes are highly appreciated
- Run `npm run build` locally before opening the PR — Vercel will catch TypeScript errors but it's faster to fix them locally

## Reporting Bugs

Use the GitHub Issues tab. Include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser and device
- Any console errors

## Questions?

Open a GitHub Discussion or an issue.

Thank you for making Dutch It! better!
