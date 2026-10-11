-- Items up to negotiate (ours): no price and no escrow. The item stays in the
-- seller's bag; a buyer whispers the seller's character from the window and
-- the two trade in game, where the trade window shows the real item. An advert
-- lives three days or until its seller takes it down (offers.ts).
--
--   sqlite3 /home/mu/.mu-marketplace/market.sqlite < marketplace/server/schema/004_offers.sql
CREATE TABLE IF NOT EXISTS offers (
  id          TEXT PRIMARY KEY,
  seller      TEXT NOT NULL,
  seller_char TEXT NOT NULL,
  slot        INTEGER NOT NULL,
  item_group  INTEGER NOT NULL,
  item_number INTEGER NOT NULL,
  item_json   TEXT NOT NULL,
  category    TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS offers_seller ON offers (seller);
CREATE INDEX IF NOT EXISTS offers_expires ON offers (expires_at);
