# Mini-SOC — Frontend Demo

A self-contained Security Operations Center (SOC) frontend built with **HTML5, CSS3 and vanilla
JavaScript only**. No frameworks, no build step, no backend, no authentication, no database.

Every record you see is **sample/demo data** generated locally in the browser. The UI labels this
wherever it matters and never claims live integrations, real-time feeds or AI inference.

---

## Quick start

### Option A — open directly (simplest)

Double-click `index.html` (or drag it into a browser). The app runs entirely over `file://`:

- classic `<script>` tags, no ES modules and no `fetch()`,
- no CORS-dependent resources (fonts, icons and charts are inlined or drawn at runtime).

### Option B — tiny dev server (optional)

```bash
node tools/serve.js 8080
# then open http://localhost:8080/
```

`tools/serve.js` is a ~60-line static file server with no dependencies. It exists only for
convenience (e.g. dev-tools niceties); it is **not required**.

> Verified in current Chromium-based browsers. No IE/legacy support.

---

## Pages

| # | Page | File | What it demonstrates |
|---|------|------|----------------------|
| 1 | Overview | `index.html` | KPI row, activity/donut/bar charts, attention list, graph preview, timeline, quick links |
| 2 | Security Events | `pages/events.html` | Filterable/sortable/paginated event table, facet counts, detail drawer, CSV export |
| 3 | Incidents | `pages/incidents.html` | Status/severity filters, sortable table with risk bars, detail drawer |
| 4 | Investigation | `pages/investigation.html` | Incident workspace: tabs for overview, evidence, MITRE ATT&CK, timeline, AI panel, hunt findings |
| 5 | Attack Graph | `pages/attack-graph.html` | Interactive SVG graph: pan/zoom/pinch/keyboard, node details, sample attack path, legend |
| 6 | AI Assistant | `pages/ai-assistant.html` | Chatbot with General/SOC-Analyst modes, markdown-lite transcript, conversation history, workspace context chips, contextual drawer (also in the topbar on every page) |
| 7 | AI Security Analyst | `pages/ai-analyst.html` | Authored analyses split into **Observed fact / Inference / Recommendation**, confidence meters, uncertainty block |
| 8 | Threat Hunting | `pages/threat-hunting.html` | Local query engine (`field:value` + free text + scope filters), saved queries, history, CSV export |
| 9 | Cyber Deception | `pages/deception.html` | Simulated decoy inventory, interaction timeline, detail drawer |
| 10 | Incident Response & Risk | `pages/incident-response.html` | Risk gauge + factors, recommendations with **human approval workflow**, audit log |
| 11 | Reports | `pages/reports.html` | Report builder, section toggles, print view (PDF via browser), CSV export |
| 12 | Settings | `pages/settings.html` | Theme, motion, sidebar, rows-per-page preferences; demo environment info; API placeholder map |

All pages share one shell (sidebar + topbar + global search), injected by
`js/navigation.js` into `<div id="app-shell">`.

---

## AI Assistant (chatbot)

The assistant lives at `pages/ai-assistant.html` and — via the topbar chat button — as a
**contextual drawer** on every page. Rendering (`js/chat-ui.js`) is separated from data access
(`js/chat-service.js`); both hosts share one store through the `chat:changed` event.

- **Modes:** *General Assistant* and *SOC Analyst* with a visible pressed/active state; the mode
  persists in `localStorage` (`soc.pref.chatMode`).
- **Provider status:** the header chip reads **“Demo provider · no live model”** — replies come
  from a scripted sample knowledge base in `chat-service.js`. No model, backend, telemetry or API
  keys are involved, and the transcript labels every reply *Demo*.
- **Context:** opening the drawer (or the page) auto-attaches real context only — `?incident=` /
  `?event=` / `?id=` from the current URL plus the current page name, shown as removable chips.
  SOC Analyst mode shows an honest “not configured yet” note when no record context is attached,
  and an unknown incident id gets an explicit *can’t find* answer — **nothing is ever invented**.
- **History:** new/switch/delete-with-confirm, titles from the first user message, empty-history
  state, capped at 20 conversations × 100 messages in `localStorage` (`soc.chat.store`), falling
  back to memory when storage is unavailable. Only conversation text is stored — no secrets.
- **Composer:** auto-expanding textarea, <kbd>Enter</kbd> sends, <kbd>Shift</kbd>+<kbd>Enter</kbd>
  adds a line (IME-safe), disabled while a reply is pending, accessible send button.
- **Demo test hooks:** send `/error` to exercise the error bubble + **Retry** (the retry then
  recovers), and `/empty` to see the honest empty-response state — no backend required.

---

## Running the demo

- **Theme:** light/dark toggle in the topbar, theme cards in Settings, or press <kbd>D</kbd>.
  Persisted in `localStorage` (`soc.theme`), with system preference as the fallback.
- **Motion:** Settings → *Prefer reduced motion*; the CSS/JS also honour the OS-level
  `prefers-reduced-motion` setting. Graph pulses and path animations pause when the tab is
  hidden or the stage is off-screen.
- **Search:** <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd> or <kbd>/</kbd> — searches across
  incidents, events, assets and pages.
- **Shortcuts:** <kbd>Esc</kbd> closes dialogs/drawers/popovers (including the AI drawer and the
  chat history panel); graph nodes are reachable with <kbd>Tab</kbd> and selectable with
  <kbd>Enter</kbd>.
- **AI Assistant:** the topbar chat button opens the assistant drawer on any page;
  <kbd>Enter</kbd>/<kbd>Shift</kbd>+<kbd>Enter</kbd> work inside the composer.
- **Responsive:** designed and checked at 1440 / 1024 / 768 / 390 px widths.
- **Accessibility:** skip link, landmarks, focus-visible rings, focus trapping in dialogs and
  drawers, `aria-live` result counts, `role="log"` chat transcript with a polite status region,
  table captions/scope, keyboard-operable filters, tabs and chat controls.
  Verified with **axe-core 4.12 — 0 violations on all 12 pages in both themes** (plus the open
  AI drawer) and **Lighthouse 1.0** (Accessibility / Best Practices / SEO).

### Deep links (query parameters)

| Page | Parameter | Example |
|------|-----------|---------|
| Events | `?event=` | `events.html?event=EVT-9112` |
| Incidents | `?status=` | `incidents.html?status=Investigating` |
| Investigation | `?id=` | `investigation.html?id=INC-2026-1039` |
| Attack Graph | `?focus=`, `?path=0`, `?incident=` | `attack-graph.html?focus=n-web` |
| AI Analyst | `?id=` | `ai-analyst.html?id=INC-2026-1042` |
| Threat Hunting | `?q=` (saved-query id or free text) | `threat-hunting.html?q=SQ-3` |
| Cyber Deception | `?decoy=` | `deception.html?decoy=DCY-01` |
| Incident Response | `?id=` | `incident-response.html?id=INC-2026-1042` |
| AI Assistant | `?incident=`, `?event=` | `ai-assistant.html?incident=INC-2026-1039` |

---

## Feature honesty

What is implemented **on this demo data**:

- ✅ CSV export — events, hunt results, report data (built client-side via `Blob` + download link)
- ✅ Print view — Reports → *Print / save as PDF* uses the browser print dialog; dedicated
  `@media print` rules hide the shell and builder
- ✅ Local query execution, sorting, filtering, pagination, theming, graph interaction
- ✅ Approval workflow decisions and audit entries (in-memory, this browser session only)
- ✅ AI Assistant chat — full conversation UI with modes, history and retry, persisted locally;
  replies come from a scripted demo knowledge base (labelled *Demo* in the header and per message)

What the UI explicitly does **not** claim:

- ❌ No live log sources, SIEM, EDR, firewall or threat-intel feeds — all data is sample data
- ❌ No AI/LLM is called; analyses in `js/demo-scenarios.js` were authored as sample content and
  are labelled *Demo · sample analysis* with Observed/Inference/Recommendation classifications
- ❌ The AI Assistant does **not** call a model either — its header says *Demo provider · no live
  model*, replies are scripted samples, and workspace answers quote only records that really
  exist in the demo dataset (unknown ids get an explicit “can’t find” answer)
- ❌ No response action executes anything — approvals and "simulated execution" only write to the
  local audit log, and sensitive actions require an explicit confirmation dialog
- ❌ No real-time streaming, no notifications, no persistence beyond `localStorage` preferences
  and the local chat history

---

## Project structure

```
project/
├─ index.html                 # Overview page
├─ pages/                     # the other 11 pages (thin HTML shells)
├─ css/
│  ├─ tokens.css              # design tokens (colors, spacing, type, motion)
│  ├─ base.css                # reset, typography, utilities, print base
│  ├─ layout.css              # shell: sidebar, topbar, page frame
│  ├─ components.css          # buttons, badges, cards, tables, dialog, toast…
│  ├─ pages.css               # page-specific compositions
│  ├─ chat.css                # AI Assistant: page panel, drawer, transcript, composer
│  └─ responsive.css          # 1024/768/390 breakpoints + print
├─ js/
│  ├─ utils.js                # DOM/format helpers, event bus, page registry, prefs
│  ├─ theme.js                # theme + motion + sidebar persistence
│  ├─ demo-data.js            # env, assets, techniques, events, incidents, series…
│  ├─ demo-scenarios.js       # graph, hunting, decoys, AI analyses, response/audit
│  ├─ services.js             # ← single data-access layer (+ SOC.api placeholders)
│  ├─ components.js           # SOC.ui: badges, KPIs, tables, drawer, dialog, toast…
│  ├─ charts.js               # dependency-free SVG charts (area, donut, bars, gauge)
│  ├─ network-graph.js        # pan/zoom SVG graph with animation + a11y keyboard model
│  ├─ navigation.js           # shared shell, global search, popovers, shortcuts
│  ├─ chat-service.js         # SOC.chat: provider adapter, mock provider, chat store
│  ├─ chat-ui.js              # SOC.chatUI: chat view, markdown-lite, history, drawer
│  ├─ app.js                  # boots the shell, then the current page controller
│  └─ pages/*.js              # one controller per page (SOC.registerPage)
└─ tools/serve.js             # optional zero-dependency static server
```

Script order matters (classic scripts): `utils → theme → demo-data → demo-scenarios → services →
components → charts → network-graph → navigation → chat-service → chat-ui → <page controller> →
app.js`.
Each page registers itself with `SOC.registerPage('data-page-id', init)`; `app.js` runs the shell
first and then the matching controller inside a try/catch that renders a readable error card
instead of a blank page.

---

## Connecting a backend (integration points)

All data access goes through **`js/services.js`** — pages never read `SOC.demo` directly for
lists/details, so replacing the demo layer is a single-file change:

1. `SOC.services.*` functions (`listEvents`, `getIncidents`, `getGraph`, `runHuntQuery`,
   `getAIAnalysis`, `getRecommendations`, …) are the app's internal API.
   Swap their bodies for `fetch()` calls while keeping the returned shapes.
2. `SOC.api.endpoints` documents the intended REST surface (also rendered in
   **Settings → Backend integration points**):

   | Purpose | Placeholder |
   |---------|-------------|
   | Security events | `GET /api/events` |
   | Incident list | `GET /api/incidents` |
   | Single incident | `GET /api/incidents/:id` |
   | Asset inventory | `GET /api/assets` |
   | Attack graph | `GET /api/graph` |
   | Hunt query execution | `POST /api/hunt` |
   | Deception assets | `GET /api/decoys` |
   | AI analysis per incident | `GET /api/analysis/:incidentId` |
   | Response recommendations | `GET/POST /api/recommendations` |
   | Audit log | `GET/POST /api/audit` |
   | Notifications | `GET /api/notifications` |
   | **AI Assistant chat** | `POST /api/chat` |
   | **Chat conversations** | `GET /api/chat/conversations` |
   | **Chat record context** | `GET /api/chat/context?incidentId=…` |

3. Because the frontend must keep working over `file://` today, `services.js` resolves these
   calls synchronously from the demo dataset (with a documented async boundary you can flip to
   promises without touching page code).
4. Real AI output must arrive **classified** (fact vs inference vs recommendation) with source
   references; the AI Analyst layout already renders those labels and the uncertainty block.
5. Real response actions belong behind the existing confirmation/approval flow — the UI already
   treats every action as simulated and requires confirmation for sensitive ones.

### AI Assistant integration (`js/chat-service.js`)

The chat provider is a single documented adapter — no page code changes needed:

1. `SOC.chat.CONFIG.provider` is `"mock"` today (scripted local replies) and `"http"` for a real
   backend. The future adapter already exists as `httpSend()`; it POSTs
   `{ mode, message, conversationId, context }` to `SOC.chat.CONFIG.endpoints.send`
   (`POST /api/chat`) and expects `{ text }` back (empty/`text: ""` renders the honest
   empty-state bubble; a non-2xx renders the error bubble with a working **Retry**).
2. Conversations stay client-side in `localStorage`. To move them server-side, replace the
   `load()/persist()` bodies with `GET /api/chat/conversations` while keeping the store shape.
3. Record context (incident/alert ids the user attached) can be verified server-side via
   `GET /api/chat/context` before answering — the client only ever sends ids it actually saw in
   the URL, never fabricated ones.
4. **Never put API keys in this frontend** — authentication belongs on the backend; the browser
   should only ever hold a session cookie or short-lived user token.

---

## Browser support / limitations

- Modern evergreen browsers (Chromium, Firefox, Safari) with ES5-compatible output (no optional
  chaining in shipped code, no modules).
- `localStorage` may be unavailable (private mode) — preferences then degrade gracefully to
  session-only behaviour.
- Demo state (status changes, audit entries, hunt history) is in-memory: **reload to reset**.
  Preferences (theme/motion/sidebar/rows-per-page) and AI Assistant conversations
  (`soc.chat.store`) persist until deleted; if `localStorage` is unavailable everything degrades
  to session-only behaviour.
