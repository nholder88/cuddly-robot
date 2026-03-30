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

  it('emits Templates/ prefixed paths for template files', async () => {
    const ctx = { repoRoot, ...resolveRepoPaths(repoRoot) };
    const adapter = createPassthroughAdapter('vscode-agent');
    const arts = await adapter.adaptTemplates(ctx);
    assert.ok(arts.length > 0);
    const first = arts[0];
    assert.equal(first?.kind, 'copy');
    if (first?.kind === 'copy') {
      const norm = first.targetSubpath.replace(/\//g, path.sep);
      assert.ok(norm.startsWith(`Templates${path.sep}`));
    }
  });
});
