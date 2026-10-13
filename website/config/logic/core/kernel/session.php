<?php
declare(strict_types=1);
// Sessions in private storage, never under the web root; CSRF token per session.

function session_boot(bool $readOnly = false): void
{
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', '604800');
    session_save_path(storage('sessions'));
    session_name('muweb');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        // Set to .<domain> by the installer so the play and ws hosts see the login (client_gated).
        'domain' => config('cookie_domain'),
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start($readOnly ? ['read_and_close' => true] : []);
}

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . csrf_token() . '">';
}

function csrf_check(): void
{
    if (!hash_equals(csrf_token(), input('_csrf'))) fail(400);
}

/** One message shown on the next page. */
function flash(?string $message = null, string $kind = 'ok'): ?array
{
    if ($message !== null) {
        $_SESSION['flash'] = [$kind, $message];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}
