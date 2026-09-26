#
# Stage 1: Static asset preparation
#
FROM alpine:3.18 AS builder

WORKDIR /src
COPY static/ ./static/
COPY default.conf.template ./

#
# Stage 2: Runtime (Unprivileged Nginx)
#
FROM nginxinc/nginx-unprivileged:1.25-alpine AS runtime

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



