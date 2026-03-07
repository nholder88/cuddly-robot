# Template Scaffold Prompt

Use this prompt with `orchestrator` or `architect-planner` when starting a new project.

## Prompt

Create a new project using the template system in `Templates/`.

Inputs:
- Project name: [name]
- Domain: [domain]
- Frontend needed: [yes/no]
- Backend needed: [yes/no]
- Frontend stack: [nextjs/sveltekit/angular]
- Backend stack: [node_nestjs/dotnet/python/go/java/rust]
- Deployment target: [azure/aws/on-prem]
- Data stores: [postgres/redis/mongo/etc]

Requirements:
1. Treat `Templates/shared/platform-contracts.yaml` as source of truth.
2. Treat `Templates/shared/capability-parity-matrix.yaml` as non-negotiable parity gate.
3. Resolve selected stacks via `Templates/shared/stack-catalog.yaml`.
4. If frontend is needed, instantiate the selected frontend stack template.
5. If backend is needed, instantiate the selected backend stack template.
6. Apply stack-specific state management rules from the selected frontend template.
7. Map every required capability ID to concrete implementation files.
8. Keep feature flags, reporting endpoints, and admin dashboard hooks in the initial scaffold.
9. Generate a first-pass architecture doc, implementation backlog, and initial file tree.
10. Keep all handoffs lean using AC IDs and artifact pointers.

Expected output:
- Architecture doc
- Backlog tasks
- Initial directory structure
- Required env files
- Capability parity map (capability ID -> implementation location)
- First run instructions
