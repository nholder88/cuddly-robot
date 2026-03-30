import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandPathTemplate, getNodePlatform, type NodePlatform } from './paths.js';

export interface ToolRegistryFile {
  version: number;
  tools: ToolDefinition[];
}

export interface ToolDefinition {
  id: string;
  label: string;
  adapterId: string;
  agentsRootByPlatform: Partial<Record<NodePlatform, string>>;
}

export function loadToolsRegistry(registryPath?: string): ToolRegistryFile {
  const resolved =
    registryPath ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools.registry.json');
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw) as ToolRegistryFile;
}

export function resolveToolAgentsRoot(tool: ToolDefinition, platform: NodePlatform = getNodePlatform()): string {
  const template = tool.agentsRootByPlatform[platform];
  if (!template || template.trim() === '') {
    throw new Error(`Tool "${tool.id}" has no agentsRoot for platform "${platform}"`);
  }
  return expandPathTemplate(template, platform);
}

export function listToolIds(registry: ToolRegistryFile): string[] {
  return registry.tools.map((t) => t.id);
}

export function getToolById(registry: ToolRegistryFile, id: string): ToolDefinition {
  const found = registry.tools.find((t) => t.id === id);
  if (!found) {
    throw new Error(`Unknown tool id "${id}". Valid: ${listToolIds(registry).join(', ')}`);
  }
  return found;
}
