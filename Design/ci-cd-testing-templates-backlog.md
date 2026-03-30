# CI/CD and Testing Templates Backlog (Stage 2)

This backlog covers all architecture components defined in `Design/ci-cd-testing-templates-architecture.md` and is ordered as a dependency-safe DAG.

## Task T1: Define Shared CI Command Contract

**Priority**: P0-Critical
**Estimated Complexity**: Small
**Dependencies**: None
**Component**: Shared Command Contract

### Description
Create a canonical command-slot contract that every supported stack must satisfy for CI/CD and testing execution.

### Requirements
- [ ] Add `templates/shared/ci-command-contract.yaml` with required command slots.
- [ ] Include slot definitions for `install`, `lint`, `build`, `unit_test`, `e2e_test`, `package`, and `deploy`.
- [ ] Document required vs optional semantics (all required for this feature baseline).

### Technical Specification
- Create file: `templates/shared/ci-command-contract.yaml`.
- Define top-level fields: `version`, `name`, `slots`.
- Keep schema simple and machine-parseable for future validator integration.
- Ensure slot names match architecture doc and downstream mapping tasks.

### Acceptance Criteria
- [ ] Contract file exists and is valid YAML.
- [ ] All seven command slots are present and marked required.
- [ ] Slot names are referenced consistently in later tasks without renaming.

### Testing Requirements
- [ ] Unit tests covering: YAML parse/load success for command contract file.
- [ ] Integration tests covering: contract file can be read by validator script path resolution.
- [ ] Edge case tests: missing slot key produces clear validation failure.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T2: Add Per-Stack Command Mapping Matrix

**Priority**: P0-Critical
**Estimated Complexity**: Medium
**Dependencies**: T1
**Component**: Stack Command Mapping Matrix

### Description
Define concrete CI/CD/test commands for each supported stack key while preserving the shared command-slot contract.

### Requirements
- [ ] Add `templates/shared/ci-stack-command-matrix.yaml`.
- [ ] Include mappings for frontend: `nextjs`, `sveltekit`, `angular`.
- [ ] Include mappings for backend: `node_nestjs`, `dotnet`, `python`, `go`, `java`, `rust`.
- [ ] Map every required command slot for every stack.

### Technical Specification
- Create file: `templates/shared/ci-stack-command-matrix.yaml`.
- Structure:
  - `version`
  - `stacks.<stack_key>.<slot_name>: <command>`
- Use stack keys from `templates/shared/stack-catalog.yaml`.
- Keep commands stack-native and runnable in fresh generated projects.

### Acceptance Criteria
- [ ] Matrix file exists and is valid YAML.
- [ ] Every catalog stack has an entry.
- [ ] Every stack entry maps all required command slots from T1.

### Testing Requirements
- [ ] Unit tests covering: parser/loader can read matrix and enumerate stack keys.
- [ ] Integration tests covering: matrix keys match stack catalog keys exactly.
- [ ] Edge case tests: unknown stack key and missing slot are reported as failures.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T3: Implement Reusable CI Workflow Templates

**Priority**: P0-Critical
**Estimated Complexity**: Medium
**Dependencies**: T1, T2
**Component**: Reusable Workflow Templates (CI)

### Description
Create shared CI action templates that consume stack mappings and execute install/lint/build/unit/E2E in a consistent sequence.

### Requirements
- [ ] Add reusable CI workflow template files under `templates/shared/workflows/`.
- [ ] Ensure workflow can be parameterized by stack key and working directory.
- [ ] Use command slots from the shared contract and stack matrix.
- [ ] Include concurrency and path-filter guidance to reduce CI cost.

### Technical Specification
- Create files:
  - `templates/shared/workflows/ci-pr.yaml`
  - `templates/shared/workflows/ci-main.yaml`
- Define template placeholders for `stack_key`, `working_directory`, and command expressions.
- Sequence steps in deterministic order: install -> lint -> build -> unit_test -> e2e_test.
- Emit artifacts/log grouping hooks for debugging.

### Acceptance Criteria
- [ ] CI templates exist and are syntactically valid YAML.
- [ ] Templates reference only command-slot names defined in T1.
- [ ] Templates can be resolved with any supported stack mapping from T2.

### Testing Requirements
- [ ] Unit tests covering: workflow YAML parse and expected step presence.
- [ ] Integration tests covering: sample stack resolution generates executable command steps.
- [ ] Edge case tests: missing stack mapping fails with actionable error.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T4: Implement Reusable CD and Deployment Templates

**Priority**: P0-Critical
**Estimated Complexity**: Medium
**Dependencies**: T1, T2, T3
**Component**: Reusable Workflow Templates (CD + Deployment)

### Description
Add shared CD templates that package artifacts and perform deployment-template steps with environment placeholders and approval gates.

### Requirements
- [ ] Add deployment-oriented workflow templates under `templates/shared/workflows/`.
- [ ] Include `package` and `deploy` contract slots.
- [ ] Include environment protection and approval gate placeholders.
- [ ] Avoid hardcoded secrets or provider-specific credentials.

### Technical Specification
- Create files:
  - `templates/shared/workflows/cd-release.yaml`
  - `templates/shared/workflows/cd-deploy.yaml`
- Add placeholders: `artifact_name`, `deploy_environment`, `secrets_namespace`.
- Provide guarded deploy stages that can be enabled downstream.
- Document minimum required secrets by name only.

### Acceptance Criteria
- [ ] CD templates exist and are valid YAML.
- [ ] Deploy templates include explicit approval/environment placeholders.
- [ ] Templates avoid plaintext secret values and include least-privilege guidance.

### Testing Requirements
- [ ] Unit tests covering: YAML parse and presence of package/deploy steps.
- [ ] Integration tests covering: end-to-end template resolution with at least one frontend and one backend stack.
- [ ] Edge case tests: missing deployment placeholders fail validation.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T5: Add Unit-Test Starter Templates Across Stack Specs

**Priority**: P1-High
**Estimated Complexity**: Medium
**Dependencies**: T2
**Component**: Unit-Test Templates

### Description
Update each stack template spec to define starter unit-test expectations and command wiring so generated projects can run unit tests immediately.

### Requirements
- [ ] Update all affected template specs to include unit-test starter template guidance.
- [ ] Ensure stack-native command references align with T2.
- [ ] Include minimum one sample unit test target per stack.

### Technical Specification
- Modify files:
  - `templates/frontend-nextjs/template-spec.yaml`
  - `templates/frontend-sveltekit/template-spec.yaml`
  - `templates/frontend-angular/template-spec.yaml`
  - `templates/backend-service/template-spec.yaml`
  - `templates/backend-dotnet/template-spec.yaml`
  - `templates/backend-python/template-spec.yaml`
  - `templates/backend-go/template-spec.yaml`
  - `templates/backend-java/template-spec.yaml`
  - `templates/backend-rust/template-spec.yaml`
- Add or extend testing sections with `unit_test` expectations.
- Keep compatibility with existing capability IDs and governance structure.

### Acceptance Criteria
- [ ] Every affected stack spec documents unit-test starter coverage.
- [ ] Unit-test command in each spec matches matrix command for the same stack.
- [ ] Generated-project instructions indicate unit tests are runnable on day one.

### Testing Requirements
- [ ] Unit tests covering: spec parser accepts new testing keys in all updated files.
- [ ] Integration tests covering: generated sample projects can execute unit test command.
- [ ] Edge case tests: mismatch between spec command and matrix command is detected.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T6: Add E2E Starter Templates (Frontend + Backend API Smoke/Integration)

**Priority**: P1-High
**Estimated Complexity**: Medium
**Dependencies**: T2, T5
**Component**: E2E Test Templates

### Description
Add stack-specific E2E starter definitions, including frontend browser E2E and backend API smoke/integration baselines.

### Requirements
- [ ] Define frontend E2E starter guidance for Next.js, SvelteKit, and Angular.
- [ ] Define backend API smoke/integration starter guidance for all backend stacks.
- [ ] Wire E2E command references to T2 matrix.

### Technical Specification
- Modify the same nine template spec files listed in T5.
- Add explicit E2E subsection split by frontend vs backend expectations.
- Backend E2E must explicitly indicate API smoke/integration semantics.
- Ensure no stack is left with an undefined `e2e_test` command path.

### Acceptance Criteria
- [ ] Frontend stacks include browser-style E2E starter guidance.
- [ ] Backend stacks include API smoke/integration starter guidance.
- [ ] E2E commands run through shared CI slot mapping without special-case branching.

### Testing Requirements
- [ ] Unit tests covering: spec files contain valid E2E testing keys.
- [ ] Integration tests covering: CI template resolution executes E2E slot for frontend and backend sample stacks.
- [ ] Edge case tests: backend E2E wrongly configured as browser-only is rejected.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T7: Extend Parity Validator for CI/CD and Testing Coverage

**Priority**: P0-Critical
**Estimated Complexity**: Medium
**Dependencies**: T1, T2, T3, T4, T5, T6
**Component**: Governance and Validation

### Description
Update repository parity tooling so CI/CD command contract completeness, workflow references, and testing template presence are enforceable gates.

### Requirements
- [ ] Extend validator logic to verify stack command matrix completeness.
- [ ] Validate required workflow template files are present.
- [ ] Validate each stack template spec includes unit and E2E starter metadata.
- [ ] Preserve existing behavior for capability parity checks.

### Technical Specification
- Modify files:
  - `templates/tools/validate-parity.ts`
  - `templates/tools/validate-parity.test.ts`
  - `templates/shared/capability-parity-matrix.yaml` (only if adding explicit CI/testing parity keys)
- Add non-breaking validation functions with actionable error messages.
- Ensure existing unstaged parity edits are not overwritten; merge carefully.

### Acceptance Criteria
- [ ] Validator fails when any stack is missing required command slots.
- [ ] Validator fails when required workflow templates are absent.
- [ ] Validator fails when unit/E2E metadata is missing from any stack spec.
- [ ] Existing capability parity checks continue passing for unchanged baseline data.

### Testing Requirements
- [ ] Unit tests covering: each new validation function success/failure paths.
- [ ] Integration tests covering: full validator run with sample compliant and non-compliant fixtures.
- [ ] Edge case tests: partial stack updates and unknown stack keys.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T8: Update Repository Documentation for Adoption and Validation

**Priority**: P2-Medium
**Estimated Complexity**: Small
**Dependencies**: T3, T4, T7
**Component**: Documentation and Adoption

### Description
Document how to use reusable CI/CD templates, command mappings, and testing templates so teams can adopt the feature without reverse engineering.

### Requirements
- [ ] Update root `README.md` with CI/CD + testing template overview.
- [ ] Update `templates/README.md` with command contract and workflow file references.
- [ ] Add guidance on running parity validator for CI/CD + testing checks.

### Technical Specification
- Modify files:
  - `README.md`
  - `templates/README.md`
- Include examples of stack mapping and validation commands.
- Keep docs aligned with actual file names introduced by T1 to T4.

### Acceptance Criteria
- [ ] Docs clearly explain where templates live and how they are consumed.
- [ ] Docs provide exact commands to run validation locally.
- [ ] Docs mention backend E2E definition as API smoke/integration tests.

### Testing Requirements
- [ ] Unit tests covering: N/A (documentation task).
- [ ] Integration tests covering: documented commands run successfully in repo context.
- [ ] Edge case tests: docs remain accurate after file path verification.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end

## Task T9: Traceability and Gate Verification for Stage 2 Exit

**Priority**: P1-High
**Estimated Complexity**: Small
**Dependencies**: T1, T2, T3, T4, T5, T6, T7, T8
**Component**: Governance and Validation

### Description
Produce a Stage 2 traceability note confirming each architecture component is covered by backlog execution evidence and each gate requirement is satisfied.

### Requirements
- [ ] Link each architecture component to completed tasks and artifacts.
- [ ] Confirm no circular dependencies and no uncovered components.
- [ ] Record Stage 2 gate pass/fail with rationale.

### Technical Specification
- Modify file: `agent-progress/pipeline-ci-cd-testing-templates.md`.
- Append Stage 2 status entry with artifact links.
- Include concise dependency DAG summary and residual risks.

### Acceptance Criteria
- [ ] Every architecture component has at least one completed task reference.
- [ ] Stage 2 gate status is explicit and justified.
- [ ] Residual risks and next stage recommendation are recorded.

### Testing Requirements
- [ ] Unit tests covering: N/A.
- [ ] Integration tests covering: referenced files exist and paths are valid.
- [ ] Edge case tests: missing artifact link is detected during review.
- [ ] All tests pass with no regressions.

### Completion Checklist
- [ ] Implementation complete per requirements
- [ ] All acceptance criteria met
- [ ] All testing requirements satisfied and tests passing
- [ ] Code review agent has reviewed and approved
- [ ] No linting errors or warnings
- [ ] Documentation updated if applicable
- [ ] Confirmed working end-to-end
