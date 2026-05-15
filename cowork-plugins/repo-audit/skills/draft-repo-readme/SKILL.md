---
name: draft-repo-readme
description: Draft a structured README for a single GitHub repo following a problem/goal/approach/features format. Use when the user says "draft a README for X", "regenerate the README for [repo]", "write a problem statement README", "give me a real README for this", "write a proper README", or wants README content for one specific repo (as opposed to a full multi-repo audit, which is the audit-repos skill). Pulls source-of-truth from the repo's own files — does not invent details.
---

# Draft Repo README

Generate a structured, honest README for one repo from the repo's own source files.

## When this skill runs

Single-repo README generation. For a full multi-repo audit pass, use the `audit-repos` skill instead.

## Procedure

### Step 1: Locate the repo

If the user gave a path, use it. If they gave just a name, look for it under `repos/<name>/` in any mounted folder, or ask. If neither, ask for the path.

### Step 2: Read the source

Read these files (tolerate missing):
- Existing `README.md`
- Manifest: `package.json`, `pyproject.toml`, `Cargo.toml`, `*.csproj`, `go.mod`, `redwood.toml`, `nest-cli.json` — whatever applies to the stack
- Top-level directory listing
- First and last commit messages via `git log` if a `.git` folder is present
- Any prior `_analysis/<repo>.json` from a previous audit pass — use it as a starting point if present

For larger repos, also skim the most semantically interesting subdirectories (e.g., `src/`, `api/`, `web/`, `db/schema.prisma`) to verify what's actually implemented.

### Step 3: Draft the README

Follow the structure in `references/readme-template.md`. Sections in order:

1. Title + one-sentence tagline
2. Problem — what real friction this addresses
3. Goal — what "done" looks like
4. Approach — architecture / tech choices
5. Implemented features — only what's verifiable in the source
6. What's left to reach the goal — checkbox list
7. Related repos — if any (consolidation history)
8. Getting started — clone-and-run commands
9. Status — maturity signal + 1–2 sentence honest take

### Step 4: Write the draft

Default location: `_drafts/<repo>/README.md` relative to the user's working folder. Different location if the user specified one.

Confirm to the user where you wrote it and offer to refine specific sections.

## Honesty rules (non-negotiable)

- **Don't invent biographical details.** Author hobbies, certifications, years of experience, job titles — if it's not in the source, it doesn't go in.
- **Don't claim features that aren't in the code.** If you can't see the route handler, don't claim auth works.
- **Be honest about completion.** If commit history shows two commits from 2022 and nothing since, say so. "Prototype, ~30% complete, last touched [date]" is more useful than vague positivity.
- **Profile READMEs are highest-stakes.** For the `<user>/<user>` repo specifically: only include facts already present in the existing profile README or directly observable in the user's public repos. When in doubt, omit.

## References

- `references/readme-template.md` — the section-by-section format with anti-patterns to avoid
