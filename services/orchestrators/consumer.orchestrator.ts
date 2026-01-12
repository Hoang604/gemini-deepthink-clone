/**
 * CONSUMER ORCHESTRATOR
 *
 * For non-technical users who want instant, visual results.
 * STRICTLY outputs only ONE TSX file - no other code types allowed.
 * Backbone is injected at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { ToTPrompts, Backbone } from "../backbones";

// ============================================================================
// CONSUMER-FOCUSED PROMPTS (TSX ONLY)
// ============================================================================

const CONSUMER_PROMPTS: ToTPrompts = {
  divergence: (query: string, context?: string) => `
You are building a visual application for a non-technical user.
They want to SEE something working immediately.

${context ? `CONTEXT: ${context}` : ""}
REQUEST: ${query}

Generate 3-5 distinct UI design approaches. Focus on:
- Visual appeal and user delight
- Intuitive, self-explanatory interface
- Immediate value - user sees results right away
- Beautiful animations and modern aesthetics

Output format (JSON only):
[{"id": "h1", "title": "...", "strategy": "Visual design approach...", "assumption": "What the user needs to see..."}]
`,

  critique: (query: string, strategy: string, assumption: string) => `
Evaluate this UI design for a non-technical user.

User Request: "${query}"
Design Approach: "${strategy}"
Assumption: "${assumption}"

Critique from USER EXPERIENCE perspective:
1. Will they immediately understand how to use it?
2. Is it visually impressive at first glance?
3. Are there confusing elements?
4. Does it feel premium/polished?

Output format (JSON only):
{
  "strengths": ["UX strength 1", "UX strength 2"],
  "validity_conditions": "When this design shines",
  "invalidity_triggers": ["confusion point 1", "confusion point 2"],
  "critical_flaws": "Summary of UX concerns"
}
`,

  synthesis: (query: string, strategies: unknown[]) => `
Create the ultimate user-friendly design from these approaches.

User Request: "${query}"
Design Approaches & Critiques: ${JSON.stringify(strategies)}

Synthesize a design that:
1. Makes the user say "Wow!" immediately
2. Requires ZERO learning curve
3. Looks premium and modern
4. Delivers instant value

Output format (JSON only):
{
  "blueprint": "Complete visual design specification with layout, colors, animations, user flow...",
  "objective": "What the user will experience...",
  "tone": "Visual style (e.g., 'sleek and minimal', 'vibrant and playful')...",
  "safeguards": ["Loading states", "Empty states", "Error handling with friendly messages"]
}
`,

  decomposition: (
    query: string,
    depth: number,
    maxDepth: number,
    force: boolean
  ) => `
Should this UI be broken into visual sections?

REQUEST: "${query}"
Current Depth: ${depth}, Max Depth: ${maxDepth}

${
  force && depth === 0
    ? `
**FORCED MODE**: Break into 2-3 visual sections (header, main content, footer).
`
    : `
**RULES**:
- Decompose only if there are clearly distinct visual areas
- Keep it simple for the user - avoid over-complexity
- Do NOT decompose small apps or single-purpose views
`
}

Output format (JSON only):
{
  "shouldDecompose": boolean,
  "reasoning": "Why decompose or not",
  "subProblems": [
    {"id": "sp1", "title": "Section name", "query": "What this section shows"}
  ]
}
`,

  aggregation: (
    query: string,
    childSolutions: { query: string; solution: string }[]
  ) => `
Combine these UI sections into one beautiful interface.

ORIGINAL REQUEST: "${query}"

SECTIONS:
${childSolutions
  .map(
    (c, i) => `
### Section ${i + 1}: ${c.query}
${c.solution}
`
  )
  .join("\n---\n")}

Integrate into a cohesive, polished UI that feels like ONE app, not separate pieces.

Output format (JSON only):
{
  "aggregatedSolution": "How sections fit together visually...",
  "childContributions": ["What each section adds to the experience"]
}
`,

  final: (query: string, blueprint?: string) => `
${
  blueprint
    ? `## Design Blueprint
${blueprint}

---
`
    : ""
}
## User Request
${query}

## CRITICAL: OUTPUT FORMAT

You MUST output EXACTLY ONE TSX file. This is non-negotiable.

\`\`\`
<<TSX title="App.tsx">>
import React, { useState } from 'react';
// Your complete, self-contained React component
// ALL logic, types, and utilities MUST be inline
// Use Tailwind CSS for styling
// Use lucide-react for icons
// MUST export: export default function App() { ... }
<<END>>
\`\`\`

## STRICT RULES (VIOLATION = FAILURE)

1. **ONE TSX FILE ONLY** - You CANNOT output SQL, Python, JavaScript, or ANY other format
2. **Self-contained** - ALL types, interfaces, helpers MUST be inside the TSX file
3. **No external dependencies** except: 'react', 'lucide-react', 'recharts', 'framer-motion'
4. **No localStorage/API calls** - Use React state with realistic mock data
5. **No placeholders** - Everything must be fully implemented
6. **Premium design** - Modern gradients, micro-animations, professional polish
7. **Mobile-friendly** - Must look good on all screen sizes

If the user asks for a database, API, or backend - implement it as MOCK DATA inside the TSX.
If the user asks for login - implement a VISUAL login that switches views, no real auth.
Never explain why you're making these choices. Just deliver a beautiful, working app.
`,
};

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const ConsumerOrchestrator: Orchestrator = {
  id: "consumer",
  name: "Consumer App Builder",
  description: "Builds beautiful, instant-preview apps for non-technical users",

  classificationHint: `Use for non-technical users wanting visual results:
- "Build me a...", "Create a...", "Make me an app..."
- No mention of specific technologies, frameworks, or languages
- Wants to SEE something working (dashboard, tracker, portfolio)
- Casual language, not developer jargon
- Focus on WHAT, not HOW
- Keywords: app, tracker, dashboard, portfolio, website, simple`,

  totDecisionHint: `Use ToT only for complex multi-view consumer apps:
- NEEDS ToT when: Multiple distinct views/pages, complex state management, multi-step user flows
- SKIP ToT when: Single-page app, simple tracker, basic dashboard, portfolio page
- Most consumer requests are simple and should NOT use ToT`,

  outputFormat: "tsx",

  prompts: CONSUMER_PROMPTS,

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
      CONSUMER_PROMPTS
    );

    return {
      prompt: result.prompt,
      outputFormat: "tsx",
      thinkingProcess: result.thinkingProcess,
      totProcess: result.totProcess,
    };
  },
};
