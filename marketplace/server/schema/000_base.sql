-- The marketplace's own SQLite. Applied at every service start (each
-- statement is idempotent) and, on a live box, by hand after a deploy:
--
--   sqlite3 /home/mu/.mu-marketplace/market.sqlite < marketplace/server/schema/000_base.sql
--
-- Listings: one row per item a seller asked to sell. `state` is the whole
-- story (see db.ts, ListingState); `holder` and `holder_slot` say which bot
-- account has the item and in which bag slot.
CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,
  seller        TEXT NOT NULL,
  seller_char   TEXT NOT NULL,
  price         INTEGER NOT NULL,
  item_group    INTEGER NOT NULL,
  item_number   INTEGER NOT NULL,
  item_level    INTEGER NOT NULL DEFAULT 0,
  item_json     TEXT NOT NULL,
  category      TEXT NOT NULL,
  state         TEXT NOT NULL,
  holder        TEXT,
  holder_slot   INTEGER,
  buyer         TEXT,
  buyer_char    TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS listings_state ON listings (state);
CREATE INDEX IF NOT EXISTS listings_seller ON listings (seller);
CREATE INDEX IF NOT EXISTS listings_item ON listings (item_group, item_number);

-- Zen owed to sellers from sales made while they were away.
CREATE TABLE IF NOT EXISTS balances (
  account   TEXT PRIMARY KEY,
  zen       INTEGER NOT NULL DEFAULT 0
);

-- One row for everything that moves.
CREATE TABLE IF NOT EXISTS audit (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  at        INTEGER NOT NULL,
  listing   TEXT,
  account   TEXT,
  event     TEXT NOT NULL,
  detail    TEXT
);
