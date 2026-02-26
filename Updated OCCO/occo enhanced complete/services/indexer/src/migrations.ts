import { db } from "./db.js";

export async function runMigrations() {
  const client = await db.connect();
  
  try {
    // Migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration 001: Base tables
    await runMigration(client, "001_base_tables", async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS wallets (
          address TEXT PRIMARY KEY,
          first_seen TIMESTAMP NOT NULL,
          last_activity TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS loan_events (
          id UUID PRIMARY KEY,
          wallet TEXT NOT NULL,
          protocol TEXT NOT NULL,
          event_type TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    });

    // Migration 002: Add indexes
    await runMigration(client, "002_add_indexes", async () => {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_loan_events_wallet ON loan_events(wallet);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_loan_events_protocol ON loan_events(protocol);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_loan_events_timestamp ON loan_events(timestamp DESC);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_loan_events_wallet_protocol ON loan_events(wallet, protocol);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_wallets_last_activity ON wallets(last_activity DESC);`);
    });

    // Migration 003: Position tracking for collateral ratios
    await runMigration(client, "003_position_tracking", async () => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS lending_positions (
          id UUID PRIMARY KEY,
          wallet TEXT NOT NULL,
          protocol TEXT NOT NULL,
          collateral_amount NUMERIC NOT NULL DEFAULT 0,
          borrow_amount NUMERIC NOT NULL DEFAULT 0,
          collateral_ratio NUMERIC,
          is_active BOOLEAN DEFAULT TRUE,
          opened_at TIMESTAMP NOT NULL,
          closed_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(wallet, protocol)
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_positions_wallet ON lending_positions(wallet);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_positions_active ON lending_positions(wallet, is_active);
      `);
    });

    // Migration 004: Add signature tracking to prevent duplicates
    await runMigration(client, "004_signature_tracking", async () => {
      await client.query(`
        ALTER TABLE loan_events 
        ADD COLUMN IF NOT EXISTS signature TEXT;
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_events_signature 
        ON loan_events(signature) 
        WHERE signature IS NOT NULL;
      `);
    });

    console.log("✅ All migrations completed successfully");
  } finally {
    client.release();
  }
}

async function runMigration(
  client: any,
  name: string,
  migration: () => Promise<void>
) {
  // Check if migration already applied
  const result = await client.query(
    "SELECT 1 FROM migrations WHERE name = $1",
    [name]
  );

  if (result.rowCount > 0) {
    console.log(`⏭️  Skipping migration ${name} (already applied)`);
    return;
  }

  console.log(`▶️  Running migration ${name}...`);
  await migration();
  
  await client.query(
    "INSERT INTO migrations (name) VALUES ($1)",
    [name]
  );
  
  console.log(`✅ Migration ${name} completed`);
}
