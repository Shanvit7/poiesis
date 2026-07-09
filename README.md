# SupaTube

Chrome extension that watches what you learn on YouTube and stores it in Supermemory.

Built for [Localhost:6767](https://instinctive-chance-ed9.notion.site/Localhost-6767-392222a60c568030ab86e7729d765bbe) — the Supermemory Local hackathon.

---

## What it does

Most YouTube watching produces nothing searchable. SupaTube runs in the background, filters out noise (music, shorts, background video), extracts key concepts from transcripts, and writes them to Supermemory as structured memories.

The result is a searchable log of things you actually learned — not a watch history.

---

## Setup

1. Install dependencies
   ```bash
   pnpm install
   ```

2. Start everything
   ```bash
   pnpm dev
   # starts: Supermemory (:6767) + Next.js (:3000) + extension watcher
   ```

3. On **first boot**, Supermemory prints an API key — copy it and add it to `apps/web/.env.local`
   ```env
   SUPERMEMORY_API_KEY=sm_...
   SUPERMEMORY_BASE_URL=http://localhost:6767
   ```
   Then restart `pnpm dev`.

4. Load the extension in Chrome
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** → select `apps/extension/build/chrome-mv3-dev`

---

## Commands

### Root (all workspaces)

| Command | What it does |
|---|---|
| `pnpm dev` | Start all apps in parallel |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint everything |
| `pnpm check` | Lint and auto-fix |
| `pnpm format` | Format with Biome |

### Web app (`apps/web`)

| Command | What it does |
|---|---|
| `pnpm --filter @supatube/web dev` | Start Supermemory `:6767` + Next.js `:3000` together |
| `pnpm --filter @supatube/web build` | Production build |

### Extension (`apps/extension`)

| Command | What it does |
|---|---|
| `pnpm --filter @supatube/extension dev` | Build extension + watch |
| `pnpm --filter @supatube/extension build` | Production build |

---

## License

MIT
