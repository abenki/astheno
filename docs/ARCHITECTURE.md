# Astheno — System Architecture

Status: design baseline before implementation. Supersede sections here as real
decisions get made in code; don't let this drift into fiction.

## 1. Scope

Astheno is a personal AI harness: a macOS Electron app with two modes —
**Chat** (plain conversation, no tools) and **Cowork** (agentic, takes real
actions via connectors and local tools). Target usage is assistant-style work
across the user's own accounts and machine — e.g. "check my calendar against
this email, propose time slots, send the reply once I pick one" — not
software development. Browser/computer-use style tools are an explicit future
direction, not v1.

Agent runtime: [Pi Coding Agent SDK](https://github.com/earendil-works/pi)
(`@earendil-works/pi-coding-agent`, built on `@earendil-works/pi-ai`). Pi
supplies the agent loop, tool-calling, streaming events, session
persistence/branching, and a multi-provider model layer — Astheno does not
reimplement any of that; it configures Pi and builds UI + connectors around
it.

### Package layering

Pi is a layered stack, not three interchangeable options — Astheno depends
on two of the layers, not all three:

```
pi-agent-core   → raw agent loop (tool exec, state, event streaming),
                   provider-agnostic. Never imported directly by Astheno —
                   it's an implementation detail pi-coding-agent wraps.
pi-ai           → LLM/provider layer (models, credentials, createProvider).
                   Astheno imports this directly, but only to register the
                   llama.cpp custom provider (§4) — Google/Mistral are
                   already in pi-ai's built-in catalog via ModelRuntime.
pi-coding-agent → wraps both, adds session persistence + branching,
                   ModelRuntime, defineTool, SettingsManager,
                   extensions/resource-loader, and a default toolset
                   (read/bash/edit/write/grep/find/ls). This is Astheno's
                   primary dependency — createAgentSession, SessionManager,
                   defineTool, ModelRuntime, SettingsManager all come from
                   here (§3, §6, §7).
```

`pi-coding-agent`'s "coding" framing is just its *default* system prompt and
toolset, both of which are plain configuration: the tool allowlist is set
per session (Chat gets `[]`, Cowork gets connectors plus whichever built-ins
it needs — never forced into `bash`), and the system prompt is overridable
via `DefaultResourceLoader`'s `systemPromptOverride`. Dropping to
`pi-agent-core` directly to shed that persona isn't worth it — it would mean
hand-rebuilding session persistence, settings/credential storage, and the
extension system (the natural home for the future MCP-wrapper in §8), all of
which `pi-coding-agent` already provides.

## 2. Process architecture

```
┌─────────────────────────────┐        IPC (preload bridge)       ┌──────────────────────────────┐
│  Renderer (React/TS/Tailwind)│ ───────────────────────────────▶ │  Main (Node)                  │
│  - Chat UI, Cowork UI         │ ◀─────────────────────────────── │  - Pi SDK: AgentSession(s)   │
│  - pure view, no Node access │      streamed session events       │  - ModelRuntime / providers   │
└─────────────────────────────┘                                    │  - connector tools             │
                                                                      │  - llama.cpp process manager  │
                                                                      └──────────────────────────────┘
```

Pi's SDK needs Node (`fs`, `child_process`, network) for its `bash`/`edit`/
`write` tools, and connector tools need the same for `osascript` and local
process management — so the agent runtime lives entirely in Electron's
**main** process, never in the renderer.

The renderer stays a pure view. It calls into main through the existing
preload bridge (`app/src/preload/index.ts`), extended with something like:

```ts
// preload
astheno.chat.prompt(sessionId: string, text: string): Promise<void>
astheno.chat.abort(sessionId: string): Promise<void>
astheno.chat.onEvent(cb: (sessionId: string, event: AgentSessionEvent) => void): () => void
astheno.sessions.list(mode: "chat" | "cowork"): Promise<SessionSummary[]>
```

Main subscribes to each `AgentSession` via `session.subscribe(...)` and
forwards events to the renderer over `webContents.send`. This replaces the
stub in `useChat.ts` (`ChatApp.tsx`'s canned `stubReply`) without touching
the already-built UI shell.

## 3. Agent runtime (Chat vs Cowork)

One Pi `AgentSession` per thread, in both modes. The modes differ only in
**tool allowlist**, not in SDK usage:

- **Chat**: `tools: []`, no custom tools registered. Pure conversation, works
  with zero connector setup. This was an explicit, deliberate choice — keep
  it that way; don't let a future feature request quietly add tools to Chat.
- **Cowork**: full allowlist — Pi's built-ins (`read`, `bash`, `edit`,
  `write`, `grep`, `find`, `ls`) plus Astheno's connector tools
  (`mail_*`, `calendar_*`, later others). This is the only mode that can
  take real actions.

Both modes share the same `ModelRuntime` and model selection (Settings is
global, not per-mode).

### Write-action confirmation gating

Given the target usage ("send the reply once I pick one"), any connector
tool that *mutates* external state (send an email, create/modify a calendar
event) must not fire the instant the model decides to call it. Pattern:

1. Tool's `execute()` doesn't perform the action directly — it returns a
   `pending_confirmation` result describing what it wants to do.
2. Renderer shows an inline "Send this email to X? [Confirm] [Cancel]" card
   in the Cowork transcript.
3. Only on explicit user confirmation does main actually perform the action
   (a second internal call, not a re-invocation of the model).

Read-only connector tools (check calendar, read mail) execute immediately —
no confirmation needed. This is the one piece of the design that isn't just
"configure Pi" — it's Astheno-specific safety plumbing worth building early,
since the whole point of Cowork is that it acts on real accounts.

## 4. Model providers

Configured through `pi-ai`'s `ModelRuntime` / `createProvider`. All three
target providers are supported without custom API-layer work:

- **Google, Mistral**: built-in `pi-ai` providers. Just need API keys,
  entered in Settings and stored via `ModelRuntime`'s `auth.json`
  (`modelRuntime.setRuntimeApiKey(...)` for runtime, persisted store for
  saved keys).
- **llama.cpp (local)**: registered as a custom OpenAI-compatible provider
  (llama.cpp's server exposes an OpenAI-compatible API), using
  `fetchModels()` against the running server's `/v1/models` so whatever GGUF
  is currently loaded shows up automatically.

### llama.cpp lifecycle (app-managed, per your call)

Don't bundle the `llama-server` binary inside the Electron app bundle —
ggml-org publishes versioned, prebuilt, Metal-accelerated binaries per
release (`llama-<version>-bin-macos-arm64.zip` from
[ggml-org/llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases)),
and re-notarizing the whole app every time upstream cuts a release would be
wasteful. Instead:

1. On first use of the local provider, download a pinned known-good release
   zip into `~/Library/Application Support/Astheno/llama.cpp/<version>/`.
2. Astheno spawns/stops `llama-server` as a child process against a
   user-chosen GGUF file, on the loopback interface only.
3. "Check for update" in Settings compares the pinned version against
   latest GitHub release and offers to download the new one side-by-side —
   never silently auto-updates, since llama.cpp releases occasionally change
   server flags/behavior and a model that worked yesterday breaking silently
   mid-session would be worse than staying on a pinned version.
4. Model (GGUF) files are separate from the binary and user-managed — point
   at a file on disk; Astheno doesn't fetch model weights itself in v1.

This gives you the "just works, app-managed" experience you asked for while
keeping updates explicit and the app bundle itself small and stable.

## 5. Connectors

v1 ships **Mail + Calendar only**, both native macOS apps automated via
AppleScript/JXA (`osascript`) — confirmed as the right call: it's the only
public automation surface for Mail.app (no EventKit equivalent exists for
Mail), and using the same mechanism for both keeps the connector layer
uniform for v1. Worth revisiting Calendar specifically later: EventKit is
Apple's more "correct" native path for Calendar (doesn't require Calendar.app
to be running, cleaner TCC semantics) but needs a small native Swift helper
process — not worth the extra moving part until AppleScript proves
insufficient.

Each connector is a module of Pi custom tools:

```
app/src/main/connectors/
  mail.ts       // mail_search, mail_read, mail_send (confirm-gated)
  calendar.ts   // calendar_list_events, calendar_find_free_slots,
                //   calendar_create_event (confirm-gated)
```

```ts
export const mailSearch = defineTool({
  name: "mail_search",
  description: "Search Mail.app messages",
  parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number()) }),
  execute: async (_id, { query, limit }) => {
    const script = /* osascript targeting Mail.app */;
    const result = await runAppleScript(script);
    return { content: [{ type: "text", text: result }], details: {} };
  },
});
```

### macOS permissions

AppleScript automation triggers per-app TCC "Automation" prompts the first
time Astheno addresses Mail/Calendar. Required for a notarized,
hardened-runtime build (Electron apps outside the Mac App Store still need
hardened runtime + notarization):

- `Info.plist`: `NSAppleEventsUsageDescription` (via electron-builder's
  `mac.extendInfo`), plus per-target descriptions matter for the system
  prompt copy.
- Entitlements: `com.apple.security.automation.apple-events` in the
  entitlements plist used for signing.

Without these, `osascript` calls will silently fail against a signed build
even though they work fine running unsigned in dev.

## 6. Session & data model

Single global "agent home" — `~/Library/Application Support/Astheno/agent/`
— shared by Chat and Cowork for *storage*: both write their session jsonl
files under this one root (Chat at its default `SessionManager` location,
Cowork under a `cowork-sessions/` subfolder — separate listing pools, so
`listChats()`/`listCoworkSessions()` never see each other's sessions).

- Sessions persisted via Pi's `SessionManager` (jsonl, branching built in) —
  `ChatHistoryList`/`groupChats.ts` for Chat and `CoworkSessionList`/
  `groupByFolder.ts` for Cowork are both thin views over
  `SessionManager.list()`/`.listAll()` metadata.
- **Superseding this section's earlier "no per-task/per-project working
  directory" note, for Cowork specifically**: each Cowork session *is*
  pinned to one folder for its lifetime, picked via a native folder dialog
  when the session is created (`runtime.ts`'s `createCoworkSession`). That
  folder becomes both the session's tool-execution `cwd` (what `bash`/`read`/
  `write`/etc. actually operate against) and its `SessionManager`-header
  `cwd` — the two must be set to the same value, since the sidebar's
  folder-grouping and a resumed session's tool-cwd restoration both read
  from that one stored field. Chat has no equivalent — it has no tools, so
  cwd is only ever storage-location bookkeeping for it, not a real per-task
  distinction. `~/Library/Application Support/Astheno/workspace/` still
  exists as the folder picker's *default offered location*, not as a shared
  cwd every session gets — a user picking it repeatedly just makes those
  sessions group together like any other folder would.

## 7. Settings (gear icon)

Per the locked IA decision, providers/connectors live behind the gear icon,
not as top-level tabs. Implemented so far: a modal (`components/ui/Modal.tsx`
+ `features/settings/SettingsModal.tsx`) listing model providers with a
save/remove API-key row per provider. Still needed:

- Local llama.cpp binary version + model file picker + start/stop +
  update-check (§4) — no UI yet, and the download/spawn lifecycle itself
  isn't built.
- Connector toggles: enable/disable Mail, Calendar individually (maps to the
  Cowork tool allowlist at session-creation time).
- (Later) GitHub/Gmail auth, MCP server list.

### How the API-key row actually persists a key

Goes through Pi's own credential store rather than a parallel Astheno-owned
settings file — `ModelRuntime.login(providerId, 'api_key', interaction)`
writes to `auth.json` at the `authPath` already passed to
`ModelRuntime.create()`, the same file `ModelRuntime` resolves auth from at
request time. Astheno's `AuthInteraction.prompt()` is a one-shot fake (the
key was already collected by the modal) rather than a real interactive
prompt — `login` is built for a CLI prompt loop but doesn't require one.

Provider list (`KNOWN_PROVIDERS` in `runtime.ts`) is a small Astheno-owned
array of `{ id, name }` — deliberately not derived from
`modelRuntime.getProviders()` (which would surface all 40+ providers `pi-ai`
knows about, not just the ones Astheno has actually wired into a session).
Adding a provider row is: wire it into `createChat`/session creation the way
Google is, then add one entry here.

`getProviderStatus()` reports "configured" from `listCredentials()`
(stored credentials only), not `hasConfiguredAuth()` (which also reports
true from an ambient env var like dev's `GEMINI_API_KEY` in `.env.local`).
Using the latter made "Remove" look broken — still "Connected" after
removing a credential that was never actually the one satisfying auth.

Key storage is plaintext JSON on disk (`auth.json`), matching how Pi's own
CLI (`pi login`) already stores credentials — not additionally encrypted
with something like Electron's `safeStorage`, since `ModelRuntime` reads the
raw key directly from that file at request time and doesn't go through an
Astheno-controlled decryption step. Acceptable for a personal single-user
local app; would need revisiting if this file's threat model ever changes.

## 8. Extensibility path (explicitly deferred, not v1)

Pi has no built-in MCP client — it's "aggressively extensible" instead
(custom tools, extensions). Your instinct to reach for MCP for GitHub/Gmail
later is the right shape for it: rather than hand-writing GitHub/Gmail
connector tools the way Mail/Calendar are hand-written, add a generic
`mcp_client` layer that connects to external MCP servers and dynamically
registers their tools as Pi `defineTool` entries. That's a single piece of
infrastructure that covers GitHub, Gmail, and anything else with an MCP
server, instead of N bespoke connectors. Also the natural place to eventually
hang a browser/computer-use tool. None of this blocks v1 — the connector
module structure in §5 doesn't need to change to accommodate it later.

## 9. Open risks / follow-ups

- Confirmation-gating UI (§3) doesn't exist yet in any form — a Cowork
  transcript now exists (`CoworkThreadView`/`CoworkMessageList`), so this is
  an inline confirm/cancel card added to it plus the pause-before-execute
  plumbing in a tool's `execute()`, not building a transcript from scratch.
- llama.cpp binary download/update flow (§4) needs an actual pinned
  known-good version chosen before first implementation.
- AppleScript entitlements (§5) can't be verified in dev (unsigned) — first
  real test only happens against a signed, notarized build.
- Settings (§7) only has the model-provider API-key row so far — no local
  model management, no connector toggles yet.
