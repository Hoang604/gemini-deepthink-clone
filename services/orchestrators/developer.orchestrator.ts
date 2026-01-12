/**
 * DEVELOPER ORCHESTRATOR
 *
 * For technical users who want robust, production-ready code.
 * Outputs multiple file types (Python, C, SQL, TS, etc.)
 * Focus: Architecture, separation of concerns, maintainability.
 * Backbone is injected at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { ToTPrompts, Backbone } from "../backbones";

// ============================================================================
// DEVELOPER-FOCUSED PROMPTS (PRODUCTION-READY CODE)
// ============================================================================

const DEVELOPER_PROMPTS: ToTPrompts = {
  divergence: (query: string, context?: string) => `
You are a Principal Software Architect consulting for a senior developer.
They expect production-grade code with proper engineering principles.

${context ? `CONTEXT: ${context}` : ""}
TECHNICAL REQUEST: ${query}

Generate 3-5 architectural approaches. For each, consider:
- SOLID principles compliance
- Separation of concerns
- Loose coupling, high cohesion
- Testability and maintainability
- Performance and scalability
- Error handling strategy

Output format (JSON only):
[{"id": "h1", "title": "Architecture Name", "strategy": "Detailed technical approach with patterns...", "assumption": "Key architectural assumption..."}]
`,

  critique: (query: string, strategy: string, assumption: string) => `
Perform a senior code review on this architecture.

Technical Request: "${query}"
Proposed Architecture: "${strategy}"
Assumption: "${assumption}"

Analyze like a Staff Engineer reviewing a design doc:
1. **Coupling Analysis**: Are modules properly decoupled?
2. **Cohesion Check**: Does each module have a single responsibility?
3. **Abstraction Quality**: Are implementation details hidden behind interfaces?
4. **Extension Points**: Can this be extended without modification?
5. **Error Resilience**: How does this fail? Can it recover gracefully?
6. **Performance Bottlenecks**: Where will this slow down?

Output format (JSON only):
{
  "strengths": ["architectural strength 1", "architectural strength 2"],
  "validity_conditions": "Scenarios where this architecture excels",
  "invalidity_triggers": ["anti-pattern 1", "scaling issue 2"],
  "critical_flaws": "Summary of architectural concerns"
}
`,

  synthesis: (query: string, strategies: unknown[]) => `
Synthesize the optimal production architecture from these approaches.

Technical Request: "${query}"
Architectures & Reviews: ${JSON.stringify(strategies)}

Create a robust implementation plan that:
1. Maximizes separation of concerns
2. Defines clear interfaces between components
3. Follows language-specific best practices
4. Includes proper error handling and logging
5. Is testable at unit and integration levels

Output format (JSON only):
{
  "blueprint": "Complete architectural specification with component diagram, interfaces, data flow, error handling...",
  "objective": "What this system achieves and its quality attributes...",
  "tone": "Code style (e.g., 'enterprise-grade', 'lean and efficient')...",
  "safeguards": ["Input validation", "Error boundaries", "Logging", "Type safety"]
}
`,

  decomposition: (
    query: string,
    depth: number,
    maxDepth: number,
    force: boolean
  ) => `
Should this be decomposed into separate modules/components?

TECHNICAL REQUEST: "${query}"
Current Depth: ${depth}, Max Depth: ${maxDepth}

${
  force && depth === 0
    ? `
**FORCED MODE**: Break into architectural layers (e.g., Data layer, Business logic, API layer, UI).
`
    : `
**ENGINEERING RULES**:
- Decompose if there are distinct bounded contexts
- Decompose if separation would improve testability
- Decompose if components have different change frequencies
- Do NOT decompose if modules share too much state
- Do NOT decompose if it adds unnecessary complexity
`
}

Output format (JSON only):
{
  "shouldDecompose": boolean,
  "reasoning": "Architectural justification",
  "subProblems": [
    {"id": "sp1", "title": "Module name", "query": "Module responsibility with technical constraints"}
  ]
}
`,

  aggregation: (
    query: string,
    childSolutions: { query: string; solution: string }[]
  ) => `
Integrate these modules into a cohesive system.

ORIGINAL REQUEST: "${query}"

MODULES:
${childSolutions
  .map(
    (c, i) => `
### Module ${i + 1}: ${c.query}
${c.solution}
`
  )
  .join("\n---\n")}

Integration Requirements:
1. Define clear interfaces between modules
2. Specify dependency injection points
3. Document data contracts
4. Ensure consistent error handling
5. Maintain loose coupling

Output format (JSON only):
{
  "aggregatedSolution": "Complete system integration specification with interfaces, contracts, and wiring...",
  "childContributions": ["Each module's role in the system"]
}
`,

  final: (query: string, blueprint?: string) => `
${
  blueprint
    ? `## Architecture Blueprint
${blueprint}

---
`
    : ""
}
## Technical Request
${query}

## OUTPUT REQUIREMENTS

You are writing code for a SENIOR DEVELOPER. They expect:
- Production-ready quality
- Proper error handling
- Clean architecture
- Type safety
- Separation of concerns

You MAY output MULTIPLE files of DIFFERENT types. Use this format for EACH file:

\`\`\`
<<TYPE title="filename.ext">>
// Your code here
<<END>>
\`\`\`

Where TYPE can be: TSX, TS, PYTHON, SQL, C, JS, HTML

## ENGINEERING STANDARDS

1. **Architecture First**
   - Clear separation between layers (data, logic, presentation)
   - Interfaces/protocols between modules
   - Dependency injection where appropriate

2. **Code Quality**
   - Self-documenting code with clear naming
   - Comprehensive type annotations
   - Meaningful comments for complex logic
   - No magic numbers - use named constants

3. **Error Handling**
   - Graceful degradation
   - Informative error messages
   - Proper exception hierarchies

4. **Best Practices**
   - Python: Follow PEP 8, use type hints, dataclasses
   - TypeScript: Strict mode, proper types (no any)
   - SQL: Parameterized queries, proper indexing hints
   - C: Memory safety, bounds checking

5. **Testing Hooks**
   - Code should be easily testable
   - Pure functions where possible
   - Dependency injection for mocking

## FORBIDDEN
- "Instant noodle" code (quick and dirty)
- Copy-paste solutions without adaptation
- Ignoring edge cases
- Hardcoded values
- Global mutable state
- Tight coupling between modules

Deliver code worthy of a senior engineer's approval.
`,
};

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const DeveloperOrchestrator: Orchestrator = {
  id: "developer",
  name: "Developer Code Generator",
  description: "Produces robust, production-ready code for technical users",

  classificationHint: `Use for technical/developer users:
- Mentions specific languages (Python, C, SQL, TypeScript)
- Uses developer jargon (API, backend, database, schema)
- Asks about architecture, patterns, or best practices
- Requests multi-file or multi-language solutions
- Focus on HOW, not just WHAT
- Keywords: implement, code, script, algorithm, class, function, module, package`,

  totDecisionHint: `Use ToT for complex software engineering tasks:
- NEEDS ToT when: Multi-module architecture, multiple files/languages, complex algorithms, system integration
- SKIP ToT when: Single function implementation, simple bug fix, straightforward CRUD, basic script
- Key indicator: Does it require multiple components interacting?`,

  outputFormat: "auto",

  prompts: DEVELOPER_PROMPTS,

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
      DEVELOPER_PROMPTS
    );

    return {
      prompt: result.prompt,
      outputFormat: "auto",
      thinkingProcess: result.thinkingProcess,
      totProcess: result.totProcess,
    };
  },
};
