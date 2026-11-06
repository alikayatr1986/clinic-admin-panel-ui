# Admin frontend instructions

These instructions apply to planning, implementing, fixing, and reviewing the
admin app. Follow the repository root `AGENTS.md` and its required frontend
reading as well. This app is a separate Vite/React app; do not assume the public
Next.js app's components, tooling, or runtime are available here.

## Design and implementation

- Before changing UI, inspect the affected workflow, nearby pages, existing
  controls and styles. Identify the feature owner, states, responsive needs,
  and a consistent visual reference. Reuse suitable existing infrastructure.
- Use a consistent visual system for typography, spacing, color, borders,
  sizing, focus, and action hierarchy. A primary action must be visibly distinct
  from secondary and destructive actions. Never leave interactive controls as
  unstyled or indistinguishable text unless that is an intentional link pattern.
- Reuse suitable shared admin controls when available. When a needed control is
  missing, implement the smallest accessible, reusable control justified by the
  task; do not assume a component library already exists or copy a fragile
  implementation across pages. Do not redesign unrelated screens.
- Preserve feature-first ownership: routes compose; feature code owns domain
  behavior; shared UI and infrastructure remain independent of feature code.
  Put types in dedicated `*.types.ts` files, not TSX. Use the existing API and
  TanStack Query patterns; do not introduce a competing transport or duplicate
  server state in local state.
- **Component grouping and folder separation:** When a component is decomposed
  into subcomponents related only to each other (e.g. form cards, sections,
  field groups, dialogs, headers, or state cards specific to that parent view),
  group them in a dedicated subfolder under `src/features/<feature>/components/<group>/`.
  Do not dump non-shared subcomponents flat into the root `components/` folder.
  Only genuinely shared components remain directly under `components/`.
  Move all custom hooks to `hooks/`, types to `types/`, Zod schemas to `schemas/`,
  and helpers to `utils/` within the feature. Never leave hooks, schemas, or utils
  in `components/`.
- Write readable, maintainable code: small cohesive components, descriptive names,
  explicit error handling, and no duplicated business logic or speculative
  abstractions. Keep dependencies and changes proportional to the task.
- New and changed admin forms use React Hook Form, Zod, and `zodResolver` from
  `@hookform/resolvers/zod`. Keep Zod schemas feature-owned. Map server field
  errors with the shared `fieldErrors` helper; `ApiError.fields` stays
  `Record<string, string>` and the server remains authoritative. Do not make a
  client schema stricter than the server, and do not migrate forms that the
  current change did not touch.

## State ownership and rendering

- Keep transient UI state and its handlers in the smallest stable component that
  needs them. When multiple components need to coordinate, keep a single source
  of truth in their closest common owner.
- Extract a section when it has a clear responsibility or isolating frequently
  updated state reduces unnecessary work; do not split components solely to
  reduce render counts. A custom hook alone does not isolate renders from its
  calling component.
- Define components outside other components and preserve intentional state and
  draft lifetimes when moving or conditionally rendering them. Use the React
  Profiler to investigate a slow interaction before adding memoization.
- Keep remote server state in feature-owned TanStack Query hooks; do not mirror
  it into local state. Local state remains appropriate for UI state such as
  dialog visibility, selections, and unsaved form input.

## Interaction and accessibility

- Design and verify the applicable default, hover, focus-visible, disabled,
  loading, empty, validation, error, and success states. Make unavailable
  choices and failures understandable and actionable; never silently render an
  empty selector as if it were ready. Preserve form input on failure and avoid
  duplicate submissions.
- Use semantic controls, associated labels, meaningful accessible names, and
  visible keyboard focus. Do not rely on color alone. Ensure controls have
  usable target sizes, sufficient contrast, and logical reading and tab order.
- Dialogs need an accessible name, initial focus, contained focus, appropriate
  Escape and close behavior, and focus returned to the trigger. Background
  content must not be interactive while a modal is open. Use a proven existing
  primitive when suitable; test these behaviors rather than assuming ARIA alone
  implements them. Do not discard unsaved work without an appropriate warning.
- Show field errors beside their fields and associate them programmatically;
  announce relevant asynchronous feedback. Destructive actions must be clearly
  identified and require suitable confirmation. Do not imply success before the
  server confirms it.
- Check narrow and wide screens, zoom, long content, and keyboard operation.
  Support English and Arabic text and correct direction where applicable;
  ensure labels, controls, tables, and dialogs remain usable without clipping
  or horizontal overflow except where intentionally scrollable.

## Verification and completion

- For every UI change, run the app and inspect the actual affected pages and
  interactive states in a browser at desktop and narrow widths. Exercise the
  main workflow, relevant error and empty states, and keyboard interaction.
  Inspect screenshots for spacing, alignment, hierarchy, legibility, and visual
  consistency; fix defects found before reporting completion. A passing unit
  test alone is not visual verification.
- If browser verification or a required state cannot be exercised, report the
  precise blocker and unverified scope; never claim it passed. Use safe test
  data and avoid mutating real patient or production data during verification.
- Add or update focused behavior and accessibility tests when warranted. For
  critical workflows use browser tests when the repository supports them;
  introduce visual regression baselines only after the rendered result has been
  reviewed, and review screenshot changes rather than blindly accepting them.
- From `admin-panel-frontend/`, run `pnpm test` and `pnpm build` for changes
  that affect the app, plus any targeted checks appropriate to the change.
  Report failures and skipped checks honestly. Inspect the final diff for
  unintended changes and architectural boundary violations.
- In completion reports identify the pages and states inspected, components
  reused or added, checks performed, and material unresolved issues. Do not
  describe a page as finished when visible controls or required states remain
  broken or unverified.
