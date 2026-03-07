import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { AnySchema } from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';

export type ValidationError = {
  filePath: string;
  message: string;
  hint?: string;
};

type StackEntry = {
  key: string;
  spec: string;
};

type StackCatalog = {
  frontend?: StackEntry[];
  backend?: StackEntry[];
};

type ParityMatrix = {
  required_capabilities?: Array<{ id: string }>;
  parity_gate?: {
    parity_evidence_schema?: string;
  };
  frontend_stack_mapping?: Record<string, string[]>;
  backend_stack_mapping?: Record<string, string[]>;
};

type ValidationOptions = {
  rootDir: string;
  evidencePath?: string;
};

export function loadYaml<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  const fileContents = readFileSync(filePath, 'utf8');
  try {
    return YAML.parse(fileContents) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse YAML ${filePath}: ${message}`);
  }
}

function getKnownCapabilityIds(matrix: ParityMatrix): Set<string> {
  return new Set((matrix.required_capabilities ?? []).map((item) => item.id));
}

function getStackEntries(catalog: StackCatalog): Array<{ area: 'frontend' | 'backend'; entry: StackEntry }> {
  const frontend = (catalog.frontend ?? []).map((entry) => ({ area: 'frontend' as const, entry }));
  const backend = (catalog.backend ?? []).map((entry) => ({ area: 'backend' as const, entry }));
  return [...frontend, ...backend];
}

export function validateStackCoverage(
  catalog: StackCatalog,
  matrix: ParityMatrix,
  catalogPath: string,
  matrixPath: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const frontendMapping = matrix.frontend_stack_mapping ?? {};
  const backendMapping = matrix.backend_stack_mapping ?? {};

  const frontendCatalogKeys = new Set((catalog.frontend ?? []).map((entry) => entry.key));
  const backendCatalogKeys = new Set((catalog.backend ?? []).map((entry) => entry.key));

  for (const key of frontendCatalogKeys) {
    if (!(key in frontendMapping)) {
      errors.push({
        filePath: matrixPath,
        message: `Missing frontend stack mapping for '${key}'.`,
        hint: `Add '${key}' to frontend_stack_mapping in ${path.basename(matrixPath)}.`,
      });
    }
  }

  for (const key of backendCatalogKeys) {
    if (!(key in backendMapping)) {
      errors.push({
        filePath: matrixPath,
        message: `Missing backend stack mapping for '${key}'.`,
        hint: `Add '${key}' to backend_stack_mapping in ${path.basename(matrixPath)}.`,
      });
    }
  }

  for (const key of Object.keys(frontendMapping)) {
    if (!frontendCatalogKeys.has(key)) {
      errors.push({
        filePath: matrixPath,
        message: `Unknown frontend stack mapping '${key}' is not declared in stack catalog.`,
        hint: `Add '${key}' to ${path.basename(catalogPath)} frontend list or remove the mapping.`,
      });
    }
  }

  for (const key of Object.keys(backendMapping)) {
    if (!backendCatalogKeys.has(key)) {
      errors.push({
        filePath: matrixPath,
        message: `Unknown backend stack mapping '${key}' is not declared in stack catalog.`,
        hint: `Add '${key}' to ${path.basename(catalogPath)} backend list or remove the mapping.`,
      });
    }
  }

  return errors;
}

export function validateTemplateCapabilities(
  rootDir: string,
  catalog: StackCatalog,
  matrix: ParityMatrix,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const knownCapabilities = getKnownCapabilityIds(matrix);

  for (const { area, entry } of getStackEntries(catalog)) {
    const mapping = area === 'frontend' ? matrix.frontend_stack_mapping ?? {} : matrix.backend_stack_mapping ?? {};
    const mappedCapabilityIds = mapping[entry.key];

    if (!Array.isArray(mappedCapabilityIds)) {
      errors.push({
        filePath: path.join(rootDir, entry.spec),
        message: `No mapped capabilities found for '${entry.key}'.`,
        hint: `Add '${entry.key}' mapping to capability-parity-matrix.yaml before validating templates.`,
      });
      continue;
    }

    const specPath = path.join(rootDir, entry.spec);
    if (!existsSync(specPath)) {
      errors.push({
        filePath: specPath,
        message: `Template spec file does not exist for stack '${entry.key}'.`,
        hint: `Fix stack-catalog spec path for '${entry.key}'.`,
      });
      continue;
    }

    const spec = loadYaml<{ required_capabilities?: string[] }>(specPath);
    if (!Array.isArray(spec.required_capabilities)) {
      errors.push({
        filePath: specPath,
        message: `Template '${entry.key}' is missing required_capabilities array.`,
        hint: `Add required_capabilities with parity IDs from the matrix mapping.`,
      });
      continue;
    }

    const required = spec.required_capabilities;
    const duplicates = required.filter((id, index) => required.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push({
        filePath: specPath,
        message: `Template '${entry.key}' has duplicate capability IDs: ${Array.from(new Set(duplicates)).join(', ')}.`,
        hint: 'Keep each capability ID only once in required_capabilities.',
      });
    }

    const unknownTemplateCapabilities = required.filter((id) => !knownCapabilities.has(id));
    if (unknownTemplateCapabilities.length > 0) {
      errors.push({
        filePath: specPath,
        message: `Template '${entry.key}' uses unknown capability IDs: ${unknownTemplateCapabilities.join(', ')}.`,
        hint: 'Use IDs declared in required_capabilities of capability-parity-matrix.yaml.',
      });
    }

    const missing = mappedCapabilityIds.filter((id) => !required.includes(id));
    if (missing.length > 0) {
      errors.push({
        filePath: specPath,
        message: `Template '${entry.key}' is missing mapped capabilities: ${missing.join(', ')}.`,
        hint: 'Add the missing IDs to required_capabilities in this template spec.',
      });
    }
  }

  return errors;
}

export function validateParityEvidence(
  evidence: unknown,
  schema: unknown,
  evidencePath: string,
  schemaPath: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema as AnySchema);
  const isValid = validate(evidence);

  if (!isValid) {
    for (const issue of validate.errors ?? []) {
      const location = issue.instancePath || '/';
      errors.push({
        filePath: evidencePath,
        message: `Schema validation failed at '${location}': ${issue.message ?? 'unknown schema error'}.`,
        hint: `Align parity evidence structure with ${path.basename(schemaPath)}.`,
      });
    }
  }

  const evidenceDoc = evidence as { parity_evidence?: Array<{ capability_id?: string; implementation_location?: string | string[]; verification_method?: string }> };
  const entries = evidenceDoc.parity_evidence ?? [];

  if (Array.isArray(entries)) {
    const seen = new Set<string>();
    for (const [index, item] of entries.entries()) {
      const capabilityId = item.capability_id;
      if (capabilityId && seen.has(capabilityId)) {
        errors.push({
          filePath: evidencePath,
          message: `Duplicate capability_id '${capabilityId}' found in parity_evidence at index ${index}.`,
          hint: 'Keep one parity evidence entry per capability_id.',
        });
      }

      if (capabilityId) {
        seen.add(capabilityId);
      }

      if (typeof item.implementation_location === 'string' && item.implementation_location.trim().length === 0) {
        errors.push({
          filePath: evidencePath,
          message: `Empty implementation_location for capability '${capabilityId ?? 'unknown'}'.`,
          hint: 'Use a non-empty file path or a non-empty array of file paths.',
        });
      }

      if (Array.isArray(item.implementation_location) && item.implementation_location.some((location) => location.trim().length === 0)) {
        errors.push({
          filePath: evidencePath,
          message: `implementation_location array for capability '${capabilityId ?? 'unknown'}' contains empty values.`,
          hint: 'Remove blank entries from implementation_location.',
        });
      }
    }
  }

  return errors;
}

function parseArgs(argv: string[]): ValidationOptions {
  const options: ValidationOptions = {
    rootDir: process.cwd(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--root') {
      options.rootDir = path.resolve(argv[i + 1] ?? process.cwd());
      i += 1;
      continue;
    }

    if (token === '--evidence') {
      options.evidencePath = path.resolve(options.rootDir, argv[i + 1] ?? '');
      i += 1;
    }
  }

  return options;
}

function formatErrors(rootDir: string, errors: ValidationError[]): string {
  return errors
    .map((error, index) => {
      const relativePath = path.relative(rootDir, error.filePath) || error.filePath;
      const hintSuffix = error.hint ? ` Hint: ${error.hint}` : '';
      return `${index + 1}. ${relativePath}: ${error.message}${hintSuffix}`;
    })
    .join('\n');
}

export function runValidation(options: ValidationOptions): { ok: boolean; errors: ValidationError[] } {
  const rootDir = options.rootDir;
  const matrixPath = path.join(rootDir, 'Templates/shared/capability-parity-matrix.yaml');
  const catalogPath = path.join(rootDir, 'Templates/shared/stack-catalog.yaml');

  const matrix = loadYaml<ParityMatrix>(matrixPath);
  const catalog = loadYaml<StackCatalog>(catalogPath);

  const schemaRelativePath = matrix.parity_gate?.parity_evidence_schema;
  const schemaPath = schemaRelativePath
    ? path.join(rootDir, schemaRelativePath)
    : path.join(rootDir, 'Templates/shared/parity-evidence-schema.yaml');

  const evidencePath = options.evidencePath
    ? path.resolve(options.evidencePath)
    : path.join(rootDir, 'Templates/shared/capability-evidence.example.yaml');

  const errors: ValidationError[] = [];
  errors.push(...validateStackCoverage(catalog, matrix, catalogPath, matrixPath));
  errors.push(...validateTemplateCapabilities(rootDir, catalog, matrix));

  const schema = loadYaml<unknown>(schemaPath);
  const evidence = loadYaml<unknown>(evidencePath);
  errors.push(...validateParityEvidence(evidence, schema, evidencePath, schemaPath));

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function main(): number {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = runValidation(options);

    if (!result.ok) {
      console.error(`[parity] Validation failed with ${result.errors.length} issue(s).`);
      console.error(formatErrors(options.rootDir, result.errors));
      return 1;
    }

    console.log('[parity] Validation passed. Stack mappings, template capabilities, and parity evidence are aligned.');
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[parity] Fatal error: ${message}`);
    return 1;
  }
}

const thisModulePath = process.argv[1] ? path.resolve(process.argv[1]).replace(/\\/g, '/') : '';
const thisModuleUrl = thisModulePath ? `file:///${thisModulePath}` : '';

if (import.meta.url === thisModuleUrl || process.argv[1]?.endsWith('validate-parity.ts')) {
  process.exitCode = main();
}
