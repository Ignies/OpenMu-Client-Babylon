-- News posts. Featured ones with an image become hero slides until their event ends. Dates are YYYY-MM-DD.
CREATE TABLE IF NOT EXISTS web_news (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(16) NOT NULL,
    title VARCHAR(160) NOT NULL,
    summary VARCHAR(300) NOT NULL,
    body TEXT NOT NULL,
    image VARCHAR(64) NOT NULL,
    featured SMALLINT NOT NULL,
    event_start VARCHAR(10) NOT NULL,
    event_end VARCHAR(10) NOT NULL,
    author VARCHAR(10) NOT NULL,
    created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS web_news_created ON web_news (created_at)
