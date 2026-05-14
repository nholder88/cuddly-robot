import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAgents, categorizeAgent } from './agents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const agentsDir = path.join(repoRoot, 'agents');

describe('listAgents', () => {
  it('returns an entry for every *.agent.md in agents/', async () => {
    const agents = await listAgents(agentsDir);
    assert.ok(agents.length > 0, 'should find at least one agent');
    for (const a of agents) {
      assert.ok(a.filename.endsWith('.agent.md'), `filename should end with .agent.md: ${a.filename}`);
    }
  });

  it('parses name and description from frontmatter', async () => {
    const agents = await listAgents(agentsDir);
    const orchestrator = agents.find((a) => a.filename === 'orchestrator.agent.md');
    assert.ok(orchestrator, 'orchestrator.agent.md should be present');
    assert.equal(orchestrator.name, 'orchestrator');
    assert.ok(orchestrator.description.length > 0, 'description should be non-empty');
  });

  it('assigns a non-empty category to each agent', async () => {
    const agents = await listAgents(agentsDir);
    for (const a of agents) {
      assert.ok(a.category.length > 0, `category should be non-empty for ${a.filename}`);
    }
  });

  it('returns empty array when agentsDir does not exist', async () => {
    const result = await listAgents('/nonexistent/path/agents');
    assert.deepEqual(result, []);
  });

  it('returns empty array for a directory with no .agent.md files', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-test-'));
    try {
      await fs.writeFile(path.join(tmp, 'readme.md'), '# not an agent\n', 'utf8');
      const result = await listAgents(tmp);
      assert.deepEqual(result, []);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('categorizeAgent', () => {
  it('groups orchestrator files into Orchestration', () => {
    assert.equal(categorizeAgent('orchestrator.agent.md'), 'Orchestration');
    assert.equal(categorizeAgent('architect-planner.agent.md'), 'Orchestration');
  });

  it('groups implementer files into Implementers', () => {
    assert.equal(categorizeAgent('python-implementer.agent.md'), 'Implementers');
    assert.equal(categorizeAgent('csharp-implementer.agent.md'), 'Implementers');
  });

  it('groups specialist files into Specialists', () => {
    assert.equal(categorizeAgent('redis-specialist.agent.md'), 'Specialists');
    assert.equal(categorizeAgent('graphql-specialist.agent.md'), 'Specialists');
  });

  it('groups sentinel/clarifier files into Review & QA', () => {
    assert.equal(categorizeAgent('code-review-sentinel.agent.md'), 'Review & QA');
    assert.equal(categorizeAgent('pbi-clarifier.agent.md'), 'Review & QA');
  });

  it('falls back to Utilities for unmatched files', () => {
    assert.equal(categorizeAgent('idea-validator.agent.md'), 'Utilities');
  });
});
