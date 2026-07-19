---
name: agent-browser
description: >
  The tutor's live web research tool. Use agent-browser any time the tutor
  needs to consult an authoritative source instead of relying on training
  knowledge — official docs, RFCs, tutorials, package pages, error references,
  or any online material relevant to what the student is learning.

  **When to reach for this (Poiesis context):**

  1. TEACHING — before explaining a concept, look up the official docs or a
     canonical reference so the explanation is accurate and current, not a
     recollection. Examples: MDN for Web APIs, docs.python.org for stdlib,
     the framework's own getting-started guide for a chapter topic.

  2. IN DEBATE — the student challenges a claim ("I read somewhere that X is
     wrong"). Don't argue from memory. Open the authoritative source live,
     quote it, and resolve it from evidence.

  3. SELF-CONFLICT — the tutor notices it's unsure or that two things it
     knows might contradict each other. Stop, look it up, confirm before
     continuing. A tutor who guesses and is wrong is worse than one who says
     "let me check".

  4. PACKAGE / API RESEARCH — before writing code that uses any library,
     check the actual API signature and config shape. Never hallucinate
     method names or option keys.

  5. ERROR LOOKUP — when a command or test fails with an unfamiliar error,
     search for the error message or look up the tool's error reference.

  The rule: if it's version-sensitive, config-sensitive, or the tutor would
  say "I think..." — use agent-browser instead of thinking.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
---

# agent-browser (Poiesis)

Fast browser automation CLI for AI agents. Chrome/Chromium via CDP with
accessibility-tree snapshots and compact `@eN` element refs.

Install (global, one-time): `npm i -g agent-browser && agent-browser install`

## Start here

Before running any `agent-browser` command, load the live workflow guide:

```bash
agent-browser skills get core        # workflows, patterns, troubleshooting
agent-browser skills get core --full # full command reference
```

## Poiesis: how to use this as a tutor

### Teaching — look up the reference before explaining

```bash
agent-browser open "https://developer.mozilla.org/en-US/docs/Web/API/<topic>"
agent-browser snapshot
# read the definition / spec / examples
agent-browser close
```

Same pattern for any docs:
- Framework docs: `https://hono.dev/docs`, `https://fastapi.tiangolo.com`, etc.
- Language stdlib: `https://docs.python.org/3/library/<module>.html`
- RFCs: `https://datatracker.ietf.org/doc/html/rfc<N>`
- Official tutorials linked from the chapter content

### In debate — settle it from the source

Student says "I thought async/await was just syntactic sugar with no performance
difference" and you're not 100% sure of the nuance:

```bash
agent-browser open "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function"
agent-browser snapshot
# find the authoritative answer, quote it directly to the student
agent-browser close
```

Don't argue from memory. Cite the source.

### Self-conflict — when you're unsure

If the tutor catches itself about to say "I believe..." or holds two
contradicting ideas:

```bash
agent-browser open "<most authoritative URL for the topic>"
agent-browser snapshot
```

Read the actual spec or docs, then answer.

### Package / API research

```bash
# pi packages
agent-browser open "https://pi.dev/packages/<name>"

# npm packages
agent-browser open "https://www.npmjs.com/package/<name>"

# GitHub README
agent-browser open "https://github.com/<owner>/<repo>#readme"

# skills.sh
agent-browser open "https://www.skills.sh/<org>/<repo>/<skill>"
```

### Error lookup

```bash
agent-browser open "https://duckduckgo.com/?q=<error+message+quoted>"
agent-browser snapshot -i
agent-browser click @e<first-result-ref>
agent-browser snapshot
```

Or go directly to the tool's error reference if known.

## Core loop (quick reference)

```bash
agent-browser open <url>      # open page
agent-browser snapshot -i     # interactive elements only
agent-browser snapshot        # full content read
agent-browser click @e3       # act on a ref
agent-browser snapshot -i     # re-snapshot after any change
agent-browser close           # always close when done
```

Refs go stale on every page change — always re-snapshot before the next action.

## Specialized skills

```bash
agent-browser skills get electron      # VS Code, Slack, Discord, Figma
agent-browser skills get dogfood       # exploratory QA / bug hunts
agent-browser skills get vercel-sandbox
agent-browser skills get agentcore     # AWS Bedrock cloud browsers
```
