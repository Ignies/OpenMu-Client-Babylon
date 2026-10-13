<?php
declare(strict_types=1);
// Level and resets are OpenMU stat attributes (data."StatAttribute", named in config."AttributeDefinition").
// Game Master accounts are left out. Cached a minute so the landing page never waits on it.

$board = static function (): array {
    $cache = storage('cache') . '/rankings.json';
    if (is_file($cache) && filemtime($cache) > time() - 60) return json_decode(file_get_contents($cache), true);
    $base = 'SELECT c."Name" AS name, cc."Name" AS class, c."PlayerKillCount" AS pk,
            COALESCE(MAX(CASE WHEN d."Designation" = \'Level\' THEN s."Value" END), 1) AS level,
            COALESCE(MAX(CASE WHEN d."Designation" = \'Resets\' THEN s."Value" END), 0) AS resets
        FROM data."Character" c
        JOIN data."Account" a ON a."Id" = c."AccountId" AND a."State" <> ' . ACCOUNT_GM . '
        LEFT JOIN config."CharacterClass" cc ON cc."Id" = c."CharacterClassId"
        LEFT JOIN data."StatAttribute" s ON s."CharacterId" = c."Id"
        LEFT JOIN config."AttributeDefinition" d ON d."Id" = s."DefinitionId" AND d."Designation" IN (\'Level\', \'Resets\')
        GROUP BY c."Id", c."Name", cc."Name", c."PlayerKillCount"';
    $data = [
        'best' => q("$base ORDER BY resets DESC, level DESC LIMIT 10")->fetchAll(),
        'pk' => q("$base HAVING c.\"PlayerKillCount\" > 0 ORDER BY pk DESC LIMIT 10")->fetchAll(),
    ];
    file_put_contents($cache, json_encode($data), LOCK_EX);
    return $data;
};

try {
    $data = $board();
} catch (PDOException $e) {
    error_log((string) $e);
    return;
}

$panes = [
    'best' => [t('rankings.best'), static fn($r) => t('rankings.level', ['resets' => (int) $r['resets'], 'level' => (int) $r['level']])],
    'pk' => [t('rankings.pk'), static fn($r) => t('rankings.kills', ['kills' => (int) $r['pk']])],
];
card(t('rankings.title'), static function () use ($data, $panes) {
    $tabs = [];
    foreach ($panes as $key => [$label]) $tabs["rank-$key"] = [$label, null];
    echo subtabs($tabs, 'rank-best', 'data-tabs');
    foreach ($panes as $key => [, $stat]): ?>
        <div class="rank-pane" id="rank-<?= $key ?>"<?= $key === 'best' ? '' : ' hidden' ?>>
            <?php if (!$data[$key]): ?><p class="muted"><?= e(t('rankings.none')) ?></p><?php else: ?>
                <ol class="rank-list">
                    <?php foreach ($data[$key] as $i => $r): ?>
                        <li class="rank-row">
                            <span class="rank-pos"><?= $i + 1 ?></span>
                            <span class="rank-name"><?= e($r['name']) ?><small><?= e($r['class'] ?? '') ?></small></span>
                            <span class="rank-stat"><?= e($stat($r)) ?></span>
                        </li>
                    <?php endforeach ?>
                </ol>
            <?php endif ?>
        </div>
    <?php endforeach;
}, 'w-rankings');
