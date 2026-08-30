FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# npm ci : installation reproductible strictement depuis package-lock.json
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
# Les variables NEXT_PUBLIC_* sont inlinées dans les bundles au moment de
# `next build` : l'URL de l'API doit donc être connue ici (build arg), une
# variable d'environnement fournie seulement à l'exécution n'a aucun effet.
# Surcharger via `docker build --build-arg NEXT_PUBLIC_API_URL=...` ou
# `build.args` dans docker-compose.yml.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# next.config.ts doit avoir output: "standalone"
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
