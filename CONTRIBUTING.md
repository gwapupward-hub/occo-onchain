# Contributing to OCCO

Thanks for your interest in helping build OCCO — on-chain credit scores for Solana wallets.

## Getting Started

1. **Read the README** — understand the product and architecture before diving in.
2. **Read `docs/PRD.md`** — the product requirements document explains what we're building and why.
3. **Follow the QUICKSTART** — get a local environment running before making changes.

## Development Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure
docker compose up -d postgres redis

# 3. Copy env files
cp apps/api/.env.example apps/api/.env
cp services/indexer/.env.example services/indexer/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Start all services
pnpm dev
```

## Repository Structure

```
occo/
├── apps/
│   ├── api/          # Express REST API — public score endpoints
│   └── web/          # Next.js UI — institutional lookup dashboard
├── services/
│   ├── indexer/      # Helius webhook processor + DB migrations
│   └── scoring/      # Pure TypeScript scoring engine (no side effects)
├── packages/
│   └── types/        # Shared TypeScript types — the data contracts
├── docs/             # PRD, OpenAPI spec, deployment guide
└── scripts/          # SQL scripts for database setup and seeding
```

**Key rule:** the scoring engine (`services/scoring`) must remain a pure function library — no database calls, no network requests.

## How to Contribute

### Branching

- Branch off `main`
- Use descriptive branch names: `feat/kamino-adapter`, `fix/health-score-null`, `docs/openapi-update`

### Making Changes

1. Open an issue (or comment on an existing one) before starting significant work
2. Create your feature branch from `main`
3. Make focused, well-scoped commits
4. Open a pull request against `main` with a clear description of what changed and why

### Code Style

- **Language:** TypeScript (strict mode) across the entire repo
- **Module system:** ES modules everywhere (`"type": "module"`)
- **Formatting:** Keep consistent with the existing code style
- **No external state in scoring:** `services/scoring/src/index.ts` must stay pure

### Type Check Before Submitting

```bash
pnpm typecheck
```

## Good First Contributions

| Area | Task |
|------|------|
| **Protocol adapters** | Add a new lending protocol adapter in `services/indexer/src/adapters/` (Drift, Jupiter, etc.) |
| **Scoring** | Tune scoring parameters based on real data distribution |
| **Tests** | Add unit tests for scoring functions in `services/scoring` |
| **Web UI** | Improve the wallet lookup page in `apps/web` |
| **Docs** | Improve OpenAPI spec (`docs/OpenAPI.yaml`) or add JSDoc to functions |

### Adding a New Protocol Adapter

1. Create `services/indexer/src/adapters/<protocol>.adapter.ts` implementing `LendingAdapter`
2. Register it in `services/indexer/src/pipeline.ts`
3. Add the program ID to your Helius webhook filter

See `services/indexer/src/adapters/solend.adapter.ts` and `kamino.adapter.ts` for reference implementations.

## Questions

Open a GitHub Issue and tag it `question`. We'll get back to you.
