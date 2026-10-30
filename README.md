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

## Architecture and planned page migration

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the adopted target structure and [the migration spec](../_bmad-output/specs/spec-admin-panel-architecture/SPEC.md) for routes, UX companions and nine checkpointed stories. The current runtime still uses the legacy AdminApp dispatcher; these documents define the planned migration.
