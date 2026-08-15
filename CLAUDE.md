# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

- `app/` — the actual Electron application. **All commands below run from `app/`, not repo root.**
- `docs/ARCHITECTURE.md` — living system-design doc (process architecture, agent runtime, model providers, connectors, session model). Read it before touching anything in `src/main/agent/`, and update it when a real design decision changes.
- `brand/` — app icon assets (Icon Composer project + source SVG), not app source.
- `ui-inspiration/` — local-only reference screenshots, gitignored, not to be redistributed.

## Commands (run from `app/`)

- `npm run dev` — electron-vite dev (main + preload + renderer, with HMR for renderer code)
- `npm run build` — electron-vite build
- `npm run start` — electron-vite preview
- `npm run typecheck` — `tsc --noEmit` against `tsconfig.node.json` (main+preload) and `tsconfig.web.json` (renderer). This is the only automated check in the repo right now — no test suite, no lint script.

Chat mode needs a Gemini key — set it from inside the app (gear icon → Settings → Google (Gemini) → paste key → Save; persists via Pi's own `auth.json` credential store). For a faster dev loop that skips opening the UI, `app/.env.local` (gitignored) with `GEMINI_API_KEY=...` also works — loaded by `src/main/index.ts` via `process.loadEnvFile` when `is.dev`, and a stored Settings key takes precedence over it if both are present. Without either, chat sessions fail with a clear "model not found" error rather than a silent no-op.

This environment silently skips npm `postinstall` scripts (`npm warn allow-scripts ... have install scripts not yet covered`). Usually harmless, but if a package misbehaves after install, that's why — run `npm approve-scripts` or the package's install step manually.

## Verifying UI changes — do not launch a second Electron instance

The main process runs a loopback-only HTTP server on `127.0.0.1:47823` whenever `is.dev` is true (`src/main/index.ts`):

- `GET /screenshot` → PNG of the current window
- `GET /click?text=<substr>` → clicks the first `button`/`[role=tab]`/`a` whose text or aria-label contains the substring
- `GET /type?text=<...>&selector=<css>` (selector defaults to `textarea`) → sets the value via the native setter and dispatches `input` (needed for React-controlled inputs)
- `GET /key?name=<KeyboardEvent.key>&selector=<css>` → dispatches `keydown`

Check `curl -m 2 http://127.0.0.1:47823/screenshot` first. If it responds, a dev session is already running — reuse it rather than starting another `npm run dev` or killing Electron processes by pattern (that risks killing the user's own running session, not just yours).

Edits under `src/renderer/` hot-reload into the already-running window. Edits under `src/main/` or `src/preload/` need the Electron process restarted — electron-vite's auto-restart on these files is unreliable, so if you started the dev server yourself, kill and relaunch it (redirect to a fresh log file so you can grep it for errors — the console-message forwarder in `createWindow` mirrors renderer console output into that log when `is.dev`).

Preload builds to `out/preload/index.mjs` — note `.mjs`, not `.js` (`package.json` has `"type": "module"`, so electron-vite emits preload as ESM). `src/main/index.ts`'s `webPreferences.preload` must reference that exact filename; a mismatch fails silently (`window.api` ends up `undefined`, no error thrown anywhere) until something tries to call it.

## Architecture

### Process split

Electron main/preload/renderer, built via `electron-vite` (per-target Vite configs in `electron.vite.config.ts`). The **Pi agent runtime lives entirely in main** (`src/main/agent/runtime.ts`) — it needs Node for the agent SDK and model calls. The renderer is a pure view and never imports the agent SDK.

`src/preload/index.ts` is the canonical wire-protocol definition: it exports the `ChatStreamEvent` / `ChatSummary` / `ChatModelInfo` / `ChatMessageSnapshot` types and the `AsthenoApi` shape, exposed to the renderer as `window.api` (typed globally via `preload/index.d.ts`) and imported as types by main. When adding a new IPC call, extend this file first, then add the `ipcMain.handle` in `src/main/index.ts` and the implementation in `src/main/agent/runtime.ts`.

### Agent runtime (`src/main/agent/runtime.ts`)

Built on `@earendil-works/pi-coding-agent` (primary dependency — session lifecycle, tool registration, `ModelRuntime`) and `@earendil-works/pi-ai` only where needed directly (not yet used in code; reserved for registering a local llama.cpp provider later). The package layering (`pi-agent-core` → `pi-ai` → `pi-coding-agent`) and why the code depends on `pi-coding-agent` rather than dropping to `pi-agent-core` directly is explained in `docs/ARCHITECTURE.md` §1.

Non-obvious things the current implementation relies on:

- Pi's raw `AgentSessionEvent` union is translated into a small `ChatStreamEvent` protocol (`assistant_start`/`assistant_delta`/`assistant_done`/`error`) before crossing IPC — the renderer never sees Pi's event types.
- **A turn can fail with `stopReason: "error"` directly at `message_end`, without ever emitting a `message_update` event.** Both that path and the `message_update`-carried error path must be handled in `subscribeChat`, or failures are silently swallowed (empty assistant bubble, `isSending` clears, nothing visibly wrong).
- Provider error bodies often arrive doubly-JSON-nested (pi-ai's wrapper around the raw provider error) — `extractErrorMessage` best-effort unwraps to the human-readable inner message.
- Don't pass an explicit `thinkingLevel` when creating sessions. Pi's own per-model clamping of its default is more reliable than any single fixed value — different Gemini catalog entries accept different thinking levels, and forcing `'off'` broke a model that worked fine under Pi's own default.
- When resuming a session from disk (`openChat`), deliberately omit `model` from `createAgentSession` so Pi restores whatever model that session last used, instead of forcing it back to a default.
- Chat mode always creates sessions with `noTools: 'all'` — a deliberate, locked product decision (`docs/ARCHITECTURE.md` §3), not a placeholder. Cowork mode (not yet built) is the only place tools/connectors get enabled.
- The model picker's catalog comes straight from `modelRuntime.getModels('google')` — no hardcoded model list, so it stays correct as the provider's catalog changes. This also means it can surface models that are broken or deprecated on the provider's side (has happened: `gemini-2.5-flash` 404s as "no longer available to new users"). The fix for that class of problem is robust error surfacing (see above), not curating the list.
- Provider API keys (Settings modal, gear icon) persist through Pi's own `ModelRuntime.login()`/`logout()`/`listCredentials()` — writing to `auth.json` at the same `authPath` `ModelRuntime` already resolves auth from — not a separate Astheno-owned settings file. `getProviderStatus()` deliberately checks `listCredentials()` (stored only) rather than `hasConfiguredAuth()` (also true from the dev `.env.local` env var), or "Remove" looks like it does nothing. See `docs/ARCHITECTURE.md` §7 for the full reasoning, including why the key is plaintext on disk (matches how `pi login` already stores it; `ModelRuntime` reads it directly at request time, so Astheno can't interpose its own encryption without breaking that).

### Design system

Flat, neutral palette defined in `src/renderer/src/styles/globals.css`'s `@theme` block (surface/border/text/accent/radius/shadow custom properties). No component library — primitives are hand-rolled in `components/ui/` (Button, Card, IconButton, Menu, Modal, PillInput, SidebarItem, Tabs) styled directly with Tailwind v4 + those custom properties. New UI should reuse existing tokens rather than introducing ad hoc values. Kitchen-sink reference screen at `src/renderer/src/pages/StyleGuide.tsx`, reachable via the app's own tiny hash router (`#/styleguide`, no react-router dependency).

Top-level IA is locked to two modes, Chat and Cowork (`components/Sidebar.tsx`'s `AppMode`), with provider/connector settings behind a gear icon rather than additional top-level tabs — this was an explicit product decision, not an oversight.
