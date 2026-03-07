import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync as fsMkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  runValidation,
  validateParityEvidence,
  validateStackCoverage,
  validateTemplateCapabilities,
} from './validate-parity';

function createTempRepo(): string {
  const rootDir = fsMkdtempSync(path.join(os.tmpdir(), 'parity-validator-'));
  return rootDir;
}

function writeYaml(rootDir: string, relativePath: string, content: string): void {
  const absolutePath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
}

test('validateStackCoverage fails when catalog stack is not mapped', () => {
  const errors = validateStackCoverage(
    {
      frontend: [{ key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' }],
      backend: [{ key: 'python', spec: 'Templates/backend-python/template-spec.yaml' }],
    },
    {
      frontend_stack_mapping: {},
      backend_stack_mapping: { python: ['CAP-OPS-001'] },
    },
    'Templates/shared/stack-catalog.yaml',
    'Templates/shared/capability-parity-matrix.yaml',
  );

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /Missing frontend stack mapping/);
});

test('validateTemplateCapabilities fails when template misses mapped capability', () => {
  const rootDir = createTempRepo();
  writeYaml(
    rootDir,
    'Templates/frontend-nextjs/template-spec.yaml',
    ['required_capabilities:', '  - CAP-FF-001'].join('\n'),
  );

  const errors = validateTemplateCapabilities(
    rootDir,
    {
      frontend: [{ key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' }],
    },
    {
      required_capabilities: [{ id: 'CAP-FF-001' }, { id: 'CAP-FF-002' }],
      frontend_stack_mapping: {
        nextjs: ['CAP-FF-001', 'CAP-FF-002'],
      },
    },
  );

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /missing mapped capabilities/i);
});

test('validateParityEvidence fails on unsupported verification method and duplicate capability id', () => {
  const schema = {
    type: 'object',
    required: ['parity_evidence'],
    properties: {
      parity_evidence: {
        type: 'array',
        items: {
          type: 'object',
          required: ['capability_id', 'implementation_location', 'verification_method'],
          properties: {
            capability_id: { type: 'string' },
            implementation_location: { type: 'string', minLength: 1 },
            verification_method: {
              type: 'string',
              enum: ['unit_test', 'integration_test', 'e2e_test', 'manual_check'],
            },
          },
        },
      },
    },
  };

  const evidence = {
    parity_evidence: [
      {
        capability_id: 'CAP-FF-001',
        implementation_location: 'src/one.ts',
        verification_method: 'smoke_test',
      },
      {
        capability_id: 'CAP-FF-001',
        implementation_location: 'src/two.ts',
        verification_method: 'unit_test',
      },
    ],
  };

  const errors = validateParityEvidence(evidence, schema, 'evidence.yaml', 'schema.yaml');

  assert.ok(errors.some((error) => /Schema validation failed/.test(error.message)));
  assert.ok(errors.some((error) => /Duplicate capability_id/.test(error.message)));
});

test('runValidation passes with minimal valid fixture', () => {
  const rootDir = createTempRepo();

  writeYaml(
    rootDir,
    'Templates/shared/stack-catalog.yaml',
    [
      'frontend:',
      '  - key: nextjs',
      '    spec: Templates/frontend-nextjs/template-spec.yaml',
      'backend:',
      '  - key: python',
      '    spec: Templates/backend-python/template-spec.yaml',
    ].join('\n'),
  );

  writeYaml(
    rootDir,
    'Templates/shared/capability-parity-matrix.yaml',
    [
      'required_capabilities:',
      '  - id: CAP-FF-001',
      '  - id: CAP-OPS-001',
      'parity_gate:',
      '  parity_evidence_schema: Templates/shared/parity-evidence-schema.yaml',
      'frontend_stack_mapping:',
      '  nextjs: [CAP-FF-001]',
      'backend_stack_mapping:',
      '  python: [CAP-OPS-001]',
    ].join('\n'),
  );

  writeYaml(
    rootDir,
    'Templates/shared/parity-evidence-schema.yaml',
    [
      'type: object',
      'required: [parity_evidence]',
      'properties:',
      '  parity_evidence:',
      '    type: array',
      '    items:',
      '      type: object',
      '      required: [capability_id, implementation_location, verification_method]',
      '      properties:',
      '        capability_id: { type: string }',
      '        implementation_location: { type: string, minLength: 1 }',
      '        verification_method:',
      '          type: string',
      '          enum: [unit_test, integration_test, e2e_test, manual_check]',
    ].join('\n'),
  );

  writeYaml(
    rootDir,
    'Templates/shared/capability-evidence.example.yaml',
    [
      'parity_evidence:',
      '  - capability_id: CAP-FF-001',
      '    implementation_location: src/a.ts',
      '    verification_method: unit_test',
    ].join('\n'),
  );

  writeYaml(
    rootDir,
    'Templates/frontend-nextjs/template-spec.yaml',
    ['required_capabilities:', '  - CAP-FF-001'].join('\n'),
  );

  writeYaml(
    rootDir,
    'Templates/backend-python/template-spec.yaml',
    ['required_capabilities:', '  - CAP-OPS-001'].join('\n'),
  );

  const result = runValidation({ rootDir });
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});
