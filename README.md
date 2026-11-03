# Clinic admin panel

React/Vite staff interface for the Go `/admin/api/*` API. This project owns UI state only; the Go backend validates sessions, CSRF, gallery edits, and publication.

## Local development

1. Start the Go backend on `127.0.0.1:8080` with its usual database and storage dependencies.
2. Run `pnpm install` in this directory, then `pnpm dev`.
3. Open `http://127.0.0.1:5174/admin/login`.

Vite runs on port 5174 and proxies `/admin/api/*` to Go. The browser sees one origin, so the backend's `/admin` scoped cookies work without CORS. `admin_session` is HttpOnly. Go deliberately sets `admin_csrf` as a readable cookie so the client can echo it in `X-CSRF-Token` for writes; the client never reads the session cookie or stores session tokens.

For production, serve the built SPA at `/admin/*` with an index fallback for page routes (including `/admin/leads`, `/admin/leads/{id}`, `/admin/blogs/{id}` and `/admin/blogs/{id}/preview`), and forward `/admin/api/*` to Go before the SPA fallback. The Go service currently also has legacy HTML `/admin` routes, so the reverse proxy must send page requests to the SPA and API requests to Go. Use HTTPS so Go can set Secure cookies. All admin documents/API responses must send `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, and `Referrer-Policy: no-referrer`; configure these on the production SPA host too. Vite development/preview and the Go admin router set these headers. The SPA has robots/referrer metadata as well; authentication protects preview content.

## Checks

`pnpm build` type checks and bundles the app. `pnpm test` covers the API transport, authentication, gallery browsing, and case editing. The `/admin/gallery` view loads a bounded server page and keeps status, procedure, timeframe, and page in the URL. Create a private draft at `/admin/gallery/new`, then edit its combined image, consent reference, metadata, and bilingual descriptions at `/admin/gallery/:id`. Preview and publication controls use the Go API's current revision and validation gates. Story 14 adds consent withdrawal and delete controls.

## Deploy with Docker

This deploys the admin SPA on one server. Deploy the Go backend and its database and storage first; see [backend production deployment](../backend/PRODUCTION.md). Install Docker with the Compose plugin and configure an HTTPS reverse proxy on the host. The admin image contains no backend or credentials.

1. From the admin panel folder, build the image, replacing `RELEASE` with your release identifier:

   ```sh
   docker build -t clinic-admin:RELEASE .
   ```

   The included `fixtures/blog-body-conformance.json` is a copy of the shared rendering contract used during the build. Keep it in sync with the repository's `fixtures/blog-body-conformance.json` when that contract changes. If building elsewhere, transfer the image to the server through your registry or image transfer process. Keep the previous image for rollback.

2. On the server, copy `compose.production.yml` from the same release and run:

   ```sh
   export ADMIN_IMAGE=clinic-admin:RELEASE
   docker compose -f compose.production.yml config --quiet
   docker compose -f compose.production.yml up -d
   docker compose -f compose.production.yml ps
   ```

   The container listens on host loopback at `127.0.0.1:8082`. It serves `/admin/` and nested SPA routes. API requests must go directly to Go through the HTTPS proxy.

3. Add these locations to the existing HTTPS Nginx server for the same origin as the admin panel. This assumes the backend listens on `127.0.0.1:8080`, as in its production guide:

   ```nginx
   location = /admin { return 308 /admin/; }
   location ^~ /admin/api {
       client_max_body_size 20m;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Forwarded-For $remote_addr;
       proxy_pass http://127.0.0.1:8080;
   }
   location ^~ /admin/ {
       proxy_set_header Host $host;
       proxy_pass http://127.0.0.1:8082;
   }
   ```

   Run `nginx -t` and reload Nginx. Adjust the upload limit to match your backend. Route public `/api/v1/` requests to the backend as described in its guide; private preview links use those routes. Configure trusted proxies for the actual network path, and do not log preview query strings.

4. Open `https://YOUR_DOMAIN/admin/login`. Verify login, nested page reload, API requests, an image upload, and private preview. Check admin responses for `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, and `Referrer-Policy: no-referrer`. The backend must use secure cookies and HTTPS in production. Create the first admin using the backend guide if needed.

For an update or rollback, set `ADMIN_IMAGE` to the desired retained image and repeat `docker compose -f compose.production.yml up -d`. Check logs with `docker compose -f compose.production.yml logs --tail=100 admin`.

## Architecture and planned page migration

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the adopted target structure and [the migration spec](../_bmad-output/specs/spec-admin-panel-architecture/SPEC.md) for routes, UX companions and nine checkpointed stories. The current runtime still uses the legacy AdminApp dispatcher; these documents define the planned migration.
