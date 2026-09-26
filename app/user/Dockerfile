#
# Stage 1: Build & Dependencies
#
FROM node:18-alpine AS builder

WORKDIR /opt/server

COPY package.json ./
RUN npm install --omit=dev

#
# Stage 2: Runtime
#
FROM node:18-alpine AS runtime

EXPOSE 8080

WORKDIR /opt/server

COPY --from=builder --chown=node:node /opt/server/node_modules ./node_modules
COPY --from=builder --chown=node:node /opt/server/package.json ./package.json
COPY --chown=node:node server.js ./

USER node

CMD ["node", "server.js"]


