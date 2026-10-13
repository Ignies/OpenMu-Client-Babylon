<?php
declare(strict_types=1);
// /news lists posts (?c=category, ?p=page); /news/<id> shows one. Bodies are plain text with paragraphs.

require_once __DIR__ . '/lib.php';

$id = substr(request_path(), strlen('news/'));
if ($id !== '') {
    $post = news_find($id) ?? fail(404);
    layout($post['title'], static function () use ($post) { ?>
        <div class="wrap">
            <article class="panel panel-wide">
                <h1 class="h-title"><?= e($post['title']) ?></h1>
                <div class="post-meta"><?= news_tag($post) ?><span><?= news_date((int) $post['created_at']) ?></span>
                    <?php if ($span = news_span($post)): ?><span><?= e($span) ?></span><?php endif ?></div>
                <?php if ($post['image']): ?><div class="post-media skel"><img class="fade" src="<?= url('media/' . $post['image']) ?>" alt=""></div><?php endif ?>
                <div class="post-body"><?php foreach (preg_split('/\R{2,}/', trim($post['body'])) as $para): ?><p><?= nl2br(e($para)) ?></p><?php endforeach ?></div>
                <div class="divider"></div>
                <div class="center"><a class="btn" href="<?= url('news') ?>"><?= e(t('news.all')) ?></a></div>
            </article>
        </div>
    <?php });
    return;
}

$cats = news_categories();
$category = isset($cats[input('c')]) ? input('c') : null;
$page = max(1, (int) input('p'));
$posts = news_latest(21, $category, ($page - 1) * 20);
layout(t('news.title'), static function () use ($posts, $cats, $category, $page) {
    $tabs = ['' => [t('news.everything'), url('news')]];
    foreach ($cats as $slug => $c) $tabs[$slug] = [$c['name'], url('news?c=' . $slug)];
    $q = $category ? "c=$category&" : '' ?>
    <div class="wrap">
        <section class="panel panel-wide">
            <h1 class="h-title"><?= e(t('news.title')) ?></h1>
            <?= subtabs($tabs, $category ?? '') ?>
            <?php if (!$posts): ?><p class="muted center"><?= e(t('news.none')) ?></p><?php endif ?>
            <ul class="news-list">
                <?php foreach (array_slice($posts, 0, 20) as $p): ?>
                    <li class="news-row">
                        <?= news_tag($p) ?>
                        <a class="news-title" href="<?= url('news/' . $p['id']) ?>"><?= e($p['title']) ?></a>
                        <span class="news-date"><?= news_date((int) $p['created_at']) ?></span>
                    </li>
                <?php endforeach ?>
            </ul>
            <div class="tabs">
                <?php if ($page > 1): ?><a class="btn btn-sm" href="<?= url("news?{$q}p=" . ($page - 1)) ?>"><?= e(t('news.newer')) ?></a><?php endif ?>
                <?php if (count($posts) > 20): ?><a class="btn btn-sm" href="<?= url("news?{$q}p=" . ($page + 1)) ?>"><?= e(t('news.older')) ?></a><?php endif ?>
            </div>
        </section>
    </div>
<?php });
