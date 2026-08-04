# =========================
# Dependencies
# =========================
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# =========================
# Build
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# =========================
# Runtime
# =========================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Устанавливаем только production зависимости
RUN pnpm install --prod --frozen-lockfile

# Копируем собранное приложение
COPY --from=builder /app/dist ./dist

# Если используются public-файлы
COPY --from=builder /app/public ./public

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]