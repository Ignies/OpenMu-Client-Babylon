<?php
declare(strict_types=1);
// The player's account: e-mail and password. The password is the game's, hashed the way OpenMU reads it.

$me = require_user();
$error = null;
if (is_post()) {
    $current = $_POST['current'] ?? '';
    $hash = q('SELECT "PasswordHash" FROM data."Account" WHERE "Id" = ?', [$me['id']])->fetchColumn();
    $email = input('email');
    $password = $_POST['password'] ?? '';
    $error = match (true) {
        !password_verify($current, (string) $hash) => t('account.wrong_current'),
        $email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL) => t('auth.email_rule'),
        $password !== '' => password_error($password),
        default => null,
    };
    if ($error === null) {
        q('UPDATE data."Account" SET "EMail" = ? WHERE "Id" = ?', [$email, $me['id']]);
        if ($password !== '') q('UPDATE data."Account" SET "PasswordHash" = ? WHERE "Id" = ?', [openmu_hash($password), $me['id']]);
        flash(t('account.saved'));
        redirect('account');
    }
}

layout(t('nav.account'), static function () use ($me, $error) { ?>
    <section class="panel panel-narrow">
        <h1 class="h-title"><?= e($me['login']) ?></h1>
        <div class="row-actions"><?= play_button() ?></div>
        <?php if ($error): ?><div class="flash flash-error"><?= e($error) ?></div><?php endif ?>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <?= field('email', t('field.email'), 'email', $me['email']) ?>
            <?= field('password', t('account.new_password'), 'password', '', 'maxlength="10" autocomplete="new-password"') ?>
            <?= field('current', t('account.current_password'), 'password', '', 'required maxlength="10" autocomplete="current-password"') ?>
            <button class="btn btn-primary" type="submit"><?= e(t('save')) ?></button>
        </form>
    </section>
<?php });
