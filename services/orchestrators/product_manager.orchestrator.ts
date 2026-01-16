/**
 * PRODUCT MANAGER ORCHESTRATOR
 *
 * For defining product requirements, user stories, and roadmaps.
 * Focuses on value, feasibility, user needs, and prioritization.
 * Backbone is injected at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { ToTPrompts, Backbone } from "../backbones";

// ============================================================================
// PRODUCT MANAGEMENT PROMPTS
// ============================================================================

const PRODUCT_MANAGER_PROMPTS: ToTPrompts = {
  divergence: (query: string, context?: string) => `
You are a **Chief Product Officer (CPO)**. You define WHAT to build and WHY.

${context ? `CONTEXT: ${context}` : ""}
PRODUCT REQUEST: ${query}

Generate 3-5 distinct strategic directions for this product/feature. For each, define:
- **The Strategy:** (e.g., "Minimum Viable Product (MVP)", "Enterprise-Grade Scale", "User-Delight Focus")
- **The Value Prop:** Why customers will buy/use this.
- **The Target Audience:** Who this is specifically for.

Output format (JSON only):
[{"id": "h1", "title": "Strategy Name", "strategy": "Detailed approach...", "assumption": "Key market/user assumption..."}]
`,

  critique: (query: string, strategy: string, assumption: string) => `
Evaluate this product strategy using the **RICE Score framework** (Reach, Impact, Confidence, Effort).

Request: "${query}"
Strategy: "${strategy}"
Assumption: "${assumption}"

Critique based on:
1. **Market Fit:** Does anyone actually want this?
2. **Feasibility:** Can engineering build this in a reasonable time?
3. **Business Viability:** Does this make money or drive growth?
4. **Risks:** Legal, operational, or reputational risks.

Output format (JSON only):
{
  "strengths": ["Market advantage", "User benefit"],
  "validity_conditions": "When this strategy wins",
  "invalidity_triggers": ["Market shifts", "Tech limitations"],
  "critical_flaws": "Why it might fail"
}
`,

  synthesis: (query: string, strategies: unknown[]) => `
Synthesize the ultimate **Product Requirements Document (PRD)**.

Request: "${query}"
Strategies & Critiques: ${JSON.stringify(strategies)}

Create a master PRD that:
1. Clearly defines the Problem and Opportunity.
2. Specifies Success Metrics (KPIs).
3. Prioritizes the most high-impact features.

Output format (JSON only):
{
  "blueprint": "Detailed PRD with Problem, Goals, User Personas, Functional Requirements, and Non-Functional Requirements...",
  "objective": "Success definition...",
  "tone": "Professional & Directive...",
  "safeguards": ["Scope creep warnings", "Compliance requirements"]
}
`,

  decomposition: (
    query: string,
    depth: number,
    maxDepth: number,
    force: boolean
  ) => `
Should this product be broken down into Epics or Phases?

REQUEST: "${query}"
Current Depth: ${depth}, Max Depth: ${maxDepth}

${
  force && depth === 0
    ? `
**FORCED MODE**: Break into Launch Phases (e.g., Alpha, Beta, GA).
`
    : `
**RULES**:
- Decompose if it's a large system into Epics (e.g., "User Auth", "Payments", "Reporting").
- Decompose if it requires a phased rollout.
- Do NOT decompose a single feature request.
`
}

Output format (JSON only):
{
  "shouldDecompose": boolean,
  "reasoning": "Why decompose or not",
  "subProblems": [
    {"id": "sp1", "title": "Epic/Phase Name", "query": "Detailed requirements for this specific part"}
  ]
}
`,

  aggregation: (
    query: string,
    childSolutions: { query: string; solution: string }[]
  ) => `
Assemble these requirements into a cohesive **Product Roadmap**.

ORIGINAL REQUEST: "${query}"

EPICS/PHASES:
${childSolutions
  .map(
    (c, i) => `
### Item ${i + 1}: ${c.query}
${c.solution}
`
  )
  .join("\n---\n")}

Format as a structured roadmap with priorities.

Output format (JSON only):
{
  "aggregatedSolution": "The complete roadmap and integrated PRD...",
  "childContributions": ["Role of each epic"]
}
`,

  final: (query: string, blueprint?: string) => `
${
  blueprint
    ? `## Product Strategy
${blueprint}

---
`
    : ""
}
## Request
${query}

## OUTPUT REQUIREMENTS

You are a **Senior Product Manager**. Output a professional **Product Requirements Document (PRD)** in Markdown.

**Required Structure:**

### 1. Executive Summary
- **The "Why":** One sentence pitch.
- **Target Audience:** Primary and secondary personas.

### 2. Success Metrics (KPIs)
- What numbers move if we succeed? (e.g., Conversion Rate, Retention, ARR)

### 3. User Stories (The "What")
Use a table format:
| Priority | As a... | I want to... | So that... |
|----------|---------|--------------|------------|
| P0 | User | Login | I can access my data |

### 4. Acceptance Criteria
- Define "Done" for the critical path.

### 5. Out of Scope (The "No")
- Explicitly state what we are NOT building in V1 to prevent scope creep.

### 6. Go-to-Market Strategy
- Brief launch plan (Internal -> Beta -> Public).

**Tone:** Clear, concise, authoritative, and user-centric. No fluff.
`,
};

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const ProductManagerOrchestrator: Orchestrator = {
  id: "product_manager",
  name: "Product Manager",
  description:
    "Generates PRDs, user stories, and roadmaps for features or products.",

  classificationHint: `Use for product planning and requirements:
- "Create a PRD for...", "User stories for...", "Define requirements for..."
- "Product roadmap", "Feature specs", "Acceptance criteria"
- Focus on business value, metrics, and user needs (not code or design)
- Keywords: prd, product, requirements, user story, roadmap, feature, specs, scope, kpi`,

  totDecisionHint: `Use ToT for large, multi-faceted product launches:
- NEEDS ToT when: Defining a full MVP, complex platform with multiple user roles, phased rollout plans
- SKIP ToT when: Single feature spec, writing a few user stories, simple improvement
- Key indicator: Does the product need to be broken down into Epics or Phases?`,

  outputFormat: "markdown",

  prompts: PRODUCT_MANAGER_PROMPTS,

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
      PRODUCT_MANAGER_PROMPTS
    );

    return {
      prompt: result.prompt,
      outputFormat: "markdown",
      thinkingProcess: result.thinkingProcess,
      totProcess: result.totProcess,
    };
  },
};
