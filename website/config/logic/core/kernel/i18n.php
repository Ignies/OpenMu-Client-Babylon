<?php
declare(strict_types=1);
// Text: every string the site shows comes from t('key'). Each owner keeps its own files: core/i18n/<code>.php
// and modules/<name>/i18n/<code>.php, each returning key => text. English is complete and the fallback.

/** Languages the site has (core/i18n files), code => name. */
function languages(): array
{
    static $all;
    if ($all !== null) return $all;
    $all = [];
    foreach (glob(CORE . '/i18n/*.php') ?: [] as $file) {
        $code = basename($file, '.php');
        if (preg_match('/^[a-z]{2}$/', $code)) $all[$code] = (require $file)['_name'] ?? $code;
    }
    return $all;
}

/** The visitor's language: their choice (cookie), else the install's (MU_SITE_LANGUAGE), else English. */
function lang(): string
{
    static $lang;
    if ($lang !== null) return $lang;
    foreach ([$_COOKIE['lang'] ?? '', config('language'), 'en'] as $code) {
        if (is_string($code) && isset(languages()[$code])) return $lang = $code;
    }
    return $lang = 'en';
}

function text_for(string $code): array
{
    $text = [];
    foreach ([CORE, ...array_map(static fn($n) => MODULES . "/$n", array_keys(modules_installed()))] as $dir) {
        if (is_file($file = "$dir/i18n/$code.php")) $text += require $file;
    }
    return $text;
}

/** The text for a key in the visitor's language, `{name}` placeholders filled from $vars. */
function t(string $key, array $vars = []): string
{
    static $dict = [];
    $dict[lang()] ??= text_for(lang());
    $dict['en'] ??= text_for('en');
    $text = $dict[lang()][$key] ?? $dict['en'][$key] ?? $key;
    foreach ($vars as $k => $v) $text = str_replace('{' . $k . '}', (string) $v, $text);
    return $text;
}

/** A label that is either literal text or, starting with @, a text key (seeded names stay translatable). */
function label(string $text): string
{
    return str_starts_with($text, '@') ? t(substr($text, 1)) : $text;
}
