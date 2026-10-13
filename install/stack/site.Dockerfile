# The website's PHP: PHP-FPM with PostgreSQL, the site's files taken from the web image (compose passes it as
# the `web` context). Environment from env/site.env reaches PHP (clear_env off); sessions and uploads go to /data/site.
FROM php:8.4-fpm-alpine
RUN apk add --no-cache libpq \
 && apk add --no-cache --virtual .build postgresql-dev \
 && docker-php-ext-install pdo_pgsql \
 && apk del .build \
 && printf 'upload_max_filesize=32M\npost_max_size=34M\nexpose_php=Off\nsession.cookie_httponly=1\n' > /usr/local/etc/php/conf.d/site.ini \
 && printf '[www]\nclear_env = no\n' > /usr/local/etc/php-fpm.d/zz-site.conf
COPY --from=web /srv/site /srv/site
CMD ["sh", "-c", "mkdir -p /data/site && chown www-data:www-data /data/site && exec php-fpm"]
