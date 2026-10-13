<?php
declare(strict_types=1);
// Install-time settings. The installer passes them as MU_* environment variables (install/cli/render/env.ts);
// a local run reads settings.local.php when present. What admins change later lives in the database.

$env = static fn(string $key, string $default = ''): string => ($v = getenv($key)) === false || $v === '' ? $default : $v;
$local = is_file(__DIR__ . '/settings.local.php') ? require __DIR__ . '/settings.local.php' : [];
$root = dirname(__DIR__);

return array_replace_recursive([
    'name' => $env('MU_SITE_NAME', 'My MU'),
    'description' => $env('MU_SITE_DESCRIPTION', 'Season 6 Episode 3, played in the browser'),
    // The default language (core/i18n/<code>.php); a visitor's own choice wins.
    'language' => $env('MU_SITE_LANGUAGE', 'en'),
    'site_url' => $env('MU_SITE_URL', ''),
    'client_url' => $env('MU_CLIENT_URL', ''),
    // Only players logged in here may open the client and its game socket (Caddy asks /auth/play).
    'client_gated' => $env('MU_CLIENT_GATED', 'off') === 'on',
    'cookie_domain' => $env('MU_COOKIE_DOMAIN', ''),
    // Modules this install ships, comma separated; blank means every folder in logic/modules.
    'modules' => array_values(array_filter(array_map('trim', explode(',', $env('MU_SITE_MODULES', ''))))),
    'storage' => $env('MU_STORAGE', $root . '/storage'),
    'trusted_proxy' => $env('MU_TRUSTED_PROXY', ''),
    'upload_max_mb' => (int) $env('MU_UPLOAD_MAX_MB', '25'),
    'db' => [
        'dsn' => $env('MU_DB_DSN', 'sqlite:' . $root . '/storage/dev.sqlite'),
        'user' => $env('MU_DB_USER', ''),
        'password' => $env('MU_DB_PASSWORD', ''),
    ],
], $local);
