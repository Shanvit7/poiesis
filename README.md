

YouTube is everyone's accidental curriculum. Poiesis makes it legible.

A Chrome extension that clusters your watch history into **learning threads**, exports every video as a **Markdown note you own**, and enriches each one with the papers, repos, and tools the video references. Bring your own keys. No account, no server.

---

## How it works

Poiesis runs entirely inside your browser.

1. **Capture.** The content script tracks what you actually engage with — completion ratio, rewatch, time on screen. An on-device AI scorer (Memory Gate) filters shallow content before anything leaves the tab.
2. **Store.** Qualifying videos are written to [Supermemory Cloud](https://supermemory.ai) under your own API key — full transcript, metadata, and an entity context that steers recall toward your learning frame.
3. **Organize.** Learning Threads clusters your history into named topics (*Rust async*, *Diffusion models*) without any manual tagging.
4. **Export.** Notes Export renders every video as a Markdown file in a folder you pick — Obsidian-compatible, Dataview frontmatter included.
5. **Enrich.** A background job extracts referenced repos, papers, and tools from each transcript, fetches a one-paragraph summary of each, and writes them back into the note.

---



## Quick start

**You need a [Supermemory API key](https://supermemory.ai).** The Recall tab additionally requires a key from OpenAI, Anthropic, or Google AI Studio — any free tier works.

```bash
pnpm install
pnpm --filter @poiesis/extension build
```

Load in Chrome:

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `apps/extension/build/chrome-mv3-prod`.
3. Open the extension → **Settings** → paste your Supermemory key.

Start watching YouTube.

---



## Development

```bash
pnpm install                              # one-time workspace install
pnpm --filter @poiesis/extension dev      # watch mode → chrome-mv3-dev
pnpm --filter @poiesis/web dev            # landing page
```

> After the first `dev` build, run `pnpm fix` once to rename `_empty.*.js` chunks that Chrome rejects. Not needed on subsequent reloads.

Reload the Poiesis card in `chrome://extensions` after each change.

### Testing surfaces


| Surface             | How to open                                                |
| ------------------- | ---------------------------------------------------------- |
| Popup               | Extension icon in the toolbar                              |
| Side Panel          | Popup → Open Memory Panel                                  |
| Options             | Right-click extension icon → Options                       |
| Background logs     | `chrome://extensions` → Poiesis → Service worker → Inspect |
| Content script logs | Any YouTube tab → DevTools Console                         |




### Gate debugging

Memory Gate scores are logged by the service worker:

```
chrome://extensions → Poiesis → Service worker → Inspect → Console
```

```
gate check: "How Rust async works"
Memory Gate: score=0.82 reason="technical depth, novel concepts" → saved
```

Lower the **Gate threshold** in Settings to capture more.

---



## Commands


| Command        | What it does                   |
| -------------- | ------------------------------ |
| `pnpm install` | Install workspace dependencies |
| `pnpm build`   | Build all packages             |
| `pnpm lint`    | Lint (Biome)                   |
| `pnpm check`   | Lint and auto-fix              |
| `pnpm format`  | Format (Biome)                 |


---



## Stack


| Layer               | Choice                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Extension framework | [Plasmo](https://plasmo.com)                                           |
| Memory store        | [Supermemory Cloud](https://supermemory.ai)                            |
| AI memory tools     | `@supermemory/tools/ai-sdk` — `withSupermemory` middleware             |
| Recall models       | OpenAI · Anthropic · Gemini via [Vercel AI SDK](https://sdk.vercel.ai) |
| Memory Gate         | Chrome Built-in AI (`LanguageModel`) + heuristic fallback              |
| Landing page        | Next.js 15, static export                                              |
| Styling             | Tailwind CSS v4                                                        |
| Schema validation   | Zod                                                                    |
| Linter / formatter  | Biome                                                                  |


---



## Privacy

Poiesis makes three kinds of outbound requests:

- `youtube.com` — the content script reads the page it's already on.
- `api.supermemory.ai` — your Supermemory account, your key.
- Your chosen LLM provider — your key, used only by the Recall tab.

API keys are stored in `chrome.storage.local`. They are never synced, never sent to a Poiesis-owned server. There is no Poiesis server.

No analytics. No telemetry. No third-party tracking.



## License

MIT