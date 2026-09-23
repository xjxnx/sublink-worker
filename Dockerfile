FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install --global pnpm@10.11.1
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY src ./src
COPY public ./public
COPY tailwind.config.cjs ./

RUN pnpm run build:node

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 8787

CMD ["node", "dist/node-server.cjs"]
