import { DynamicBorder, getSelectListTheme } from "@earendil-works/pi-coding-agent"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { Container, type SelectItem, SelectList, Spacer, Text } from "@earendil-works/pi-tui"
import { Type } from "typebox"
import { appendReflection, appendTddStatus, checkOffChapter, runChapter } from "./src/chapter.ts"
import { PROFILE_PATH, needsOnboarding, runOnboarding } from "./src/onboarding.ts"
import { advanceChapter, markTestsPass, readProgress } from "./src/progress.ts"
import { runProject } from "./src/project.ts"
import type { UserProfile } from "./src/types.ts"
import { findActiveProject, readJson, run, writeJson } from "./src/utils.ts"

const extension = (pi: ExtensionAPI): void => {
  // ── Tool: poiesis_save_profile ────────────────────────────────────────────
  pi.registerTool({
    name: "poiesis_save_profile",
    label: "Poiesis: Save Profile",
    description: "Save the user profile once all fields are known from the conversation.",
    parameters: Type.Object({
      primaryStack: Type.Array(Type.String(), { description: "Languages and frameworks they use" }),
      recentProjects: Type.Array(
        Type.Object({
          name: Type.String({ description: "Repo or directory name" }),
          summary: Type.String({ description: "One sentence: what was built and key tech used" }),
          stack: Type.Array(Type.String(), { description: "Languages/frameworks in this project" }),
        })
      ),
      recentActivity: Type.String({ description: "One-line summary" }),
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const profile: UserProfile = { ...params, scannedAt: new Date().toISOString() }
      writeJson(PROFILE_PATH, profile)
      ctx.ui.notify("✅ Profile saved — run /poiesis to start your project.", "info")
      return {
        content: [
          { type: "text" as const, text: "Profile saved. Tell the user to run /poiesis now." },
        ],
        details: {},
      }
    },
  })

  // ── Tool: poiesis_confirm_test_plan ───────────────────────────────────
  // Shows the full test plan + choice in a full-screen TUI (no overlay) — owns keyboard focus.
  pi.registerTool({
    name: "poiesis_confirm_test_plan",
    label: "Poiesis: Review Test Plan",
    description:
      "Show the proposed test plan to the student in a scrollable TUI dialog. " +
      "Use this INSTEAD of ask_user_question for all test-plan confirmation steps.",
    parameters: Type.Object({
      chapterNum: Type.Number({ description: "Chapter number" }),
      intro: Type.String({
        description: "1\u20132 sentences: what the student will build by the end",
      }),
      tests: Type.Array(
        Type.Object({
          name: Type.String({ description: "Short test name in plain words" }),
          why: Type.String({ description: "One sentence: what it checks and why it matters" }),
        }),
        { minItems: 1, maxItems: 8, description: "3\u20135 test checkpoints" }
      ),
    }),
    async execute(_id, { chapterNum, intro, tests }, _signal, _onUpdate, ctx) {
      type Choice = "proceed" | "add" | "skip"

      // No overlay: true — plain custom() replaces the full TUI and owns keyboard focus.
      // overlay: true renders on top but never steals focus, so SelectList is un-navigable.
      const result = await ctx.ui.custom<Choice | null>((tui, theme, _kb, done) => {
        const root = new Container()
        const slTheme = getSelectListTheme()

        // Header
        root.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)))
        root.addChild(
          new Text(theme.fg("accent", theme.bold(`Chapter ${chapterNum} \u2014 Test Plan`)), 1, 0)
        )
        root.addChild(new Spacer(1))
        root.addChild(new Text(theme.fg("text", intro), 1, 0))
        root.addChild(new Spacer(1))
        root.addChild(new DynamicBorder((s: string) => theme.fg("borderMuted", s)))

        // Test list
        root.addChild(new Spacer(1))
        root.addChild(new Text(theme.fg("accent", "Learning checkpoints:"), 1, 0))
        root.addChild(new Spacer(1))
        tests.forEach((t, i) => {
          root.addChild(new Text(theme.bold(`  ${i + 1}. ${t.name}`), 1, 0))
          root.addChild(new Text(theme.fg("muted", `     ${t.why}`), 1, 0))
          if (i < tests.length - 1) root.addChild(new Spacer(1))
        })
        root.addChild(new Spacer(1))
        root.addChild(new DynamicBorder((s: string) => theme.fg("borderMuted", s)))

        // Choices
        const items: SelectItem[] = [
          {
            value: "proceed",
            label: "Looks good \u2014 write the tests",
            description: "Lock in this plan and start building",
          },
          { value: "add", label: "Add a checkpoint", description: "Tell me what else to verify" },
          { value: "skip", label: "Remove one", description: "Tell me which one to drop" },
        ]
        const list = new SelectList(items, items.length, slTheme)
        list.onSelect = (item) => done(item.value as Choice)
        list.onCancel = () => done(null)
        root.addChild(list)

        root.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)))
        root.addChild(
          new Text(
            theme.fg("dim", "\u2191\u2193 navigate \u00b7 Enter select \u00b7 Esc cancel"),
            1,
            0
          )
        )

        return {
          render: (w: number) => root.render(w),
          invalidate: () => root.invalidate(),
          handleInput: (data: string) => {
            list.handleInput(data)
            tui.requestRender()
          },
        }
      })

      if (result === null) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Student cancelled. Ask them how they want to proceed.",
            },
          ],
          details: { action: "cancelled" },
        }
      }

      const msgs: Record<Choice, string> = {
        proceed: "Student confirmed the test plan. Now write the test file.",
        add:
          "Student wants to add a checkpoint. Ask them: \u2018What behaviour would you like to also verify?\u2019 " +
          "Then call poiesis_confirm_test_plan again with the new test appended.",
        skip:
          "Student wants to remove a test. Ask them which one, then call poiesis_confirm_test_plan " +
          "again without that test.",
      }

      return {
        content: [{ type: "text" as const, text: msgs[result] }],
        details: { action: result, testCount: tests.length },
      }
    },
  })

  // ── Tool: poiesis_run_tests ───────────────────────────────────────────────
  pi.registerTool({
    name: "poiesis_run_tests",
    label: "Poiesis: Run Tests",
    description: "Run the chapter's test suite. Returns pass/fail + output.",
    parameters: Type.Object({
      chapter: Type.Number({ description: "Chapter number" }),
      cmd: Type.String({ description: "e.g. 'npx vitest run tests/chapter-1.test.ts'" }),
    }),
    async execute(_id, { chapter, cmd }, _signal, _onUpdate, ctx) {
      const projectDir = findActiveProject(ctx.cwd)
      if (!projectDir) {
        return {
          content: [{ type: "text" as const, text: "No active project found in cwd." }],
          details: { pass: false },
        }
      }
      try {
        const output = run(cmd, projectDir)
        markTestsPass(projectDir, chapter)
        appendTddStatus(projectDir, chapter, "🟢 passing")
        return {
          content: [{ type: "text" as const, text: `PASS\n${output}` }],
          details: { pass: true },
        }
      } catch (e) {
        const out = String(e)
        appendTddStatus(projectDir, chapter, "🔴 failing")
        return {
          content: [{ type: "text" as const, text: `FAIL\n${out}` }],
          details: { pass: false },
        }
      }
    },
  })

  // ── Tool: poiesis_chapter_done (gated) ───────────────────────────────────
  pi.registerTool({
    name: "poiesis_chapter_done",
    label: "Poiesis: Chapter Done",
    description:
      "Mark the current chapter complete. GATED — rejected if tests are not passing (unless theory chapter). Always call poiesis_run_tests first for code chapters.",
    parameters: Type.Object({
      reflection: Type.String({
        description: "2–4 sentences on what the user learned and any struggles.",
      }),
    }),
    async execute(_id, { reflection }, _signal, _onUpdate, ctx) {
      const projectDir = findActiveProject(ctx.cwd)
      if (!projectDir) {
        return {
          content: [{ type: "text" as const, text: "No active project found in cwd." }],
          details: { error: "no_project" },
        }
      }

      const p = readProgress(projectDir)
      const chData = p.chapters[p.current]

      // ── GATE: tests must be green for code/mixed chapters ──────────────
      if (chData?.type !== "theory" && !chData?.testsPass) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Cannot complete chapter — tests are not passing. Run poiesis_run_tests first.",
            },
          ],
          details: { error: "tests_not_passing" },
        }
      }

      const completedChapter = p.current
      appendReflection(projectDir, completedChapter, reflection)
      checkOffChapter(projectDir, completedChapter, chData?.type ?? "code")
      advanceChapter(projectDir)

      const isLast = completedChapter >= p.total
      const msg = isLast
        ? `🎉 All ${p.total} chapters complete! Project finished.`
        : `✓ Chapter ${completedChapter} done — chapter ${completedChapter + 1} is next. Run /poiesis to continue.`

      ctx.ui.notify(msg, "info")
      return {
        content: [{ type: "text" as const, text: msg }],
        details: { completedChapter, nextChapter: isLast ? null : completedChapter + 1 },
      }
    },
  })

  // ── Bash pre-run review ─────────────────────────────────────────────
  // ponytail: safe-list = language-agnostic OS read-only commands only
  const SAFE_CMD =
    /^(cat |ls(?:$| )|grep |find |head |tail |wc |pwd$|echo [^>|]+$|diff |type |which |env$|printenv)/

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return
    const cmd = ((event.input as Record<string, unknown>).command as string | undefined) ?? ""
    if (!cmd || SAFE_CMD.test(cmd.trimStart())) return // auto-proceed for safe commands

    type BashChoice = "run" | "skip" | "explain"

    const result = await ctx.ui.custom<BashChoice | null>((tui, theme, _kb, done) => {
      const root = new Container()

      root.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)))
      root.addChild(new Text(theme.fg("accent", theme.bold("⚡ Command Review")), 1, 0))
      root.addChild(new Spacer(1))

      // Show up to 3 wrapped lines of the command
      const chunks = cmd
        .split("\n")
        .flatMap((l) => {
          const parts: string[] = []
          for (let i = 0; i < l.length; i += 100) parts.push(l.slice(i, i + 100))
          return parts
        })
        .slice(0, 4)
      for (const line of chunks) root.addChild(new Text(theme.fg("text", `  ${line}`), 1, 0))
      if (cmd.length > 400) root.addChild(new Text(theme.fg("muted", "  … (truncated)"), 1, 0))

      root.addChild(new Spacer(1))
      root.addChild(new DynamicBorder((s: string) => theme.fg("borderMuted", s)))

      const items: SelectItem[] = [
        { value: "run", label: "✅ Run it", description: "Execute this command" },
        {
          value: "skip",
          label: "❌ Skip — don't run this",
          description: "Block without explanation",
        },
        {
          value: "explain",
          label: "❓ Explain first",
          description: "Agent explains what this does, then re-proposes",
        },
      ]
      const list = new SelectList(items, items.length, getSelectListTheme())
      list.onSelect = (item) => done(item.value as BashChoice)
      list.onCancel = () => done("skip") // Esc = skip (safe default)
      root.addChild(list)

      root.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)))
      root.addChild(new Text(theme.fg("dim", "↑↓ navigate · Enter select · Esc = skip"), 1, 0))

      return {
        render: (w: number) => root.render(w),
        invalidate: () => root.invalidate(),
        handleInput: (data: string) => {
          list.handleInput(data)
          tui.requestRender()
        },
      }
    })

    if (result === "run") return // allow through
    if (result === "explain")
      return {
        block: true,
        reason:
          "The user wants to understand this command before it runs. " +
          "In 2-3 sentences explain: what it does, why it's needed now, and whether it's reversible. " +
          "After explaining, propose running it again.",
      }
    // skip or null → block
    return { block: true, reason: "User chose not to run this command." }
  })

  // ── /poiesis ──────────────────────────────────────────────────────────────
  pi.registerCommand("poiesis", {
    description: "Poiesis — onboard, start a project, or continue the active chapter",
    handler: async (_args, ctx) => {
      if (needsOnboarding()) {
        await runOnboarding(pi, ctx)
        return
      }

      // Resume active project if one exists in cwd
      const projectDir = findActiveProject(ctx.cwd)
      if (projectDir) {
        const profile = readJson<UserProfile>(PROFILE_PATH)
        await runChapter(pi, ctx, profile, projectDir)
        return
      }

      // No active project — scaffold a new one
      await runProject(pi, ctx)
    },
  })
}

export default extension
