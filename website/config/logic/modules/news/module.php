<?php
// News: posts in editable categories with optional event dates; featured posts lead the landing page carousel.
return [
    'title' => '@news.title',
    'description' => '@news.description',
    'routes' => ['news' => 'main.php', 'news/*' => 'main.php'],
    'nav' => [['path' => 'news', 'label' => '@news.title']],
    'widgets' => ['home' => 'widget.php'],
    'slides' => 'slides.php',
    'admin' => ['news' => ['@news.title', 'admin.php']],
];
