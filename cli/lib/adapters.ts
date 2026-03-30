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
}

export interface SkillsAdapterContext extends AdapterContext {
  workspaceRoot: string;
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
      return files.map((abs) => ({
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
      const files = listFilesRecursive(ctx.skillsSourceDir);
      const base = path.resolve(ctx.skillsSourceDir);
      return files.map((abs) => {
        const rel = path.relative(base, abs);
        return {
          kind: 'copy' as const,
          targetSubpath: path.join('.github', 'skills', rel),
          sourceAbsolute: abs,
        };
      });
    },
  };
}

const passthroughVscode = createPassthroughAdapter('vscode-agent');
const passthroughCursor = createPassthroughAdapter('cursor-agent');

const adapterById: Record<string, PackAdapter> = {
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
