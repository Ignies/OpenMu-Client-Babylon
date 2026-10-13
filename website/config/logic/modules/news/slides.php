<?php
declare(strict_types=1);
// Hero slides: featured posts whose event has not ended, newest first.

require_once __DIR__ . '/lib.php';

$today = gmdate('Y-m-d');
$rows = q("SELECT * FROM web_news WHERE featured = 1 AND (event_end = '' OR event_end >= ?) ORDER BY created_at DESC LIMIT 6", [$today])->fetchAll();
return array_map(static fn(array $p) => [
    'title' => $p['title'],
    'sub' => news_span($p) ?: $p['summary'],
    'kicker' => news_tag($p),
    'image' => $p['image'] ? url('media/' . $p['image']) : '',
    'href' => url('news/' . $p['id']),
    'cta' => t('news.read_more'),
], $rows);
