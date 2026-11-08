# LabSouq — production image for a private server (VPS).
# Build:  docker build -t labsouq .
# Run:    see docker-compose.yml

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- dependencies (incl. dev deps: needed for build, migrations and seed) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- build ----
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 STANDALONE=1
RUN npm run build

# ---- setup: runs migrations + seed once (docker compose run --rm setup) ----
FROM builder AS setup
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

# ---- runtime: small image with the standalone server only ----
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
RUN groupadd -r app && useradd -r -g app app && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
