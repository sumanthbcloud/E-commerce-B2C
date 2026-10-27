#
# Stage 1: Static asset preparation
#
FROM alpine:3.21 AS builder

WORKDIR /src
COPY static/ ./static/
COPY default.conf.template ./

#
# Stage 2: Runtime (Unprivileged Nginx)
#
FROM nginxinc/nginx-unprivileged:alpine AS runtime

USER root
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*
USER 101

EXPOSE 8080

ENV CATALOGUE_HOST=catalogue \
    USER_HOST=user \
    CART_HOST=cart \
    SHIPPING_HOST=shipping \
    PAYMENT_HOST=payment \
    RATINGS_HOST=ratings

COPY --from=builder /src/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder --chown=101:101 /src/static /usr/share/nginx/html

USER 101



