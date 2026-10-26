FROM node:24-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --include=dev
COPY frontend/index.html frontend/vite.config.js ./
COPY curriculum-policy.json /build/curriculum-policy.json
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend ./
COPY --chown=node:node curriculum-policy.json /app/curriculum-policy.json
COPY --from=frontend-build --chown=node:node /build/frontend/dist /app/frontend/dist
RUN mkdir -p /app/design-review/curriculum && chown -R node:node /app/design-review
USER node
EXPOSE 5000
CMD ["node", "server.js"]
