<?php
declare(strict_types=1);
// The page frame: loader, background, the bar with the emblem and nav, body, footer.

function e(mixed $v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function asset(string $path): string
{
    $file = dirname(__DIR__, 2) . '/../resources/' . $path;
    return '/config/resources/' . $path . (is_file($file) ? '?v=' . filemtime($file) : '');
}

function play_button(string $class = ''): string
{
    if (!user() || !config('client_url')) return '';
    return '<a class="btn btn-play ' . e($class) . '" href="' . url('play') . '">' . e(t('play')) . '</a>';
}

/** The vine underline that grows out from a bud under a nav item when it is hovered or current (site.css). */
function nav_vine(): string
{
    return '<svg class="vine" viewBox="0 0 120 16" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
        . '<path class="vine-stem" pathLength="1" d="M60 8 C 52 4, 44 12, 34 8 S 16 4, 9 9 C 5 12, 1 8, 4 5 C 6 3, 9 5, 7 7 M60 8 C 68 4, 76 12, 86 8 S 104 4, 111 9 C 115 12, 119 8, 116 5 C 114 3, 111 5, 113 7"/>'
        . '<path class="vine-leaf" d="M40 9 q 4 -6 9 -4 q -4 5 -9 4z M80 9 q -4 -6 -9 -4 q 4 5 9 4z M22 6 q 3 5 8 4 q -3 -5 -8 -4z M98 6 q -3 5 -8 4 q 3 -5 8 -4z"/>'
        . '<circle class="vine-bud" cx="60" cy="8" r="2.2"/></svg>';
}

/** The background the admin chose; the default is the landing page's world map tour. */
function background_html(): string
{
    $b = background();
    $vars = sprintf(
        '--bg-tint:%s;--bg-tint-strength:%s;--bg-art:%s;--bg-dim:%s;--bg-blur:%dpx;--bg-color:%s;--bg-from:%s;--bg-to:%s;--bg-angle:%ddeg',
        e($b['tint']), $b['tint_strength'] / 100, $b['art'] / 100, $b['dim'] / 100, (int) $b['blur'],
        e($b['color']), e($b['from']), e($b['to']), (int) $b['angle']
    );
    $classes = 'bg bg-' . e($b['type']) . ($b['grain'] ? ' has-grain' : '') . ($b['vignette'] ? ' has-vignette' : '') . ($b['motion'] ? ' has-motion' : '');
    $art = match ($b['type']) {
        // The landing's map tour with the credits (website/fx) mounts over this static map.
        'map' => '<div class="bg-map-layer"><div class="bg-map"></div><div class="bg-tint"></div></div>'
            . ($b['motion'] ? '<div id="mu-backdrop" class="fx-backdrop"></div>' : ''),
        'image' => $b['media'] ? '<div class="bg-media" style="background-image:url(' . e(url('media/' . $b['media'])) . ')"></div><div class="bg-tint"></div>' : '',
        'video' => $b['media'] ? '<video class="bg-media" src="' . e(url('media/' . $b['media'])) . '" autoplay muted loop playsinline></video><div class="bg-tint"></div>' : '',
        default => '',
    };
    return "<div class=\"$classes\" style=\"$vars\" aria-hidden=\"true\">$art<div class=\"bg-dim\"></div><div class=\"bg-vignette\"></div><div class=\"bg-fade\"></div></div>";
}

function layout(string $title, callable $body, string $pageClass = ''): void
{
    $site = config('name');
    $flash = session_status() === PHP_SESSION_ACTIVE ? flash() : null;
    $here = request_path();
    $link = static fn(string $path, string $label, string $class = '') => '<a class="nav-link ' . $class . ($here === $path || ($path !== '' && str_starts_with($here, $path)) ? ' is-here' : '') . '" href="' . url($path) . '">' . e($label) . nav_vine() . '</a>';
    ?><!DOCTYPE html>
<html lang="<?= e(lang()) ?>" data-theme="<?= e(theme()) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#050506">
    <title><?= e($title === '' ? $site : "$title - $site") ?></title>
    <meta name="description" content="<?= e(config('description')) ?>">
    <link rel="icon" href="/icons/icon-192.png">
    <link rel="preload" href="/ui/world_select/logo.webp" as="image">
    <link rel="stylesheet" href="<?= e(asset('img/ui/themes.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset('js/fx/fx.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset('css/site.css')) ?>">
    <script src="<?= e(asset('js/site.js')) ?>" defer></script>
    <script type="module" src="<?= e(asset('js/fx/fx.js')) ?>"></script>
</head>
<body class="<?= e($pageClass) ?>">
<div class="loader" data-loader role="status" aria-live="polite">
    <img class="loader-logo" src="/ui/world_select/logo.webp" alt="">
    <svg class="loader-vine" viewBox="0 0 420 40" aria-hidden="true">
        <path class="loader-track" d="M10 22 C 70 6, 120 36, 210 20 S 350 6, 410 22"/>
        <path class="loader-stem" pathLength="1" d="M10 22 C 70 6, 120 36, 210 20 S 350 6, 410 22"/>
    </svg>
    <span class="loader-label"><?= e(t('loading')) ?></span>
</div>
<?= background_html() ?>
<header class="head">
    <div class="bar">
        <div class="wrap bar-row">
            <a class="emblem" href="<?= url() ?>" aria-label="<?= e($site) ?>"><span class="emblem-mount"></span><span class="emblem-glow"></span><img src="/ui/world_select/logo.webp" alt=""></a>
            <button class="nav-toggle" type="button" aria-label="<?= e(t('menu')) ?>" aria-expanded="false"><span></span></button>
            <div class="drawer">
                <nav class="nav nav-left">
                    <?= $link('', t('nav.home')) ?>
                    <?php foreach (module_nav() as $item): ?><?= $link($item['path'], label($item['label'])) ?><?php endforeach ?>
                </nav>
                <nav class="nav nav-right">
                    <?php if ($me = user()): ?>
                        <details class="drop">
                            <summary class="nav-link"><?= e($me['login']) ?><?= nav_vine() ?></summary>
                            <div class="drop-panel drop-menu">
                                <a href="<?= url('account') ?>"><?= e(t('nav.account')) ?></a>
                                <?php if (is_admin()): ?><a href="<?= url('admin') ?>"><?= e(t('nav.admin')) ?></a><?php endif ?>
                                <form method="post" action="<?= url('logout') ?>"><?= csrf_field() ?><button type="submit"><?= e(t('nav.logout')) ?></button></form>
                            </div>
                        </details>
                        <?= play_button('btn-sm') ?>
                    <?php else: ?>
                        <details class="drop">
                            <summary class="nav-link"><?= e(t('nav.login')) ?><?= nav_vine() ?></summary>
                            <div class="drop-panel">
                                <form method="post" action="<?= url('login') ?>" class="form">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="next" value="<?= e($here) ?>">
                                    <?= field('login', t('field.id'), 'text', '', 'required maxlength="10" autocomplete="username"') ?>
                                    <?= field('password', t('field.password'), 'password', '', 'required maxlength="10" autocomplete="current-password"') ?>
                                    <button class="btn btn-primary btn-block" type="submit"><?= e(t('nav.login')) ?></button>
                                </form>
                            </div>
                        </details>
                        <?php if (module_on('registration')): ?><?= $link('register', t('nav.register'), 'nav-accent') ?><?php endif ?>
                    <?php endif ?>
                </nav>
            </div>
        </div>
    </div>
</header>
<main class="main">
    <?php if ($flash): ?><div class="wrap"><div class="flash flash-<?= e($flash[0]) ?>"><?= e($flash[1]) ?></div></div><?php endif ?>
    <?php $body() ?>
</main>
<footer class="foot">
    <div class="wrap foot-row">
        <img class="foot-logo" src="/ui/world_select/logo.webp" alt="">
        <div>
            <strong><?= e($site) ?></strong>
            <p class="muted small"><?= e(config('description')) ?></p>
        </div>
        <nav class="langs" aria-label="<?= e(t('language')) ?>">
            <?php foreach (languages() as $code => $name): ?>
                <a class="<?= $code === lang() ? 'is-here' : '' ?>" href="<?= url('lang?to=' . $code . '&next=' . rawurlencode($here)) ?>" hreflang="<?= e($code) ?>"><?= e($name) ?></a>
            <?php endforeach ?>
        </nav>
        <p class="muted small foot-credit"><?= e(t('footer.credit')) ?></p>
    </div>
</footer>
</body>
</html>
<?php
}

/** A titled card in the content column. */
function card(string $title, callable $body, string $class = '', string $more = ''): void
{ ?>
    <section class="card reveal <?= e($class) ?>">
        <header class="card-head"><h2><?= e($title) ?></h2><?php if ($more): ?><a class="card-more" href="<?= url($more) ?>"><?= e(t('more')) ?></a><?php endif ?></header>
        <?php $body() ?>
    </section>
<?php }

/** A labelled form field. */
function field(string $name, string $label, string $type = 'text', string $value = '', string $extra = ''): string
{
    return '<label class="field"><span class="field-label">' . e($label) . '</span><input class="input" name="' . e($name) . '" type="' . e($type) . '" value="' . e($value) . '" ' . $extra . '></label>';
}

/** Text tabs with a growing vine (sub-sections inside a card). */
function subtabs(array $tabs, string $active, string $attr = ''): string
{
    $out = '<div class="subtabs" ' . $attr . '>';
    foreach ($tabs as $key => [$label, $href]) {
        $on = $key === $active ? ' is-here' : '';
        $out .= $href === null
            ? '<button class="nav-link' . $on . '" type="button" data-tab="' . e($key) . '">' . e($label) . nav_vine() . '</button>'
            : '<a class="nav-link' . $on . '" href="' . e($href) . '">' . e($label) . nav_vine() . '</a>';
    }
    return $out . '</div>';
}

/** Admin pages: the panel with every section's tab (core and modules). */
function admin_layout(string $section, callable $body): void
{
    $tabs = ['modules' => [t('admin.modules'), url('admin/modules')], 'appearance' => [t('admin.appearance'), url('admin/appearance')]];
    foreach (module_admin_sections() as $key => [$label]) $tabs[$key] = [label($label), url("admin/$key")];
    layout(t('nav.admin'), static function () use ($section, $tabs, $body) { ?>
        <div class="wrap">
            <section class="panel">
                <h1 class="h-title"><?= e(t('nav.admin')) ?></h1>
                <?= subtabs($tabs, $section) ?>
                <?php $body() ?>
            </section>
        </div>
    <?php });
}
