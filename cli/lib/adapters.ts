import * as fs from 'node:fs';
import * as path from 'node:path';

export type InstallArtifact =
  | { kind: 'file'; targetSubpath: string; body: string }
  | { kind: 'copy'; targetSubpath: string; sourceAbsolute: string };

export interface AdapterContext {
  repoRoot: string;
  agentsSourceDir: string;
  templatesSourceDir: string;
  skillsSourceDir: string;
  /** When set, only these agent filenames (basenames) will be installed. */
  selectedAgentFiles?: string[];
}

export interface SkillsAdapterContext extends AdapterContext {
  workspaceRoot: string;
  /** When set, only these skill family dirnames are installed. */
  selectedSkillFamilies?: string[];
}

export interface PackAdapter {
  readonly id: string;
  adaptAgents(ctx: AdapterContext): Promise<InstallArtifact[]>;
  adaptTemplates(ctx: AdapterContext): Promise<InstallArtifact[]>;
  adaptSkills?(ctx: SkillsAdapterContext): Promise<InstallArtifact[]>;
}

function listFilesRecursive(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out;
}

/**
 * Passthrough: agents copied flat by basename; templates under templates/<rel>.
 */
export function createPassthroughAdapter(id: string): PackAdapter {
  return {
    id,
    async adaptAgents(ctx: AdapterContext): Promise<InstallArtifact[]> {
      const files = listFilesRecursive(ctx.agentsSourceDir);
      const filtered = ctx.selectedAgentFiles
        ? files.filter((f) => ctx.selectedAgentFiles!.includes(path.basename(f)))
        : files;
      return filtered.map((abs) => ({
        kind: 'copy' as const,
        targetSubpath: path.basename(abs),
        sourceAbsolute: abs,
      }));
    },
    async adaptTemplates(ctx: AdapterContext): Promise<InstallArtifact[]> {
      const files = listFilesRecursive(ctx.templatesSourceDir);
      const base = path.resolve(ctx.templatesSourceDir);
      return files.map((abs) => {
        const rel = path.relative(base, abs);
        return {
          kind: 'copy' as const,
          targetSubpath: path.join('templates', rel),
          sourceAbsolute: abs,
        };
      });
    },
    async adaptSkills(ctx: SkillsAdapterContext): Promise<InstallArtifact[]> {
      if (!fs.existsSync(ctx.skillsSourceDir)) {
        return [];
      }
      const base = path.resolve(ctx.skillsSourceDir);
      const entries = fs.readdirSync(ctx.skillsSourceDir, { withFileTypes: true });
      const dirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .filter((name) =>
          ctx.selectedSkillFamilies ? ctx.selectedSkillFamilies.includes(name) : true,
        );

      const artifacts: InstallArtifact[] = [];
      for (const dir of dirs) {
        const files = listFilesRecursive(path.join(base, dir));
        for (const abs of files) {
          const rel = path.relative(base, abs);
          artifacts.push({
            kind: 'copy' as const,
            targetSubpath: path.join('.github', 'skills', rel),
            sourceAbsolute: abs,
          });
        }
      }
      // Also copy top-level files (README.md, agent-to-skill-map.md, etc.)
      for (const e of entries) {
        if (e.isFile()) {
          artifacts.push({
            kind: 'copy' as const,
            targetSubpath: path.join('.github', 'skills', e.name),
            sourceAbsolute: path.join(base, e.name),
          });
        }
      }
      return artifacts;
    },
  };
}

const passthroughClaude = createPassthroughAdapter('claude-agent');
const passthroughVscode = createPassthroughAdapter('vscode-agent');
const passthroughCursor = createPassthroughAdapter('cursor-agent');

const adapterById: Record<string, PackAdapter> = {
  'claude-agent': passthroughClaude,
  'vscode-agent': passthroughVscode,
  'cursor-agent': passthroughCursor,
};

export function getAdapter(adapterId: string): PackAdapter {
  const adapter = adapterById[adapterId];
  if (!adapter) {
    throw new Error(`Unknown adapterId "${adapterId}". Valid: ${Object.keys(adapterById).sort().join(', ')}`);
  }
  return adapter;
}
