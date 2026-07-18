import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent"
/**
 * Post-onboarding project flow (fully deterministic — no LLM).
 *
 * 1. ctx.ui.input — YouTube URL
 * 2. ctx.ui.input — project name (defaults to YT video title)
 * 3. Scaffold {cwd}/{name}/chapters/
 * 4. Gemini → chapters.md  (setStatus shows persistent footer indicator)
 */
import { GoogleGenAI } from "@google/genai"
const toFolder = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const YT_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/

const ytTitle = async (url: string): Promise<string> => {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
    const data = await res.json() as { title?: string }
    return data.title ?? 'project'
  } catch {
    return 'project'
  }
}

export const runProject = async (ctx: ExtensionCommandContext): Promise<void> => {
  // 1. YT URL
  const url = (await ctx.ui.input("Paste a YouTube URL")) ?? ""
  if (!YT_RE.test(url)) {
    ctx.ui.notify("Not a valid YouTube URL — try again.", "error")
    return
  }

  // 2. Project name — show raw YT title, slugify for folder
  const defaultTitle = await ytTitle(url)
  const input = (await ctx.ui.input(`Project name — press Enter to use "${defaultTitle}"`, defaultTitle)) || defaultTitle
  const name = toFolder(input) || 'project'

  // 3. Scaffold
  const chaptersDir = join(ctx.cwd, name, "chapters")
  mkdirSync(chaptersDir, { recursive: true })

  // 4. Gemini → chapters.md
  ctx.ui.setStatus("poiesis", " Analyzing video with Gemini…")
  try {
    const md = await buildChaptersMd(url, name)
    writeFileSync(join(chaptersDir, "chapters.md"), md, "utf8")
    ctx.ui.setStatus("poiesis", undefined)
    ctx.ui.notify(`✓ ${name}/chapters/chapters.md ready`, "info")
  } catch (err) {
    ctx.ui.setStatus("poiesis", undefined)
    ctx.ui.notify(`Gemini error: ${String(err)}`, "error")
  }
}

const buildChaptersMd = async (url: string, name: string): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const ai = new GoogleGenAI({ apiKey })

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are analyzing a YouTube tutorial video.
URL: ${url}

Generate a structured chapters.md for a project called "${name}".

Output format (markdown):

# ${name} — Chapter Plan

## Overview
2–3 sentences on what this tutorial covers and who it's for.

## Chapters

For each chapter:
### Chapter N — Title
- **Concepts**: comma-separated key topics
- **Duration**: estimated time range
- **Notes**: one short sentence on what the viewer builds or learns

Be specific to the actual video content. No filler.`,
          },
        ],
      },
    ],
  })

  return result.text ?? `# ${name} — Chapter Plan\n\n_Could not generate structure._\n`
}
