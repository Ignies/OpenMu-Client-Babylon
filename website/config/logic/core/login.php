<?php
declare(strict_types=1);
// Log in with the game account (the header's dropdown posts here too).

if (user()) redirect('account');
$error = null;
$next = safe_next(input('next'));
if (is_post()) {
    $error = login(input('login'), $_POST['password'] ?? '');
    if ($error === null) redirect($next);
}

layout(t('nav.login'), static function () use ($error, $next) { ?>
    <section class="panel panel-narrow">
        <h1 class="h-title"><?= e(t('nav.login')) ?></h1>
        <p class="muted center"><?= e(t('login.lead')) ?></p>
        <?php if ($error): ?><div class="flash flash-error"><?= e($error) ?></div><?php endif ?>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <input type="hidden" name="next" value="<?= e($next) ?>">
            <?= field('login', t('field.id'), 'text', input('login'), 'required maxlength="10" autocomplete="username" autofocus') ?>
            <?= field('password', t('field.password'), 'password', '', 'required maxlength="10" autocomplete="current-password"') ?>
            <button class="btn btn-primary" type="submit"><?= e(t('nav.login')) ?></button>
        </form>
        <?php if (module_on('registration')): ?><p class="muted small center"><?= e(t('login.no_account')) ?> <a href="<?= url('register') ?>"><?= e(t('login.create')) ?></a></p><?php endif ?>
    </section>
<?php });
