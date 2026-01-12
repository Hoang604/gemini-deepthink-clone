/**
 * ARCHITECT ORCHESTRATOR
 *
 * For open-ended architectural analysis and system design questions.
 * Does NOT output code - outputs design documents with diagrams, schemas, and constraints.
 * Backbone is injected at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { ToTPrompts, Backbone } from "../backbones";

// ============================================================================
// ARCHITECT-FOCUSED PROMPTS (DESIGN, NOT CODE)
// ============================================================================

const ARCHITECT_PROMPTS: ToTPrompts = {
  divergence: (query: string, context?: string) => `
You are a **Principal Systems Strategist**. You design constraints, not code.

${context ? `CONTEXT: ${context}` : ""}
ARCHITECTURAL QUESTION: ${query}

Generate 3-5 distinct architectural approaches. For each, analyze:

**Technical Lens:**
- What pattern does this follow? (Layered, Event-Driven, CQRS, etc.)
- What are the key abstractions/boundaries?
- Where are the integration seams?

**Trade-off Lens:**
- Coupling vs Cohesion trade-offs
- Consistency vs Availability trade-offs
- Simplicity vs Extensibility trade-offs

**Failure Lens:**
- What's the first thing that breaks at 100x scale?
- What happens during partial failures?
- How hard is this to undo if we're wrong?

Output format (JSON only):
[{"id": "h1", "title": "Architecture Name", "strategy": "Detailed approach with patterns, boundaries, data flow...", "assumption": "Key architectural assumption that makes this work..."}]
`,

  critique: (query: string, strategy: string, assumption: string) => `
Perform a rigorous Pre-Mortem analysis on this architecture.

Question: "${query}"
Proposed Architecture: "${strategy}"
Key Assumption: "${assumption}"

**Run these mental simulations:**

1. **Gall's Law Test:** Is this the simplest possible design that could work? What can be removed?

2. **Scale Failure Simulation:** Load is 100x. Where's the first bottleneck? (DB locks, hot partitions, N+1 queries)

3. **Partial Failure Simulation:** One downstream service is down. Does the system degrade gracefully or cascade?

4. **Data Corruption Simulation:** A bug wrote invalid data yesterday. How do we detect and recover?

5. **Reversibility Check:** If this design is wrong, how hard is it to undo? What's the rollback strategy?

6. **Complete Path Trace:** Can you name EVERY component from user action to user observation? Any "???" gaps?

Output format (JSON only):
{
  "strengths": ["architectural strength 1", "architectural strength 2"],
  "validity_conditions": "Scenarios where this architecture excels",
  "invalidity_triggers": ["failure mode 1", "scaling bottleneck 2"],
  "critical_flaws": "Summary of architectural risks"
}
`,

  synthesis: (query: string, strategies: unknown[]) => `
Synthesize the optimal architecture from these analyzed approaches.

Question: "${query}"
Approaches & Pre-Mortems: ${JSON.stringify(strategies)}

Create a unified design that:
1. **Follows Gall's Law:** Simplest working solution
2. **Defines clear boundaries:** Components interact via contracts, not implementations
3. **Handles failure gracefully:** Documented degradation paths
4. **Is reversible:** Easy to undo if wrong
5. **Is testable:** Explicit dependency injection seams

Output format (JSON only):
{
  "blueprint": "Complete architectural specification with component boundaries, data flow, integration seams, failure modes...",
  "objective": "What this architecture achieves and its quality attributes...",
  "tone": "Design philosophy (e.g., 'simplicity-first', 'resilience-focused')...",
  "safeguards": ["Invariant 1", "Failure recovery for X", "Rollback strategy for Y"]
}
`,

  decomposition: (
    query: string,
    depth: number,
    maxDepth: number,
    force: boolean
  ) => `
Should this architectural problem be decomposed into sub-problems?

QUESTION: "${query}"
Current Depth: ${depth}, Max Depth: ${maxDepth}

${
  force && depth === 0
    ? `
**FORCED MODE**: Break into architectural concerns (e.g., Data model, API design, Event flow, Security).
`
    : `
**RULES**:
- Decompose if there are distinct bounded contexts
- Decompose if different concerns need different trade-offs
- Do NOT decompose if it adds unnecessary complexity
`
}

Output format (JSON only):
{
  "shouldDecompose": boolean,
  "reasoning": "Why decompose or not",
  "subProblems": [
    {"id": "sp1", "title": "Concern name", "query": "What this concern addresses"}
  ]
}
`,

  aggregation: (
    query: string,
    childSolutions: { query: string; solution: string }[]
  ) => `
Integrate these architectural concerns into a unified design.

ORIGINAL QUESTION: "${query}"

CONCERNS:
${childSolutions
  .map(
    (c, i) => `
### Concern ${i + 1}: ${c.query}
${c.solution}
`
  )
  .join("\n---\n")}

Integrate into a cohesive architecture with clear boundaries and interfaces.

Output format (JSON only):
{
  "aggregatedSolution": "Complete unified architecture...",
  "childContributions": ["Each concern's role in the system"]
}
`,

  final: (query: string, blueprint?: string) => `
${
  blueprint
    ? `## Architectural Analysis
${blueprint}

---
`
    : ""
}
## Question
${query}

## OUTPUT REQUIREMENTS

You are a **Principal Systems Strategist**. You design constraints, NOT code.

**Output a comprehensive architectural analysis in Markdown with these sections:**

### 1. Executive Summary
One paragraph: What is the recommended approach and why?

### 2. The Problem Space
- What are we actually solving? (Restate the core challenge)
- What are the key Non-Functional Requirements (NFRs)?
- What is explicitly OUT OF SCOPE?

### 3. Architectural Decision
- **Recommended Pattern:** (Name the pattern: Event Sourcing, CQRS, Layered, etc.)
- **Key Abstractions:** What are the main components/boundaries?
- **Data Flow:** How does information move through the system?

### 4. Component Diagram
Use Mermaid to show the architecture:
<<MERMAID title="Component Diagram">>
graph TD
    A[Component A] --> B[Component B]
    B --> C[Component C]
<<END>>

### 5. Information Flow (Sequence)
Trace the complete path from user action to user observation:
<<MERMAID title="Information Flow">>
sequenceDiagram
    participant User
    participant ComponentA
    participant ComponentB
    User->>ComponentA: Action
    ComponentA->>ComponentB: Process
    ComponentB-->>User: Result
<<END>>

### 6. Data Model (if applicable)
Use Mermaid ER diagram or describe key entities and relationships.

### 7. Failure Modes & Mitigation
| Failure Scenario | Impact | Mitigation Strategy |
|-----------------|--------|---------------------|
| Service X down | ... | ... |

### 8. Trade-offs Acknowledged
What did we sacrifice and why?

### 9. Reversibility Assessment
How hard is this to undo if we're wrong?

---

## STRICT RULES

1. **NO CODE** - You output architecture, not implementation
2. **Mermaid diagrams are mandatory** - Visual communication is primary
3. **Name every component** - No "somehow" or "???" allowed
4. **Justify with Axioms** - Reference SOLID, DDD, Gall's Law where relevant
5. **Be opinionated** - Pick a direction, don't just list options
`,
};

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const ArchitectOrchestrator: Orchestrator = {
  id: "architect",
  name: "System Architect",
  description:
    "Designs system architecture with diagrams and constraints, no code output",

  classificationHint: `Use for architectural design and system analysis:
- "What's the right architecture for...", "How should I design...", "What pattern should I use..."
- Asks about trade-offs, scalability, system design
- Open-ended questions without specific language requirements
- Focus on structure, not implementation
- Keywords: architecture, design, pattern, trade-off, scalability, system, structure, approach`,

  totDecisionHint: `Use ToT for complex architectural analysis:
- NEEDS ToT when: Multiple bounded contexts, distributed systems, major trade-off decisions, greenfield design
- SKIP ToT when: Single pattern selection, simple component design, straightforward refactoring advice
- Key indicator: Are there multiple valid approaches with significant trade-offs?`,

  outputFormat: "markdown",

  prompts: ARCHITECT_PROMPTS,

  execute: async (
    query: string,
    _context: OrchestratorContext,
    backbone: Backbone
  ): Promise<OrchestratorResult> => {
    const result = await backbone.execute(
      query,
      {
        config: _context.config,
        onThinkingUpdate: _context.onThinkingUpdate,
        onToTUpdate: _context.onToTUpdate,
        onUsage: _context.onUsage,
      },
      ARCHITECT_PROMPTS
    );

    return {
      prompt: result.prompt,
      outputFormat: "markdown",
      thinkingProcess: result.thinkingProcess,
      totProcess: result.totProcess,
    };
  },
};
