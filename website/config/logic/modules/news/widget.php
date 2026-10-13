<?php
declare(strict_types=1);
// Landing page: the latest posts.

require_once __DIR__ . '/lib.php';

$posts = news_latest(7);
card(t('news.latest'), static function () use ($posts) {
    if (!$posts): ?><p class="muted"><?= e(t('news.none')) ?></p><?php return; endif ?>
    <ul class="news-list">
        <?php foreach ($posts as $p): ?>
            <li class="news-row">
                <?= news_tag($p) ?>
                <a class="news-title" href="<?= url('news/' . $p['id']) ?>"><?= e($p['title']) ?></a>
                <span class="news-date"><?= news_date((int) $p['created_at']) ?></span>
            </li>
        <?php endforeach ?>
    </ul>
<?php }, 'w-news', 'news');
