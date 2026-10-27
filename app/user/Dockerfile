#
# Stage 1: Build & Dependencies
#
FROM node:18-alpine AS builder

WORKDIR /opt/server

COPY package*.json ./
RUN npm ci --omit=dev

#
# Stage 2: Runtime
#
FROM node:18-alpine AS runtime

EXPOSE 8080

WORKDIR /opt/server

# Upgrade OS packages to apply Alpine security fixes and remove build tools
RUN apk upgrade --no-cache && \
    rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /usr/local/bin/corepack

COPY --from=builder --chown=node:node /opt/server/node_modules ./node_modules
COPY --from=builder --chown=node:node /opt/server/package.json ./package.json
COPY --chown=node:node server.js ./

USER node

CMD ["node", "server.js"]


