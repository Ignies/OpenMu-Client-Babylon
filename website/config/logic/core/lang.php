<?php
declare(strict_types=1);
// /lang?to=<code>&next=<path>: remembers the visitor's language for a year and goes back.

$to = input('to');
if (isset(languages()[$to])) {
    setcookie('lang', $to, ['expires' => time() + 31536000, 'path' => '/', 'domain' => config('cookie_domain'), 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}
redirect(safe_next(input('next')));
