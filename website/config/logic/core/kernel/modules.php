<?php
declare(strict_types=1);
// Modules: one folder each under logic/modules with a module.php manifest. Two switches decide if one runs:
// the install (settings `modules`, the installer's MU_SITE_MODULES) and the admin panel (web_module).

/** Every module this install ships: name => manifest. Names come from folders, never from a request. */
function modules_installed(): array
{
    static $all;
    if ($all !== null) return $all;
    $all = [];
    $allowed = config('modules');
    foreach (glob(MODULES . '/*/module.php') ?: [] as $file) {
        $name = basename(dirname($file));
        if (!preg_match('/^[a-z][a-z0-9_]*$/', $name) || ($allowed && !in_array($name, $allowed, true))) continue;
        $all[$name] = (require $file) + ['title' => $name, 'description' => '', 'default' => true, 'routes' => [], 'nav' => [], 'widgets' => [], 'admin' => [], 'slides' => null];
    }
    return $all;
}

/** Installed modules the admin has not turned off; a new module starts at its manifest's `default`. */
function modules_enabled(): array
{
    static $on;
    if ($on !== null) return $on;
    $saved = q('SELECT name, enabled FROM web_module')->fetchAll(PDO::FETCH_KEY_PAIR);
    return $on = array_filter(modules_installed(), static fn($m, $name) => (bool) ($saved[$name] ?? $m['default']), ARRAY_FILTER_USE_BOTH);
}

function module_on(string $name): bool
{
    return isset(modules_enabled()[$name]);
}

function module_set(string $name, bool $on): void
{
    if (!isset(modules_installed()[$name])) fail(400);
    q('DELETE FROM web_module WHERE name = ?', [$name]);
    q('INSERT INTO web_module (name, enabled) VALUES (?, ?)', [$name, $on ? 1 : 0]);
}

/** A file inside a module's own folder; a manifest cannot point outside it. */
function module_file(string $name, string $file): string
{
    if (!preg_match('/^[a-z0-9_]+\.php$/', $file)) throw new LogicException("module $name: bad file $file");
    return MODULES . "/$name/$file";
}

function module_routes(): array
{
    $routes = [];
    foreach (modules_enabled() as $name => $m) {
        foreach ($m['routes'] as $path => $file) $routes[$path] = module_file($name, $file);
    }
    return $routes;
}

/** Nav links of enabled modules for this visitor: `guest` links hide once logged in, `user` ones need a login. */
function module_nav(): array
{
    $links = [];
    foreach (modules_enabled() as $m) {
        foreach ($m['nav'] as $link) {
            $who = $link['who'] ?? 'all';
            if ($who === 'all' || ($who === 'guest') === (user() === null)) $links[] = $link;
        }
    }
    return $links;
}

/** Renders every enabled module's widget for a slot (`home` on the landing page). */
function module_widgets(string $slot): void
{
    foreach (modules_enabled() as $name => $m) {
        if (isset($m['widgets'][$slot])) require module_file($name, $m['widgets'][$slot]);
    }
}

/** Admin tabs enabled modules add: section => [label, file]. */
function module_admin_sections(): array
{
    $sections = [];
    foreach (modules_enabled() as $name => $m) {
        foreach ($m['admin'] as $section => [$label, $file]) $sections[$section] = [$label, module_file($name, $file)];
    }
    return $sections;
}

/** Hero carousel slides from enabled modules: each `slides` file returns a list of slide arrays. */
function module_slides(): array
{
    $slides = [];
    foreach (modules_enabled() as $name => $m) {
        if ($m['slides']) $slides = [...$slides, ...(require module_file($name, $m['slides']))];
    }
    return $slides;
}
