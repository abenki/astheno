# Astheno

Astheno is a personal AI harness: a macOS Electron app with two modes —
**Chat** (plain conversation, no tools) and **Cowork** (agentic, takes real
actions via connectors and local tools — not yet built). It's built on the
[Pi Coding Agent SDK](https://github.com/earendil-works/pi) for the agent
loop, session persistence, and multi-provider model support.

## Repository layout

- `app/` — the Electron application. All commands below run from here.
- `docs/ARCHITECTURE.md` — living system-design doc (process architecture,
  agent runtime, model providers, connectors, session model).
- `brand/` — app icon source: an Icon Composer project (`astheno.icon`) plus
  a flat SVG, compiled into the app's actual icon assets (see below).

## Getting started

```
cd app
npm install
npm run dev
```

Chat mode needs a Gemini API key. Either set it from inside the app (gear
icon → Settings → Google (Gemini) → paste key → Save), or, for a faster dev
loop, drop `GEMINI_API_KEY=...` into `app/.env.local` (gitignored) — it's
loaded automatically in dev, though a key saved via Settings takes
precedence if both are present.

## Commands (run from `app/`)

- `npm run dev` — electron-vite dev (main + preload + renderer, with HMR for renderer code)
- `npm run build` — electron-vite build
- `npm run start` — electron-vite preview
- `npm run typecheck` — the only automated check right now; no test suite or lint script yet
- `npm run icon` — recompiles `brand/astheno.icon` into the app's icon assets (`app/build/icon.icns`, `app/resources/icon.png`); run after editing the icon in Icon Composer

There's no packaging pipeline yet (no `electron-builder` config, no
code signing) — intentionally deferred until the app is further along.

## Contributing

See `CLAUDE.md` for the fuller set of conventions this codebase follows
(dev-server verification workflow, agent runtime internals, design system
rules, etc.) — written for Claude Code, but equally useful as a guide for
anyone working in this repo.
