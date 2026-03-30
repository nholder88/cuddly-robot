# CI/CD and Testing Templates PBI Clarification (Stage 3)

## 1. Summary
This feature adds shared CI/CD workflow templates, a canonical command-slot contract, per-stack command mappings, and stack-level unit plus E2E starter metadata so generated projects are executable and verifiable on day one. Primary users are template maintainers and downstream teams generating projects from `templates/`. Delivery includes governance enforcement through the existing parity validator and documentation updates that make adoption and validation paths explicit.

## 2. Assumptions Log
| # | Assumption | Status | Notes |
|---|-----------|--------|-------|
| A1 | Stage 1 decisions are final inputs for Stage 3 execution. | Confirmed | Captured in `Design/ci-cd-testing-templates-architecture.md`. |
| A2 | Canonical command slots are `install`, `lint`, `build`, `unit_test`, `e2e_test`, `package`, `deploy`. | Confirmed | Defined by backlog T1 and architecture contracts. |
| A3 | Stack keys are sourced from `templates/shared/stack-catalog.yaml` and include 3 frontend + 6 backend stacks. | Confirmed | Existing catalog file is present and parsed by validator tooling. |
| A4 | Existing unstaged edits in parity files remain intact during T7 changes. | Confirmed | Explicit risk constraint in context package. |
| A5 | Backend E2E baseline is API smoke/integration, not browser automation. | Confirmed | Stage 1 decision and Stage 2 ADR-004. |
| A6 | Validation entry points remain `npm run templates:test-parity` and `npm run templates:validate-parity`. | Confirmed | Existing scripts in `package.json`. |
| A7 | CI/CD templates stay template artifacts under `templates/shared/workflows/`, not live provider workflows under repo root. | Confirmed | Architecture and backlog scope. |

## 3. Open Questions
Functional:
1. None.

Technical:
1. None.

Scope:
1. None.

## 4. Functional Acceptance Criteria

### PBI-T1: Shared CI Command Contract (`T1`)
AC-1: Create canonical command-slot contract (happy path)
  Given the repository contains `templates/shared/`
  When a maintainer adds `templates/shared/ci-command-contract.yaml`
  Then the file parses as valid YAML
  And it defines `version`, `name`, and `slots`
  And `slots` contains `install`, `lint`, `build`, `unit_test`, `e2e_test`, `package`, and `deploy` with `required: true`.

AC-2: Missing slot handling (error path)
  Given a contract file missing any required slot
  When parity validation for CI contract rules runs
  Then validation fails
  And the error identifies the missing slot key.

AC-3: Duplicate or malformed slot keys (edge case)
  Given a contract file with duplicated semantic slot entries or non-object slot definitions
  When validation runs
  Then validation fails
  And the failure message includes the contract path and correction guidance.

### PBI-T2: Per-Stack Command Mapping Matrix (`T2`)
AC-1: Full matrix coverage (happy path)
  Given `templates/shared/stack-catalog.yaml` lists supported stacks
  When `templates/shared/ci-stack-command-matrix.yaml` is added
  Then every catalog stack key exists under `stacks`
  And each stack maps all seven required contract slots.

AC-2: Missing stack entry (error path)
  Given one catalog stack key has no matrix mapping
  When validation runs
  Then validation fails
  And the error identifies the unmapped stack key.

AC-3: Unknown stack key in matrix (edge case)
  Given matrix contains a stack key not present in catalog
  When validation runs
  Then validation fails
  And the error identifies the unknown key.

### PBI-T3: Reusable CI Workflow Templates (`T3`)
AC-1: CI template creation and sequencing (happy path)
  Given contract and matrix files exist
  When maintainers add `templates/shared/workflows/ci-pr.yaml` and `templates/shared/workflows/ci-main.yaml`
  Then both files parse as valid YAML
  And each template enforces step order `install -> lint -> build -> unit_test -> e2e_test`
  And each template accepts `stack_key` and `working_directory` inputs.

AC-2: Missing matrix lookup (error path)
  Given a template invocation references a stack without mapping
  When resolution validation runs
  Then validation fails
  And the error states that command resolution failed for the referenced stack and slot.

AC-3: Unsupported slot token in workflow (edge case)
  Given a workflow references a slot outside the canonical contract
  When validation runs
  Then validation fails
  And the error identifies the invalid slot token.

### PBI-T4: Reusable CD and Deployment Templates (`T4`)
AC-1: CD template creation (happy path)
  Given contract and matrix files exist
  When maintainers add `templates/shared/workflows/cd-release.yaml` and `templates/shared/workflows/cd-deploy.yaml`
  Then both files parse as valid YAML
  And both templates reference `package` and `deploy` slots
  And deploy templates expose placeholders for `artifact_name`, `deploy_environment`, and `secrets_namespace`.

AC-2: Missing deployment placeholders (error path)
  Given deploy templates omit required environment placeholders
  When validation runs
  Then validation fails
  And the error identifies missing placeholder keys.

AC-3: Plaintext secret value in template (edge case)
  Given a deploy template contains a literal secret value
  When validation and review checks run
  Then the change is rejected
  And guidance points to secret-name placeholder usage.

### PBI-T5: Unit-Test Starter Metadata in Stack Specs (`T5`)
AC-1: Unit starter metadata present for all stacks (happy path)
  Given nine stack template spec files under `templates/frontend-*` and `templates/backend-*`
  When unit-test starter metadata is added
  Then each stack spec includes unit-test starter coverage metadata
  And each unit command aligns with the matrix for that stack.

AC-2: Matrix/spec command mismatch (error path)
  Given a stack spec unit command diverges from the matrix command
  When validation runs
  Then validation fails
  And the error identifies the stack and conflicting command values.

AC-3: Missing unit metadata in one stack (edge case)
  Given one stack omits unit-test starter metadata
  When validation runs
  Then validation fails
  And the error points to that stack spec file.

### PBI-T6: E2E Starter Metadata in Stack Specs (`T6`)
AC-1: Frontend and backend E2E baselines (happy path)
  Given the nine stack template spec files
  When E2E starter metadata is added
  Then frontend stacks define browser E2E starter metadata
  And backend stacks define API smoke/integration E2E starter metadata
  And each stack maps the `e2e_test` slot to a runnable command.

AC-2: Missing `e2e_test` command mapping (error path)
  Given a stack lacks an `e2e_test` command path
  When validation runs
  Then validation fails
  And the error identifies the stack key and missing slot.

AC-3: Backend browser-only E2E definition (edge case)
  Given a backend stack marks E2E as browser-only without API smoke/integration semantics
  When validation runs
  Then validation fails
  And the error indicates backend E2E semantic mismatch.

### PBI-T7: Parity Validator Extension (`T7`)
AC-1: New validator gates pass for compliant fixtures (happy path)
  Given compliant contract, matrix, workflow templates, and stack specs
  When `npm run templates:test-parity` and `npm run templates:validate-parity` run
  Then both commands succeed
  And existing parity behavior remains intact.

AC-2: Missing workflow file (error path)
  Given one required workflow template file is absent
  When validator runs
  Then validation fails
  And the error identifies the missing workflow path.

AC-3: Partial stack update drift (edge case)
  Given only a subset of stacks include new testing metadata
  When validator runs
  Then validation fails
  And the output lists each non-compliant stack.

### PBI-T8: Documentation Update (`T8`)
AC-1: Adoption documentation coverage (happy path)
  Given root and templates documentation files
  When docs are updated
  Then `README.md` and `templates/README.md` describe command contract, matrix, workflow locations, and validation commands
  And docs include backend E2E API smoke/integration guidance.

AC-2: Broken command example (error path)
  Given docs contain a validation command that does not exist in `package.json`
  When review executes the documented command
  Then verification fails
  And documentation correction is required.

AC-3: Path drift in docs (edge case)
  Given docs reference an outdated file path
  When path verification runs during review
  Then the discrepancy is flagged
  And docs are corrected before merge.

### PBI-T9: Stage Exit Traceability (`T9`)
AC-1: Traceability entry completion (happy path)
  Given completed artifacts from T1-T8
  When Stage traceability is appended to `agent-progress/pipeline-ci-cd-testing-templates.md`
  Then each architecture component maps to one or more implementation artifacts
  And stage gate status is explicit with rationale.

AC-2: Missing artifact link (error path)
  Given traceability omits a required artifact reference
  When review checks links
  Then the stage record fails review
  And missing references are added.

AC-3: Dependency ordering mismatch (edge case)
  Given traceability implies execution order that violates T1-T9 dependencies
  When review validates the DAG summary
  Then the inconsistency is flagged
  And dependency notes are corrected.

## 5. Technical Acceptance Criteria

### PBI-T1 Technical AC
- Add `templates/shared/ci-command-contract.yaml` with top-level keys `version`, `name`, `slots`.
- Use slot names exactly as listed in Stage 2 backlog and architecture contracts.
- Ensure YAML parsing compatibility with existing `loadYaml` utility pattern in `templates/tools/validate-parity.ts`.

### PBI-T2 Technical AC
- Add `templates/shared/ci-stack-command-matrix.yaml` keyed by `stacks.<stack_key>.<slot>`.
- Stack keys match `templates/shared/stack-catalog.yaml` exactly.
- Command values are executable shell commands for clean generated projects.

### PBI-T3 Technical AC
- Add `templates/shared/workflows/ci-pr.yaml` and `templates/shared/workflows/ci-main.yaml`.
- Templates consume command-slot names from `ci-command-contract.yaml` only.
- Templates expose placeholders `stack_key` and `working_directory` and enforce deterministic step ordering.

### PBI-T4 Technical AC
- Add `templates/shared/workflows/cd-release.yaml` and `templates/shared/workflows/cd-deploy.yaml`.
- Templates consume `package` and `deploy` slots from matrix mappings.
- Deployment templates contain placeholder references only for secret names and environment gates.

### PBI-T5 Technical AC
- Modify nine template specs:
  - `templates/frontend-nextjs/template-spec.yaml`
  - `templates/frontend-sveltekit/template-spec.yaml`
  - `templates/frontend-angular/template-spec.yaml`
  - `templates/backend-service/template-spec.yaml`
  - `templates/backend-dotnet/template-spec.yaml`
  - `templates/backend-python/template-spec.yaml`
  - `templates/backend-go/template-spec.yaml`
  - `templates/backend-java/template-spec.yaml`
  - `templates/backend-rust/template-spec.yaml`
- Introduce normalized unit-test metadata keys with commands aligned to matrix entries.
- Keep existing `required_capabilities` structure intact to avoid parity regression.

### PBI-T6 Technical AC
- Extend the same nine template specs with normalized E2E metadata keys.
- Frontend metadata expresses browser E2E intent.
- Backend metadata expresses API smoke/integration intent and maps to `e2e_test` slot.

### PBI-T7 Technical AC
- Extend `templates/tools/validate-parity.ts` with non-breaking checks for:
  - CI contract completeness.
  - Stack command matrix completeness.
  - Required workflow template file presence.
  - Unit/E2E metadata presence per stack spec.
- Extend `templates/tools/validate-parity.test.ts` with pass/fail test cases for each new validator branch.
- Preserve current public behavior of `runValidation`, `main`, and existing parity checks.

### PBI-T8 Technical AC
- Update `README.md` with CI/CD + testing template overview and exact validation commands from `package.json`.
- Update `templates/README.md` with references to contract, matrix, and workflow template files.
- Verify all documented paths resolve in repository structure.

### PBI-T9 Technical AC
- Append Stage traceability entry to `agent-progress/pipeline-ci-cd-testing-templates.md`.
- Include artifact references for T1-T8 outputs and explicit gate verdict.
- Include residual risk note and next-stage recommendation.

## 6. Test Criteria
Unit tests:
- [ ] `loadYaml` reads new `ci-command-contract.yaml` and `ci-stack-command-matrix.yaml` fixtures.
- [ ] Validator branch tests cover missing slot, missing stack mapping, unknown stack key, missing workflow file, missing unit metadata, and missing E2E metadata.
- [ ] Validator branch test covers backend E2E semantic mismatch.

Integration tests:
- [ ] `npm run templates:test-parity` passes with a compliant fixture set spanning one frontend and one backend stack.
- [ ] `npm run templates:validate-parity` fails with actionable output on non-compliant fixture mutations.
- [ ] Documented validation commands in `README.md` and `templates/README.md` execute successfully from repo root.

E2E tests:
- [ ] Template resolution scenario demonstrates frontend `e2e_test` command execution path.
- [ ] Template resolution scenario demonstrates backend API smoke/integration `e2e_test` execution path.

Edge case tests:
- [ ] Duplicate slot definitions or malformed slot object in contract file fail validation.
- [ ] Partial stack metadata rollout fails and lists every non-compliant stack key.
- [ ] Unknown matrix stack key fails with explicit correction hint.

## 7. Implementation Steps
1. **Create contract file (`T1`)** — Add `templates/shared/ci-command-contract.yaml` with seven required slots. Acceptance: file parses and contains exact slot names.
2. **Create stack command matrix (`T2`)** — Add `templates/shared/ci-stack-command-matrix.yaml` with mappings for all stack catalog keys. Acceptance: every stack has all slots.
3. **Add CI templates (`T3`)** — Create `templates/shared/workflows/ci-pr.yaml` and `templates/shared/workflows/ci-main.yaml` with contract-driven step sequence. Acceptance: both files parse and reference only canonical slot names.
4. **Add CD templates (`T4`)** — Create `templates/shared/workflows/cd-release.yaml` and `templates/shared/workflows/cd-deploy.yaml` with package/deploy slots and deploy placeholders. Acceptance: placeholders exist and no literal secret values exist.
5. **Extend stack specs for unit metadata (`T5`)** — Update nine template-spec files with unit-test metadata and matrix-aligned commands. Acceptance: all nine specs include unit metadata and no command drift exists.
6. **Extend stack specs for E2E metadata (`T6`)** — Update the same nine template-spec files with frontend browser E2E and backend API smoke/integration metadata. Acceptance: all nine specs include valid E2E metadata and `e2e_test` command references.
7. **Extend validator logic (`T7`)** — Update `templates/tools/validate-parity.ts` with CI/CD and testing checks while preserving existing paths and error formatting style. Acceptance: validator fails correctly for each new non-compliance type.
8. **Extend validator tests (`T7`)** — Update `templates/tools/validate-parity.test.ts` with success/failure fixtures for new checks. Acceptance: `npm run templates:test-parity` passes.
9. **Update docs (`T8`)** — Update `README.md` and `templates/README.md` with new template locations, command contract usage, and validation commands. Acceptance: documented paths and commands match repository reality.
10. **Record traceability (`T9`)** — Append Stage execution evidence and gate decision to `agent-progress/pipeline-ci-cd-testing-templates.md`. Acceptance: every architecture component has a linked artifact and explicit gate result.

## 8. Out of Scope
- Cloud infrastructure provisioning.
- Live deployment credential management and secret rotation.
- Replacement of stack-native test frameworks.
- Runtime application feature implementation beyond template and validator artifacts.
- CI provider account setup in downstream repositories.
