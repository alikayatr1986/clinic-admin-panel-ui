FROM node:24-alpine AS build
WORKDIR /app/admin-panel-frontend
RUN corepack enable
COPY clinic-admin-panel-ui/package.json clinic-admin-panel-ui/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY clinic-admin-panel-ui/ ./
COPY fixtures/blog-body-conformance.json /app/fixtures/blog-body-conformance.json
RUN pnpm build

FROM nginx:1.29-alpine
COPY clinic-admin-panel-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin-panel-frontend/dist/ /usr/share/nginx/html/admin/
EXPOSE 8080
