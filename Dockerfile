FROM node:24-alpine AS build
WORKDIR /app/admin-panel-frontend
RUN corepack enable
COPY admin-panel-frontend/package.json admin-panel-frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY admin-panel-frontend/ ./
COPY fixtures/blog-body-conformance.json /app/fixtures/blog-body-conformance.json
RUN pnpm build

FROM nginx:1.29-alpine
COPY admin-panel-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin-panel-frontend/dist/ /usr/share/nginx/html/admin/
EXPOSE 8080
