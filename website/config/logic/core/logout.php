<?php
declare(strict_types=1);
// Log out: POST only, so a link elsewhere cannot log a player out.

if (!is_post()) fail(404);
logout();
redirect('');
