<?php
declare(strict_types=1);
// /play sends a logged-in player to the client. /auth/play is Caddy's forward_auth check when the client
// is gated: 204 lets the request through; the page gets the login, the game socket a 401.

if (request_path() === 'auth/play') {
    if (user()) {
        http_response_code(204);
        exit;
    }
    if (input('kind') === 'ws') fail(401);
    redirect(rtrim((string) config('site_url'), '/') . '/login?next=play');
}

require_user();
config('client_url') ? redirect(config('client_url')) : fail(404);
