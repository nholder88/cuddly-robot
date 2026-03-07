# Code Review Remediation Plan

## Scope
This plan addresses the code review issues found in the template baseline and agent workflow artifacts.

## Issues To Resolve
- Parity gate is defined but not enforced by an automated validator.
- Required parity output (`capability_id`, `implementation_location`, `verification_method`) has no canonical artifact format.
- Generic frontend baseline (`Templates/frontend-web/template-spec.yaml`) is framework-coupled to Next.js naming (`NEXT_PUBLIC_*`) and can conflict with stack-specific templates.
- Scaffold and documentation references do not provide a concrete, testable parity validation workflow.
- No CI guard currently prevents parity regressions when template files are changed.

## Assumptions
- Primary implementation language for tooling in this repo should be TypeScript/Node.js.
- Validation should fail fast in CI when parity mappings are incomplete or inconsistent.
- Existing stack keys in `Templates/shared/stack-catalog.yaml` are canonical and should remain stable.

## Task 1: Define Canonical Parity Evidence Contract

**Priority**: P0-Critical
**Estimated Complexity**: Small
**Dependencies**: None
**Component**: Shared Template Contracts

### Description
Define a single schema for parity evidence so every generated scaffold and review can produce machine-checkable parity output.

### Requirements
- [ ] Create a canonical contract document for parity evidence format.
- [ ] Include required fields: `capability_id`, `implementation_location`, `verification_method`.
- [ ] Specify accepted `verification_method` values (for example: unit_test, integration_test, e2e_test, manual_check).
- [ ] Document how one capability can map to multiple implementation locations.

### Technical Specification
- Files to create or modify:
  - `Templates/shared/parity-evidence-schema.yaml` (new)
  - `Templates/shared/capability-parity-matrix.yaml` (reference schema path)
- Data structures involved:
  - `parity_evidence` array with schema-validated objects.
- Integration points:
  - Used by scaffold generation and by parity validation script.

### Acceptance Criteria
- [ ] Schema file exists and is referenced by parity matrix.
- [ ] Schema covers all required output fields from parity gate.
- [ ] At least one valid and one invalid example is documented.

### Testing Requirements
- [ ] Unit tests covering: schema pass/fail examples.
- [ ] Integration tests covering: schema consumed by parity validator.
- [ ] Edge case tests: duplicate capability IDs, empty implementation location, unsupported verification method.
- [ ] All tests pass with no regressions

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task 2: Build Template Parity Validator CLI

**Priority**: P0-Critical
**Estimated Complexity**: Medium
**Dependencies**: 1
**Component**: Tooling and Validation

### Description
Implement a repository validator that checks all stack mappings and template capabilities against the parity matrix and schema.

### Requirements
- [ ] Validate that every stack in `stack-catalog.yaml` exists in parity mappings.
- [ ] Validate that each stack template includes all required capability IDs.
- [ ] Validate parity evidence objects against canonical schema.
- [ ] Output actionable file-level errors and non-zero exit code on failure.

### Technical Specification
- Files to create or modify:
  - `Templates/tools/validate-parity.ts` (new)
  - `Templates/tools/README.md` (new)
  - `package.json` (add script: `templates:validate-parity`)
- Functions/classes to implement:
  - `loadYaml(path)`
  - `validateStackCoverage()`
  - `validateTemplateCapabilities()`
  - `validateParityEvidence()`
  - `main()` with exit code handling.
- Integration points:
  - CI workflow and local pre-review execution.

### Acceptance Criteria
- [ ] Validator fails when a stack key is unmapped.
- [ ] Validator fails when a template is missing any required capability.
- [ ] Validator fails when parity evidence is malformed.
- [ ] Validator passes on current corrected baseline.

### Testing Requirements
- [ ] Unit tests covering: each validator function.
- [ ] Integration tests covering: full run against fixture templates.
- [ ] Edge case tests: unknown stack key, duplicate keys, missing template file.
- [ ] All tests pass with no regressions

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task 3: Normalize Generic Frontend Baseline

**Priority**: P1-High
**Estimated Complexity**: Medium
**Dependencies**: 1
**Component**: Frontend Template Baselines

### Description
Refactor `frontend-web` to be framework-agnostic so it does not imply Next.js-only env naming or route conventions.

### Requirements
- [ ] Replace framework-specific env keys with neutral keys in generic template.
- [ ] Add translation guidance from generic env keys to each frontend stack.
- [ ] Keep stack-specific details in Next.js/SvelteKit/Angular templates only.
- [ ] Preserve existing required capabilities and hooks.

### Technical Specification
- Files to create or modify:
  - `Templates/frontend-web/template-spec.yaml`
  - `Templates/frontend-web/.env.example`
  - `Templates/README.md` (explain generic vs stack-specific env mapping)
- Data structures involved:
  - `required_env` and optional `stack_env_aliases` map.

### Acceptance Criteria
- [ ] `frontend-web` no longer uses `NEXT_PUBLIC_*` keys directly as canonical generic keys.
- [ ] Documentation includes mapping examples for nextjs/sveltekit/angular.
- [ ] Stack-specific templates remain unchanged in behavior.

### Testing Requirements
- [ ] Unit tests covering: env alias mapping parser/validator (if added).
- [ ] Integration tests covering: scaffold resolves generic env to selected stack format.
- [ ] Edge case tests: missing alias for selected stack.
- [ ] All tests pass with no regressions

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task 4: Add Capability Implementation Map Artifact

**Priority**: P1-High
**Estimated Complexity**: Small
**Dependencies**: 1, 2
**Component**: Scaffold Output Contracts

### Description
Add a required scaffold output file that records parity evidence for each selected stack and capability.

### Requirements
- [ ] Define standard output path and filename for capability mapping.
- [ ] Ensure scaffold prompt requires generation of this artifact.
- [ ] Include one sample artifact in repository templates for reference.

### Technical Specification
- Files to create or modify:
  - `Templates/scaffold-prompt.md`
  - `Templates/shared/capability-evidence.example.yaml` (new)
  - `Templates/README.md`
- Data structures involved:
  - `parity_evidence` records aligned to schema from Task 1.

### Acceptance Criteria
- [ ] Scaffold prompt explicitly requires capability evidence artifact creation.
- [ ] Example artifact validates successfully with parity validator.
- [ ] README documents where this artifact lives in generated projects.

### Testing Requirements
- [ ] Unit tests covering: evidence file parser.
- [ ] Integration tests covering: example artifact validated in CI.
- [ ] Edge case tests: repeated capability IDs and empty verification method.
- [ ] All tests pass with no regressions

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task 5: Enforce Parity in CI and Review Gates

**Priority**: P0-Critical
**Estimated Complexity**: Medium
**Dependencies**: 2, 4
**Component**: Governance and Quality Gates

### Description
Integrate parity validation into CI and codify code-review gate behavior for template changes.

### Requirements
- [ ] Add CI workflow step to run parity validator.
- [ ] Fail PRs when template parity checks fail.
- [ ] Update orchestrator/review guidance to require parity pass evidence before completion.
- [ ] Document local command sequence for contributors.

### Technical Specification
- Files to create or modify:
  - `.github/workflows/templates-parity.yml` (new)
  - `Implementation/orchestrator.md`
  - `Review/code-review-sentinel.md`
  - `README.md`
- Integration points:
  - Pull request checks and stage gates.

### Acceptance Criteria
- [ ] CI runs on changes under `Templates/**`.
- [ ] CI output clearly identifies failing file and rule.
- [ ] Orchestrator and review docs mention parity gate as mandatory.

### Testing Requirements
- [ ] Unit tests covering: workflow command invocation script (if scripted wrapper exists).
- [ ] Integration tests covering: intentional parity break triggers CI failure.
- [ ] Edge case tests: docs-only changes skip heavy checks where appropriate.
- [ ] All tests pass with no regressions

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task 6: Backfill and Verify All Current Template Artifacts

**Priority**: P1-High
**Estimated Complexity**: Small
**Dependencies**: 2, 3, 4, 5
**Component**: Baseline Stabilization

### Description
Run validator and backfill any missing metadata in existing templates so baseline is green before next feature work.

### Requirements
- [ ] Validate all current frontend/backend stack templates.
- [ ] Fix any capability mismatches or missing evidence entries.
- [ ] Produce a short baseline verification report.

### Technical Specification
- Files to create or modify:
  - `Templates/reports/parity-baseline-verification.md` (new)
  - Any template files flagged by validator.
- Integration points:
  - Attach report to PR description for baseline-hardening change.

### Acceptance Criteria
- [ ] Validator passes for all supported stacks.
- [ ] Verification report includes timestamp, command, and pass summary.
- [ ] No unresolved parity warnings remain.

### Testing Requirements
- [ ] Unit tests covering: newly added normalization or mapping helpers.
- [ ] Integration tests covering: full repository parity validation run.
- [ ] Edge case tests: empty stack list and single-stack mode.
- [ ] All tests pass with no regressions

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Suggested Execution Order
1. Task 1
2. Task 2
3. Task 3 and Task 4 (parallel)
4. Task 5
5. Task 6
