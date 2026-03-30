import { strict as assert } from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { describe, it } from 'node:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandPathTemplate, getNodePlatform, resolveRepoPaths } from './paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

describe('expandPathTemplate', () => {
  it('expands HOME token using homedir()', () => {
    const home = os.homedir();
    const out = expandPathTemplate('{HOME}/.config/Code/User/prompts', 'linux');
    assert.ok(out.includes(home));
    assert.match(out, /Code/);
  });

  it('expands APPDATA on win32', () => {
    const orig = process.env.APPDATA;
    process.env.APPDATA = 'C:\\Users\\x\\AppData\\Roaming';
    try {
      const out = expandPathTemplate('{APPDATA}/Cursor/User/prompts', 'win32');
      assert.match(out, /Cursor/);
      assert.match(out, /User/);
      assert.match(out, /prompts/);
    } finally {
      if (orig === undefined) {
        delete process.env.APPDATA;
      } else {
        process.env.APPDATA = orig;
      }
    }
  });

  it('throws when APPDATA missing on win32 for APPDATA template', () => {
    const orig = process.env.APPDATA;
    delete process.env.APPDATA;
    try {
      assert.throws(() => expandPathTemplate('{APPDATA}/Code/User/prompts', 'win32'), /APPDATA/);
    } finally {
      if (orig !== undefined) {
        process.env.APPDATA = orig;
      }
    }
  });
});

describe('getNodePlatform', () => {
  it('returns a known platform string', () => {
    const p = getNodePlatform();
    assert.ok(p === 'win32' || p === 'darwin' || p === 'linux');
  });
});

describe('resolveRepoPaths', () => {
  it('points at repo-root agents, templates, skills and lists 30 agent specs', () => {
    const { agentsSourceDir, templatesSourceDir, skillsSourceDir } = resolveRepoPaths(repoRoot);
    assert.ok(fs.existsSync(agentsSourceDir));
    assert.ok(fs.existsSync(templatesSourceDir));
    assert.ok(fs.existsSync(skillsSourceDir));
    const agentFiles = fs.readdirSync(agentsSourceDir).filter((f) => f.endsWith('.agent.md'));
    assert.equal(agentFiles.length, 30);
  });
});
