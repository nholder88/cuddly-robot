import { strict as assert } from 'node:assert';
import * as os from 'node:os';
import { describe, it } from 'node:test';
import * as path from 'node:path';
import { expandPathTemplate, getNodePlatform } from './paths.js';

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
