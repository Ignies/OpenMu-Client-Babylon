<?php
declare(strict_types=1);
// The landing page: the hero carousel (the server's own slide, centred on the lit logo inside a turning rune
// ring, then module slides such as featured news) over the map tour and its embers, the thumbnail strip, then
// every module's home widget.

$welcome = ['welcome' => true, 'title' => config('name'), 'sub' => config('description'), 'kicker' => '', 'image' => ''];
$slides = [$welcome, ...module_slides()];

layout('', static function () use ($slides) { ?>
    <section class="hero" data-carousel>
        <canvas class="embers" data-embers aria-hidden="true"></canvas>
        <?php foreach ($slides as $i => $s): $welcome = !empty($s['welcome']) ?>
            <article class="slide<?= $welcome ? ' slide-welcome' : '' ?><?= $i === 0 ? ' is-on' : '' ?>" aria-hidden="<?= $i === 0 ? 'false' : 'true' ?>">
                <?php if ($s['image']): ?><div class="slide-art skel" data-bg="<?= e($s['image']) ?>"></div><?php endif ?>
                <div class="wrap slide-body">
                    <?php if ($welcome): ?>
                        <div class="crest">
                            <span class="crest-ring is-back"></span>
                            <span class="crest-ring"></span>
                            <div id="mu-logo" class="app hero-logo"><img class="fade" src="/ui/world_select/logo.webp" alt=""></div>
                        </div>
                    <?php endif ?>
                    <div class="slide-text">
                        <?php if ($s['kicker']): ?><div class="slide-kicker"><?= $s['kicker'] ?></div><?php endif ?>
                        <h<?= $welcome ? 1 : 2 ?> class="slide-title"><?= e($s['title']) ?></h<?= $welcome ? 1 : 2 ?>>
                        <p class="slide-sub"><?= e($s['sub']) ?></p>
                        <div class="slide-actions">
                            <?php if (!$welcome): ?>
                                <a class="btn btn-primary btn-lg" href="<?= e($s['href']) ?>"><?= e($s['cta']) ?></a>
                            <?php elseif (user()): ?>
                                <?= play_button('btn-lg') ?>
                            <?php else: ?>
                                <?php if (module_on('registration')): ?><a class="btn btn-primary btn-lg" href="<?= url('register') ?>"><?= e(t('home.create')) ?></a><?php endif ?>
                                <a class="btn btn-lg" href="<?= url('login') ?>"><?= e(t('nav.login')) ?></a>
                            <?php endif ?>
                        </div>
                    </div>
                </div>
            </article>
        <?php endforeach ?>
        <?php if (count($slides) > 1): ?><div class="hero-count"><b data-count>1</b> / <?= count($slides) ?></div><?php endif ?>
    </section>
    <?php if (count($slides) > 1): ?>
        <nav class="thumbs" aria-label="<?= e(t('home.slides')) ?>">
            <div class="wrap thumbs-row">
                <button class="thumb-arrow is-prev" type="button" data-prev aria-label="<?= e(t('previous')) ?>"></button>
                <div class="thumbs-list">
                    <?php foreach ($slides as $i => $s): ?>
                        <button class="thumb<?= $i === 0 ? ' is-on' : '' ?>" type="button" data-go="<?= $i ?>">
                            <?php if ($s['image']): ?><img class="fade" src="<?= e($s['image']) ?>" alt="" loading="lazy"><?php endif ?>
                            <span><?= e($s['title']) ?></span>
                        </button>
                    <?php endforeach ?>
                </div>
                <button class="thumb-arrow" type="button" data-next aria-label="<?= e(t('next')) ?>"></button>
            </div>
        </nav>
    <?php endif ?>
    <div class="wrap home-grid"><?php module_widgets('home') ?></div>
<?php }, 'page-home');
