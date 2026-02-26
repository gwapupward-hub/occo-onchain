# OCCO — OnChain Credit Organization

OCCO provides standardized, explainable, and verifiable credit scores for on-chain wallets (Solana-first).

This repository is a monorepo containing:
- API service (public score/report endpoints)
- Web app (institutional public lookup UI)
- Indexer service (Solana ingestion + normalization)
- Scoring library (deterministic scoring engine)
- Shared types package

## Monorepo structure

- `apps/api` — OCCO HTTP API (Node/TS)
- `apps/web` — Public lookup UI (Next.js)
- `services/indexer` — Solana indexer + protocol adapters (Node/TS)
- `services/scoring` — Scoring engine library (TypeScript)
- `packages/types` — Shared TypeScript types
- `docs/` — PRD, OpenAPI, investor/regulator memo

## Requirements

- Node.js >= 18
- pnpm >= 9
- Docker (recommended for local Postgres/Redis)

## Quick start (local)

1) Install deps
```bash
pnpm install
```

2) Start Postgres + Redis
```bash
docker compose up -d postgres redis
```

3) Configure env
```bash
cp apps/api/.env.example apps/api/.env
cp services/indexer/.env.example services/indexer/.env
# Edit DATABASE_URL / REDIS_URL as needed
```

4) Run dev (API + Web + Indexer + build shared packages)
```bash
pnpm dev
```

- API: http://localhost:3000
- Web: http://localhost:3001

## API endpoints (v1)

- `GET /v1/score/:wallet`
- `GET /v1/report/:wallet`
- `POST /v1/profile/claim`
- `POST /v1/attest`

## Notes

- Scoring logic lives only in `services/scoring`
- Shared types live only in `packages/types`
- UI never reads chain data directly; UI calls API only
- Indexer writes normalized facts to the database; API reads them

## License

Proprietary (default). Update if you plan to open-source any packages.
