<?php
declare(strict_types=1);
// Serves an uploaded file from private storage: only names media_store made, with its own type.

$path = media_path(substr(request_path(), strlen('media/')));
if ($path === null) fail(404);
$type = array_search(pathinfo($path, PATHINFO_EXTENSION), MEDIA_TYPES, true);
header("Content-Type: $type");
header('Content-Length: ' . filesize($path));
header('Cache-Control: public, max-age=31536000, immutable');
readfile($path);
