-- A seller pressing Collect. The bot pays a balance out only when somebody
-- has asked for it and is standing in the world to receive it, so the ask is
-- recorded here with the character the bot has to meet. One open request per
-- account; paid or dropped, the row goes.
--
--   sqlite3 /home/mu/.mu-marketplace/market.sqlite < marketplace/server/schema/001_payout_requests.sql
CREATE TABLE IF NOT EXISTS payout_requests (
  account       TEXT PRIMARY KEY,
  character     TEXT NOT NULL,
  requested_at  INTEGER NOT NULL
);
