import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface AgentMeta {
  filename: string;
  name: string;
  description: string;
  category: string;
}

const CATEGORIES: Array<{ test: (f: string) => boolean; label: string }> = [
  { test: (f) => f.includes('orchestrator') || f.includes('architect'), label: 'Orchestration' },
  { test: (f) => f.includes('-implementer'), label: 'Implementers' },
  { test: (f) => f.includes('-specialist'), label: 'Specialists' },
  {
    test: (f) => f.includes('-sentinel') || f.includes('-reviewer') || f.includes('-clarifier'),
    label: 'Review & QA',
  },
];

export function categorizeAgent(filename: string): string {
  const base = filename.toLowerCase();
  for (const { test, label } of CATEGORIES) {
    if (test(base)) return label;
  }
  return 'Utilities';
}

function extractFrontmatter(content: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return {};
  try {
    return (parseYaml(match[1]!) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

export async function listAgents(agentsDir: string): Promise<AgentMeta[]> {
  if (!fsSync.existsSync(agentsDir)) return [];

  const entries = await fs.readdir(agentsDir, { withFileTypes: true });
  const agentFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.agent.md'))
    .map((e) => e.name)
    .sort();

  const results: AgentMeta[] = [];
  for (const filename of agentFiles) {
    const content = await fs.readFile(path.join(agentsDir, filename), 'utf8');
    const fm = extractFrontmatter(content);

    const name = typeof fm.name === 'string' ? fm.name : path.basename(filename, '.agent.md');
    const rawDesc = fm.description;
    const description =
      typeof rawDesc === 'string' ? rawDesc.replace(/\n/g, ' ').trim().slice(0, 120) : '';

    results.push({ filename, name, description, category: categorizeAgent(filename) });
  }
  return results;
}
