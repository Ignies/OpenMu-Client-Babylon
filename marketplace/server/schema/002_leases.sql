-- Work one bot has taken for the length of a handover, so another bot on the
-- same rows leaves it alone. `key` is `listing:<id>`, `payout:<account>` or
-- `customer:<character>`; `until` is when the lease lapses on its own, for a
-- bot that died holding it.
--
--   sqlite3 /home/mu/.mu-marketplace/market.sqlite < marketplace/server/schema/002_leases.sql
CREATE TABLE IF NOT EXISTS leases (
  key       TEXT PRIMARY KEY,
  worker    TEXT NOT NULL,
  until     INTEGER NOT NULL
);
