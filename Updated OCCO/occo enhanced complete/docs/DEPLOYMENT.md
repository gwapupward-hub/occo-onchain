# OCCO Production Deployment Guide

## Overview
This guide covers deploying OCCO to production with all critical features enabled:
- Real Solana data ingestion via Helius webhooks
- Redis caching and rate limiting
- API authentication with tiered access
- Database migrations and indexes
- Position tracking for collateral ratios
- Webhook signature verification

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- PostgreSQL >= 16
- Redis >= 7
- Helius API account (for webhook data)

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d postgres redis
```

Wait 10 seconds for services to initialize.

### 3. Configure Environment

```bash
# API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your configuration

# Indexer
cp services/indexer/.env.example services/indexer/.env
# Edit services/indexer/.env with your Helius credentials

# Web
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env if needed
```

### 4. Run All Services

```bash
pnpm dev
```

This starts:
- API: http://localhost:3000
- Web: http://localhost:3001
- Indexer: http://localhost:3002

The indexer will automatically run database migrations on startup.

## Helius Webhook Configuration

### 1. Create Helius Webhook

1. Go to https://dev.helius.xyz/dashboard
2. Navigate to Webhooks → Create Webhook
3. Configure:
   - **Webhook URL**: `https://your-domain.com/webhook`
   - **Type**: Enhanced Transactions
   - **Account Addresses**: Add Solend and Marginfi program IDs:
     - Solend: `So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo`
     - Marginfi: `MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA`
   - **Transaction Types**: All (or specific to lending)
   - **Auth Header**: Use your `WEBHOOK_SECRET` from `.env`

### 2. Test Webhook Locally

Use ngrok for local testing:

```bash
ngrok http 3002
# Use the ngrok URL in Helius webhook config
```

### 3. Verify Webhook

Send a test event from Helius dashboard or:

```bash
curl -X POST http://localhost:3002/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: your_signature" \
  -d '{
    "transaction": {
      "signature": "test123",
      "timestamp": 1234567890,
      "feePayer": "YourWalletAddress",
      "instructions": [{
        "programId": "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo"
      }],
      "description": "Borrow 100 USDC"
    }
  }'
```

## API Authentication

### API Key Format

API keys are configured in `apps/api/.env`:

```env
API_KEYS=key1:tier:name,key2:tier:name
```

**Tiers:**
- `free`: 100 requests/minute
- `premium`: 1,000 requests/minute
- `enterprise`: 10,000 requests/minute
- `unlimited`: No rate limit

**Example:**

```env
API_KEYS=sk_live_abc123:premium:Acme Corp,sk_live_def456:enterprise:BigBank
```

### Using API Keys

**Bearer Token:**
```bash
curl https://api.occo.org/v1/score/WALLET_ADDRESS \
  -H "Authorization: Bearer sk_live_abc123"
```

**Header:**
```bash
curl https://api.occo.org/v1/score/WALLET_ADDRESS \
  -H "x-api-key: sk_live_abc123"
```

## Production Deployment

### Environment Variables

**API Service (`apps/api/.env`):**

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@db-host:5432/occo
REDIS_URL=redis://redis-host:6379
CORS_ORIGIN=https://app.occo.org
API_KEYS=sk_live_xxx:premium:Client1,sk_live_yyy:enterprise:Client2
CACHE_TTL=300
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Indexer Service (`services/indexer/.env`):**

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://user:pass@db-host:5432/occo
HELIUS_API_KEY=your_helius_key
HELIUS_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_SECRET=secure_random_string_here
ENABLED_PROTOCOLS=solend,marginfi
LOG_LEVEL=info
```

**Web App (`apps/web/.env`):**

```env
NEXT_PUBLIC_OCCO_API_BASE=https://api.occo.org
```

### Build for Production

```bash
pnpm build
```

### Run Production Services

**API:**
```bash
cd apps/api
NODE_ENV=production node dist/server.js
```

**Indexer:**
```bash
cd services/indexer
NODE_ENV=production node dist/index.js
```

**Web:**
```bash
cd apps/web
pnpm start
```

### Docker Deployment (Recommended)

Create `Dockerfile.api`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api apps/api
COPY packages packages
COPY services/scoring services/scoring
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm build
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
```

Build and run:

```bash
docker build -f Dockerfile.api -t occo-api .
docker run -p 3000:3000 --env-file apps/api/.env occo-api
```

## Database Management

### Manual Migration Execution

Migrations run automatically on indexer startup. To run manually:

```bash
cd services/indexer
pnpm dev
# Migrations run on startup
```

### Check Migration Status

```sql
SELECT * FROM migrations ORDER BY applied_at DESC;
```

### Backup Database

```bash
pg_dump -h localhost -U occo occo > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -h localhost -U occo occo < backup_20250203.sql
```

## Monitoring and Observability

### Health Checks

```bash
# API
curl http://localhost:3000/v1/health

# Indexer
curl http://localhost:3002/health
```

### Cache Performance

Check `X-Cache` header in API responses:
- `HIT`: Served from Redis cache
- `MISS`: Computed fresh

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1675456789000
```

### Database Indexes

Verify indexes are created:

```sql
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

Expected indexes:
- `idx_loan_events_wallet`
- `idx_loan_events_protocol`
- `idx_loan_events_timestamp`
- `idx_loan_events_wallet_protocol`
- `idx_wallets_last_activity`
- `idx_positions_wallet`
- `idx_positions_active`
- `idx_loan_events_signature`

## Troubleshooting

### Issue: Webhooks not being received

**Check:**
1. Helius webhook configuration matches your endpoint
2. Webhook signature verification is passing
3. Indexer logs show incoming requests
4. Network/firewall allows incoming traffic

**Solution:**
```bash
# Check indexer logs
docker logs -f indexer-container

# Test webhook endpoint
curl -X POST http://localhost:3002/health
```

### Issue: Scores always showing low confidence

**Check:**
1. Database has wallet data: `SELECT COUNT(*) FROM wallets;`
2. Loan events are being recorded: `SELECT COUNT(*) FROM loan_events;`
3. Webhooks are being processed

**Solution:**
```bash
# Manually insert test data
psql -U occo occo
INSERT INTO wallets VALUES ('test123', NOW(), NOW());
INSERT INTO loan_events VALUES (gen_random_uuid(), 'test123', 'solend', 'borrow', 1000, NOW());
```

### Issue: Redis connection errors

**Check:**
1. Redis is running: `redis-cli ping`
2. `REDIS_URL` is correct in `.env`
3. Redis is accessible from app

**Solution:**
```bash
# Test Redis connection
redis-cli -u redis://localhost:6379 ping

# Check Redis memory
redis-cli info memory
```

### Issue: Database connection pool exhausted

**Check:**
- Number of active connections
- Slow queries

**Solution:**
Add to `apps/api/src/db.ts`:

```typescript
export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increase pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Checklist

- [ ] API keys are generated securely (minimum 32 random chars)
- [ ] `WEBHOOK_SECRET` is set to a strong random value
- [ ] Database uses strong password
- [ ] Redis requires authentication in production
- [ ] HTTPS is enabled (use nginx/caddy reverse proxy)
- [ ] CORS origins are restricted to known domains
- [ ] Rate limiting is enabled
- [ ] Environment files are not committed to git
- [ ] Database backups are automated
- [ ] Logs don't contain sensitive data

## Scaling Recommendations

### Horizontal Scaling

**API Service:**
- Deploy multiple API instances behind load balancer
- Redis ensures rate limiting works across instances
- All instances share same PostgreSQL database

**Indexer Service:**
- Run single indexer instance (webhook endpoint)
- Use message queue (RabbitMQ/SQS) for high volume
- Process events asynchronously in worker pool

### Database Optimization

**Connection Pooling:**
```typescript
// apps/api/src/db.ts
max: process.env.DB_POOL_SIZE || 20
```

**Read Replicas:**
- Direct score queries to read replicas
- Keep writes on primary

**Partitioning:**
```sql
-- Partition loan_events by month
CREATE TABLE loan_events_2025_02 PARTITION OF loan_events
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### Redis Optimization

**Connection Reuse:**
- Single Redis client per process
- Use connection pooling for high concurrency

**Memory Management:**
```
maxmemory 2gb
maxmemory-policy allkeys-lru
```

## Next Steps

1. **Add More Protocol Adapters**: Kamino, Drift, Jupiter
2. **Implement Analytics Dashboard**: Track API usage, top wallets
3. **Add Email Alerts**: Notify on liquidation risk
4. **Create SDK**: JavaScript/Python clients for easy integration
5. **Implement GraphQL API**: For flexible querying
6. **Add Attestation System**: On-chain score commitments
7. **Build Admin Portal**: Manage API keys, view metrics

## Support

For production support:
- GitHub Issues: github.com/occo/occo-api
- Email: support@occo.org
- Docs: docs.occo.org
