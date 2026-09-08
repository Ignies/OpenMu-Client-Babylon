-- The account creation log.
--
-- Until now the only record that an account was created was a line on stdout
-- (`registered <name> from <ip>`), which lives in journald, rolls
-- away, and cannot be asked a question. This table is the answer to "who
-- signed up and when" - the one an operator actually asks.
--
-- Apply with:
--   sqlite3 /var/lib/mu-register/signups.sqlite < 002_account_log.sql
--
-- Idempotent: safe to re-apply.

-- `bucket` is the same network form the rate limiter uses, not an address:
-- an IPv6 caller by its /64, an IPv4 caller whole. Storing the full address
-- would make this a list of who lives where, which is not what it is for.
CREATE TABLE IF NOT EXISTS account_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  login_name   TEXT NOT NULL,
  bucket       TEXT NOT NULL,
  at           INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS account_log_at ON account_log (at DESC);
CREATE INDEX IF NOT EXISTS account_log_name ON account_log (login_name);
