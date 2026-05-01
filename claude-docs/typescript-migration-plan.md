# dragsterjs 3.0 — TypeScript Migration Plan

**Status:** Planning complete, awaiting implementation start
**Target version:** 3.0.0
**Strategy:** Full rewrite (not incremental port)
**Branch model:** Long-lived `v3` branch with stacked PRs into it; merge to `master` only at release.

---

## 1. Decisions and rationale

Each decision is paired with the *why*, so future you (or contributors) can re-evaluate edge cases without re-deriving the reasoning.

### 1.1 Migration scope: full rewrite (not a port)

**Decision:** Treat 3.0 as a full rewrite — module split, bundler, public-API redesign, fix layout-thrashing, drop legacy bits.

**Why:**
- A thin "rename `.js` → `.ts`" port keeps the string-template build pipeline (`module-generator.js` + `template.es6.js`), the unsplittable monolith that blocks unit testing, and two parallel sources of truth for types (the hand-written `dragster.d.ts` can drift from `dragster-script.js`).
- The deferred layout-thrash fix in `updateRegionsHeight` and the desire to add unit tests both require module-level structure that the current single-file shape can't provide.
- A 3.0 SemVer bump is the right contractual moment to make breaking changes; doing a half-rewrite now would force another major bump later.

### 1.2 Public API: class + typed event emitter (Level 2)

**Decision:** `Dragster(opts)` becomes `new Dragster(opts)`. The seven `onBeforeDragStart` / `onAfterDragStart` / … / `onAfterDragDrop` callback options are replaced with `.on(event, cb)` / `.off(event, cb)` on a typed event emitter. Methods (`update`, `updateRegions`, `destroy`) preserved.

**Why:**
- The seven-callback options-bag is the worst part of the current public surface from a TypeScript perspective. Each callback has to be individually declared in the options type, and there's no way to add an event without expanding the bag.
- A discriminated event map (`{ beforeDragStart: DragsterEventInfo; afterDragMove: DragsterEventInfo; ... }`) gives consumers one cleanly-typed surface and lets future events ship as additive non-breaking changes.
- Multi-subscriber comes for free (current single-callback design forces `cb1` to call `cb2` manually).
- Element-scoped construction (`new Dragster(rootEl, opts)` instead of global selectors) was considered and rejected — bigger compat break for marginal value; global selector init works fine for this library's use case.

### 1.3 Distribution: npm + CDN-via-unpkg/jsdelivr

**Decision:** No more committing built artefacts (`dragster.js`, `dragster.min.js`, `dragster.min.js.gz`) to git. `dist/` is gitignored. CDN consumers move from `raw.githubusercontent.com/sunpietro/dragster/...` to `https://unpkg.com/dragsterjs@3` or `https://cdn.jsdelivr.net/npm/dragsterjs@3`. README documents the migration.

**Why:**
- Raw GitHub URLs are not a real CDN — `raw.githubusercontent.com` ships `Cache-Control: max-age=300` and is rate-limited per IP. Anyone serious about CDN delivery is already on unpkg or jsdelivr.
- Committing artefacts to root creates noisy diffs on every release and a recurring "did I forget to regenerate?" footgun.
- After multi-format bundler output (sourcemaps + minified variants), committing 6+ binary-ish files to root becomes untenable.
- A 3.0 break is the right moment; this break is *smaller* than the API redesign already on the table.

### 1.4 Build toolchain: Rollup, ESM-only, target ES2022

**Decision:** Use [Rollup](https://rollupjs.org/) for builds. Single output format: ESM. No CJS, no UMD, no IIFE. `target: 'es2022'`. Banner from former `dragster-comment.js` injected via Rollup's `output.banner` option. `.d.ts` bundled via `rollup-plugin-dts`. Minification via `@rollup/plugin-terser`.

**Why ESM-only:**
- Browser baseline (last 3 versions: roughly Chrome 137+, Firefox 142+, Safari 17+ as of May 2026) supports `<script type="module">` natively. UMD/IIFE is dead weight.
- CJS is for Node consumers. Drag-and-drop is browser-only — no Node runtime story exists for this library. The only path Node gets involved is SSR-side imports in framework projects (Next.js, Nuxt, SvelteKit, Remix), and every modern bundler in those stacks consumes ESM natively.
- Modern peer libraries (`chalk@5+`, `nanoid@4+`, `node-fetch@3+`, `execa@7+`) shipped ESM-only and the ecosystem adapted.

**Why Rollup over tsup or tsc-only:**
- Rollup is the long-lived library-bundler default — used by React, Vue, redux, zod, lodash. Since ~2017, stable plugin ecosystem.
- Direct ownership of the toolchain; no wrapper layer (tsup) to abstract or change behaviour underneath.
- Tree-shaking, banner control, and `.d.ts` bundling via `rollup-plugin-dts` are all first-class, well-documented.
- tsc-only was considered ("just emit ES modules, skip the bundler") but rejected: dist/ would contain ~7 separate files for a CDN consumer to fetch as a waterfall. Single-file bundle is materially better for the unpkg `<script type="module">` use case.

### 1.5 Module structure: medium granularity (6–7 files)

**Decision:** Split the 989-line monolith into 7 modules under `src/`:

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Public `class Dragster`, options validation, lifecycle wiring |
| `src/state-machine.ts` | Drag pickup → move → drop lifecycle, shadow element |
| `src/regions.ts` | Region tracking, height measurement, layout-thrash fix |
| `src/placeholder.ts` | Top/bottom placeholder insertion + visibility |
| `src/scroll.ts` | Auto-scroll near viewport edges (60px threshold, 10px step) |
| `src/events.ts` | Typed event emitter + event map type definitions |
| `src/dom.ts` | Low-level DOM utilities (class manipulation, position math, event helpers) |

**Why:**
- Coarse split (3 files) leaves state-machine + regions + scroll tangled in `dragster.ts`; that's exactly what blocks the unit-test plan for the layout-thrash fix.
- Fine split (10+ files) over-indexes on locality; a ~1000-line library ends up with files that are 80% imports and the navigation tax exceeds the benefit.
- Medium split: each file 100–250 lines, each independently importable and mockable in Vitest, public surface in `src/index.ts` readable in one screen.

### 1.6 Test strategy: Vitest unit tests + Playwright E2E

**Decision:** Add Vitest + happy-dom for unit tests. Migrate existing Cypress E2E suite to Playwright. Replace `cypress-mcp` with `@playwright/mcp` in `.claude/settings.json`.

**Why Playwright over staying on Cypress:**
- Drag-and-drop is the canonical "works in Chrome, breaks in Safari" feature class. Touch events, pointer events, and WebKit's mouse-event quirks differ from Chromium. Current Cypress run only exercises one browser; Playwright's first-class Chromium + Firefox + WebKit parallelism gives real cross-browser coverage.
- `locator.dragTo()` / `page.dragAndDrop()` is meaningfully cleaner than Cypress's `trigger('mousedown')` chains — typical migration shrinks test bodies ~40%.
- The earlier audit memo already flagged "Cypress 5 major versions behind". Some E2E tooling work is unavoidable; migrating once is cheaper than upgrading then migrating.
- Test bodies have to change anyway (assertions move from `onAfterDragDrop` callback to `.on('afterDragDrop')`); this is the cheap moment to switch frameworks.

**Why Vitest:**
- The whole point of choosing module structure 1.5 was unit-testability. Vitest is the standard 2026 choice for TypeScript libraries; happy-dom is faster than jsdom and handles the `getBoundingClientRect` / `offsetHeight` surface this library uses.

### 1.7 TypeScript strictness: `strict` + `noUncheckedIndexedAccess`

**Decision:** Enable `strict: true` plus `noUncheckedIndexedAccess: true`. Skip `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`.

**Why:**
- `noUncheckedIndexedAccess` makes `regions[i]` evaluate to `HTMLElement | undefined` instead of `HTMLElement`. Region tracking, placeholder logic, and child indexing all walk element collections — exactly the shape where this flag pays for itself.
- The current `dragster-script.js` has at least one place where indexed access happens after a length check that the type system can't see; under `noUncheckedIndexedAccess` that becomes a compile error caught once at the rewrite, not a latent runtime risk.
- `exactOptionalPropertyTypes` adds friction with the `{ ...defaults, ...userOptions }` options-bag pattern without proportional safety benefit.
- Other maximalist flags are stylistic, not safety-driven.

### 1.8 Migration shape: long-lived `v3` branch with stacked PRs

**Decision:** Create `v3` branch off `master`. Merge a series of small PRs *into* `v3`. Final step merges `v3` → `master`.

**Why:**
- Self-review tax: a single 2000-line big-bang PR is unreviewable even by its author.
- `master` stays releasable for 2.2.x patches throughout the migration. A trunk-based approach where `src/` lives alongside `dragster-script.js` risks accidentally shipping incomplete scaffolding in a 2.2.3 patch tarball.
- The branch supports prereleases under the `next` npm dist-tag without disturbing `latest` (kept as a capability even though we're not using it — see 1.9).

### 1.9 No prereleases — direct 3.0.0

**Decision:** When `v3` is functionally complete and merged to master, tag `3.0.0` immediately. No `3.0.0-beta.x`, no `3.0.0-rc.x`.

**Why:**
- Solo OSS project with low download volume — beta phase would attract zero installs and add ceremony for theatre.
- The "beta lets API still change in response to feedback" argument doesn't apply when there's no feedback loop.
- If real adoption signals appear before tagging, this decision can be revisited.

### 1.10 No backward-compat shim — clean break + migration guide

**Decision:** No `dragsterjs/legacy` subpath export. README ships before/after code examples; users migrate their call sites once.

**Why:**
- The migration is short for users — one constructor change + N callback bindings, ~5–15 lines of edits.
- A compat shim has ongoing maintenance cost: every 3.x minor release becomes a question of "did I break the legacy adapter?" — a museum that has to keep working forever.
- A shim defeats the purpose of the redesign — users would reach for `legacy` and never refactor onto the better API.
- SemVer's contract: a major bump is the licensed moment to break. Users who pin `^2.2.0` are unaffected.

### 1.11 Administrative decisions (lightning round)

| Topic | Decision |
|-------|----------|
| Files deleted in cleanup | `dragster-script.js`, `dragster.js`, `dragster.min.js`, `dragster.min.js.gz`, `dragster.d.ts`, `dragster-comment.js`, `template.es6.js`, `module-generator.js`, `bower.json`, `cypress/`, `cypress.config.js` |
| `scripts/bump-version.js` | Adapted (no longer updates committed dist files), not deleted |
| Banner comment | Moved from `dragster-comment.js` into `rollup.config.js` `output.banner` option before file deletion |
| Dev loop | `rollup -c -w` + existing `http-server`. `index.html` loads `./dist/dragster.js` via `<script type="module">`. No Vite. |
| Linting | Keep eslint flat config + prettier. Add `typescript-eslint` (unified package). Drop `eslint-plugin-cypress`. |
| CI | GitHub Actions: on PR run `typecheck && lint && test:unit && test:e2e && build`. Playwright runs Chromium/Firefox/WebKit in parallel. Tag-on-master triggers `pnpm publish`. |
| Sourcemaps | External `.map` files in `dist/`, included in npm tarball |
| Migration guide | Section in README, before/after examples per option/callback. No separate `MIGRATION.md` unless it grows past ~150 lines. |
| Changelog | Manual `CHANGELOG.md` in Keep-A-Changelog format. No conventional-commits / auto-generation. |
| MCP | Replace `cypress-mcp` with `@playwright/mcp` in `.claude/settings.json` after Playwright migration lands. |

---

## 2. Locked configuration sketches

### 2.1 `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 2.2 `rollup.config.js`

```js
import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const banner = `/*@preserve
 * Dragster - drag'n'drop library v3
 * ...
 */`;

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/dragster.js',
      format: 'esm',
      sourcemap: true,
      banner,
    },
    plugins: [
      nodeResolve(),
      typescript({ tsconfig: './tsconfig.json', declaration: false }),
      terser({ format: { comments: /@preserve|@license|@cc_on/i } }),
    ],
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/dragster.d.ts', format: 'esm' },
    plugins: [dts()],
  },
];
```

### 2.3 `package.json` deltas

```jsonc
{
  "type": "module",
  "main": "./dist/dragster.js",
  "module": "./dist/dragster.js",
  "types": "./dist/dragster.d.ts",
  "exports": {
    ".": {
      "types": "./dist/dragster.d.ts",
      "import": "./dist/dragster.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE", "CHANGELOG.md"],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w & http-server . -p 8370",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "pnpm test:unit && pnpm test:e2e",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "release": "pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm publish"
  }
}
```

### 2.4 Public API surface (TypeScript)

```ts
export interface DragsterOptions {
  elementSelector?: string;
  regionSelector?: string;
  dragHandleCssClass?: string | false;
  replaceElements?: boolean;
  cloneElements?: boolean;
  dragOnlyRegionCssClass?: string;
  updateRegionsHeight?: boolean;
  minimumRegionHeight?: number;
  scrollWindowOnDrag?: boolean;
  wrapDraggableElements?: boolean;
  shadowElementUnderMouse?: boolean;
}

export interface DragsterEventInfo {
  drag: { node: HTMLElement | null };
  drop: { node: HTMLElement | null };
  shadow: { node: HTMLElement | null; top: number; left: number };
  placeholder: { node: HTMLElement | null; position: 'top' | 'bottom' | null };
  dropped: HTMLElement | null;
  clonedFrom: HTMLElement | null;
  clonedTo: HTMLElement | null;
}

export type DragsterEventMap = {
  beforeDragStart: DragsterEventInfo;
  afterDragStart: DragsterEventInfo;
  beforeDragMove: DragsterEventInfo;
  afterDragMove: DragsterEventInfo;
  beforeDragEnd: DragsterEventInfo;
  afterDragEnd: DragsterEventInfo;
  afterDragDrop: DragsterEventInfo;
};

export type DragsterEventName = keyof DragsterEventMap;
export type DragsterListener<E extends DragsterEventName> =
  (info: DragsterEventMap[E]) => void | false;

export default class Dragster {
  constructor(options?: DragsterOptions);
  on<E extends DragsterEventName>(event: E, listener: DragsterListener<E>): this;
  off<E extends DragsterEventName>(event: E, listener: DragsterListener<E>): this;
  update(): void;
  updateRegions(): void;
  destroy(): void;
}
```

---

## 3. Deliverable chunks (PR sequence)

Each chunk is a single PR into `v3`. Sized for review-in-one-sitting. Order matters: each builds on the previous.

### PR 1 — Tooling & scaffolding

**Goal:** `v3` branch has working build/test/lint pipeline against an empty (but importable) `src/`.

**Tasks:**
- Branch `v3` off `master`.
- Add deps: `typescript`, `rollup`, `@rollup/plugin-typescript`, `@rollup/plugin-node-resolve`, `@rollup/plugin-terser`, `rollup-plugin-dts`, `tslib`, `vitest`, `happy-dom`, `@playwright/test`, `typescript-eslint`. Remove deps: `cypress`, `eslint-plugin-cypress`, `@testing-library/cypress`, `cypress-mcp`, `uglify-js`.
- Create `tsconfig.json` (config from §2.1).
- Create `rollup.config.js` (config from §2.2).
- Update `package.json` (deltas from §2.3): `"type": "module"`, scripts, exports map, files allow-list.
- Update `eslint.config.js` to consume `typescript-eslint` and target `src/**/*.ts`.
- Add `vitest.config.ts` with happy-dom env.
- Add `playwright.config.ts` with Chromium/Firefox/WebKit projects.
- Add `.github/workflows/ci.yml`: typecheck, lint, unit, e2e, build on PR.
- Add `dist/` to `.gitignore`.
- Create `src/index.ts` as a stub: `export default class Dragster {}`.
- Verify `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` all run (E2E can be empty).

**Done when:** clean PR builds green; `dist/dragster.js` is produced (even if it just exports an empty class).

---

### PR 2 — `src/dom.ts` + shared types

**Goal:** Lowest layer of the rewrite — pure utilities with no dependencies on the rest.

**Tasks:**
- Port DOM-creation helpers (`createElement`-style, class manipulation, `getBoundingClientRect` wrappers, position math).
- Define shared types referenced across modules (`Position`, `Bounds`, etc.).
- Vitest unit tests for every utility.
- No state, no side effects.

**Done when:** `src/dom.ts` ships with ≥80% Vitest coverage; type errors clean under `noUncheckedIndexedAccess`.

---

### PR 3 — `src/events.ts` (typed event emitter)

**Goal:** The new `.on()`/`.off()` machinery, typed end-to-end.

**Tasks:**
- Implement minimal typed `EventEmitter<EventMap>` class supporting `on`, `off`, `emit`. ~50–80 lines.
- Define `DragsterEventMap` and `DragsterEventInfo` types (from §2.4).
- Vitest tests covering: subscribe/unsubscribe, multiple listeners per event, listener returning `false` (used today by `onBefore*` to cancel), unknown-event rejection at compile time (type-test file).

**Done when:** any consumer can write `emitter.on('beforeDragStart', info => …)` with full inference; `emitter.on('typo', …)` is a compile error.

---

### PR 4 — `src/regions.ts` + layout-thrash fix

**Goal:** First behavioural module. Resolves the long-deferred layout-thrash issue.

**Tasks:**
- Port region tracking: find regions via selector, measure heights, update minimum height on drag.
- Refactor `updateRegionsHeight` to batch reads before writes (read all `offsetHeight`s into an array, then apply all `style.height` writes in a second pass). This is the optimisation deferred in the previous audit session.
- Vitest unit tests using happy-dom: covers "X regions, Y elements per region" matrix; asserts read/write batching by spying on layout-trigger properties.

**Done when:** the layout-thrash fix has explicit test coverage; behaviour matches 2.x for the existing E2E scenarios.

---

### PR 5 — `src/state-machine.ts`

**Goal:** Drag lifecycle as an explicit state machine.

**Tasks:**
- States: `idle` → `picking` → `dragging` → `dropping` → `idle`.
- Mouse + touch normalised onto a single pointer-event stream.
- Shadow-element creation/positioning/cleanup.
- Emits via `EventEmitter` (injected, not constructed internally — easier to test).
- Vitest tests with synthetic pointer events; cover state transitions and emitted events.

**Done when:** every transition has a test; cancel-via-listener-returning-false works.

---

### PR 6 — `src/placeholder.ts` + `src/scroll.ts`

**Goal:** Two smaller modules bundled together — neither warrants its own PR.

**Tasks:**
- `placeholder.ts`: top/bottom placeholder insertion logic, visibility toggle. Pure-ish; takes target element + cursor position, returns placement decision.
- `scroll.ts`: auto-scroll near viewport edges. Constants (60px threshold, 10px step) extracted as named exports.
- Vitest tests for both.

**Done when:** both modules covered; constants documented in JSDoc.

---

### PR 7 — `src/index.ts` public class wiring

**Goal:** Compose the modules into the public `class Dragster`.

**Tasks:**
- Implement `class Dragster` matching the type surface in §2.4.
- Constructor: validates options, merges with defaults, instantiates `EventEmitter`, wires up state machine + region tracker + scroll + placeholder modules.
- `on` / `off` delegate to emitter.
- `update` / `updateRegions` / `destroy` delegate to relevant modules.
- Vitest integration tests at the class level (using happy-dom) for end-to-end-ish coverage of the public surface.

**Done when:** `import Dragster from '../src'; new Dragster({...}).on('afterDragDrop', cb)` works in a Vitest test.

---

### PR 8 — Demo migration & Playwright E2E

**Goal:** Replace Cypress with Playwright; update `index.html`.

**Tasks:**
- Update `index.html`: change `<script src="dragster.js">` to `<script type="module">import Dragster from './dist/dragster.js'; ...</script>`. Update demo init code from `Dragster({...})` to `new Dragster({...})` and from `onAfterDragDrop: cb` to `.on('afterDragDrop', cb)`.
- Migrate every `cypress/e2e/*.cy.js` spec to `tests/e2e/*.spec.ts` using Playwright. The recently-added "maintains source region height while dragging" test must come along.
- Verify all three Playwright projects (Chromium, Firefox, WebKit) pass.
- Update `.claude/settings.json`: replace `cypress-mcp` with `@playwright/mcp`.

**Done when:** `pnpm test:e2e` is green on all three browsers; `pnpm dev` (rollup -c -w + http-server) serves a working demo.

---

### PR 9 — Cleanup, README, changelog

**Goal:** Delete the old world. Document the new one.

**Tasks:**
- Delete: `dragster-script.js`, `dragster.js`, `dragster.min.js`, `dragster.min.js.gz`, `dragster.d.ts`, `dragster-comment.js` (after confirming banner is in `rollup.config.js`), `template.es6.js`, `module-generator.js`, `bower.json`, `cypress/`, `cypress.config.js`.
- Adapt `scripts/bump-version.js`: remove any logic that touches the deleted files; keep version-bumping logic for `package.json`.
- Rewrite README:
  - Update install / usage examples to `new Dragster(...)` + `.on(...)`.
  - Add **"Migrating from 2.x"** section with side-by-side before/after code blocks.
  - Update CDN section: replace `raw.githubusercontent.com` URLs with `unpkg.com/dragsterjs@3` and `cdn.jsdelivr.net/npm/dragsterjs@3`.
  - Document ESM-only requirement; note that 2.2.x remains available for users on legacy stacks.
- Create `CHANGELOG.md` (Keep-A-Changelog format) with the 3.0.0 entry summarising every breaking change.
- Update `.gitignore` if any leftover patterns reference deleted files.

**Done when:** repo contains no traces of the legacy build pipeline; README walks a user from 2.x to 3.x in one read.

---

### Final step — `v3` → `master`, tag `3.0.0`, publish

**Goal:** Ship.

**Tasks:**
- Open `v3` → `master` PR. Self-review the cumulative diff one last time.
- Merge.
- `git tag v3.0.0 && git push --tags`.
- `pnpm publish` (assuming CI tag-publish workflow is configured, this is automatic on tag push).
- Verify on npm: `npm view dragsterjs@3` reports correct `exports`, `files`, ESM-only.
- Verify on unpkg: `https://unpkg.com/dragsterjs@3` resolves to `dist/dragster.js`.
- Update GitHub repo description / topics if needed.
- Announce (if applicable: GitHub Discussions, Twitter, etc.).

**Done when:** `npm install dragsterjs@3` works; `<script type="module">import Dragster from 'https://unpkg.com/dragsterjs@3'</script>` works in a real browser.

---

## 4. Out of scope for 3.0

Logged here so they don't accidentally creep in:

- **Element-scoped construction** (`new Dragster(rootEl, opts)` instead of global selectors). Considered as Level 3 of the API redesign; rejected as too aggressive a break for this release.
- **MutationObserver replacing `update()`**. Same reasoning — adds runtime cost and is a meaningful behavioural change.
- **Auto-changelog from conventional commits**. Manual changelog is fine at this project's release frequency.
- **Public plugin API**. The new event emitter is a *foundation* for plugins, but no plugin API is exposed in 3.0.
- **Drag-and-drop file upload integration**. Out of scope; keep the library focused on element reordering.

---

## 5. Open items / TBD

These don't block the start of work, but should be resolved before the relevant PR:

- [ ] Confirm exact `target` for `tsconfig` matches Rollup typescript-plugin target (both `es2022` here, but worth re-verifying against actual browser baseline at release time).
- [ ] Decide on Playwright config: trace on retry? screenshot on failure? Default settings are probably fine.
- [ ] Draft the README "Migrating from 2.x" section before PR 9 lands so it can be reviewed independently.
- [ ] Re-check whether any 2.x consumers are pinning `raw.githubusercontent.com` URLs (GitHub search, npm download trends). If significant, add a deprecation notice commit on `master` pointing at unpkg.
