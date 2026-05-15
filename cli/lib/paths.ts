import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export type NodePlatform = 'win32' | 'darwin' | 'linux';

export function getNodePlatform(): NodePlatform {
  const p = process.platform;
  if (p === 'win32' || p === 'darwin' || p === 'linux') {
    return p;
  }
  return 'linux';
}

/**
 * Expands {HOME}, {APPDATA}, {LOCALAPPDATA} and normalizes to OS paths.
 */
export function expandPathTemplate(template: string, platform: NodePlatform = getNodePlatform()): string {
  const home = os.homedir();
  let expanded = template.replace(/\{HOME\}/g, home);
  if (platform === 'win32') {
    const appData = process.env.APPDATA ?? '';
    const localAppData = process.env.LOCALAPPDATA ?? '';
    if (template.includes('{APPDATA}') && !appData) {
      throw new Error('APPDATA is not set; cannot resolve Windows path for this tool.');
    }
    expanded = expanded.replace(/\{APPDATA\}/g, appData).replace(/\{LOCALAPPDATA\}/g, localAppData);
  } else {
    expanded = expanded.replace(/\{APPDATA\}/g, '').replace(/\{LOCALAPPDATA\}/g, '');
  }
  const normalized = path.normalize(expanded.split('/').join(path.sep));
  return path.resolve(normalized);
}

export function defaultInstallRoot(platform: NodePlatform = getNodePlatform()): string {
  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
    return path.join(local, 'ai-agent-workflows-pack');
  }
  if (platform === 'darwin') {
    return path.join(homeLibraryApplicationSupport(), 'ai-agent-workflows-pack');
  }
  return path.join(os.homedir(), '.local', 'share', 'ai-agent-workflows-pack');
}

function homeLibraryApplicationSupport(): string {
  return path.join(os.homedir(), 'Library', 'Application Support');
}

export function resolveRepoPaths(repoRoot: string): {
  agentsSourceDir: string;
  templatesSourceDir: string;
  skillsSourceDir: string;
} {
  const agentsSourceDir = path.join(repoRoot, 'agents');
  const templatesSourceDir = path.join(repoRoot, 'templates');
  const skillsSourceDir = path.join(repoRoot, 'skills');
  return { agentsSourceDir, templatesSourceDir, skillsSourceDir };
}

export function assertRepoLayout(repoRoot: string): void {
  const { agentsSourceDir, templatesSourceDir } = resolveRepoPaths(repoRoot);
  if (!fs.existsSync(agentsSourceDir) || !fs.statSync(agentsSourceDir).isDirectory()) {
    throw new Error(`Missing agents folder: ${agentsSourceDir}`);
  }
  if (!fs.existsSync(templatesSourceDir) || !fs.statSync(templatesSourceDir).isDirectory()) {
    throw new Error(`Missing templates folder: ${templatesSourceDir}`);
  }
}
