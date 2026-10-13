<?php
declare(strict_types=1);
// Request and response helpers.

/** The path without slashes at either end, '' for the home page. */
function request_path(): string
{
    return trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
}

function is_post(): bool
{
    return ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
}

function is_https(): bool
{
    return ($_SERVER['HTTPS'] ?? '') === 'on' || str_starts_with((string) config('site_url'), 'https:');
}

/** A trimmed form field, '' when missing or not a string. */
function input(string $name): string
{
    $v = $_POST[$name] ?? $_GET[$name] ?? '';
    return is_string($v) ? trim($v) : '';
}

/** The visitor's address; X-Forwarded-For is believed only from the configured proxy (Caddy). */
function client_ip(): string
{
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    $proxy = config('trusted_proxy');
    if ($proxy !== '' && $remote === $proxy && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $hops = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']));
        return end($hops);
    }
    return $remote;
}

function url(string $path = ''): string
{
    return '/' . ltrim($path, '/');
}

function redirect(string $to): never
{
    header('Location: ' . (preg_match('~^https?://~', $to) ? $to : url($to)), true, 303);
    exit;
}

/** A local path to come back to after login; anything else falls back to the home page. */
function safe_next(string $next): string
{
    return preg_match('~^[a-z0-9/_-]*$~i', $next) ? $next : '';
}

function security_headers(): void
{
    header("Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.github.com; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
}

function fail(int $code, ?Throwable $e = null): never
{
    if ($e !== null) error_log((string) $e);
    if (!headers_sent()) http_response_code($code);
    try {
        $title = t(in_array($code, [400, 401, 403, 404], true) ? "error.$code" : 'error.500');
        layout($title, static function () use ($title, $code) { ?>
            <section class="panel panel-narrow center">
                <h1 class="h-display"><?= $code ?></h1>
                <p class="muted"><?= e($title) ?></p>
                <a class="btn" href="<?= url() ?>"><?= e(t('back_home')) ?></a>
            </section>
        <?php });
    } catch (Throwable) {
        echo $code;
    }
    exit;
}
