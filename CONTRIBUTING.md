# Contributing to DutchIt

Thanks for your interest in contributing! DutchIt is open source and welcomes contributions of all kinds.

## Getting Started

1. Fork the repository and clone it locally
2. Follow the setup guide in [README.md](README.md) to get the project running
3. Create a new branch for your change: `git checkout -b feature/your-feature`

## Development Workflow

- Run `npm run dev` for local development
- Run `npm run build` to check for build errors before submitting
- Run `npm run lint` for linting

## What to Contribute

- Bug fixes — check the Issues tab for open bugs
- New features — check the Roadmap in README.md or open an issue to discuss
- UI improvements — design contributions are very welcome
- Documentation — improve the README, add code comments
- Tests — we'd love more test coverage

## Code Style

- TypeScript strict mode — no `any` types unless absolutely necessary
- Use Zod for validation on all user inputs and API routes
- Follow the existing component patterns (client components marked `'use client'`)
- Glassmorphism card pattern: `className="glass rounded-2xl p-4"`
- Use `formatINR()` from `lib/utils/formatters.ts` for all currency display

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Add a clear description of what you changed and why
- Reference any related issues: `Closes #123`
- Screenshots for UI changes are highly appreciated

## Reporting Bugs

Use the GitHub Issues tab with the bug report template.

## Questions?

Open an issue or start a Discussion.

Thank you for making DutchIt better! 🎉
