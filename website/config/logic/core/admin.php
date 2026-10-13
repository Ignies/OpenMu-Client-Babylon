<?php
declare(strict_types=1);
// Admin panel (Game Master accounts). Core sections: modules on and off, theme and background. Modules add
// their own tabs (`admin` in module.php); their file handles the section and renders through admin_layout().

require_admin();
$section = substr(request_path(), strlen('admin/')) ?: 'modules';
$moduleSections = module_admin_sections();
if (isset($moduleSections[$section])) {
    require $moduleSections[$section][1];
    return;
}
if (!in_array($section, ['modules', 'appearance'], true)) fail(404);

if (is_post() && $section === 'modules') {
    module_set(input('module'), input('on') === '1');
    flash(t('admin.module_saved'));
    redirect('admin/modules');
}

$error = null;
if (is_post() && $section === 'appearance') {
    $b = background();
    $color = static fn(string $k) => preg_match('/^#[0-9a-f]{6}$/i', input($k)) ? input($k) : $b[$k];
    $int = static fn(string $k, int $min, int $max) => max($min, min($max, (int) input($k)));
    $next = [
        'type' => in_array(input('type'), ['map', 'image', 'video', 'color', 'gradient'], true) ? input('type') : 'map',
        'color' => $color('color'), 'from' => $color('from'), 'to' => $color('to'), 'tint' => $color('tint'),
        'angle' => $int('angle', 0, 360), 'tint_strength' => $int('tint_strength', 0, 100), 'art' => $int('art', 0, 100),
        'dim' => $int('dim', 0, 100), 'blur' => $int('blur', 0, 40),
        'grain' => input('grain') === '1', 'vignette' => input('vignette') === '1', 'motion' => input('motion') === '1',
        'media' => $b['media'],
    ];
    if (($_FILES['media']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        [$name, $error] = media_store($_FILES['media']);
        if ($name !== null) {
            $next['media'] = $name;
            $next['type'] = preg_match('/\.(mp4|webm)$/', $name) ? 'video' : 'image';
        }
    }
    if ($error === null) {
        setting_set('background', $next);
        if (isset(SITE_THEMES[input('theme')])) setting_set('theme', input('theme'));
        flash(t('admin.appearance_saved'));
        redirect('admin/appearance');
    }
}

admin_layout($section, static function () use ($section, $error) {
    if ($error): ?><div class="flash flash-error"><?= e($error) ?></div><?php endif;
    if ($section === 'modules'): ?>
        <p class="muted"><?= e(t('admin.modules_lead')) ?></p>
        <div class="module-list">
            <?php foreach (modules_installed() as $name => $m): $on = module_on($name) ?>
                <form method="post" class="module-row">
                    <?= csrf_field() ?>
                    <input type="hidden" name="module" value="<?= e($name) ?>">
                    <input type="hidden" name="on" value="<?= $on ? '0' : '1' ?>">
                    <div>
                        <strong><?= e(label($m['title'])) ?></strong> <span class="tag"><?= e($name) ?></span>
                        <p class="muted small"><?= e(label($m['description'])) ?></p>
                    </div>
                    <button class="btn btn-sm toggle<?= $on ? ' is-on' : '' ?>" type="submit" aria-pressed="<?= $on ? 'true' : 'false' ?>"><?= e(t($on ? 'on' : 'off')) ?></button>
                </form>
            <?php endforeach ?>
        </div>
    <?php else: $b = background() ?>
        <p class="muted"><?= e(t('admin.appearance_lead')) ?></p>
        <form method="post" enctype="multipart/form-data" class="form form-grid" data-bg-form>
            <?= csrf_field() ?>
            <div class="field"><span class="field-label"><?= e(t('admin.theme')) ?></span>
                <div class="swatches">
                    <?php foreach (SITE_THEMES as $name => $hex): ?>
                        <label class="swatch" title="<?= e(t("theme.$name")) ?>" style="--sw:<?= e($hex) ?>"><input type="radio" name="theme" value="<?= e($name) ?>"<?= theme() === $name ? ' checked' : '' ?>><span></span></label>
                    <?php endforeach ?>
                </div>
            </div>
            <label class="field"><span class="field-label"><?= e(t('admin.bg_type')) ?></span>
                <select class="input" name="type">
                    <?php foreach (['map', 'image', 'video', 'color', 'gradient'] as $v): ?>
                        <option value="<?= $v ?>"<?= $b['type'] === $v ? ' selected' : '' ?>><?= e(t("admin.bg.$v")) ?></option>
                    <?php endforeach ?>
                </select>
            </label>
            <label class="field"><span class="field-label"><?= e(t('admin.bg_media', ['mb' => (int) config('upload_max_mb')])) ?></span>
                <input class="input" type="file" name="media" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm">
            </label>
            <?= field('art', t('admin.bg_art'), 'range', (string) $b['art'], 'min="0" max="100"') ?>
            <?= field('tint', t('admin.bg_tint'), 'color', $b['tint']) ?>
            <?= field('tint_strength', t('admin.bg_tint_strength'), 'range', (string) $b['tint_strength'], 'min="0" max="100"') ?>
            <?= field('dim', t('admin.bg_dim'), 'range', (string) $b['dim'], 'min="0" max="100"') ?>
            <?= field('blur', t('admin.bg_blur'), 'range', (string) $b['blur'], 'min="0" max="40"') ?>
            <?= field('color', t('admin.bg_color'), 'color', $b['color']) ?>
            <?= field('from', t('admin.bg_from'), 'color', $b['from']) ?>
            <?= field('to', t('admin.bg_to'), 'color', $b['to']) ?>
            <?= field('angle', t('admin.bg_angle'), 'range', (string) $b['angle'], 'min="0" max="360"') ?>
            <div class="checks">
                <?php foreach (['grain', 'vignette', 'motion'] as $k): ?>
                    <label class="check"><input type="checkbox" name="<?= $k ?>" value="1"<?= $b[$k] ? ' checked' : '' ?>> <?= e(t("admin.bg_$k")) ?></label>
                <?php endforeach ?>
            </div>
            <button class="btn btn-primary" type="submit"><?= e(t('save')) ?></button>
        </form>
    <?php endif;
});
