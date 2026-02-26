CREATE TABLE IF NOT EXISTS wallets (
  address TEXT PRIMARY KEY,
  first_seen TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS loan_events (
  id UUID PRIMARY KEY,
  wallet TEXT NOT NULL,
  protocol TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  timestamp TIMESTAMP NOT NULL
);
