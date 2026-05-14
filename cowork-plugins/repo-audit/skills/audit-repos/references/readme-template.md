# Repo README Template

Use this structure for every drafted README. The point is honesty: a reader should be able to tell within 30 seconds what the repo solves, how far along it is, and whether it's worth their time.

## Section order

### 1. Title + tagline

```
# Project Name

> One-sentence description of what this is.
```

### 2. Problem

What real-world friction does this try to solve? Be specific. If the project is exploratory ("learning Svelte", "trying out Sanity v3"), say so plainly — don't dress it up as something it isn't.

### 3. Goal

One paragraph: what does the finished state look like? What does "done" mean for this repo? If the goal has shifted (e.g., started as a tutorial, became a real app), say so.

### 4. Approach

Architecture and key tech choices. Bullet the file/folder layout if it's not obvious. Mention the main runtime/framework, persistence layer, and any non-obvious dependencies.

### 5. Implemented features

What's actually in the code today. Bullet list. **Only claim what's verifiable from the source files.** If a feature is half-built (route defined but no handler), say "scaffolded, not wired up" rather than implying it works.

### 6. What's left to reach the goal

Checkbox list (`- [ ]`). Concrete remaining work. Order roughly by what blocks what.

### 7. Related repos (optional)

If this is a consolidation winner or has been preceded by other attempts, list them here. This keeps search history pointing to the right place after archives.

### 8. Getting started

Prereqs + setup commands in code blocks. The reader should be able to clone-and-run from this section alone. Include:
- Required runtime versions (Node X, Python Y, .NET Z)
- Environment variables and where to set them
- The command sequence: install → migrate → run

### 9. Status

One-line maturity signal. Choose from:
- `prototype - X% complete`
- `working - missing polish`
- `production-lean - in active use`
- `experiment - learning artifact, not maintained`

Plus a 1–2 sentence honest take on what state it's actually in. Mention last commit date if it's been a while.

### Footer (optional)

If this draft was produced by an audit pass, include:

```
*Part of [user]'s personal project cleanup ([month year]). See problem statement above for what this is supposed to solve.*
```

## Anti-patterns to avoid

- **Aspirational features in the implemented list.** If it's planned, it goes in "What's left", not "Implemented features".
- **Marketing voice.** "Revolutionary", "best-in-class", "blazingly fast" — strike all of it.
- **Hidden bus factor.** If this is one person's side project, don't write it like an open-source project with contributors. Be plain about what it is.
- **Profile README inflation.** For the `<user>/<user>` repo specifically: do not invent job titles, years of experience, hobbies, certifications, or anything else not already in the existing profile README or directly observable in the user's public repos.
