import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPassthroughAdapter } from './adapters.js';
import { resolveRepoPaths } from './paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

describe('passthrough adapter', () => {
  it('emits one artifact per agent file with basename target', async () => {
    const ctx = { repoRoot, ...resolveRepoPaths(repoRoot) };
    const adapter = createPassthroughAdapter('vscode-agent');
    const arts = await adapter.adaptAgents(ctx);
    assert.ok(arts.length > 0);
    for (const a of arts) {
      assert.equal(a.kind, 'copy');
      if (a.kind === 'copy') {
        assert.equal(path.basename(a.targetSubpath), a.targetSubpath);
        assert.ok(fs.existsSync(a.sourceAbsolute));
      }
    }
  });

  it('returns all agents when selectedAgentFiles is undefined', async () => {
    const ctx = { repoRoot, ...resolveRepoPaths(repoRoot) };
    const adapter = createPassthroughAdapter('vscode-agent');
    const all = await adapter.adaptAgents(ctx);
    const withUndefined = await adapter.adaptAgents({ ...ctx, selectedAgentFiles: undefined });
    assert.equal(all.length, withUndefined.length);
  });

  it('returns only selected agents when selectedAgentFiles is provided', async () => {
    const ctx = { repoRoot, ...resolveRepoPaths(repoRoot), selectedAgentFiles: ['orchestrator.agent.md'] };
    const adapter = createPassthroughAdapter('vscode-agent');
    const arts = await adapter.adaptAgents(ctx);
    assert.equal(arts.length, 1);
    if (arts[0]?.kind === 'copy') {
      assert.equal(path.basename(arts[0].sourceAbsolute), 'orchestrator.agent.md');
    }
  });

  it('returns empty array when selectedAgentFiles is an empty array', async () => {
    const ctx = { repoRoot, ...resolveRepoPaths(repoRoot), selectedAgentFiles: [] };
    const adapter = createPassthroughAdapter('vscode-agent');
    const arts = await adapter.adaptAgents(ctx);
    assert.equal(arts.length, 0);
  });

  it('emits templates/ prefixed paths for template files', async () => {
    const ctx = { repoRoot, ...resolveRepoPaths(repoRoot) };
    const adapter = createPassthroughAdapter('vscode-agent');
    const arts = await adapter.adaptTemplates(ctx);
    assert.ok(arts.length > 0);
    const first = arts[0];
    assert.equal(first?.kind, 'copy');
    if (first?.kind === 'copy') {
      const norm = first.targetSubpath.replace(/\//g, path.sep);
      assert.ok(norm.startsWith(`templates${path.sep}`));
    }
  });
});
