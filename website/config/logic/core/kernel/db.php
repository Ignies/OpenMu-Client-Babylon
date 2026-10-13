<?php
declare(strict_types=1);
// One PDO connection to OpenMU's database; the site's own tables are prefixed web_ (migrations/).

function db(): PDO
{
    static $pdo;
    if ($pdo) return $pdo;
    $c = config('db');
    $pdo = new PDO($c['dsn'], $c['user'] ?: null, $c['password'] ?: null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    if (db_is_sqlite()) dev_database($pdo);
    return $pdo;
}

function db_is_sqlite(): bool
{
    return str_starts_with(config('db')['dsn'], 'sqlite:');
}

function q(string $sql, array $args = []): PDOStatement
{
    $s = db()->prepare($sql);
    $s->execute($args);
    return $s;
}

function uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr(ord($b[6]) & 0x0f | 0x40);
    $b[8] = chr(ord($b[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

/** Runs every core and module migration not yet applied; a marker in storage skips the query once all are in. */
function db_migrate(): void
{
    $files = [];
    foreach ([CORE, ...glob(MODULES . '/*', GLOB_ONLYDIR) ?: []] as $dir) {
        foreach (glob("$dir/migrations/[0-9]*.sql") ?: [] as $file) $files[basename($dir) . '/' . basename($file)] = $file;
    }
    $marker = storage() . '/migrated';
    $want = md5(implode(',', array_keys($files)));
    if (is_file($marker) && file_get_contents($marker) === $want) return;
    db()->exec('CREATE TABLE IF NOT EXISTS web_migration (id VARCHAR(96) PRIMARY KEY)');
    $done = q('SELECT id FROM web_migration')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($files as $id => $file) {
        if (in_array($id, $done, true)) continue;
        db()->beginTransaction();
        sql_file($file);
        q('INSERT INTO web_migration (id) VALUES (?)', [$id]);
        db()->commit();
    }
    file_put_contents($marker, $want);
}

/** Runs a .sql file: `--` comment lines dropped, then one statement per `;` (no `;` inside a statement). */
function sql_file(string $file): void
{
    $sql = preg_replace('/^\s*--.*$/m', '', file_get_contents($file));
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) db()->exec($statement);
}

/** Local runs without Postgres: OpenMU's schemas become attached SQLite files, seeded once (migrations/dev.sql). */
function dev_database(PDO $pdo): void
{
    foreach (['data', 'config'] as $schema) $pdo->exec("ATTACH DATABASE " . $pdo->quote(storage() . "/dev_$schema.sqlite") . " AS $schema");
    if ($pdo->query("SELECT 1 FROM data.sqlite_master WHERE name = 'Account'")->fetch()) return;
    sql_file(CORE . '/migrations/dev.sql');
}
