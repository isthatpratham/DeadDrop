# Stage 1: Build frontend and backend
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json tsconfig.json ./
RUN npm ci

COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci

COPY . .

RUN npm run build
RUN npm --prefix frontend run build

# Stage 2: Production runtime
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV SQLITE_PATH=/app/backend/database/deaddrop.db
ENV UPLOAD_DIR=/app/uploads

RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend ./backend
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
  && mkdir -p /app/uploads /app/backend/database \
  && chown -R node:node /app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/server.js"]
