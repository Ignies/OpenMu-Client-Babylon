<?php
declare(strict_types=1);
// Front controller: the only PHP file the web server runs (website/readme.md).

if (PHP_SAPI === 'cli-server') {
    $path = (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (str_contains($path, '..')) return false;
    if (str_starts_with($path, '/config/resources/')) {
        if (is_file(__DIR__ . $path)) return false;
        http_response_code(404);
        return true;
    }
    // Dev only: the landing's art and fonts from the repo's public/ (the image build copies them, Caddy serves them).
    $shared = dirname(__DIR__) . '/public' . $path;
    if (preg_match('~^/(fonts|icons|ui/world_select)/~', $path) && is_file($shared)) {
        header('Content-Type: ' . (mime_content_type($shared) ?: 'application/octet-stream'));
        readfile($shared);
        return true;
    }
}

require __DIR__ . '/config/logic/core/kernel/app.php';
app_run();
