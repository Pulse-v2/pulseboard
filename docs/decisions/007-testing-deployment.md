# 007 — Testing and deployment readiness

## Decision

Use Vitest with jsdom and React Testing Library for fast unit and component
checks, and Playwright with Chromium for browser-level auth-page coverage. The
Playwright suite builds and serves the production app on port 3100. CI runs
typecheck, lint, unit/component tests, and E2E checks on pushes and pull
requests.

Deploy the MVP as one Node.js Next.js instance connected to hosted Supabase.
Vercel is the shortest path, while the same build can run with `pnpm start` on
another Node host that supports streaming. Database migrations are deployed
separately through the Supabase CLI after reviewing the pending migration list.

## Trade-offs

- **Vitest vs Jest:** Vitest uses the project's Vite-based React tooling and
  runs quickly without a second transform stack. Async Server Components are
  covered through browser tests because jsdom unit runners do not model their
  server execution.
- **Playwright Chromium vs a three-browser matrix:** Chromium covers the core
  signup/login flows without multiplying CI time and browser downloads. Broader
  browser coverage can be added once the MVP needs it.
- **One server instance vs distributed cache:** A single instance keeps
  deployment simple. Multi-instance deployments need shared cache and tag
  coordination for consistent revalidation.
- **No production demo seeding:** The local seed command uses privileged
  credentials and synthetic data. Hosted environments should use migrations
  only and create authorized demo data intentionally.

## Validation

Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm test:e2e`, and `pnpm exec supabase test db`. The SQL suite and backend
verification additionally require local Supabase and Docker.
