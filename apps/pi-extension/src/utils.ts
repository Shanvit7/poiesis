import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { ChapterState, ChapterStep } from "./types.ts"

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)

export const expandHome = (p: string): string => p.replace(/^~/, process.env.HOME ?? "")

/**
 * Scan $HOME for directories that actually exist — used to build ask_user_question options
 * for the project location picker. Returns at most 4 (the tool's max per question).
 */
export const scanHomeDirs = (): { label: string; path: string }[] => {
  const home = process.env.HOME ?? ""
  const candidates = ["Desktop", "projects", "dev", "code", "Documents", "workspace", "src"]
  return candidates
    .filter((name) => existsSync(`${home}/${name}`))
    .slice(0, 4)
    .map((name) => ({ label: name, path: `${home}/${name}` }))
}

export const readJson = <T>(path: string): T => {
  const full = expandHome(path)
  return JSON.parse(readFileSync(full, "utf8")) as T
}

export const writeJson = (path: string, data: unknown): void => {
  const full = expandHome(path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, JSON.stringify(data, null, 2))
}

export const exists = (path: string): boolean => existsSync(expandHome(path))

export const run = (cmd: string, cwd?: string): string => {
  try {
    return execSync(cmd, {
      cwd: cwd ? expandHome(cwd) : undefined,
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"],
    }).trim()
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; message?: string }
    throw new Error(`Command failed: ${cmd}\n${err.stderr?.toString() ?? err.message ?? ""}`)
  }
}

export const ensureDir = (path: string): void => {
  mkdirSync(expandHome(path), { recursive: true })
}

// ── Chapter step state ──────────────────────────────────────────────────────────────────

export const chapterStatePath = (projectDir: string, n: number): string =>
  join(expandHome(projectDir), ".poiesis", "chapters", `chapter-${n}.state.json`)

export const readChapterState = (projectDir: string, n: number): ChapterState | null => {
  const p = chapterStatePath(projectDir, n)
  if (!existsSync(p)) return null
  return readJson<ChapterState>(p)
}

/** Deep-merges patch into existing state, or creates from defaults. */
export const writeChapterState = (
  projectDir: string,
  n: number,
  patch: Partial<ChapterState>
): void => {
  const existing = readChapterState(projectDir, n) ?? {
    step: "prereq" as ChapterStep,
    prereqResult: null,
    testsFile: null,
    testsPlan: [],
    testsPass: false,
    startedAt: new Date().toISOString(),
  }
  writeJson(chapterStatePath(projectDir, n), { ...existing, ...patch })
}

/**
 * Find a poiesis project directory that has an active .progress.json.
 *
 * Two-pass:
 * 1. cwd itself is the project root (user is already inside it)
 * 2. scan immediate children of cwd (user is in the parent)
 */
export const findActiveProject = (cwd: string): string | null => {
  const base = expandHome(cwd)

  // Pass 1: cwd is the project itself
  if (existsSync(join(base, ".poiesis", "chapters", ".progress.json"))) return base

  // Pass 2: scan one level down
  let entries: import("node:fs").Dirent[]
  try {
    entries = readdirSync(base, { withFileTypes: true })
  } catch {
    return null
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (existsSync(join(base, e.name, ".poiesis", "chapters", ".progress.json")))
      return join(base, e.name)
  }
  return null
}

// ponytail: self-check
if (process.argv[1]?.endsWith("utils.ts")) {
  import("node:os").then(({ tmpdir }) => {
    import("node:fs").then(({ mkdirSync, writeFileSync, rmSync }) => {
      const s = slugify("Build a Rust HTTP Server from Scratch!!")
      console.assert(s === "build-a-rust-http-server-from-scratch", `slugify failed: ${s}`)

      // Pass 2: cwd is the parent, project is a child dir
      const tmp = join(tmpdir(), `poiesis-utils-${Date.now()}`)
      const projDir = join(tmp, "my-project", ".poiesis", "chapters")
      mkdirSync(projDir, { recursive: true })
      writeFileSync(join(projDir, ".progress.json"), "{}")
      const found = findActiveProject(tmp)
      console.assert(found === join(tmp, "my-project"), `pass-2 failed: ${found}`)

      // Pass 1: cwd IS the project (user ran /poiesis from inside it)
      const insideFound = findActiveProject(join(tmp, "my-project"))
      console.assert(insideFound === join(tmp, "my-project"), `pass-1 failed: ${insideFound}`)

      // null when nothing found
      const empty = join(tmpdir(), `poiesis-empty-${Date.now()}`)
      mkdirSync(empty)
      console.assert(findActiveProject(empty) === null, "should return null for empty dir")

      // chapterState round-trip
      writeChapterState(join(tmp, "my-project"), 1, { step: "theory", prereqResult: "primed" })
      const st = readChapterState(join(tmp, "my-project"), 1)
      console.assert(st?.step === "theory", `state step not persisted: ${st?.step}`)
      console.assert(
        st?.prereqResult === "primed",
        `state prereqResult not persisted: ${st?.prereqResult}`
      )
      console.assert(
        st?.testsFile === null,
        `state testsFile should default null: ${st?.testsFile}`
      )
      // patch merges, does not clobber existing fields
      writeChapterState(join(tmp, "my-project"), 1, { step: "plan" })
      const st2 = readChapterState(join(tmp, "my-project"), 1)
      console.assert(st2?.step === "plan", `patched step failed: ${st2?.step}`)
      console.assert(
        st2?.prereqResult === "primed",
        `prereqResult should survive patch: ${st2?.prereqResult}`
      )

      rmSync(tmp, { recursive: true })
      rmSync(empty, { recursive: true })
      console.log("utils.ts: ok")
    })
  })
}
