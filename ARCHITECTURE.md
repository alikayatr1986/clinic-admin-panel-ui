# Admin panel architecture

Status: target architecture, 2026-10-30. This document governs the independent React/Vite admin application; it does not migrate it to Next.js. Read root AGENTS.md, frontend/AGENTS.md and frontend/ARCHITECTURE.md first. Their feature ownership and type-placement rules apply; Next.js-specific server conventions belong to the public frontend.

## Current state and decisions

AdminApp.tsx combines session checks, login, history parsing, navigation guards, shell and feature rendering. BlogEditor and lists also manipulate history. Feature services and domain types already exist and should be reused. package.json currently has React without a router or query library.

Adopt React Router with a browser data router, basename /admin, nested routes and a protected layout outlet. Use the supported installed router APIs, including navigation blocking, after checking its documentation during implementation. Add TanStack Query for browser server state to follow repository data ownership policy. Pin compatible versions in package.json and pnpm-lock.yaml during implementation; no version is prescribed here. Do not build another history abstraction. Use lazy route modules for domain pages and route loading/error boundaries.

## Ownership and dependency direction

Paths relative to admin-panel-frontend:

| Path | Responsibility |
| --- | --- |
| src/main.tsx | Mount root and global stylesheet only |
| src/app/AdminApp.tsx | Compose router and providers |
| src/app/router.tsx | Route declarations, feature imports and access boundaries |
| src/app/providers.tsx | Query and session composition |
| src/components/layout/AdminShell.tsx | Sidebar, header, content outlet; no domain fetches |
| src/components/layout/AdminSidebar.tsx | Render injected navigation items and active state |
| src/app/navigation.ts | App-level menu configuration and role visibility |
| src/types/layout.types.ts | Shared shell/navigation contracts |
| src/features/auth/ | LoginPage, session boundary/hooks/services/types |
| src/features/dashboard/ | DashboardPage and overview hooks |
| src/features/blogs/pages/ | BlogListPage, BlogCreatePage, BlogDetailPage, BlogEditPage, BlogPreviewPage |
| src/features/gallery/pages/ | GalleryListPage, GalleryCreatePage, GalleryDetailPage, GalleryEditPage |
| src/features/leads/pages/ | LeadListPage and LeadDetailPage |
| src/features/<feature>/hooks/ | Query keys, reads and mutations owned by that domain |
| src/features/<feature>/services/ | Existing typed API operations |
| src/features/<feature>/types/*.types.ts | Every domain and component type/interface |
| src/lib/api.ts | Existing authenticated JSON transport and progress-upload XHR |
| src/lib/query-client.ts | Query defaults only |
| src/components/ui/ | Only generic primitives justified by repeated use |

Routes compose pages; pages compose feature UI and hooks; hooks call services; services call the existing transport. Shared modules never import features. Features never import another feature's internals. Dashboard may compose public feature hook exports through its page without duplicating transport calls. Keep components flat; create folders only as needed. No speculative repository layers, generic CRUD engine or global domain helpers. Extract all touched inline types to dedicated *.types.ts files.

Auth owns session state and auth endpoints; move authApi/AdminSession ownership out of generic transport with re-exports only if temporarily necessary. App composes authorization boundaries. Backend authorization remains decisive. Query keys include entity, filters, pagination and locale where applicable. Do not put patient content or credentials in keys or URLs. Cancel reads with signals, invalidate affected detail/list/overview queries after confirmed writes, and clear all private query data on logout or identity change. Never retry writes automatically. Keep form drafts local and revision-aware; query refresh must not overwrite dirty values. Keep the documented XHR upload exception for progress.

## Routing and draft lifetime

Use route params and router search params, never component-owned pathname parsing, pushState or popstate dispatch. Static /new precedes entity routes. IDs are encoded once and decoded through router params. Canonical /:id is a dedicated read-only detail page; /:id/edit owns editing. Existing editor bookmarks at /:id now open detail with a visible Edit action. Existing blog /:id/preview remains valid.

Blog edit and preview share a feature-owned draft boundary at the entity route so moving between them retains unsaved bilingual fields. Detail uses saved server data, preview explicitly identifies saved versus unsaved content. Leaving the draft boundary, switching records, sidebar navigation and sign-out use one router blocker; unload uses beforeunload. Cancel must preserve URL and form; confirm navigates exactly once. Do not restore history by pushing artificial entries. Existing gallery preview remains within its editing workflow unless the current API supports a dedicated preview route.

401 enters reauthentication with a validated same-origin /admin return target, never an external redirect. Dirty drafts stay in tab memory while reauthentication is shown; clear them on explicit discard/logout, and never persist lead data or drafts to localStorage. 403 renders access denied without redirect loops. A missing record gets a detail-level 404; unknown routes get an app 404. A 409 preserves form values and requires explicit refresh/reconciliation.

## Delivery and migration

Preserve /admin/api/*, cookie/CSRF behavior, API payloads, aggregate revisions, no-store and noindex/referrer headers. SPA host must route APIs before page fallback and serve index for all valid nested page URLs. Legacy Go HTML admin pages remain a deployment boundary; this plan does not delete them.

Migrate in stories: infrastructure and auth, shell and dashboard, then blogs, gallery, leads, then remove old dispatch/history code. Intermediate route switches must have one owner; never run old and new history listeners together. Existing components, services, upload controls and tests are reuse candidates; extracting pages does not justify rewriting publication business rules. Adopt the new architecture through this document and README; public frontend docs remain authoritative for shared policy.

## Verification

Use real router integration tests for routes, history, blockers, role boundaries, return targets and preview draft lifetime. Keep feature service payload tests and workflow tests. Add structural checks for forbidden dependency directions, inline types in TSX, direct transport calls and manual history routing. Verify query isolation and invalidation. Run pnpm test and pnpm build, then browser checks at desktop and narrow viewport. Production-like smoke tests must cover nested-route reload and API precedence. Report changed files, reused modules, executed/failed/skipped checks, structural debt, baseline_commit and final_commit: none for every story.
