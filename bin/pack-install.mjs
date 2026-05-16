#!/usr/bin/env node
/**
 * Thin launcher — delegates to the TypeScript entry point via tsx.
 * tsx is a declared runtime dependency so it is available after install.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = resolve(__dirname, '../cli/pack-install.ts');

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', cli, ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 1);
