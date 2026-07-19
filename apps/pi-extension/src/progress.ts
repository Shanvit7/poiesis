import { join } from "node:path"
import type { ChapterKind, ChapterMeta, Progress } from "./types.ts"
import { expandHome, readJson, writeJson } from "./utils.ts"

// ponytail: progress lives in .poiesis/chapters/.progress.json
const progressPath = (projectDir: string): string =>
  join(expandHome(projectDir), ".poiesis", "chapters", ".progress.json")

export const readProgress = (projectDir: string): Progress =>
  readJson<Progress>(progressPath(projectDir))

export const writeProgress = (projectDir: string, p: Progress): void =>
  writeJson(progressPath(projectDir), p)

/** Create initial .progress.json at scaffold time. */
export const initProgress = (
  projectDir: string,
  total: number,
  chapters: Record<string, ChapterMeta>
): void => {
  const now = new Date().toISOString()
  writeProgress(projectDir, {
    current: 1,
    total,
    completed: [],
    startedAt: now,
    lastActiveAt: now,
    chapters,
  })
}

/** Called by poiesis_run_tests on success. */
export const markTestsPass = (projectDir: string, chapter: number): void => {
  const p = readProgress(projectDir)
  const ch = p.chapters[chapter]
  if (ch) ch.testsPass = true
  p.lastActiveAt = new Date().toISOString()
  writeProgress(projectDir, p)
}

/** Set chapter type + testsFile after classification. */
export const setChapterMeta = (
  projectDir: string,
  chapter: number,
  kind: ChapterKind,
  testsFile: string | null
): void => {
  const p = readProgress(projectDir)
  p.chapters[chapter] = { type: kind, testsFile, testsPass: kind === "theory" ? null : false }
  p.lastActiveAt = new Date().toISOString()
  writeProgress(projectDir, p)
}

/** Move current → next after chapter_done gate passes. */
export const advanceChapter = (projectDir: string): void => {
  const p = readProgress(projectDir)
  if (!p.completed.includes(p.current)) p.completed.push(p.current)
  p.current = Math.min(p.current + 1, p.total)
  p.lastActiveAt = new Date().toISOString()
  writeProgress(projectDir, p)
}

// ponytail: self-check
if (process.argv[1]?.endsWith("progress.ts")) {
  import("node:os").then(({ tmpdir }) => {
    import("node:fs").then(({ mkdirSync, rmSync }) => {
      const dir = join(tmpdir(), `poiesis-test-${Date.now()}`)
      mkdirSync(join(dir, ".poiesis", "chapters"), { recursive: true })

      initProgress(dir, 3, {
        "1": { type: "code", testsFile: "tests/chapter-1.test.ts", testsPass: false },
        "2": { type: "theory", testsFile: null, testsPass: null },
        "3": { type: "code", testsFile: "tests/chapter-3.test.ts", testsPass: false },
      })

      let p = readProgress(dir)
      console.assert(p.current === 1, "current should be 1")
      console.assert(p.total === 3, "total should be 3")
      console.assert(p.completed.length === 0, "none completed")

      markTestsPass(dir, 1)
      p = readProgress(dir)
      console.assert(p.chapters["1"]?.testsPass === true, "chapter 1 should pass")

      advanceChapter(dir)
      p = readProgress(dir)
      console.assert(p.current === 2, "current should advance to 2")
      console.assert(p.completed.includes(1), "chapter 1 should be completed")

      rmSync(dir, { recursive: true })
      console.log("progress.ts: ok")
    })
  })
}
