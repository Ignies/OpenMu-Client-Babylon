<?php
declare(strict_types=1);
// Settings admins change from the panel (web_setting), JSON per key, and uploaded media in private storage.

const BACKGROUND_DEFAULT = [
    'type' => 'map',            // map (the landing's world map), image, video, color, gradient
    'color' => '#101113',
    'from' => '#2a0d0c',
    'to' => '#101113',
    'angle' => 160,
    'media' => '',
    'tint' => '#c4302b',
    'tint_strength' => 75,      // 0-100, the red wash over the art
    'art' => 70,                // 0-100, how strongly the map or media shows
    'dim' => 0,                 // 0-100, black over the art
    'blur' => 0,                // px
    'grain' => true,
    'vignette' => true,
    'motion' => true,           // the slow breathe
];

/** The art's themes (website/art/build.py THEMES) and their accent, for the admin's swatches. */
const SITE_THEMES = [
    'red' => '#c8251a', 'orange' => '#e26816', 'yellow' => '#daac20',
    'green' => '#24a84e', 'blue' => '#2874e2', 'purple' => '#8838e2',
];

const MEDIA_TYPES = [
    'image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/gif' => 'gif',
    'video/mp4' => 'mp4', 'video/webm' => 'webm',
];

function setting(string $key, mixed $default = null): mixed
{
    $v = q('SELECT value FROM web_setting WHERE key = ?', [$key])->fetchColumn();
    return $v === false ? $default : json_decode($v, true);
}

function setting_set(string $key, mixed $value): void
{
    q('DELETE FROM web_setting WHERE key = ?', [$key]);
    q('INSERT INTO web_setting (key, value) VALUES (?, ?)', [$key, json_encode($value)]);
}

function theme(): string
{
    $t = setting('theme', 'red');
    return isset(SITE_THEMES[$t]) ? $t : 'red';
}

function background(): array
{
    return (setting('background') ?? []) + BACKGROUND_DEFAULT;
}

/** Stores an uploaded file under a random name if its real type is allowed; returns the name or the reason. */
function media_store(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) return [null, t('upload.failed')];
    if ($file['size'] > config('upload_max_mb') * 1048576) return [null, t('upload.too_big')];
    $ext = MEDIA_TYPES[(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name'])] ?? null;
    if ($ext === null) return [null, t('upload.type')];
    $name = bin2hex(random_bytes(12)) . ".$ext";
    if (!move_uploaded_file($file['tmp_name'], storage('media') . "/$name")) return [null, t('upload.save')];
    return [$name, null];
}

function media_path(string $name): ?string
{
    if (!preg_match('/^[a-f0-9]{24}\.(png|jpg|webp|gif|mp4|webm)$/', $name)) return null;
    $path = storage('media') . "/$name";
    return is_file($path) ? $path : null;
}
