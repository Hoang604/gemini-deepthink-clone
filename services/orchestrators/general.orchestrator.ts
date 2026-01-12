/**
 * GENERAL ORCHESTRATOR
 *
 * For general explanations, analysis, and Q&A.
 * Outputs markdown with structured explanations.
 * Backbone is injected at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { ToTPrompts, Backbone } from "../backbones";

// ============================================================================
// GENERAL-PURPOSE PROMPTS
// ============================================================================

const GENERAL_PROMPTS: ToTPrompts = {
  divergence: (query: string, context?: string) => `
You are an expert analyst providing a comprehensive answer.

${context ? `CONTEXT: ${context}` : ""}
QUESTION: ${query}

Generate 3-5 distinct perspectives or approaches to answer this question:
- Consider different viewpoints
- Think about various interpretations
- Identify key factors to consider

Output format (JSON only):
[{"id": "h1", "title": "Perspective Name", "strategy": "Detailed approach...", "assumption": "Key assumption..."}]
`,

  critique: (query: string, strategy: string, assumption: string) => `
Evaluate this perspective.

Question: "${query}"
Perspective: "${strategy}"
Assumption: "${assumption}"

Analyze:
1. Strengths of this perspective
2. Potential blind spots
3. When this applies best
4. Potential limitations

Output format (JSON only):
{
  "strengths": ["strength 1", "strength 2"],
  "validity_conditions": "When this perspective is most valid",
  "invalidity_triggers": ["limitation 1", "limitation 2"],
  "critical_flaws": "Summary of concerns"
}
`,

  synthesis: (query: string, strategies: unknown[]) => `
Synthesize the best answer from these perspectives.

Question: "${query}"
Perspectives & Critiques: ${JSON.stringify(strategies)}

Create a comprehensive answer that:
1. Combines the strongest insights
2. Addresses limitations
3. Provides a balanced view

Output format (JSON only):
{
  "blueprint": "Complete answer outline...",
  "objective": "What this answer achieves...",
  "tone": "Style (e.g., 'educational', 'analytical')...",
  "safeguards": ["Important caveats"]
}
`,

  decomposition: (
    query: string,
    depth: number,
    maxDepth: number,
    force: boolean
  ) => `
Should this question be broken into sub-questions?

QUESTION: "${query}"
Current Depth: ${depth}, Max Depth: ${maxDepth}

${
  force && depth === 0
    ? `
**FORCED MODE**: Break into 2-3 sub-questions.
`
    : `
**RULES**:
- Decompose if there are distinct aspects to address
- Do NOT decompose simple questions
`
}

Output format (JSON only):
{
  "shouldDecompose": boolean,
  "reasoning": "Why decompose or not",
  "subProblems": [
    {"id": "sp1", "title": "Sub-topic", "query": "Sub-question"}
  ]
}
`,

  aggregation: (
    query: string,
    childSolutions: { query: string; solution: string }[]
  ) => `
Combine these sub-answers into a complete response.

ORIGINAL QUESTION: "${query}"

SUB-ANSWERS:
${childSolutions
  .map(
    (c, i) => `
### Part ${i + 1}: ${c.query}
${c.solution}
`
  )
  .join("\n---\n")}

Create a cohesive, unified answer.

Output format (JSON only):
{
  "aggregatedSolution": "Complete integrated answer...",
  "childContributions": ["What each part contributes"]
}
`,

  final: (query: string, blueprint?: string) => `
${
  blueprint
    ? `## Analysis
${blueprint}

---
`
    : ""
}
## Question
${query}

## OUTPUT REQUIREMENTS

Provide a comprehensive, well-structured answer in Markdown.

Use:
- Clear headings for sections
- Bullet points for lists
- Code blocks for any code (with language specified)
- Tables if comparing options
- Bold for key terms

Be thorough but concise. Focus on practical, actionable information.
`,
};

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const GeneralOrchestrator: Orchestrator = {
  id: "general",
  name: "General Assistant",
  description: "Handles explanations, analysis, and general Q&A",

  classificationHint: `Use for general questions and explanations:
- "Explain...", "What is...", "How does..."
- Asking for information or clarification
- Conceptual questions
- Not asking for code or visual apps
- Keywords: explain, describe, tell me, what, how, why`,

  outputFormat: "markdown",

  prompts: GENERAL_PROMPTS,

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
      GENERAL_PROMPTS
    );

    return {
      prompt: result.prompt,
      outputFormat: "markdown",
      thinkingProcess: result.thinkingProcess,
      totProcess: result.totProcess,
    };
  },
};
