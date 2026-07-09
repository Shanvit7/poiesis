# On-Premise AI: Replacing Heuristics with In-Browser Intelligence

**Research date:** 2026-07-09  
**Scope:** Should we replace (or augment) SupaTube's time-based heuristics with a locally-running
AI model that decides whether a YouTube video is worth persisting to the backend?

---

## 1. The Problem with the Current Heuristics

`contents/youtube.tsx` gates every capture on three numbers:

```ts
const THRESHOLDS = {
  minDurationSeconds: 180,   // ignore < 3 min
  minWatchPercent: 0.5,      // must have watched ≥ 50%
  minPlayedSeconds: 90,      // ≥ 90s of real playback
};
```

These are **purely time-based**. They have no awareness of content quality, intent, or category.
Failure modes are real:

| Scenario | Heuristic result | Desired result |
|---|---|---|
| 4-min music video, 100% watched | ✅ captured | ❌ not educational |
| 2-hr lecture, first 20 min deep-watched | ❌ skipped (50% not met) | ✅ should capture |
| 3-min tutorial, 60% watched | ✅ captured | ✅ correct |
| 5-min "life hack" clickbait | ✅ captured | ❌ noise |
| Podcast episode, background play | ✅ captured | maybe — ambiguous |

An AI classifier operating on title + channel name (both already scraped) can apply semantic
judgment that three numbers never can. The question is *which* AI approach fits a Chrome
extension without destroying UX.

---

## 2. Three In-Browser AI Options (Researched)

### Option A — Chrome Built-in AI (Prompt API / Gemini Nano)

**Source:** https://developer.chrome.com/docs/ai/prompt-api  
**Chrome Extension status:** Stable in **Chrome 138+** (no origin trial needed for extensions)

Chrome ships **Gemini Nano** as a managed model inside the browser. The extension calls
`LanguageModel.create()` — no download prompt, no API key, no cost. Chrome handles model
versioning, caching, and GPU scheduling.

#### How it works in an extension

```ts
// In background.ts (service worker) — this is already where we handle capture
const availability = await LanguageModel.availability();
// → 'available' | 'downloading' | 'unavailable'

if (availability === 'available') {
  const session = await LanguageModel.create({
    initialPrompts: [{
      role: 'system',
      content: `You classify YouTube videos. Given a title and channel name,
                reply with ONLY true (worth remembering as a learning resource)
                or false (entertainment, music, news, or low-value content).`,
    }],
  });

  // Structured boolean output — constrained by JSON Schema, no parsing needed
  const result = await session.prompt(
    `Title: "${payload.title}"\nChannel: "${payload.channel}"`,
    { responseConstraint: { type: 'boolean' } },
  );

  const isEducational = JSON.parse(result); // true | false
  session.destroy();
}
```

#### Hardware requirements (Chrome-enforced, not ours to control)

| Requirement | Value |
|---|---|
| OS | Windows 10/11, macOS 13+, Linux, ChromeOS Chromebook Plus |
| Storage | ≥ 22 GB free (model auto-removed if < 10 GB remains after download) |
| GPU | > 4 GB VRAM **or** CPU path |
| CPU path | ≥ 16 GB RAM + ≥ 4 cores |
| Mobile | ❌ not supported (Android, iOS, non-Plus ChromeOS) |
| Data to Google | ❌ none after initial model download |

#### Verdict on Option A

| | |
|---|---|
| ✅ Zero extension weight | Chrome owns the model — nothing bundled |
| ✅ No API key or cost | Runs fully on-device after one-time download |
| ✅ Service worker accessible | Works exactly where `handleCapture` already runs |
| ✅ Structured output | `responseConstraint: {type: 'boolean'}` — no LLM parsing hacks |
| ✅ Stable API for extensions | Chrome 138+ without any origin trial enrollment |
| ⚠️ Hardware gate | Excludes budget laptops and all mobile users |
| ⚠️ `'unavailable'` must degrade | Must fall back to heuristics silently |
| ⚠️ Model changes with Chrome | Behaviour can shift on Chrome updates (no version pin) |

---

### Option B — WebLLM (`@mlc-ai/web-llm`)

**Source:** https://webllm.mlc.ai  
**npm:** `@mlc-ai/web-llm` (18.3K GitHub stars, actively maintained)

WebLLM compiles LLMs via MLC (Machine Learning Compilation) and runs them via **WebGPU**.
It ships with Chrome Extension examples and runs inside service workers.

```ts
import { MLCEngine } from '@mlc-ai/web-llm';

const engine = new MLCEngine();
// First run: downloads model from HuggingFace CDN into IndexedDB/OPFS
await engine.reload('Phi-3.5-mini-instruct-q4f16_1-MLC');

const reply = await engine.chat.completions.create({
  messages: [{ role: 'user', content: `Is "${title}" by "${channel}" educational?` }],
});
```

#### Available models relevant to our task

| Model | Quantization | Approx. download size |
|---|---|---|
| Phi-3.5-mini-instruct | q4f16 | ~2.0 GB |
| Llama-3.2-1B-Instruct | q4f16 | ~0.8 GB |
| Gemma-2-2b-instruct | q4f16 | ~1.5 GB |
| Qwen2.5-0.5B-Instruct | q4f16 | ~0.4 GB |

#### Verdict on Option B

| | |
|---|---|
| ✅ Full model control | Pin exact model version, never changes under you |
| ✅ OpenAI-compatible API | Easy to use, structured output supported |
| ✅ Service worker support | `ExtensionServiceWorkerMLCEngine` helper exists |
| ❌ Model download UX | First run downloads 400 MB – 2 GB into user's browser |
| ❌ WebGPU required | Chrome 113+ with WebGPU enabled; no CPU fallback in WebLLM |
| ❌ Overkill for binary classification | A full LLM to return true/false is massive overhead |
| ❌ Bundle size | Package itself adds significant weight to the extension |

**Conclusion:** WebLLM is a strong choice for chat or summarisation features, but it is
excessive for a boolean "worth saving?" decision. The mandatory multi-GB download would be a
hard dealbreaker at install time.

---

### Option C — Transformers.js (Hugging Face, ONNX Runtime)

**Source:** https://huggingface.co/docs/transformers.js  
**npm:** `@huggingface/transformers`

Transformers.js runs ONNX-quantized models via WASM (CPU) or WebGPU. It has an explicit
**Chrome Extension tutorial** and supports text classification pipelines out of the box.

```ts
import { pipeline } from '@huggingface/transformers';

// Zero-shot classification — no fine-tuning needed
// Model: ~400 MB q4 download on first use; cached in IndexedDB thereafter
const classifier = await pipeline(
  'zero-shot-classification',
  'Xenova/bart-large-mnli',
  { device: 'webgpu', dtype: 'q4' },
);

const result = await classifier(
  `"${title}" by ${channel}`,
  ['educational tutorial', 'entertainment', 'music', 'news', 'other'],
);
// result.labels[0] = top label, result.scores[0] = confidence
```

For a lighter approach, a tiny **text classification** model (~25 MB) can be fine-tuned on a
labelled dataset of YouTube titles:

```ts
// DistilBERT q4 — ~25 MB — sentiment/classification fine-tune
const pipe = await pipeline(
  'text-classification',
  'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  { dtype: 'q4' },  // WASM, no WebGPU needed
);
```

#### Verdict on Option C

| | |
|---|---|
| ✅ WASM fallback | Works without WebGPU — much broader hardware support |
| ✅ Tiny models possible | DistilBERT q4 ≈ 25 MB if fine-tuned on our data |
| ✅ Stable across Chrome versions | Model is pinned by us, not Chrome |
| ✅ Browser Extension tutorial exists | First-class support from Hugging Face |
| ⚠️ Zero-shot model = 400 MB download | bart-large-mnli is too heavy for an extension |
| ⚠️ Tiny model needs fine-tuning | Requires labelled data of "educational" YouTube videos |
| ⚠️ Bundle adds weight | ONNX runtime WASM adds ~4 MB to extension |
| ⚠️ Slower than GPU options | WASM on CPU is noticeably slower (still < 1s for classification) |

---

## 3. Comparison Table

| | Chrome Built-in AI | WebLLM | Transformers.js |
|---|---|---|---|
| **Model download size** | 0 MB (Chrome manages) | 400 MB – 2 GB | 25 MB – 400 MB |
| **Hardware gate** | 22 GB storage + 4 GB VRAM or 16 GB RAM | WebGPU required | WASM works anywhere |
| **Mobile support** | ❌ | ❌ | ✅ (if extension runs) |
| **Chrome version** | 138+ | 113+ (WebGPU) | Any |
| **API stability** | Chrome-managed (can drift) | Dev-controlled | Dev-controlled |
| **Structured output** | ✅ JSON Schema | ✅ | ✅ pipeline labels |
| **Extension bundle size** | +0 | +heavy | +~4 MB WASM |
| **Latency (first token)** | Fast (GPU-managed) | Fast (WebGPU) | ~200-800 ms (WASM) |
| **Cost / API key** | Free, none | Free, none | Free, none |
| **Fits our use case** | ✅ Best | ❌ Overkill | ⚠️ Only with fine-tuning |

---

## 4. Recommendation

### Short term — use Chrome Built-in AI as the primary path

The Prompt API is the right fit **right now**:

- Already available in stable Chrome 138+ for extensions — no origin trial enrollment
- No extension weight, no download UX to manage, no cost
- The `responseConstraint: {type: 'boolean'}` structured output is purpose-built for our gate
- Runs in `background.ts` (service worker) where `handleCapture` already lives
- Graceful degradation to heuristics when `availability === 'unavailable'` is trivial

### Long term — consider a fine-tuned Transformers.js classifier

If we want coverage on hardware that doesn't meet Chrome's Gemini Nano requirements (budget
laptops, older machines), a fine-tuned **DistilBERT q4** model (~25 MB) on a labelled dataset
of YouTube titles would be the right second tier. This requires us to:
1. Collect ~1,000 labelled examples (`{title, channel, label: 'educational'|'entertainment'}`)
2. Fine-tune DistilBERT via Hugging Face and export to ONNX
3. Serve the model from an extension-bundled URL or a CDN

This is a meaningful investment and should only happen once the user base is large enough to
warrant it.

### Never — WebLLM for this task

WebLLM is excellent for open-ended generation (chat, summarisation). It is not the right tool
for a binary classification decision. The multi-GB download would be a dealbreaker.

---

## 5. Proposed Architecture (Chrome Built-in AI Path)

```
contents/youtube.tsx
  └─ chrome.runtime.sendMessage({ type: 'VIDEO_CAPTURED', payload })

background.ts
  └─ handleCapture(payload)
       ├─ [1] Check heuristics (existing gate — fast, no I/O)
       │       if fails → drop, no AI call
       │
       ├─ [2] Check LanguageModel.availability()
       │       if 'unavailable' → proceed with heuristic result as-is
       │       if 'downloading' → proceed with heuristic result, log warning
       │       if 'available'  → run classifier
       │
       ├─ [3] AI classify: title + channel → boolean
       │       if false → drop
       │       if true  → proceed
       │
       └─ [4] memoryService.capture(payload)
```

The heuristics stay as a **pre-filter** (cheap, always runs). AI only fires on videos that
already pass the time thresholds — this keeps inference calls minimal (a few per session at
most) and means any AI latency never blocks a video that was going to be dropped anyway.

---

## 6. Prompt Design (starter)

```ts
const SYSTEM_PROMPT = `
You are a classifier for a YouTube memory app. The user wants to save videos
they genuinely learned something from — tutorials, lectures, talks, how-tos,
documentaries, and deep-dives.

They do NOT want to save: music videos, movie trailers, entertainment/reaction
videos, news clips, vlogs, sports highlights, or short memes.

Given a video title and channel name, respond with ONLY true or false.
true  = likely a learning resource worth saving
false = likely entertainment or low-value content
`.trim();
```

For our schema-constrained call:

```ts
const session = await LanguageModel.create({
  initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
});

const raw = await session.prompt(
  `Title: "${payload.title}"\nChannel: "${payload.channel}"`,
  { responseConstraint: { type: 'boolean' } },
);

const isWorthSaving = JSON.parse(raw); // true | false — guaranteed by Chrome
session.destroy();
```

---

## 7. TypeScript Setup

```bash
# Types for the Prompt API and all built-in AI APIs
pnpm add -D @types/dom-chromium-ai
```

No manifest permission changes needed — the Prompt API for Chrome Extensions requires
**no additional permissions**.

---

## 8. Caveats & Risks

| Risk | Mitigation |
|---|---|
| Gemini Nano changes behaviour on Chrome update | Keep heuristics as hard gate; log model output for monitoring |
| `'unavailable'` on most machines initially | Degrade silently to heuristics; AI is additive, not a requirement |
| AI may misclassify niche educational channels | Let users manually override / flag a capture in the popup UI |
| Latency of `LanguageModel.create()` + `prompt()` | Session creation is ~100-300 ms; prompt is ~50-200 ms — acceptable in background SW |
| 22 GB storage requirement excludes users | Track `availability` metric in analytics to measure actual reach |

---

## 9. Files to Touch When Implementing

| File | Change |
|---|---|
| `background.ts` | Add `classifyWithAI(payload)` helper, gate in `handleCapture` |
| `lib/types.ts` | Optionally add `aiClassified?: boolean` to `VideoPayload` for observability |
| `services/memory.service.ts` | Pass-through — no change |
| `package.json` | Add `@types/dom-chromium-ai` to devDependencies |
| `tsconfig.json` | No changes needed (already has `./**/*.ts` glob) |

No manifest changes required.
