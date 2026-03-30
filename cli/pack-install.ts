#!/usr/bin/env node
/**
 * Multi-IDE pack installer (VS Code / Cursor). See README "CLI installer".
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkbox, confirm, input } from '@inquirer/prompts';
import { defaultInstallRoot, getNodePlatform } from './lib/paths.js';
import { loadToolsRegistry, listToolIds } from './lib/registry.js';
import { runInstall } from './lib/pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function defaultRepoRoot(): string {
  return path.resolve(__dirname, '..');
}

interface ParsedArgs {
  targets: string[] | null;
  workspace: string | undefined;
  workspaceTemplates: boolean;
  source: string;
  installRoot: string;
  dryRun: boolean;
  yes: boolean;
  help: boolean;
  registryPath: string | null;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    targets: null,
    workspace: undefined,
    workspaceTemplates: false,
    source: defaultRepoRoot(),
    installRoot: defaultInstallRoot(),
    dryRun: false,
    yes: false,
    help: false,
    registryPath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '-h' || a === '--help') {
      out.help = true;
    } else if (a === '--targets' && argv[i + 1]) {
      out.targets = argv[++i]!.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--target' && argv[i + 1]) {
      const t = argv[++i]!.trim();
      out.targets = out.targets ?? [];
      out.targets.push(t);
    } else if (a === '--workspace' && argv[i + 1]) {
      out.workspace = argv[++i]!;
    } else if (a === '--workspace-templates') {
      out.workspaceTemplates = true;
    } else if (a === '--source' && argv[i + 1]) {
      out.source = path.resolve(argv[++i]!);
    } else if (a === '--install-root' && argv[i + 1]) {
      out.installRoot = path.resolve(argv[++i]!);
    } else if (a === '--registry' && argv[i + 1]) {
      out.registryPath = path.resolve(argv[++i]!);
    } else if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--yes' || a === '-y') {
      out.yes = true;
    } else if (!a.startsWith('-')) {
      continue;
    } else {
      console.error(`Unknown option: ${a}`);
      printHelp();
      process.exit(1);
    }
  }

  return out;
}

function printHelp(): void {
  console.log(`Usage: node --import tsx cli/pack-install.ts [options]

Install agents + Templates into selected IDE prompt folders; optionally copy
skills and Templates into a project workspace.

Options:
  --targets <id,id>     Comma-separated tool ids (e.g. vscode,cursor)
  --target <id>         Add one target (repeatable)
  --workspace <path>    Project root: install .github/skills when present
  --workspace-templates Copy Templates/ into <workspace>/Templates/
  --source <path>       Pack repo root (default: parent of cli/)
  --install-root <path> Manifest folder (default: OS-specific pack metadata root)
  --registry <path>     Override cli/tools.registry.json
  --dry-run             Print actions without writing files
  --yes, -y             Non-interactive (requires --targets)
  -h, --help            Show help
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.yes && args.workspaceTemplates && args.workspace === undefined) {
    console.error('--workspace-templates requires --workspace when using --yes');
    process.exit(1);
  }

  const registry = loadToolsRegistry(args.registryPath ?? undefined);
  const validIds = listToolIds(registry);

  let toolIds: string[] = args.targets ?? [];

  if (!args.yes && toolIds.length === 0) {
    toolIds = await checkbox({
      message: 'Install pack to which editors?',
      choices: registry.tools.map((t) => ({ name: t.label, value: t.id, checked: true })),
      required: true,
    });
  }

  if (toolIds.length === 0) {
    console.error('No targets selected. Use --targets or run interactively without --yes.');
    process.exit(1);
  }

  for (const id of toolIds) {
    if (!validIds.includes(id)) {
      console.error(`Invalid tool id "${id}". Valid: ${validIds.join(', ')}`);
      process.exit(1);
    }
  }

  let workspaceRoot: string | null = args.workspace != null ? path.resolve(args.workspace) : null;
  let workspaceTemplates = args.workspaceTemplates;

  if (!args.yes) {
    if (args.workspace === undefined) {
      const useWs = await confirm({
        message: 'Also install skills (and optional Templates) into a project workspace?',
        default: false,
      });
      if (useWs) {
        const ws = await input({
          message: 'Workspace root path',
          default: process.cwd(),
        });
        workspaceRoot = ws.trim() ? path.resolve(ws.trim()) : null;
      }
    }
    if (workspaceRoot && !args.workspaceTemplates) {
      workspaceTemplates = await confirm({
        message: 'Copy Templates/ into workspace (for scaffold prompts / parity tooling)?',
        default: false,
      });
    }
  } else if (workspaceTemplates && workspaceRoot === null) {
    console.error('--workspace-templates requires --workspace');
    process.exit(1);
  }

  const { manifest, manifestPath } = await runInstall({
    repoRoot: args.source,
    installRoot: args.installRoot,
    toolIds,
    registry,
    workspaceRoot: workspaceRoot ? path.resolve(workspaceRoot) : null,
    workspaceTemplates,
    dryRun: args.dryRun,
  });

  if (args.dryRun) {
    console.log('[dry-run] Would write manifest to:', manifestPath);
  } else {
    console.log('[ok] Manifest:', manifestPath);
  }

  const platform = getNodePlatform();
  console.log(`Platform: ${platform}`);
  for (const t of manifest.targets) {
    console.log(`Target [${t.target}] prompts: ${t.promptsPath}`);
    console.log(`  Agents: ${t.agentFileCount}  Templates: ${t.templateFileCount}`);
  }
  if (manifest.workspace) {
    console.log(`Workspace: ${manifest.workspace.root}`);
    if (manifest.workspace.skillsFileCount > 0) {
      console.log(`  Skills: ${manifest.workspace.skillsFileCount} → ${manifest.workspace.skillsPath}`);
    }
    if (manifest.workspace.templatesFileCount > 0) {
      console.log(`  Templates: ${manifest.workspace.templatesFileCount} → ${manifest.workspace.templatesPath}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
