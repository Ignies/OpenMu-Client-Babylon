-- The site's own tables. Portable SQL (Postgres in production, SQLite locally), no semicolons inside a statement.
CREATE TABLE IF NOT EXISTS web_setting (key VARCHAR(64) PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS web_module (name VARCHAR(64) PRIMARY KEY, enabled SMALLINT NOT NULL);
CREATE TABLE IF NOT EXISTS web_throttle (key VARCHAR(128) PRIMARY KEY, hits INTEGER NOT NULL, reset_at BIGINT NOT NULL);
