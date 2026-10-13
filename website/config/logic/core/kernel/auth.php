<?php
declare(strict_types=1);
// Accounts are OpenMU's own (data."Account"): one login for the site and the game.

const ACCOUNT_NORMAL = 0;
const ACCOUNT_GM = 2;
const ACCOUNT_BANNED = 4;

/** The logged-in account, or null. Re-read each request so a ban or a GM change applies at once. */
function user(): ?array
{
    static $user = false;
    if ($user !== false) return $user;
    $id = $_SESSION['account'] ?? null;
    $user = $id === null ? null : (q('SELECT "Id" AS id, "LoginName" AS login, "EMail" AS email, "State" AS state FROM data."Account" WHERE "Id" = ?', [$id])->fetch() ?: null);
    if ($user !== null && (int) $user['state'] === ACCOUNT_BANNED) $user = null;
    return $user;
}

function is_admin(): bool
{
    return (int) (user()['state'] ?? -1) === ACCOUNT_GM;
}

function require_user(): array
{
    return user() ?? redirect('login?next=' . rawurlencode(request_path()));
}

function require_admin(): void
{
    require_user();
    if (!is_admin()) fail(403);
}

/** Null on success, else the reason. Same answer for a wrong login and a wrong password. */
function login(string $login, string $password): ?string
{
    if (!throttle('login:' . client_ip(), 10, 600)) return t('auth.throttled');
    $row = q('SELECT "Id" AS id, "PasswordHash" AS hash, "State" AS state FROM data."Account" WHERE lower("LoginName") = lower(?)', [$login])->fetch();
    if (!$row || !password_verify($password, $row['hash'])) return t('auth.wrong');
    if ((int) $row['state'] === ACCOUNT_BANNED) return t('auth.banned');
    session_regenerate_id(true);
    $_SESSION['account'] = $row['id'];
    return null;
}

function logout(): void
{
    $_SESSION = [];
    session_regenerate_id(true);
}

/**
 * OpenMU verifies with BCrypt.Net and stores `$2a$` at cost 11 (register/server/accounts.ts).
 * PASSWORD_DEFAULT is not used: PHP may move it off bcrypt, and the game could no longer log in.
 */
function openmu_hash(string $password): string
{
    return '$2a$' . substr(password_hash($password, PASSWORD_BCRYPT, ['cost' => 11]), 4);
}

/** The game's rules: 4-10 letters or digits; MKT names belong to the marketplace (src/modules/servers/reservedNames.ts). */
function login_error(string $login): ?string
{
    if (!preg_match('/^[A-Za-z0-9]{4,10}$/', $login)) return t('auth.id_rule');
    if (preg_match('/^mkt/i', $login)) return t('auth.id_reserved');
    return null;
}

/** 4-10 printable ASCII: the login packet carries one byte per character. */
function password_error(string $password): ?string
{
    return preg_match('/^[!-~]{4,10}$/', $password) ? null : t('auth.password_rule');
}

/** Counts a hit on $key; false once it passes $max inside $seconds. */
function throttle(string $key, int $max, int $seconds): bool
{
    $now = time();
    $row = q('SELECT hits, reset_at FROM web_throttle WHERE key = ?', [$key])->fetch();
    if (!$row || (int) $row['reset_at'] < $now) {
        q('DELETE FROM web_throttle WHERE key = ? OR reset_at < ?', [$key, $now]);
        q('INSERT INTO web_throttle (key, hits, reset_at) VALUES (?, 1, ?)', [$key, $now + $seconds]);
        return true;
    }
    q('UPDATE web_throttle SET hits = hits + 1 WHERE key = ?', [$key]);
    return (int) $row['hits'] < $max;
}
