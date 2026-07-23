# PLAN — Transcript-First, Gemini-Optional Project Creation

## Problem

`runProject` and `classifyChapter` both hard-throw when `GEMINI_API_KEY` is absent.
A user without a key hits an error immediately and can't use Poiesis at all.

## Root causes (two files, two throws)

| Location | Line | What breaks |
|---|---|---|
| `src/project.ts → analyzeVideo` | `if (!apiKey) throw` | Whole video analysis fails |
| `src/chapter.ts → classifyChapter` | `if (!apiKey) throw` | Chapter kind stays wrong |

---

## Solution: transcript-first, LLM-optional pipeline

### Core idea

- **With Gemini key** → current behaviour (URL → Gemini natively watches the video, best quality).
- **Without Gemini key** → yt-dlp extracts captions + YouTube's public oEmbed/chapters data → agent (pi's built-in model) performs the analysis via `pi.sendUserMessage`, writing the scaffold files itself using its tools.
- **No transcript available** → metadata-only scaffold (title + description + placeholder chapters), user is told and can edit manually.

`classifyChapter` gets a zero-LLM heuristic fallback so it never throws.

---

## New file: `src/transcript.ts`

Single responsibility: get text out of a YouTube video.

```
extractTranscript(url: string): Promise<TranscriptResult>

type TranscriptResult =
  | { kind: 'transcript'; text: string; chapters: YTChapter[] }   // captions + optional timestamps
  | { kind: 'metadata';   title: string; description: string }    // no captions, fall back to metadata
  | { kind: 'none' }                                               // nothing available
```

**Extraction cascade (in order, stop at first success):**

1. `yt-dlp --write-subs --sub-langs en --skip-download` — manual EN captions (highest quality)
2. `yt-dlp --write-auto-subs --sub-langs en --skip-download` — auto-generated EN captions
3. `yt-dlp --write-auto-subs --sub-langs ".*" --skip-download` — any language auto-subs
4. YouTube oEmbed + description scrape — title + description only (no captions)
5. `{ kind: 'none' }` — nothing

**VTT/SRT parser:** strip timestamps and tags, return plain text.
**YT Chapters:** parse from video description timestamp lines (`0:00 - Intro`, `5:30 Setup`, etc.).

**Edge cases handled:**
- yt-dlp not installed → skip steps 1–3, fall through to step 4
- Private / age-restricted / region-locked video → step 4 metadata only
- No captions at all, empty description → `{ kind: 'none' }`
- Non-English auto-captions → included as-is (LLM handles the language)

---

## Modified `src/project.ts`

### New `analyzeVideo` flow

```
analyzeVideo(url, name, transcript)
  ├─ if GEMINI_API_KEY → current Gemini URL analysis (unchanged, best quality)
  └─ if no key
       ├─ transcript.kind === 'transcript' → return null (delegate to agent)
       ├─ transcript.kind === 'metadata'   → return null (delegate to agent, metadata passed)
       └─ transcript.kind === 'none'       → return PLACEHOLDER analysis (no LLM)
```

### New `runProject` flow

```
1. Prompt for YT URL (unchanged)
2. extractTranscript(url)            ← NEW: always run this first
3. Prompt for project name (unchanged)
4. Create .poiesis/chapters/ dir (unchanged)
5. if GEMINI_API_KEY
     analyzeVideo → scaffoldChapters → pi.sendUserMessage briefing  ← unchanged path
   else if transcript available
     scaffoldPlaceholder(projectDir, name, url, transcript)          ← write stub files
     pi.sendUserMessage(agentAnalysisPrompt(...))                    ← agent rewrites stubs
   else (no transcript, no key)
     scaffoldMetadataOnly(projectDir, name, url, title)              ← minimal scaffold
     notify user: "No transcript available — chapter files are stubs. Edit them manually."
```

### `scaffoldPlaceholder`
Writes minimal stub files (roadmap.json with 1 placeholder chapter, empty chapter-1.md, etc.) so the project directory is valid before the agent rewrites it.

### `agentAnalysisPrompt(name, url, transcript, ytChapters)`
A `pi.sendUserMessage` payload that:
1. Gives the agent the raw transcript text
2. Tells it to produce `VideoAnalysis`-shaped content
3. Instructs it to **write all chapter files** using the `write` bash tool into `.poiesis/chapters/`
4. Instructs it to update `roadmap.json` with the real chapter list
5. Tells it to call `initProgress` via `node -e` or equivalent once files are written

The agent already has all write tools — no new tool registration needed.

---

## Modified `src/chapter.ts`

### `classifyChapter` — zero-LLM heuristic fallback

```ts
// if no Gemini key, classify by heuristic — never throw
const heuristicClassify = (md: string): ChapterKind => {
  const lower = md.toLowerCase()
  const codeSignals = [
    /```/.test(md),           // fenced code block
    /\bwrite\b/.test(lower),
    /\bimplement\b/.test(lower),
    /\bbuild\b/.test(lower),
    /\binstall\b/.test(lower),
    /\bnpm\b|\bbun\b|\bpip\b/.test(lower),
  ]
  return codeSignals.filter(Boolean).length >= 2 ? 'code' : 'theory'
}
```

`classifyChapter` tries Gemini first, falls back to `heuristicClassify` — no throw, ever.
Adds a `// ponytail: heuristic, upgrade to LLM call if accuracy matters` comment.

---

## User-facing messaging

| Situation | What user sees |
|---|---|
| No Gemini key, transcript found | Status: "Analyzing transcript…" → agent runs analysis in the session |
| No Gemini key, no transcript | Notify (warn): "No captions found for this video. Stub files created — edit them or re-run with a Gemini key for auto-analysis." |
| yt-dlp not installed | Notify (info): "Install yt-dlp for better transcript extraction: `brew install yt-dlp`" |
| No key + no yt-dlp | Notify (warn): stub files + manual edit message |

---

## What does NOT change

- Gemini path: untouched when key is present (same model, same schema, same quality)
- Chapter session flow: prereq → theory → plan → tests → implement → done (unchanged)
- All tools: `poiesis_run_tests`, `poiesis_chapter_done`, etc. (unchanged)
- File layout: `.poiesis/chapters/` structure unchanged
- `classifyChapter` external API: same signature, same return type, just no throw

---

## File changes summary

| File | Change |
|---|---|
| `src/transcript.ts` | **NEW** — yt-dlp cascade + VTT parser + YT chapter extractor |
| `src/project.ts` | `analyzeVideo` gets transcript param + no-key branch; `runProject` calls `extractTranscript` first |
| `src/chapter.ts` | `classifyChapter` adds heuristic fallback, removes throw |

No new dependencies. yt-dlp is a system binary (already installed on this machine), not an npm package.

---

## Implementation order

1. `src/transcript.ts` — extractTranscript + VTT parser (testable in isolation)
2. `src/chapter.ts` — heuristic fallback (5-line change, no deps)
3. `src/project.ts` — wire transcript → no-key branch → agent delegation
