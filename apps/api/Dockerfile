FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY apps/api ./apps/api
COPY packages/contracts ./packages/contracts
ENV NODE_ENV=production
USER node
CMD ["node", "apps/api/src/server.ts"]
