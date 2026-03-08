import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync as fsMkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  runValidation,
  validateCiCommandContract,
  validateCiStackCommandMatrix,
  validateParityEvidence,
  validateStackCoverage,
  validateTemplateCapabilities,
  validateTemplateTestingMetadata,
  validateWorkflowTemplates,
} from './validate-parity';

function createTempRepo(): string {
  const rootDir = fsMkdtempSync(path.join(os.tmpdir(), 'parity-validator-'));
  return rootDir;
}

function writeYaml(
  rootDir: string,
  relativePath: string,
  content: string
): void {
  const absolutePath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
}

function writeCommonParityFixtures(rootDir: string): void {
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
    ].join('\n')
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
    ].join('\n')
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
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/shared/capability-evidence.example.yaml',
    [
      'parity_evidence:',
      '  - capability_id: CAP-FF-001',
      '    implementation_location: src/a.ts',
      '    verification_method: unit_test',
    ].join('\n')
  );
}

function writeCommonCiFixtures(rootDir: string): void {
  writeYaml(
    rootDir,
    'Templates/shared/ci-command-contract.yaml',
    [
      'version: 1.0.0',
      'name: ci-command-contract',
      'slots:',
      '  install: { required: true }',
      '  lint: { required: true }',
      '  build: { required: true }',
      '  unit_test: { required: true }',
      '  e2e_test: { required: true }',
      '  package: { required: true }',
      '  deploy: { required: true }',
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/shared/ci-stack-command-matrix.yaml',
    [
      'version: 1.0.0',
      'stacks:',
      '  nextjs:',
      '    install: npm ci',
      '    lint: npm run lint',
      '    build: npm run build',
      '    unit_test: npm run test:unit',
      '    e2e_test: npm run test:e2e',
      '    package: npm pack',
      '    deploy: npm run deploy',
      '  python:',
      '    install: pip install -r requirements-dev.txt',
      '    lint: ruff check .',
      '    build: python -m build',
      '    unit_test: pytest -m "not e2e"',
      '    e2e_test: pytest -m "e2e or smoke"',
      '    package: python -m build',
      '    deploy: echo "configure deployment target"',
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/shared/workflows/ci-pr.yaml',
    [
      'inputs: { stack_key: "{{ stack_key }}", working_directory: "{{ working_directory }}" }',
      'slot_tokens: [install, lint, build, unit_test, e2e_test]',
      'steps:',
      '  - slot: install',
      '  - slot: lint',
      '  - slot: build',
      '  - slot: unit_test',
      '  - slot: e2e_test',
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/shared/workflows/ci-main.yaml',
    [
      'inputs: { stack_key: "{{ stack_key }}", working_directory: "{{ working_directory }}" }',
      'slot_tokens: [install, lint, build, unit_test, e2e_test]',
      'steps:',
      '  - slot: install',
      '  - slot: lint',
      '  - slot: build',
      '  - slot: unit_test',
      '  - slot: e2e_test',
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/shared/workflows/cd-release.yaml',
    [
      'inputs: { stack_key: "{{ stack_key }}", working_directory: "{{ working_directory }}", artifact_name: "{{ artifact_name }}" }',
      'slot_tokens: [package]',
      'steps:',
      '  - slot: package',
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/shared/workflows/cd-deploy.yaml',
    [
      'inputs:',
      '  stack_key: "{{ stack_key }}"',
      '  working_directory: "{{ working_directory }}"',
      '  artifact_name: "{{ artifact_name }}"',
      '  deploy_environment: "{{ deploy_environment }}"',
      '  secrets_namespace: "{{ secrets_namespace }}"',
      'slot_tokens: [package, deploy]',
      'required_placeholders: [artifact_name, deploy_environment, secrets_namespace]',
      'steps:',
      '  - slot: package',
      '  - slot: deploy',
    ].join('\n')
  );
}

test('validateStackCoverage fails when catalog stack is not mapped', () => {
  const errors = validateStackCoverage(
    {
      frontend: [
        { key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' },
      ],
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      frontend_stack_mapping: {},
      backend_stack_mapping: { python: ['CAP-OPS-001'] },
    },
    'Templates/shared/stack-catalog.yaml',
    'Templates/shared/capability-parity-matrix.yaml'
  );

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /Missing frontend stack mapping/);
});

test('validateTemplateCapabilities fails when template misses mapped capability', () => {
  const rootDir = createTempRepo();
  writeYaml(
    rootDir,
    'Templates/frontend-nextjs/template-spec.yaml',
    ['required_capabilities:', '  - CAP-FF-001'].join('\n')
  );

  const errors = validateTemplateCapabilities(
    rootDir,
    {
      frontend: [
        { key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' },
      ],
    },
    {
      required_capabilities: [{ id: 'CAP-FF-001' }, { id: 'CAP-FF-002' }],
      frontend_stack_mapping: {
        nextjs: ['CAP-FF-001', 'CAP-FF-002'],
      },
    }
  );

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /missing mapped capabilities/i);
});

test('validateCiCommandContract fails when required slot is missing', () => {
  const errors = validateCiCommandContract(
    {
      slots: {
        install: { required: true },
        lint: { required: true },
        build: { required: true },
      },
    },
    'Templates/shared/ci-command-contract.yaml'
  );

  assert.ok(errors.some((error) => /Missing required CI command slot 'unit_test'/.test(error.message)));
});

test('validateCiCommandContract fails when slots is not an object and required flag is false', () => {
  const malformedErrors = validateCiCommandContract(
    {
      slots: undefined,
    },
    'Templates/shared/ci-command-contract.yaml'
  );

  assert.ok(
    malformedErrors.some((error) =>
      /must define a slots object/.test(error.message)
    )
  );

  const requiredFlagErrors = validateCiCommandContract(
    {
      slots: {
        install: { required: false },
        lint: { required: true },
        build: { required: true },
        unit_test: { required: true },
        e2e_test: { required: true },
        package: { required: true },
        deploy: { required: true },
      },
    },
    'Templates/shared/ci-command-contract.yaml'
  );

  assert.ok(
    requiredFlagErrors.some((error) =>
      /Slot 'install' must declare required: true/.test(error.message)
    )
  );
});

test('validateCiStackCommandMatrix fails for unknown stack key and missing required slot command', () => {
  const errors = validateCiStackCommandMatrix(
    {
      frontend: [
        { key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' },
      ],
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      stacks: {
        nextjs: {
          install: 'npm ci',
          lint: 'npm run lint',
          build: 'npm run build',
          unit_test: 'npm run test:unit',
          e2e_test: 'npm run test:e2e',
          package: 'npm pack',
        },
        unknown_stack: {
          install: 'echo x',
          lint: 'echo x',
          build: 'echo x',
          unit_test: 'echo x',
          e2e_test: 'echo x',
          package: 'echo x',
          deploy: 'echo x',
        },
      },
    },
    ['install', 'lint', 'build', 'unit_test', 'e2e_test', 'package', 'deploy'],
    'Templates/shared/stack-catalog.yaml',
    'Templates/shared/ci-stack-command-matrix.yaml'
  );

  assert.ok(errors.some((error) => /Unknown stack key 'unknown_stack'/.test(error.message)));
  assert.ok(errors.some((error) => /missing command for slot 'deploy'/.test(error.message)));
});

test('validateCiStackCommandMatrix fails when catalog stack has no mapping object', () => {
  const errors = validateCiStackCommandMatrix(
    {
      frontend: [
        { key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' },
      ],
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      stacks: {
        nextjs: {
          install: 'npm ci',
          lint: 'npm run lint',
          build: 'npm run build',
          unit_test: 'npm run test:unit',
          e2e_test: 'npm run test:e2e',
          package: 'npm pack',
          deploy: 'npm run deploy',
        },
      },
    },
    ['install', 'lint', 'build', 'unit_test', 'e2e_test', 'package', 'deploy'],
    'Templates/shared/stack-catalog.yaml',
    'Templates/shared/ci-stack-command-matrix.yaml'
  );

  assert.ok(
    errors.some((error) =>
      /Missing command mapping for stack 'python'/.test(error.message)
    )
  );
});

test('validateWorkflowTemplates fails when required workflow file is missing', () => {
  const rootDir = createTempRepo();
  writeCommonParityFixtures(rootDir);
  writeCommonCiFixtures(rootDir);

  const errors = validateWorkflowTemplates(
    rootDir,
    {
      frontend: [
        { key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' },
      ],
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      stacks: {
        nextjs: {
          install: 'npm ci',
          lint: 'npm run lint',
          build: 'npm run build',
          unit_test: 'npm run test:unit',
          e2e_test: 'npm run test:e2e',
          package: 'npm pack',
          deploy: 'npm run deploy',
        },
        python: {
          install: 'pip install -r requirements-dev.txt',
          lint: 'ruff check .',
          build: 'python -m build',
          unit_test: 'pytest -m "not e2e"',
          e2e_test: 'pytest -m "e2e or smoke"',
          package: 'python -m build',
          deploy: 'echo "configure deployment target"',
        },
      },
    },
    new Set(['install', 'lint', 'build', 'unit_test', 'e2e_test', 'package', 'deploy'])
  );

  assert.equal(errors.length, 0);

  // Remove one required workflow and verify it is reported.
  rmSync(path.join(rootDir, 'Templates/shared/workflows/cd-deploy.yaml'));
  const missingFileErrors = validateWorkflowTemplates(
    rootDir,
    {
      frontend: [
        { key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' },
      ],
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      stacks: {
        nextjs: {
          install: 'npm ci',
          lint: 'npm run lint',
          build: 'npm run build',
          unit_test: 'npm run test:unit',
          e2e_test: 'npm run test:e2e',
          package: 'npm pack',
          deploy: 'npm run deploy',
        },
        python: {
          install: 'pip install -r requirements-dev.txt',
          lint: 'ruff check .',
          build: 'python -m build',
          unit_test: 'pytest -m "not e2e"',
          e2e_test: 'pytest -m "e2e or smoke"',
          package: 'python -m build',
          deploy: 'echo "configure deployment target"',
        },
      },
    },
    new Set(['install', 'lint', 'build', 'unit_test', 'e2e_test', 'package', 'deploy'])
  );

  assert.ok(
    missingFileErrors.some((error) =>
      /Required workflow template file is missing/.test(error.message)
    )
  );
});

test('validateWorkflowTemplates fails for CI step order, unsupported slot token, and literal secret', () => {
  const rootDir = createTempRepo();
  writeCommonParityFixtures(rootDir);
  writeCommonCiFixtures(rootDir);

  writeYaml(
    rootDir,
    'Templates/shared/workflows/ci-pr.yaml',
    [
      'inputs: { stack_key: "{{ stack_key }}", working_directory: "{{ working_directory }}" }',
      'slot_tokens: [build, lint, install, unit_test, e2e_test, unsupported_slot]',
      'steps:',
      '  - slot: build',
      '  - slot: lint',
      '  - slot: install',
      '  - slot: unit_test',
      '  - slot: e2e_test',
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/shared/workflows/cd-deploy.yaml',
    [
      'inputs:',
      '  stack_key: "{{ stack_key }}"',
      '  working_directory: "{{ working_directory }}"',
      '  artifact_name: "{{ artifact_name }}"',
      'slot_tokens: [package, deploy]',
      'required_placeholders: [artifact_name, deploy_environment]',
      'steps:',
      '  - slot: package',
      '  - slot: deploy',
      'deploy_token: hardcodedtoken1234',
    ].join('\n')
  );

  const errors = validateWorkflowTemplates(
    rootDir,
    {
      frontend: [
        { key: 'nextjs', spec: 'Templates/frontend-nextjs/template-spec.yaml' },
      ],
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      stacks: {
        nextjs: {
          install: 'npm ci',
          lint: 'npm run lint',
          build: 'npm run build',
          unit_test: 'npm run test:unit',
          e2e_test: 'npm run test:e2e',
          package: 'npm pack',
          deploy: 'npm run deploy',
        },
        python: {
          install: 'pip install -r requirements-dev.txt',
          lint: 'ruff check .',
          build: 'python -m build',
          unit_test: 'pytest -m "not e2e"',
          e2e_test: 'pytest -m "e2e or smoke"',
          package: 'python -m build',
          deploy: 'echo "configure deployment target"',
        },
      },
    },
    new Set(['install', 'lint', 'build', 'unit_test', 'e2e_test', 'package', 'deploy'])
  );

  assert.ok(
    errors.some((error) =>
      /unsupported slot token 'unsupported_slot'/.test(error.message)
    )
  );
  assert.ok(
    errors.some((error) => /must follow install -> lint -> build/.test(error.message))
  );
  assert.ok(
    errors.some((error) =>
      /missing required placeholder 'secrets_namespace'/.test(error.message)
    )
  );
  assert.ok(
    errors.some((error) =>
      /include a literal secret value/.test(error.message)
    )
  );
});

test('validateTemplateTestingMetadata fails when backend e2e is browser-only', () => {
  const rootDir = createTempRepo();

  writeYaml(
    rootDir,
    'Templates/shared/stack-catalog.yaml',
    ['backend:', '  - key: python', '    spec: Templates/backend-python/template-spec.yaml'].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/backend-python/template-spec.yaml',
    [
      'required_capabilities: [CAP-OPS-001]',
      'ci_command_contract:',
      '  stack_key: python',
      '  slots:',
      '    unit_test: pytest -m "not e2e"',
      '    e2e_test: pytest -m "e2e or smoke"',
      'testing_starter:',
      '  unit:',
      '    slot: unit_test',
      '    command: pytest -m "not e2e"',
      '  e2e:',
      '    slot: e2e_test',
      '    command: pytest -m "e2e or smoke"',
      '    mode: browser',
      '    semantics: Browser checks only',
    ].join('\n')
  );

  const errors = validateTemplateTestingMetadata(
    rootDir,
    {
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      stacks: {
        python: {
          unit_test: 'pytest -m "not e2e"',
          e2e_test: 'pytest -m "e2e or smoke"',
        },
      },
    }
  );

  assert.ok(errors.some((error) => /cannot define browser-only E2E mode/.test(error.message)));
});

test('validateTemplateTestingMetadata fails when backend e2e semantics miss api smoke/integration keywords', () => {
  const rootDir = createTempRepo();

  writeYaml(
    rootDir,
    'Templates/shared/stack-catalog.yaml',
    ['backend:', '  - key: python', '    spec: Templates/backend-python/template-spec.yaml'].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/backend-python/template-spec.yaml',
    [
      'required_capabilities: [CAP-OPS-001]',
      'ci_command_contract:',
      '  stack_key: python',
      '  slots:',
      '    unit_test: pytest -m "not e2e"',
      '    e2e_test: pytest -m "e2e or smoke"',
      'testing_starter:',
      '  unit:',
      '    slot: unit_test',
      '    command: pytest -m "not e2e"',
      '  e2e:',
      '    slot: e2e_test',
      '    command: pytest -m "e2e or smoke"',
      '    mode: api',
      '    semantics: Endpoint checks only',
    ].join('\n')
  );

  const errors = validateTemplateTestingMetadata(
    rootDir,
    {
      backend: [
        { key: 'python', spec: 'Templates/backend-python/template-spec.yaml' },
      ],
    },
    {
      stacks: {
        python: {
          unit_test: 'pytest -m "not e2e"',
          e2e_test: 'pytest -m "e2e or smoke"',
        },
      },
    }
  );

  assert.ok(
    errors.some((error) =>
      /must mention API smoke\/integration behavior/.test(error.message)
    )
  );
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
          required: [
            'capability_id',
            'implementation_location',
            'verification_method',
          ],
          properties: {
            capability_id: { type: 'string' },
            implementation_location: { type: 'string', minLength: 1 },
            verification_method: {
              type: 'string',
              enum: [
                'unit_test',
                'integration_test',
                'e2e_test',
                'manual_check',
              ],
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

  const errors = validateParityEvidence(
    evidence,
    schema,
    'evidence.yaml',
    'schema.yaml'
  );

  assert.ok(
    errors.some((error) => /Schema validation failed/.test(error.message))
  );
  assert.ok(
    errors.some((error) => /Duplicate capability_id/.test(error.message))
  );
});

test('runValidation passes with minimal valid fixture', () => {
  const rootDir = createTempRepo();

  writeCommonParityFixtures(rootDir);
  writeCommonCiFixtures(rootDir);

  writeYaml(
    rootDir,
    'Templates/frontend-nextjs/template-spec.yaml',
    [
      'required_capabilities: [CAP-FF-001]',
      'ci_command_contract:',
      '  stack_key: nextjs',
      '  slots:',
      '    unit_test: npm run test:unit',
      '    e2e_test: npm run test:e2e',
      'testing_starter:',
      '  unit:',
      '    slot: unit_test',
      '    command: npm run test:unit',
      '  e2e:',
      '    slot: e2e_test',
      '    command: npm run test:e2e',
      '    mode: browser',
      '    semantics: Browser journey coverage',
    ].join('\n')
  );

  writeYaml(
    rootDir,
    'Templates/backend-python/template-spec.yaml',
    [
      'required_capabilities: [CAP-OPS-001]',
      'ci_command_contract:',
      '  stack_key: python',
      '  slots:',
      '    unit_test: pytest -m "not e2e"',
      '    e2e_test: pytest -m "e2e or smoke"',
      'testing_starter:',
      '  unit:',
      '    slot: unit_test',
      '    command: pytest -m "not e2e"',
      '  e2e:',
      '    slot: e2e_test',
      '    command: pytest -m "e2e or smoke"',
      '    mode: api',
      '    semantics: API smoke and integration coverage',
    ].join('\n')
  );

  const result = runValidation({ rootDir });
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});
