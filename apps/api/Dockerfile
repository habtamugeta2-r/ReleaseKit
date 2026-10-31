FROM node:22-bookworm-slim AS build

WORKDIR /workspace
COPY package.json package-lock.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=@releasekit/api --include-workspace-root=false

COPY apps/api apps/api
WORKDIR /workspace/apps/api
RUN npm run build

FROM build AS migrator
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS production-deps
WORKDIR /workspace
RUN npm prune --omit=dev --workspace=@releasekit/api --include-workspace-root=false

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    API_PORT=4000
WORKDIR /app
COPY --from=production-deps --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/api/package.json ./package.json
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/v1/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER node
CMD ["node", "dist/server.js"]
