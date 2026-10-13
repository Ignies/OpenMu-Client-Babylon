<?php
declare(strict_types=1);
// Shared by the news pages, widget, slides and admin.

/** slug => ['name' => shown name, 'color' => #hex], in their order. */
function news_categories(): array
{
    static $all;
    if ($all !== null) return $all;
    $all = [];
    foreach (q('SELECT slug, name, color FROM web_news_category ORDER BY position, slug')->fetchAll() as $c) {
        $all[$c['slug']] = ['name' => label($c['name']), 'raw' => $c['name'], 'color' => $c['color']];
    }
    return $all;
}

function news_find(string $id): ?array
{
    return q('SELECT * FROM web_news WHERE id = ?', [$id])->fetch() ?: null;
}

function news_latest(int $limit, ?string $category = null, int $offset = 0): array
{
    $where = $category ? 'WHERE category = ?' : '';
    return q("SELECT * FROM web_news $where ORDER BY created_at DESC LIMIT $limit OFFSET $offset", $category ? [$category] : [])->fetchAll();
}

function news_tag(array $post): string
{
    $c = news_categories()[$post['category']] ?? ['name' => $post['category'], 'color' => '#8a94a3'];
    return '<span class="tag" style="--tag:' . e($c['color']) . '">' . e($c['name']) . '</span>';
}

function news_date(int $time): string
{
    return gmdate('d/m/Y', $time);
}

/** "13/10/2026 ~ 27/10/2026" for an event, '' otherwise. */
function news_span(array $post): string
{
    $fmt = static fn(string $d) => $d === '' ? '' : implode('/', array_reverse(explode('-', $d)));
    return trim($fmt($post['event_start']) . ($post['event_end'] !== '' ? ' ~ ' . $fmt($post['event_end']) : ''));
}
