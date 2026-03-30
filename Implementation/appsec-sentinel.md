# appsec-sentinel — implementation notes

Companion to [agents/appsec-sentinel.agent.md](../agents/appsec-sentinel.agent.md).

## Role

Application security audits: stack inventory, OWASP/STRIDE-oriented review, containers and deployment (Docker, Vercel, K8s, CI), cited CVE and advisory research, and a **persisted** markdown report under `Review/security-audit-report.md` (or dated variant) in the **audited application** workspace.

This agent **does not** replace Snyk, Veracode, Trivy, or Docker Scout; it recommends them and documents findings the scanners would complement.

## Parallel execution with code-review-sentinel

In the orchestrator pipeline, Stage 7 runs **7a** (`appsec-sentinel`) and **7b** (`code-review-sentinel`) **in parallel** on the same change set. The parent passes identical scope hints (changed files, branch/PR, conventions paths).

**Merge rule:** Stage 7 passes only when:

- **7b** meets the code-review gate (no Critical four-pillar issues, scores ≥ 4, parity validator when templates changed).
- **7a** has no unresolved **Critical** security findings (severity aligned with the audit report). High/Medium/Low flow to backlog unless policy says otherwise.

**Dedup:** When the same issue appears in both reviews, the AppSec report notes overlap with code-review where known.

## Handoffs

| Label | Target agent | Use when |
|-------|--------------|----------|
| Harden containers | `docker-architect` | Dockerfile/Compose/K8s findings |
| Fix application findings | `typescript-implementer` | Code-level fixes (or language-specific implementer) |
| Re-verify after fixes | `code-review-sentinel` | Post-fix quality gate |
| Plan security backlog | `architect-planner` | Many Critical/High items need sequencing |

## Report location

- Default: `Review/security-audit-report.md` in the project being audited.
- Ensure `Review/` exists or create it when writing the report.

## External sources

Every CVE or advisory claim in the report must include a **markdown link** (NVD, GitHub Advisory, vendor security bulletin, CWE, OWASP). Include the **date of research** in the methodology section.
