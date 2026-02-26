# OCCO — OnChain Credit Organization

OCCO provides standardized, explainable, and verifiable credit scores for on-chain wallets (Solana-first).

## ✨ Key Features

- **Real-time Solana Data Ingestion** via Helius webhooks
- **Multi-Protocol Support**: Solend, Marginfi (expandable)
- **Intelligent Caching** with Redis for sub-100ms response times
- **Tiered API Authentication** with rate limiting
- **Position Tracking** for accurate collateral ratio calculation
- **Deterministic Scoring** (300-850 range) with full breakdown
- **Production-Ready** with migrations, security, and monitoring

## 🏗️ Architecture

```
┌─────────────┐
│   Helius    │ Webhooks → ┌──────────────┐
│   Solana    │             │   Indexer    │
└─────────────┘             │   Service    │
                            └──────┬───────┘
                                   │
                            ┌──────▼────────┐
                            │   PostgreSQL  │
                            │  + Positions  │
                            └──────┬────────┘
                                   │
                            ┌──────▼────────┐
                            │  API Service  │ ← Redis Cache
                            │  + Auth       │ ← Rate Limit
                            └──────┬────────┘
                                   │
                            ┌──────▼────────┐
                            │   Web App     │
                            │   (Next.js)   │
                            └───────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- Docker (for Postgres/Redis)

### 1. Install & Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d postgres redis

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp services/indexer/.env.example services/indexer/.env
cp apps/web/.env.example apps/web/.env

# Edit .env files with your configuration
```

### 2. Configure Helius (Required for Production Data)

1. Sign up at https://dev.helius.xyz
2. Create a webhook pointing to your indexer endpoint
3. Add these program IDs to webhook filters:
   - Solend: `So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo`
   - Marginfi: `MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA`
4. Add your `HELIUS_API_KEY` to `services/indexer/.env`

### 3. Run Development

```bash
pnpm dev
```

Services will start:
- **API**: http://localhost:3000
- **Web**: http://localhost:3001
- **Indexer**: http://localhost:3002

Database migrations run automatically on indexer startup.

## 📡 API Usage

### Authentication

All API requests require an API key:

```bash
curl https://api.occo.org/v1/score/WALLET_ADDRESS \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Configure API keys in `apps/api/.env`:

```env
API_KEYS=sk_live_abc123:premium:ClientName,sk_live_def456:enterprise:BigCorp
```

**Tiers**: `free`, `premium`, `enterprise`, `unlimited`

### Endpoints

**Get Score**
```bash
GET /v1/score/:wallet
```

Response:
```json
{
  "issuer": "OCCO",
  "wallet": "ABC123...",
  "modelVersion": "v0.1",
  "score": 687,
  "riskTier": "B",
  "confidence": 0.82,
  "flags": ["no_lending_history"],
  "breakdown": {
    "base": 500,
    "ageScore": 45,
    "repaymentScore": 150,
    "diversityScore": 20,
    "healthScore": 70,
    "liquidationPenalty": 0,
    "riskPenalty": 0,
    "inactivityPenalty": 0,
    "rawScore": 687,
    "finalScore": 687
  },
  "computedAt": "2025-02-03T12:00:00Z"
}
```

**Get Full Report**
```bash
GET /v1/report/:wallet
```

**Health Check**
```bash
GET /v1/health
```

## 🔒 Security Features

- **API Key Authentication** with tier-based access
- **Rate Limiting** via Redis (100-10,000 req/min based on tier)
- **Webhook Signature Verification** for Helius events
- **CORS Protection** with configurable origins
- **Helmet.js** security headers
- **Input Validation** with Zod schemas
- **SQL Injection Protection** with parameterized queries

## 📊 Database Schema

### Core Tables

**`wallets`** - Wallet metadata
```sql
address          TEXT PRIMARY KEY
first_seen       TIMESTAMP
last_activity    TIMESTAMP
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

**`loan_events`** - Transaction history
```sql
id               UUID PRIMARY KEY
wallet           TEXT
protocol         TEXT
event_type       TEXT (borrow|repay|liquidation)
amount           NUMERIC
timestamp        TIMESTAMP
signature        TEXT UNIQUE
created_at       TIMESTAMP
```

**`lending_positions`** - Active/historical positions
```sql
id                  UUID PRIMARY KEY
wallet              TEXT
protocol            TEXT
collateral_amount   NUMERIC
borrow_amount       NUMERIC
collateral_ratio    NUMERIC
is_active           BOOLEAN
opened_at           TIMESTAMP
closed_at           TIMESTAMP
updated_at          TIMESTAMP
```

### Indexes

Optimized for:
- Wallet lookups: `idx_loan_events_wallet`
- Protocol filtering: `idx_loan_events_protocol`
- Time-based queries: `idx_loan_events_timestamp`
- Duplicate prevention: `idx_loan_events_signature`
- Active positions: `idx_positions_active`

## 🎯 Scoring Methodology

OCCO Score = Base (500) + Positive Factors - Penalties

### Positive Factors
- **Age Score** (0-100): Up to 5 years = +100
- **Repayment Score** (0-200): 100% repayment rate = +200
- **Diversity Score** (0-50): Multiple protocols = +50
- **Health Score** (10-100): High collateral ratio = +100

### Penalties
- **Liquidation Penalty** (0-200): -100 per liquidation
- **Risk Penalty** (0-100): -50 per high-risk event
- **Inactivity Penalty** (0-50): Inactive >90 days = -50

### Risk Tiers
- **A**: 750-850 (Excellent)
- **B**: 650-749 (Good)
- **C**: 550-649 (Fair)
- **D**: 450-549 (Poor)
- **E**: 300-449 (High Risk)

### Confidence Score
Calculated based on:
- Wallet age (2+ years = +15%)
- Number of loans (10+ = +25%)
- Protocol diversity (3+ = +10%)
- Penalties for very new wallets

## 🛠️ Development

### Monorepo Structure

```
occo/
├── apps/
│   ├── api/          # Express REST API
│   └── web/          # Next.js frontend
├── services/
│   ├── indexer/      # Webhook processor + migrations
│   └── scoring/      # Scoring engine (pure TS)
├── packages/
│   └── types/        # Shared TypeScript types
├── docs/
│   ├── PRD.md
│   ├── OpenAPI.yaml
│   └── DEPLOYMENT.md
└── scripts/
    └── bootstrap.sql # Legacy (now using migrations)
```

### Adding a New Protocol

1. Create adapter in `services/indexer/src/adapters/`:

```typescript
export class KaminoAdapter implements LendingAdapter {
  protocol = "kamino";
  
  parse(payload: unknown): NormalizedLoanEvent[] {
    // Extract borrow/repay/liquidation events
    return events;
  }
}
```

2. Register in `services/indexer/src/pipeline.ts`:

```typescript
const adapters = [
  new SolendAdapter(),
  new MarginfiAdapter(),
  new KaminoAdapter(), // Add here
];
```

3. Add program ID to Helius webhook configuration

### Running Tests

```bash
# Coming soon - test suite in development
pnpm test
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

## 📈 Performance

- **Cache Hit Rate**: >90% for frequent wallets
- **API Response Time**: <100ms (cached), <500ms (uncached)
- **Indexer Throughput**: 1000+ events/second
- **Database Queries**: All indexed, <10ms avg

## 🚢 Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for comprehensive production deployment guide including:
- Helius webhook setup
- Environment configuration
- Docker deployment
- Database migrations
- Monitoring and troubleshooting
- Scaling recommendations

### Quick Production Deploy

```bash
# Build all services
pnpm build

# Run API
cd apps/api
NODE_ENV=production node dist/server.js

# Run Indexer (includes migrations)
cd services/indexer
NODE_ENV=production node dist/index.js

# Run Web
cd apps/web
pnpm start
```

## 📝 API Documentation

OpenAPI spec: [docs/OpenAPI.yaml](docs/OpenAPI.yaml)

Interactive docs coming soon at https://docs.occo.org

## 🎯 Roadmap

### v1.0 (Current)
- [x] Solana indexer with Helius
- [x] Multi-protocol support (Solend, Marginfi)
- [x] Position tracking
- [x] Redis caching
- [x] API authentication
- [x] Rate limiting
- [x] Database migrations

### v1.1 (Next)
- [ ] Additional protocols (Kamino, Drift, Jupiter)
- [ ] GraphQL API
- [ ] WebSocket real-time updates
- [ ] Email/Discord alerts
- [ ] SDK (JavaScript, Python)

### v2.0 (Future)
- [ ] Cross-chain support (Ethereum, Arbitrum)
- [ ] Machine learning scoring models
- [ ] On-chain attestations
- [ ] Governance token
- [ ] Identity verification (optional)

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (when test suite is available)
5. Submit a pull request

## 📄 License

Proprietary (default). Contact for licensing inquiries.

## 🙋 Support

- **Documentation**: Coming soon at docs.occo.org
- **Issues**: GitHub Issues
- **Email**: support@occo.org
- **Discord**: Coming soon

## 🏢 Business Model

OCCO is a data and analytics provider. We do not:
- Issue credit
- Make lending decisions
- Provide financial advice
- Collect PII by default

Revenue streams:
- API subscriptions (tiered pricing)
- Enterprise integrations
- Custom reporting services
- On-chain attestation fees (future)

---

Built with ❤️ for the DeFi ecosystem
