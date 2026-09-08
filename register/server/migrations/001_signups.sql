-- The rate limiter's memory, which this service has always created for itself
-- at startup, written down so the production database can be reproduced by
-- hand rather than by booting the service and hoping.
--
-- Apply with:
--   sqlite3 /var/lib/mu-register/signups.sqlite < 001_signups.sql
--
-- Idempotent: safe to re-apply.

-- `bucket` is a network, never an address: an IPv6 caller is counted by its
-- /64, an IPv4 caller whole. No account name here - this table only answers
-- "has this network had its allowance".
CREATE TABLE IF NOT EXISTS signups (
  bucket TEXT NOT NULL,
  at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS signups_bucket_at ON signups (bucket, at);
