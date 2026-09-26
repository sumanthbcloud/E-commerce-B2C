#
# Stage 1: Build & Vendor Dependencies
#
FROM composer:2.2 AS builder

WORKDIR /app

COPY html/composer.json ./
RUN composer config platform.php 7.4.33 && \
    composer install --no-dev --optimize-autoloader

#
# Stage 2: Runtime
#
FROM php:7.4-apache AS runtime

EXPOSE 8080

RUN apt-get update && apt-get install -yqq --no-install-recommends \
    libzip-dev \
    && docker-php-ext-install pdo_mysql opcache zip \
    && rm -rf /var/lib/apt/lists/*

COPY status.conf /etc/apache2/mods-available/status.conf
RUN a2enmod rewrite && a2enmod status

# Configure Apache to listen on unprivileged port 8080
RUN sed -i 's/Listen 80/Listen 8080/' /etc/apache2/ports.conf && \
    sed -i 's/:80>/:8080>/' /etc/apache2/sites-available/000-default.conf && \
    mkdir -p /var/run/apache2 /var/lock/apache2 /var/log/apache2 && \
    chown -R www-data:www-data /var/run/apache2 /var/lock/apache2 /var/log/apache2

WORKDIR /var/www/html

COPY --chown=www-data:www-data html/ /var/www/html/
COPY --from=builder --chown=www-data:www-data /app/vendor /var/www/html/vendor

RUN rm -rf /var/www/html/var/* && \
    mkdir -p /var/www/html/var/cache /var/www/html/var/log && \
    chown -R www-data:www-data /var/www/html/var

USER www-data

CMD ["apache2-foreground"]



