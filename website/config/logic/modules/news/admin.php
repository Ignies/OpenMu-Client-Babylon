<?php
declare(strict_types=1);
// Admin > News: posts (the list, and one form to write or edit a post: ?edit=<id>, ?edit=new) and categories
// (?view=categories: rename, recolour, reorder, add, remove; a removed category's posts move to the first one left).

require_once __DIR__ . '/lib.php';

$view = input('view') === 'categories' ? 'categories' : 'posts';
$editing = input('edit');
$post = $editing && $editing !== 'new' ? (news_find($editing) ?? fail(404)) : null;
$error = null;
$hex = static fn(string $v) => preg_match('/^#[0-9a-f]{6}$/i', $v) ? strtolower($v) : '#8a94a3';

if (is_post() && $view === 'categories') {
    $slug = input('slug');
    if (input('remove') !== '' && isset(news_categories()[$slug])) {
        $rest = array_values(array_diff(array_keys(news_categories()), [$slug]));
        if (!$rest) {
            $error = t('news.cat_last');
        } else {
            q('UPDATE web_news SET category = ? WHERE category = ?', [$rest[0], $slug]);
            q('DELETE FROM web_news_category WHERE slug = ?', [$slug]);
        }
    } elseif (isset(news_categories()[$slug])) {
        $name = mb_substr(input('name'), 0, 48);
        $old = news_categories()[$slug];
        // Unchanged seeded names stay keys, so they keep following the visitor's language.
        $name = $name === '' || $name === $old['name'] ? $old['raw'] : $name;
        q('UPDATE web_news_category SET name = ?, color = ?, position = ? WHERE slug = ?', [$name, $hex(input('color')), (int) input('position'), $slug]);
    } elseif (input('name') !== '') {
        $new = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(input('name'))), '-') ?: 'category';
        $new = substr($new, 0, 20) . (isset(news_categories()[$new]) ? '-' . random_int(10, 99) : '');
        q('INSERT INTO web_news_category (slug, name, color, position) VALUES (?, ?, ?, ?)', [$new, mb_substr(input('name'), 0, 48), $hex(input('color')), count(news_categories()) + 1]);
    }
    if ($error === null) {
        flash(t('news.cat_saved'));
        redirect('admin/news?view=categories');
    }
}

if (is_post() && $view === 'posts' && input('delete') !== '') {
    q('DELETE FROM web_news WHERE id = ?', [input('delete')]);
    flash(t('news.deleted'));
    redirect('admin/news');
}

if (is_post() && $view === 'posts') {
    $date = static fn(string $k) => preg_match('/^\d{4}-\d{2}-\d{2}$/', input($k)) ? input($k) : '';
    $row = [
        'category' => isset(news_categories()[input('category')]) ? input('category') : array_key_first(news_categories()),
        'title' => mb_substr(input('title'), 0, 160),
        'summary' => mb_substr(input('summary'), 0, 300),
        'body' => (string) ($_POST['body'] ?? ''),
        'image' => $post['image'] ?? '',
        'featured' => input('featured') === '1' ? 1 : 0,
        'event_start' => $date('event_start'),
        'event_end' => $date('event_end'),
    ];
    if ($row['title'] === '') $error = t('news.need_title');
    if ($error === null && ($_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        [$name, $error] = media_store($_FILES['image']);
        if ($name !== null && preg_match('/\.(mp4|webm)$/', $name)) $error = t('news.need_image');
        elseif ($name !== null) $row['image'] = $name;
    }
    if ($error === null) {
        if ($post) {
            $set = implode(', ', array_map(static fn($k) => "$k = ?", array_keys($row)));
            q("UPDATE web_news SET $set WHERE id = ?", [...array_values($row), $post['id']]);
        } else {
            $row += ['id' => uuid(), 'author' => user()['login'], 'created_at' => time()];
            q('INSERT INTO web_news (' . implode(', ', array_keys($row)) . ') VALUES (' . implode(', ', array_fill(0, count($row), '?')) . ')', array_values($row));
        }
        flash(t('news.saved'));
        redirect('admin/news');
    }
}

admin_layout('news', static function () use ($view, $editing, $post, $error) {
    echo subtabs(['posts' => [t('news.posts'), url('admin/news')], 'categories' => [t('news.categories'), url('admin/news?view=categories')]], $view);
    if ($error): ?><div class="flash flash-error"><?= e($error) ?></div><?php endif;

    if ($view === 'categories'): ?>
        <div class="module-list">
            <?php $i = 0; foreach (news_categories() as $slug => $c): $i++ ?>
                <form method="post" class="module-row cat-row">
                    <?= csrf_field() ?>
                    <input type="hidden" name="slug" value="<?= e($slug) ?>">
                    <span class="tag" style="--tag:<?= e($c['color']) ?>"><?= e($c['name']) ?></span>
                    <input class="input" name="name" value="<?= e($c['name']) ?>" maxlength="48" aria-label="<?= e(t('news.cat_name')) ?>">
                    <input class="input input-color" type="color" name="color" value="<?= e($c['color']) ?>" aria-label="<?= e(t('news.cat_color')) ?>">
                    <input class="input input-num" type="number" name="position" value="<?= $i ?>" min="1" aria-label="<?= e(t('news.cat_order')) ?>">
                    <button class="btn btn-sm" type="submit"><?= e(t('save')) ?></button>
                    <button class="btn btn-sm btn-ghost" type="submit" name="remove" value="1" data-confirm-click="<?= e(t('news.cat_remove_confirm')) ?>"><?= e(t('remove')) ?></button>
                </form>
            <?php endforeach ?>
            <form method="post" class="module-row cat-row">
                <?= csrf_field() ?>
                <span class="tag"><?= e(t('news.cat_new')) ?></span>
                <input class="input" name="name" maxlength="48" required placeholder="<?= e(t('news.cat_name')) ?>">
                <input class="input input-color" type="color" name="color" value="#8a94a3">
                <button class="btn btn-sm btn-primary" type="submit"><?= e(t('add')) ?></button>
            </form>
        </div>
        <?php return;
    endif;

    if (!$editing): ?>
        <div class="row-actions"><a class="btn btn-primary" href="<?= url('admin/news?edit=new') ?>"><?= e(t('news.new')) ?></a></div>
        <ul class="news-list">
            <?php foreach (news_latest(100) as $p): ?>
                <li class="news-row">
                    <?= news_tag($p) ?>
                    <a class="news-title" href="<?= url('admin/news?edit=' . $p['id']) ?>"><?= $p['featured'] ? '&#9733; ' : '' ?><?= e($p['title']) ?></a>
                    <span class="news-date"><?= news_date((int) $p['created_at']) ?></span>
                </li>
            <?php endforeach ?>
        </ul>
        <?php return;
    endif;
    $p = $post ?? ['category' => array_key_first(news_categories()), 'title' => '', 'summary' => '', 'body' => '', 'image' => '', 'featured' => 0, 'event_start' => '', 'event_end' => ''] ?>
    <form method="post" enctype="multipart/form-data" class="form">
        <?= csrf_field() ?>
        <div class="form-grid">
            <label class="field"><span class="field-label"><?= e(t('news.category')) ?></span>
                <select class="input" name="category">
                    <?php foreach (news_categories() as $k => $c): ?><option value="<?= e($k) ?>"<?= $p['category'] === $k ? ' selected' : '' ?>><?= e($c['name']) ?></option><?php endforeach ?>
                </select>
            </label>
            <?= field('event_start', t('news.event_start'), 'date', $p['event_start']) ?>
            <?= field('event_end', t('news.event_end'), 'date', $p['event_end']) ?>
        </div>
        <?= field('title', t('news.post_title'), 'text', $p['title'], 'required maxlength="160"') ?>
        <?= field('summary', t('news.summary'), 'text', $p['summary'], 'maxlength="300"') ?>
        <label class="field"><span class="field-label"><?= e(t('news.body')) ?></span>
            <textarea class="input" name="body"><?= e($p['body']) ?></textarea>
        </label>
        <label class="field"><span class="field-label"><?= e(t($p['image'] ? 'news.image_replace' : 'news.image')) ?></span>
            <input class="input" type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif">
        </label>
        <label class="check"><input type="checkbox" name="featured" value="1"<?= $p['featured'] ? ' checked' : '' ?>> <?= e(t('news.feature')) ?></label>
        <div class="tabs">
            <a class="btn" href="<?= url('admin/news') ?>"><?= e(t('back')) ?></a>
            <button class="btn btn-primary" type="submit"><?= e(t('save')) ?></button>
        </div>
    </form>
    <?php if ($post): ?>
        <form method="post" class="center" data-confirm="<?= e(t('news.delete_confirm')) ?>">
            <?= csrf_field() ?>
            <input type="hidden" name="delete" value="<?= e($post['id']) ?>">
            <button class="btn btn-ghost" type="submit"><?= e(t('news.delete')) ?></button>
        </form>
    <?php endif;
});
