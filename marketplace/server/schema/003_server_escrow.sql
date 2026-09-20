-- Server-side escrow: the game server's plugin moves the items, the service
-- only mints tokens and reads the boxes back. Each listing names its escrow
-- box (an unowned ItemStorage row in OpenMU's Postgres), the item row that
-- went into it, and what the seller is owed once it sold.
--
-- SQLite cannot ADD COLUMN IF NOT EXISTS, so db.ts skips each ALTER whose
-- column already exists. By hand it runs once; a second run reports
-- "duplicate column name" and changes nothing, which is fine:
--
--   sqlite3 /home/mu/.mu-marketplace/market.sqlite < marketplace/server/schema/003_server_escrow.sql
--
-- `holder`, `holder_slot`, `balances`, `payout_requests` and `leases` are no
-- longer written; they stay until a later migration drops them.
ALTER TABLE listings ADD COLUMN box_id TEXT;
ALTER TABLE listings ADD COLUMN item_id TEXT;
ALTER TABLE listings ADD COLUMN proceeds INTEGER;

CREATE INDEX IF NOT EXISTS listings_box ON listings (box_id);
