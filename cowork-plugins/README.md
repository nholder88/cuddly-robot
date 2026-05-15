# Cowork plugins

Installable plugins for Anthropic's Cowork desktop app. These are distinct from the Cursor/VS Code agent pack in the top-level `skills/` and `agents/` folders — Cowork plugins use a different manifest format (`.claude-plugin/plugin.json`) and run inside the Cowork sandbox rather than in an IDE.

## What's here

- [`repo-audit/`](./repo-audit) — multi-repo audit + README-drafting pipeline. Skills: `audit-repos` (full 8-phase pass across a GitHub account), `draft-repo-readme` (single-repo README from source files). Emits parameterized PowerShell so the user runs anything that touches GitHub locally.

## Packaging a plugin for install

From the plugin's source directory:

```powershell
cd cowork-plugins\repo-audit
Compress-Archive -Path * -DestinationPath ..\..\dist\repo-audit.plugin -Force
```

Then drag the `.plugin` file into the Cowork plugin manager. Note: `.plugin` is just a ZIP with a `.plugin` extension.

## How Cowork plugins differ from the rest of this repo

| | `skills/` + `agents/` (Cursor/VS Code) | `cowork-plugins/` |
|---|---|---|
| Target | Cursor, VS Code via the adapter registry | Anthropic Cowork desktop app |
| Manifest | agent frontmatter + `tools.registry.json` | `.claude-plugin/plugin.json` |
| Install | `npm run pack:install` | drag-and-drop `.plugin` file |
| Runtime | IDE chat, access to workspace files | Cowork sandbox, limited network |
