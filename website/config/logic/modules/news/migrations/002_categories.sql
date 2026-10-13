-- News categories, editable in Admin > News. Names starting with @ are text keys (translated); edited ones are literal.
CREATE TABLE IF NOT EXISTS web_news_category (
    slug VARCHAR(24) PRIMARY KEY,
    name VARCHAR(48) NOT NULL,
    color VARCHAR(7) NOT NULL,
    position INTEGER NOT NULL
);
INSERT INTO web_news_category (slug, name, color, position) VALUES ('notice', '@news.cat.notice', '#8a94a3', 1);
INSERT INTO web_news_category (slug, name, color, position) VALUES ('event', '@news.cat.event', '#e0402c', 2);
INSERT INTO web_news_category (slug, name, color, position) VALUES ('update', '@news.cat.update', '#5b8fd0', 3);
INSERT INTO web_news_category (slug, name, color, position) VALUES ('maintenance', '@news.cat.maintenance', '#d0a050', 4)
