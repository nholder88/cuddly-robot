# cuddly-robot

A Repo of the custom Cursor or VS code Agents I have created.

## Agent Handoffs (Logical Flow)

Handoffs are defined in the YAML frontmatter (`handoffs:`) of each agent file. The diagram summarizes **outbound** handoffs between agents:

```mermaid
flowchart LR
  subgraph strategy [Strategy]
    ideaValidator[idea-validator]
  end
  subgraph design [Design]
    architect[architect-planner]
    pbiClarifier[pbi-clarifier]
    systemRev[system-reverse-engineer]
  end
  subgraph review [Review]
    codeReview[code-review-sentinel]
    assumptionRev[assumption-reviewer]
  end
  subgraph impl [Implementation]
    tsImpl[typescript-implementer]
  end
  subgraph test [Testing]
    backendTest[backend-unit-test-specialist]
    frontendTest[frontend-unit-test-specialist]
    uiTest[ui-test-specialist]
  end
  subgraph other [Deploy / Doc / DB]
    docker[docker-architect]
    doc[code-documenter]
  end

  ideaValidator -->|Plan architecture| architect
  ideaValidator -->|Write spec| pbiClarifier
  ideaValidator -->|Blind spots| assumptionRev

  architect -->|Review code| codeReview
  architect -->|Reverse engineer| systemRev
  architect -->|Containerize| docker

  pbiClarifier -->|Consult architect| architect
  pbiClarifier -->|Review spec| codeReview
  pbiClarifier -->|Understand codebase| systemRev

  assumptionRev -->|Clarify spec| pbiClarifier
  assumptionRev -->|Consult architect| architect
  assumptionRev -->|Understand codebase| systemRev

  systemRev -->|Review spec| codeReview
  systemRev -->|Plan reconstruction| architect
  systemRev -->|Analyze Docker| docker

  codeReview -->|Plan improvements| architect
  codeReview -->|Add E2E| uiTest
  codeReview -->|Add unit frontend| frontendTest
  codeReview -->|Add unit backend| backendTest

  tsImpl -->|Review code| codeReview
  tsImpl -->|Clarify spec| pbiClarifier
  tsImpl -->|Unit frontend| frontendTest
  tsImpl -->|Unit backend| backendTest
  tsImpl -->|Add docs| doc
  tsImpl -->|Plan architecture| architect

  docker -->|Review configs| codeReview
  docker -->|Reverse engineer| systemRev

  backendTest -->|Review tests| codeReview
  backendTest -->|Containerize| docker
  frontendTest -->|Review tests| codeReview
  frontendTest -->|E2E| uiTest
  uiTest -->|Review tests| codeReview
  uiTest -->|Unit tests| frontendTest

  doc -->|Review docs| codeReview
  doc -->|Check assumptions| assumptionRev
  doc -->|Add tests| frontendTest
```

SQL, MongoDB, Redis, and GraphQL specialists follow the same pattern (→ code-review-sentinel, backend-unit-test-specialist, docker-architect or ui-test-specialist).
