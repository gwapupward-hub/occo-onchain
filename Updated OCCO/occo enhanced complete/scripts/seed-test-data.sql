-- OCCO Database Seed Script
-- Populates database with realistic test data for development/testing

-- Clear existing test data
DELETE FROM lending_positions WHERE wallet LIKE 'test_%';
DELETE FROM loan_events WHERE wallet LIKE 'test_%';
DELETE FROM wallets WHERE address LIKE 'test_%';

-- Create test wallets with varying credit profiles

-- Wallet 1: Excellent credit (A tier)
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_excellent_001', NOW() - INTERVAL '2 years', NOW() - INTERVAL '1 day');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_excellent_001', 'solend', 'borrow', 1000, NOW() - INTERVAL '2 years', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_excellent_001', 'solend', 'repay', 1000, NOW() - INTERVAL '1 year 11 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_excellent_001', 'marginfi', 'borrow', 5000, NOW() - INTERVAL '1 year', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_excellent_001', 'marginfi', 'repay', 5000, NOW() - INTERVAL '11 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_excellent_001', 'solend', 'borrow', 10000, NOW() - INTERVAL '6 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_excellent_001', 'solend', 'repay', 10000, NOW() - INTERVAL '5 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_excellent_001', 'marginfi', 'borrow', 15000, NOW() - INTERVAL '3 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_excellent_001', 'marginfi', 'repay', 15000, NOW() - INTERVAL '2 months', gen_random_uuid()::text);

INSERT INTO lending_positions (id, wallet, protocol, collateral_amount, borrow_amount, collateral_ratio, is_active, opened_at) VALUES
(gen_random_uuid(), 'test_wallet_excellent_001', 'solend', 50000, 15000, 3.33, true, NOW() - INTERVAL '1 month'),
(gen_random_uuid(), 'test_wallet_excellent_001', 'marginfi', 30000, 10000, 3.0, true, NOW() - INTERVAL '2 months');

-- Wallet 2: Good credit (B tier)
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_good_002', NOW() - INTERVAL '1 year', NOW() - INTERVAL '5 days');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_good_002', 'solend', 'borrow', 5000, NOW() - INTERVAL '1 year', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_good_002', 'solend', 'repay', 5000, NOW() - INTERVAL '11 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_good_002', 'marginfi', 'borrow', 3000, NOW() - INTERVAL '6 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_good_002', 'marginfi', 'repay', 3000, NOW() - INTERVAL '5 months', gen_random_uuid()::text);

INSERT INTO lending_positions (id, wallet, protocol, collateral_amount, borrow_amount, collateral_ratio, is_active, opened_at) VALUES
(gen_random_uuid(), 'test_wallet_good_002', 'solend', 20000, 8000, 2.5, true, NOW() - INTERVAL '3 months');

-- Wallet 3: Fair credit (C tier) - some late repayments
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_fair_003', NOW() - INTERVAL '6 months', NOW() - INTERVAL '30 days');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_fair_003', 'solend', 'borrow', 2000, NOW() - INTERVAL '6 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_fair_003', 'solend', 'repay', 2000, NOW() - INTERVAL '4 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_fair_003', 'solend', 'borrow', 1000, NOW() - INTERVAL '3 months', gen_random_uuid()::text);

INSERT INTO lending_positions (id, wallet, protocol, collateral_amount, borrow_amount, collateral_ratio, is_active, opened_at) VALUES
(gen_random_uuid(), 'test_wallet_fair_003', 'solend', 5000, 3000, 1.67, true, NOW() - INTERVAL '3 months');

-- Wallet 4: Poor credit (D tier) - liquidation history
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_poor_004', NOW() - INTERVAL '8 months', NOW() - INTERVAL '60 days');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_poor_004', 'marginfi', 'borrow', 5000, NOW() - INTERVAL '8 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_poor_004', 'marginfi', 'liquidation', 5000, NOW() - INTERVAL '7 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_poor_004', 'solend', 'borrow', 1000, NOW() - INTERVAL '4 months', gen_random_uuid()::text);

INSERT INTO lending_positions (id, wallet, protocol, collateral_amount, borrow_amount, collateral_ratio, is_active, opened_at) VALUES
(gen_random_uuid(), 'test_wallet_poor_004', 'solend', 3000, 2000, 1.5, true, NOW() - INTERVAL '4 months');

-- Wallet 5: High risk (E tier) - multiple liquidations
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_highrisk_005', NOW() - INTERVAL '3 months', NOW() - INTERVAL '90 days');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_highrisk_005', 'solend', 'borrow', 3000, NOW() - INTERVAL '3 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_highrisk_005', 'solend', 'liquidation', 3000, NOW() - INTERVAL '2 months 20 days', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_highrisk_005', 'marginfi', 'borrow', 2000, NOW() - INTERVAL '2 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_highrisk_005', 'marginfi', 'liquidation', 2000, NOW() - INTERVAL '1 month 20 days', gen_random_uuid()::text);

-- Wallet 6: New wallet (low confidence)
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_new_006', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_new_006', 'solend', 'borrow', 500, NOW() - INTERVAL '10 days', gen_random_uuid()::text);

INSERT INTO lending_positions (id, wallet, protocol, collateral_amount, borrow_amount, collateral_ratio, is_active, opened_at) VALUES
(gen_random_uuid(), 'test_wallet_new_006', 'solend', 1500, 500, 3.0, true, NOW() - INTERVAL '10 days');

-- Wallet 7: Inactive wallet
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_inactive_007', NOW() - INTERVAL '1 year', NOW() - INTERVAL '200 days');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_inactive_007', 'solend', 'borrow', 10000, NOW() - INTERVAL '1 year', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_inactive_007', 'solend', 'repay', 10000, NOW() - INTERVAL '10 months', gen_random_uuid()::text);

-- Wallet 8: Multi-protocol diversified
INSERT INTO wallets (address, first_seen, last_activity) VALUES
('test_wallet_diversified_008', NOW() - INTERVAL '18 months', NOW() - INTERVAL '2 days');

INSERT INTO loan_events (id, wallet, protocol, event_type, amount, timestamp, signature) VALUES
(gen_random_uuid(), 'test_wallet_diversified_008', 'solend', 'borrow', 5000, NOW() - INTERVAL '18 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_diversified_008', 'solend', 'repay', 5000, NOW() - INTERVAL '17 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_diversified_008', 'marginfi', 'borrow', 3000, NOW() - INTERVAL '12 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_diversified_008', 'marginfi', 'repay', 3000, NOW() - INTERVAL '11 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_diversified_008', 'solend', 'borrow', 8000, NOW() - INTERVAL '6 months', gen_random_uuid()::text),
(gen_random_uuid(), 'test_wallet_diversified_008', 'solend', 'repay', 8000, NOW() - INTERVAL '5 months', gen_random_uuid()::text);

INSERT INTO lending_positions (id, wallet, protocol, collateral_amount, borrow_amount, collateral_ratio, is_active, opened_at) VALUES
(gen_random_uuid(), 'test_wallet_diversified_008', 'solend', 25000, 7000, 3.57, true, NOW() - INTERVAL '2 months'),
(gen_random_uuid(), 'test_wallet_diversified_008', 'marginfi', 15000, 5000, 3.0, true, NOW() - INTERVAL '1 month');

-- Summary
SELECT 'Seeded test wallets:' as message;
SELECT address, first_seen, last_activity 
FROM wallets 
WHERE address LIKE 'test_%' 
ORDER BY address;

SELECT 'Total loan events per wallet:' as message;
SELECT wallet, COUNT(*) as event_count 
FROM loan_events 
WHERE wallet LIKE 'test_%' 
GROUP BY wallet 
ORDER BY wallet;

SELECT 'Active lending positions:' as message;
SELECT wallet, protocol, collateral_ratio, is_active 
FROM lending_positions 
WHERE wallet LIKE 'test_%' 
ORDER BY wallet, protocol;

-- Quick verification queries
SELECT 'Expected score distributions:' as message;
SELECT 
    CASE 
        WHEN address = 'test_wallet_excellent_001' THEN 'A tier (750-850)'
        WHEN address = 'test_wallet_good_002' THEN 'B tier (650-749)'
        WHEN address = 'test_wallet_fair_003' THEN 'C tier (550-649)'
        WHEN address = 'test_wallet_poor_004' THEN 'D tier (450-549)'
        WHEN address = 'test_wallet_highrisk_005' THEN 'E tier (300-449)'
        WHEN address = 'test_wallet_new_006' THEN 'Varies (low confidence)'
        WHEN address = 'test_wallet_inactive_007' THEN 'Penalized (inactive)'
        WHEN address = 'test_wallet_diversified_008' THEN 'A/B tier (diversified)'
    END as expected_tier,
    address
FROM wallets 
WHERE address LIKE 'test_%'
ORDER BY address;
