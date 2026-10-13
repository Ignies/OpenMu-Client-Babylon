<?php
declare(strict_types=1);
// The sign-up form. Same rules and columns as register/server/accounts.ts, so OpenMU accepts the account.

if (user()) redirect('account');
$error = null;
if (is_post()) {
    $login = input('login');
    $password = $_POST['password'] ?? '';
    $email = input('email');
    $error = login_error($login) ?? password_error($password)
        ?? ($password !== ($_POST['confirm'] ?? '') ? t('registration.mismatch') : null)
        ?? ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL) ? t('auth.email_rule') : null)
        ?? (throttle('register:' . client_ip(), 5, 3600) ? null : t('registration.throttled'));
    if ($error === null) {
        try {
            if (q('SELECT 1 FROM data."Account" WHERE lower("LoginName") = lower(?)', [$login])->fetch()) throw new DomainException();
            q('INSERT INTO data."Account" ("Id", "LoginName", "PasswordHash", "SecurityCode", "EMail", "RegistrationDate", "State", "TimeZone", "VaultPassword", "IsVaultExtended")
               VALUES (?, ?, ?, \'\', ?, ?, ?, 0, \'\', false)', [uuid(), $login, openmu_hash($password), $email, gmdate('Y-m-d H:i:s'), ACCOUNT_NORMAL]);
            login($login, $password);
            flash(t('registration.welcome'));
            redirect('account');
        } catch (DomainException | PDOException $e) {
            // The unique index on LoginName settles two sign-ups racing for one name.
            if ($e instanceof PDOException && !in_array($e->getCode(), ['23505', '23000'], true)) throw $e;
            $error = t('registration.taken');
        }
    }
}

layout(t('registration.page'), static function () use ($error) { ?>
    <section class="panel panel-narrow">
        <h1 class="h-title"><?= e(t('registration.page')) ?></h1>
        <p class="muted center"><?= e(t('registration.lead')) ?></p>
        <?php if ($error): ?><div class="flash flash-error"><?= e($error) ?></div><?php endif ?>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <?= field('login', t('registration.id'), 'text', input('login'), 'required minlength="4" maxlength="10" pattern="[A-Za-z0-9]+" autocomplete="username" autofocus') ?>
            <?= field('password', t('registration.password'), 'password', '', 'required minlength="4" maxlength="10" autocomplete="new-password"') ?>
            <?= field('confirm', t('registration.confirm'), 'password', '', 'required minlength="4" maxlength="10" autocomplete="new-password"') ?>
            <?= field('email', t('registration.email'), 'email', input('email'), 'autocomplete="email"') ?>
            <button class="btn btn-primary" type="submit"><?= e(t('registration.page')) ?></button>
        </form>
        <p class="muted small center"><?= e(t('registration.have')) ?> <a href="<?= url('login') ?>"><?= e(t('nav.login')) ?></a></p>
    </section>
<?php });
