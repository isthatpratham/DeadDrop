# Stage 1: Build Frontend and Backend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci

COPY . .

RUN npm run build
RUN npm --prefix frontend run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend ./backend

RUN mkdir -p uploads backend/database && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]
