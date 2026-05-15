import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';

export interface SkillFamilyMeta {
  dirname: string;
  label: string;
}

/** Map from agent name (basename without .agent.md) → skill family dirnames it uses. */
export type AgentSkillMap = Map<string, string[]>;

function toLabel(dirname: string): string {
  return dirname
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function listSkillFamilies(skillsDir: string): Promise<SkillFamilyMeta[]> {
  if (!fsSync.existsSync(skillsDir)) return [];
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ dirname: e.name, label: toLabel(e.name) }))
    .sort((a, b) => a.dirname.localeCompare(b.dirname));
}

/**
 * Parse the agent-to-skill-map markdown table.
 * Extracts rows of the form: | `agent-name` | `skill-family` |
 */
export function parseAgentSkillMap(content: string): AgentSkillMap {
  const map: AgentSkillMap = new Map();
  for (const line of content.split('\n')) {
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    const agentMatch = /^`([^`]+)`$/.exec(cells[0]!);
    const skillMatch = /^`([^`]+)`$/.exec(cells[1]!);
    if (!agentMatch || !skillMatch) continue;
    const agent = agentMatch[1]!;
    const skill = skillMatch[1]!;
    const existing = map.get(agent) ?? [];
    existing.push(skill);
    map.set(agent, existing);
  }
  return map;
}

/**
 * Load the agent-to-skill map from the skills directory.
 * Returns an empty map if the file does not exist.
 */
export async function loadAgentSkillMap(skillsDir: string): Promise<AgentSkillMap> {
  const mapPath = path.join(skillsDir, 'agent-to-skill-map.md');
  if (!fsSync.existsSync(mapPath)) return new Map();
  const content = await fs.readFile(mapPath, 'utf8');
  return parseAgentSkillMap(content);
}

/**
 * Given a list of selected agent filenames and the full agent→skill map,
 * returns the set of skill family dirnames those agents depend on.
 */
export function getRequiredSkills(agentFilenames: string[], map: AgentSkillMap): Set<string> {
  const required = new Set<string>();
  for (const filename of agentFilenames) {
    const agentName = path.basename(filename, '.agent.md');
    for (const skill of map.get(agentName) ?? []) {
      required.add(skill);
    }
  }
  return required;
}
