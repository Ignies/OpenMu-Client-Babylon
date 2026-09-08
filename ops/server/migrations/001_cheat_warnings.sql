-- The cheat-warning log.
--
-- OpenMU already notices around two dozen things a normal client cannot do -
-- attacking from a safe zone, repairing without an NPC, combining jewels
-- without Lahap - and writes each one through Serilog as a warning. The stock
-- deployment sends those to rolling text files, which roll away and cannot be
-- asked a question. This table is where they are kept and counted.
--
-- Apply with:
--   sqlite3 /var/lib/mu-ops/ops.sqlite < 001_cheat_warnings.sql
--
-- Idempotent: safe to re-apply.

-- `template` is OpenMU's Serilog message template, which is a literal in its
-- source and therefore a stable key for "which check tripped". `message` is
-- that template with its values filled in, kept so an operator reads a
-- sentence rather than a template. `properties` is the raw JSON of the
-- structured values, so a question nobody thought to ask yet can still be
-- answered.
CREATE TABLE IF NOT EXISTS cheat_warnings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  at         INTEGER NOT NULL,
  signal     TEXT NOT NULL,
  severity   TEXT NOT NULL,
  account    TEXT,
  character  TEXT,
  message    TEXT NOT NULL,
  template   TEXT NOT NULL,
  properties TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS cheat_warnings_at ON cheat_warnings (at DESC);
CREATE INDEX IF NOT EXISTS cheat_warnings_signal ON cheat_warnings (signal, at DESC);
CREATE INDEX IF NOT EXISTS cheat_warnings_account ON cheat_warnings (account, at DESC);
CREATE INDEX IF NOT EXISTS cheat_warnings_character ON cheat_warnings (character, at DESC);

-- Where the reader had got to in each log file, so a restart does not
-- re-ingest what it already has. Keyed by file, because Serilog rolls daily
-- and on size.
CREATE TABLE IF NOT EXISTS ingest_progress (
  file    TEXT PRIMARY KEY,
  offset  INTEGER NOT NULL,
  seen_at INTEGER NOT NULL
);
