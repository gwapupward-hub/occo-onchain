# OCCO Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Prerequisites Check

```bash
node --version  # Should be >= 18
pnpm --version  # Should be >= 9
docker --version  # For Postgres/Redis
```

### 2. Clone & Install

```bash
# Install dependencies (takes 1-2 minutes)
pnpm install
```

### 3. Start Infrastructure

```bash
# Start Postgres and Redis
docker compose up -d

# Wait 10 seconds for services to initialize
sleep 10
```

### 4. Configure Environment

```bash
# Copy environment templates
cp apps/api/.env.example apps/api/.env
cp services/indexer/.env.example services/indexer/.env
cp apps/web/.env.example apps/web/.env

# The defaults work for local development!
# For production, edit these files with your credentials
```

### 5. Start All Services

```bash
# This starts API, Web, and Indexer
pnpm dev
```

Services available at:
- **API**: http://localhost:3000
- **Web UI**: http://localhost:3001  
- **Indexer**: http://localhost:3002

### 6. Test the API

```bash
# Run the test suite
./scripts/test-api.sh
```

### 7. Load Test Data (Optional)

```bash
# Seed database with 8 test wallets
psql -h localhost -U occo occo < scripts/seed-test-data.sql

# Test with seeded wallets
curl http://localhost:3000/v1/score/test_wallet_excellent_001 \
  -H "Authorization: Bearer dev_key_12345" | jq
```

## 🎯 Common Tasks

### Get a Wallet Score

```bash
curl http://localhost:3000/v1/score/WALLET_ADDRESS \
  -H "Authorization: Bearer dev_key_12345"
```

### Check Health

```bash
# API
curl http://localhost:3000/v1/health

# Indexer  
curl http://localhost:3002/health
```

### View Logs

```bash
# All services (if using docker compose for everything)
docker compose logs -f

# Just Postgres
docker compose logs -f postgres

# Just Redis
docker compose logs -f redis
```

### Access Database

```bash
# Connect to Postgres
psql -h localhost -U occo occo

# View wallets
SELECT * FROM wallets LIMIT 5;

# View loan events
SELECT * FROM loan_events LIMIT 10;

# Check migrations
SELECT * FROM migrations ORDER BY applied_at DESC;
```

### Access Redis

```bash
# Connect to Redis
redis-cli

# Check cached scores
KEYS occo:score:*

# View a cached score
GET occo:score:WALLET_ADDRESS

# Check rate limits
KEYS occo:api:*
```

## 🔧 Development Workflow

### Making Changes

```bash
# Changes hot-reload automatically with pnpm dev

# Type check
pnpm typecheck

# Build for production
pnpm build
```

### Adding a New Protocol

1. Create adapter in `services/indexer/src/adapters/newprotocol.adapter.ts`
2. Register in `services/indexer/src/pipeline.ts`
3. Add program ID to Helius webhook config
4. Test with real transactions

### Adding API Endpoints

1. Create route in `apps/api/src/v1/newroute.route.ts`
2. Register in `apps/api/src/server.ts`
3. Add to OpenAPI spec in `docs/OpenAPI.yaml`
4. Test with curl or test script

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check if ports are in use
lsof -i :3000  # API
lsof -i :3001  # Web
lsof -i :3002  # Indexer
lsof -i :5432  # Postgres
lsof -i :6379  # Redis

# Kill conflicting processes or change ports in .env
```

### Database Connection Errors

```bash
# Verify Postgres is running
docker compose ps postgres

# Check connection
psql -h localhost -U occo occo -c "SELECT 1;"

# Restart Postgres
docker compose restart postgres
```

### Redis Connection Errors

```bash
# Verify Redis is running  
docker compose ps redis

# Test connection
redis-cli ping

# Restart Redis
docker compose restart redis
```

### Migrations Not Running

```bash
# Migrations run automatically when indexer starts
# Check indexer logs for migration status

# Force re-run (delete migration records)
psql -h localhost -U occo occo -c "DELETE FROM migrations;"

# Then restart indexer
```

### Scores Always Low Confidence

This is normal! Without real Solana data, the database is empty.

**Solutions**:
1. Seed test data: `psql ... < scripts/seed-test-data.sql`
2. Set up Helius webhook (see DEPLOYMENT.md)
3. Manually insert data via SQL

## 📚 Next Steps

### For Development
1. Read `docs/IMPLEMENTATION_SUMMARY.md` - What was built
2. Read `docs/DEPLOYMENT.md` - Production deployment
3. Check `docs/PRD.md` - Product requirements
4. Review `docs/OpenAPI.yaml` - API specification

### For Production
1. Get Helius API key: https://dev.helius.xyz
2. Generate production API keys (32+ random chars)
3. Set up monitoring (Sentry, DataDog, etc.)
4. Configure domain and SSL
5. Follow deployment guide in `docs/DEPLOYMENT.md`

## 🔑 Default Credentials

**Development API Key**: `dev_key_12345`
**Database**: 
- User: `occo`
- Password: `occo`  
- Database: `occo`
- Port: `5432`

**Redis**:
- Port: `6379`
- No password (local only)

⚠️ **Change all credentials for production!**

## 📞 Getting Help

1. Check error logs first
2. Run test suite: `./scripts/test-api.sh`
3. Review troubleshooting section above
4. Read relevant docs in `docs/` folder
5. Check implementation files in `apps/` and `services/`

## 🎉 You're Ready!

Your OCCO instance is now running with:
- ✅ Real-time Solana indexing (ready for Helius)
- ✅ Multi-protocol support (Solend, Marginfi)
- ✅ API authentication & rate limiting
- ✅ Redis caching for performance
- ✅ Position tracking for accurate scores
- ✅ Production-grade security

Happy building! 🚀
