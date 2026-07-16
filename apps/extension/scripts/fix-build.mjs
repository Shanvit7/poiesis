#!/usr/bin/env node
// Renames _*.js chunks in the Plasmo build output.
// Chrome rejects extension files whose names start with "_".
// Parcel generates `_empty.*.js` stubs for Node built-ins — this script
// renames them and rewrites all references so the build loads correctly.

import { readdir, rename, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const BUILD_DIRS = ["build/chrome-mv3-prod", "build/chrome-mv3-dev"]

const fixDir = async (dir) => {
  let files
  try {
    files = await readdir(dir)
  } catch {
    return // dir doesn't exist yet — skip
  }

  const underscoreFiles = files.filter((f) => f.startsWith("_") && f.endsWith(".js"))
  if (underscoreFiles.length === 0) return

  // Build rename map: _empty.abc.js → empty.abc.js
  const renames = Object.fromEntries(
    underscoreFiles.map((f) => [f, f.slice(1)]) // _empty.X.js → empty.X.js
  )

  // Rewrite references in every JS file first
  const allJs = files.filter((f) => f.endsWith(".js"))
  for (const file of allJs) {
    const path = join(dir, file)
    let src = await readFile(path, "utf8")
    let changed = false
    for (const [from, to] of Object.entries(renames)) {
      if (src.includes(from)) {
        src = src.replaceAll(from, to)
        changed = true
      }
    }
    if (changed) await writeFile(path, src, "utf8")
  }

  // Also fix manifest.json if it references these files
  try {
    const manifestPath = join(dir, "manifest.json")
    let manifest = await readFile(manifestPath, "utf8")
    let changed = false
    for (const [from, to] of Object.entries(renames)) {
      if (manifest.includes(from)) {
        manifest = manifest.replaceAll(from, to)
        changed = true
      }
    }
    if (changed) await writeFile(manifestPath, manifest, "utf8")
  } catch {
    /* no manifest */
  }

  // Rename the files
  for (const [from, to] of Object.entries(renames)) {
    await rename(join(dir, from), join(dir, to))
    console.log(`  renamed: ${from} → ${to}`)
  }
}

for (const dir of BUILD_DIRS) {
  await fixDir(dir)
}
