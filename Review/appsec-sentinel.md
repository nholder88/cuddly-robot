# appsec-sentinel

This file points to the **application security audit** agent for the AI Agent Workflows pack.

- **Agent definition:** [agents/appsec-sentinel.agent.md](../agents/appsec-sentinel.agent.md)
- **Workflow notes:** [Implementation/appsec-sentinel.md](../Implementation/appsec-sentinel.md)

The agent writes its primary output to the **audited project** (not necessarily this repo), typically:

- `Review/security-audit-report.md`, or
- `Review/security-audit-<ISO-date>.md`

It is designed to run **in parallel** with `code-review-sentinel` during orchestrator Stage 7; see [agents/orchestrator.agent.md](../agents/orchestrator.agent.md).
