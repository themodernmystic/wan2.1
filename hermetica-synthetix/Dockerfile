# Single-container build: compiles the React frontend and the Express/Prisma
# backend, then serves both from one Node process (backend serves the built
# frontend as static files + the /api/* routes). Works on any platform that
# can run `docker build` + a container with one exposed port and a
# DATABASE_URL env var pointed at a reachable Postgres instance.

FROM node:20-bullseye-slim AS build
WORKDIR /app

# Install deps for all three workspaces (root, server, web) in one pass
COPY package.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm install --no-audit --no-fund

COPY . .

# Prisma client generation only needs the schema, not a live DB
RUN npx prisma generate --schema=./prisma/schema.prisma

RUN npm run build:web
RUN npm run build:server

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/package.json ./package.json

# Uploaded files (local storage driver) persist here — mount a volume in
# production if you want uploads to survive container restarts/redeploys.
RUN mkdir -p /app/uploads

EXPOSE 8080

# Applies any pending Prisma migrations, then starts the server. Safe to run
# on every boot: `migrate deploy` is a no-op when the schema is already current.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node server/dist/index.js"]
