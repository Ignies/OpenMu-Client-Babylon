<?php
declare(strict_types=1);
// The kernel's rules that must never drift: php website/tests/kernel_test.php (exits 1 on a failure).
// Runs on the local SQLite database (website/storage), like `php -S`.

require __DIR__ . '/../config/logic/core/kernel/app.php';

$failed = 0;
function check(string $name, bool $ok): void
{
    global $failed;
    echo ($ok ? 'ok   ' : 'FAIL ') . $name . "\n";
    if (!$ok) $failed++;
}

// OpenMU reads bcrypt `$2a$` at cost 11; anything else makes an account the game cannot log into.
$hash = openmu_hash('abc123');
check('hash is $2a$ cost 11', str_starts_with($hash, '$2a$11$') && strlen($hash) === 60);
check('hash verifies', password_verify('abc123', $hash) && !password_verify('abc124', $hash));

// The game's ID and password rules (register/server/accounts.ts).
check('id 4-10 letters or digits', login_error('abcd') === null && login_error('abc') !== null && login_error('abcdefghijk') !== null && login_error('ab_cd') !== null);
check('MKT ids are reserved', login_error('MKT006') !== null);
check('password printable ascii 4-10', password_error('a!b~') === null && password_error('abc') !== null && password_error('pass word') !== null && password_error('contraseña') !== null);

// A manifest cannot point outside its module's folder.
$threw = false;
try {
    module_file('news', '../core/admin.php');
} catch (LogicException) {
    $threw = true;
}
check('module files stay in their folder', $threw && str_ends_with(module_file('news', 'main.php'), '/news/main.php'));

// Text: English is complete and the fallback; missing keys show themselves.
check('english text', t('nav.login') === 'Log in');
check('placeholders', t('admin.bg_media', ['mb' => 25]) === 'Image or video (PNG, JPG, WEBP, GIF, MP4, WEBM; max 25 MB)');
check('unknown key shows the key', t('no.such.key') === 'no.such.key');
check('@ labels are keys', label('@nav.login') === 'Log in' && label('Literal') === 'Literal');

// Every language has every English core key (modules fall back line by line).
$en = require CORE . '/i18n/en.php';
foreach (glob(CORE . '/i18n/*.php') as $file) {
    $missing = array_diff(array_keys($en), array_keys(require $file));
    check(basename($file) . ' has every core key', !$missing);
}

exit($failed ? 1 : 0);
