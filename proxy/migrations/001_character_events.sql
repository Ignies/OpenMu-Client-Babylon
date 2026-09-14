-- What each character did, as read off the wire by the proxy's tracker
-- (documentation/admin_console/ARCHITECTURE.md). Applied at startup by
-- proxy/track/store.ts and by hand on a live box:
--   sqlite3 ~/.mu-proxy/track.sqlite < proxy/migrations/001_character_events.sql

CREATE TABLE IF NOT EXISTS character_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  at        INTEGER NOT NULL,
  account   TEXT,
  character TEXT,
  kind      TEXT NOT NULL,
  text      TEXT NOT NULL,
  data      TEXT
);

CREATE INDEX IF NOT EXISTS character_events_character_at
  ON character_events (character COLLATE NOCASE, at);

CREATE INDEX IF NOT EXISTS character_events_at
  ON character_events (at);
