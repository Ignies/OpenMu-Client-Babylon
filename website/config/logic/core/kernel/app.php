<?php
declare(strict_types=1);
// Boot and routing: settings, database, session, then the page the path names.

const CORE = __DIR__ . '/..';
const MODULES = __DIR__ . '/../../modules';

foreach (['http', 'db', 'session', 'auth', 'modules', 'i18n', 'store', 'view'] as $part) require __DIR__ . "/$part.php";

function config(?string $key = null): mixed
{
    static $config;
    $config ??= require dirname(__DIR__, 4) . '/config/settings.php';
    return $key === null ? $config : ($config[$key] ?? null);
}

/** A folder under the private storage root, created on first use. */
function storage(string $sub = ''): string
{
    $dir = rtrim(config('storage'), '/\\') . ($sub === '' ? '' : "/$sub");
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException("storage: $sub");
    return $dir;
}

/** Core pages win over module routes, so a module can never take over login or admin. */
function core_routes(): array
{
    return [
        '' => CORE . '/home.php',
        'login' => CORE . '/login.php',
        'logout' => CORE . '/logout.php',
        'account' => CORE . '/account.php',
        'play' => CORE . '/play.php',
        'auth/play' => CORE . '/play.php',
        'admin' => CORE . '/admin.php',
        'admin/*' => CORE . '/admin.php',
        'media/*' => CORE . '/media.php',
        'lang' => CORE . '/lang.php',
    ];
}

function app_run(): void
{
    set_exception_handler(static fn(Throwable $e) => fail(500, $e));
    security_headers();
    db_migrate();
    $path = request_path();
    session_boot($path === 'auth/play');
    if (is_post()) csrf_check();
    $routes = core_routes() + module_routes();
    $file = $routes[$path] ?? $routes[strtok($path, '/') . '/*'] ?? null;
    if ($file === null) fail(404);
    require $file;
}
