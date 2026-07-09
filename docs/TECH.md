# Tech Architecture

This is a living doc. Update it as decisions get made.

---

## Components

### 1. Chrome Extension (`apps/extension`)

The only thing running on the user's browser. Three jobs:

- **Observe** — content script runs on `youtube.com/watch`, tracks real playback time and scrapes lightweight metadata from the DOM
- **Gate** — decides on-device whether the video is worth saving before anything leaves the browser
- **Hand off** — sends a 7-field payload to `POST /api/memories`

The extension does not talk to Supermemory directly. It only talks to our API.

#### Memory Gate

The gate runs entirely on-device in `background.ts` (service worker). No cloud inference.

**Primary path — Gemini Nano (Chrome Built-in AI)**

Available on Chrome 138+ when hardware requirements are met (≥22 GB storage, >4 GB VRAM or ≥16 GB RAM). The extension calls `LanguageModel.availability()` first; if the result is `'available'` it creates a session and runs a single classification prompt:

```
Given this video's title, channel, description, and watch stats —
is this content worth saving to the user's long-term memory?
```

Output is constrained to `{ store: boolean, confidence?: number }` via `responseConstraint` JSON schema — no parsing hacks, no ambiguity.

**Fallback — multi-signal heuristic scorer**

Activates only when Gemini Nano is unavailable or throws. Not dumb time thresholds — a weighted scorer across six signals:

| Signal | What it captures |
|---|---|
| Absolute played seconds | Heavy penalty below 90s — not a hard gate but functions as one |
| Inferred total duration | Long videos = structured content; shorts penalised |
| Completion in context | 20% of a 2hr lecture outweighs 80% of a 3min clip |
| Title keywords | `tutorial / lecture / walkthrough` → +points; `music video / reaction / vlog` → −points |
| Channel name patterns | `Academy / University / Learning / Engineering` → small boost |
| Description timestamps | `0:00 Intro  5:30 Deep dive` = structured content → +20 (strongest single signal) |

Score must reach 30 to store. Tuned so a 2-hr lecture watched 20% scores ~58 (store) and a 4-min music video watched 100% scores ~−10 (drop).

#### What the extension sends to the backend

Exactly 7 fields — nothing the backend can derive from `videoId` itself:

| Field | Type | Notes |
|---|---|---|
| `videoId` | `string` | YouTube video ID |
| `playedSeconds` | `number` | Real playback time, seeking excluded |
| `watchPercent` | `number` | 0–1 |
| `capturedAt` | `string` | ISO timestamp |
| `gate` | `"ai" \| "heuristic"` | Which gate approved it |
| `confidence` | `number?` | AI confidence score (AI gate only) |
| `gateScore` | `number?` | Heuristic scorer total (heuristic gate only) |

Title, channel, description, duration, and transcript are **not sent** — the backend fetches them from YouTube via yt-dlp.

#### Metadata the extension does scrape (for local gate only)

These are used only inside the gate decision and are discarded after:

- `title` — from `document.title`
- `channel` — from `ytd-channel-name` (multiple selector fallbacks)
- `description` — from `#description-inline-expander` (first 1000 chars)
- `durationSeconds` — from `<video>.duration`

#### Auth in the extension

The extension cannot share cookies with the web app (different origin):

1. User clicks "Login" in the popup → opens a tab to the web app login
2. User completes Google login
3. Backend issues a long-lived API token
4. Extension stores it in `chrome.storage`
5. All extension API calls include the token in headers

---

### 2. Next.js Frontend (`apps/web` — pages/UI side)

The web dashboard. Users come here to:

- Log in (Google via Better Auth)
- Browse their saved memories
- Search across everything Supermemory has stored for them
- Manage their account

---

### 3. Next.js API Backend (`apps/web` — route handlers)

Lives inside the same Next.js app as API routes (`/api/*`). The only thing that talks to Supermemory.

Responsibilities:

- **Auth** — Better Auth handles session management and Google OAuth. All memory routes are protected.
- **Receive from extension** — `POST /api/memories` accepts the 7-field `CapturePayload`, verifies the API token
- **Enrich** — fetches title, channel, description, duration, and transcript from YouTube using `videoId` (yt-dlp or equivalent) — the extension doesn't send these
- **Process** — extracts concepts from the transcript (LLM call, TBD)
- **Write to Supermemory** — stores the enriched memory, tagged to the user
- **Search** — proxies semantic search queries from the frontend to Supermemory

Supermemory API keys never leave the server.

---

## Auth

**Library**: [Better Auth](https://www.better-auth.com/)
**Provider**: Google only (for now)

| Surface | Method |
|---|---|
| Web dashboard | Better Auth session cookie |
| Chrome extension | API token issued by Better Auth after web login |

---

## Data Flow

```
User watches YouTube video
  → content script tracks real playback, scrapes title/channel/description from DOM
  → CAPTURE_TRIGGER fires (≥60s played AND ≥8% watched)
  → background.ts checks LanguageModel.availability()
      available   → Gemini Nano classifies → store: true/false
      unavailable → heuristic scorer runs  → score >= 30?
  → if approved: POST /api/memories with 7-field CapturePayload
  → backend verifies token
  → backend fetches full metadata + transcript via yt-dlp (videoId)
  → backend processes transcript / extracts concepts
  → backend writes enriched memory to Supermemory (scoped to user)

User opens dashboard
  → logs in with Google (Better Auth)
  → searches or browses
  → GET /api/search or /api/memories
  → backend queries Supermemory
  → returns results
```

---

## Open Questions

- Concept extraction — LLM call, keyword extraction, or Supermemory handles it natively?
- yt-dlp vs YouTube Data API for backend enrichment — yt-dlp needs server-side binary, Data API needs quota management
- Extension popup — beyond login status, what does it show?
- Supermemory user scoping — one space per user, or tags?
- Token refresh — long-lived token acceptable for now?
