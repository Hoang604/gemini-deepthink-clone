/**
 * SOCIAL WRITER ORCHESTRATOR
 *
 * For creating high-engagement social media content.
 * Focuses on hooks, readability, viral structures, and platform-specific nuances.
 * Backbone is injected at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { ToTPrompts, Backbone } from "../backbones";

// ============================================================================
// SOCIAL MEDIA PROMPTS
// ============================================================================

const SOCIAL_WRITER_PROMPTS: ToTPrompts = {
  divergence: (query: string, context?: string) => `
You are a **Viral Content Strategist**. You don't just write text; you engineer attention.

${context ? `CONTEXT: ${context}` : ""}
CONTENT REQUEST: ${query}

Generate 3-5 distinct content angles/hooks. For each, define:
- **The Angle:** (e.g., Contrarian, Storytelling, Data-Driven, Vulnerable)
- **The Hook:** The exact first sentence that stops the scroll.
- **The Psychology:** Why will people click "See more"?

Output format (JSON only):
[{"id": "h1", "title": "Angle Name", "strategy": "Detailed structure...", "assumption": "Key psychological trigger..."}]
`,

  critique: (query: string, strategy: string, assumption: string) => `
Evaluate this content strategy for **maximum engagement**.

Request: "${query}"
Strategy: "${strategy}"
Trigger: "${assumption}"

Critique based on the "Scroll-Stop Algorithm":
1. **Hook Strength:** Is it boring? Is it too clickbaity?
2. **Readability:** Is it "wall of text" or skimmable?
3. **Virality:** Will people share this to look smart/funny/kind?
4. **Platform Fit:** Does it match the culture of the specific platform?

Output format (JSON only):
{
  "strengths": ["hook strength", "readability"],
  "validity_conditions": "Best platform/audience for this",
  "invalidity_triggers": ["cringe factor", "boredom risk"],
  "critical_flaws": "Why it might flop"
}
`,

  synthesis: (query: string, strategies: unknown[]) => `
Synthesize the ultimate high-performing content structure.

Request: "${query}"
Strategies & Critiques: ${JSON.stringify(strategies)}

Create a master content blueprint that:
1. combines the strongest hook with the most valuable body content.
2. optimizes for "Dwell Time" and "Shares".
3. includes a clear but non-salesy Call to Action (CTA).

Output format (JSON only):
{
  "blueprint": "Detailed outline of the post/thread structure...",
  "objective": "Engagement goal (e.g., viral reach vs conversion)...",
  "tone": "Voice (e.g., 'Punchy & Bold', 'Empathetic & Soft')...",
  "safeguards": ["Avoid engagement baiting", "Fact-check claims"]
}
`,

  decomposition: (
    query: string,
    depth: number,
    maxDepth: number,
    force: boolean
  ) => `
Should this content be broken down into multiple pieces?

REQUEST: "${query}"
Current Depth: ${depth}, Max Depth: ${maxDepth}

${
  force && depth === 0
    ? `
**FORCED MODE**: Break into a content series or multi-platform campaign.
`
    : `
**RULES**:
- Decompose if it's a "Twitter Thread" or "LinkedIn Carousel" (step-by-step).
- Decompose if it's a "30-day strategy" or "Campaign".
- Do NOT decompose a single tweet or caption.
`
}

Output format (JSON only):
{
  "shouldDecompose": boolean,
  "reasoning": "Why decompose or not",
  "subProblems": [
    {"id": "sp1", "title": "Post/Slide #", "query": "Content for this specific part"}
  ]
}
`,

  aggregation: (
    query: string,
    childSolutions: { query: string; solution: string }[]
  ) => `
Assemble these pieces into a cohesive social narrative.

ORIGINAL REQUEST: "${query}"

PIECES:
${childSolutions
  .map(
    (c, i) => `
### Piece ${i + 1}: ${c.query}
${c.solution}
`
  )
  .join("\n---\n")}

Format as a clean, ready-to-post sequence (e.g., Thread 1/X).

Output format (JSON only):
{
  "aggregatedSolution": "The complete thread/campaign...",
  "childContributions": ["Role of each post"]
}
`,

  final: (query: string, blueprint?: string) => `
${
  blueprint
    ? `## Content Strategy
${blueprint}

---
`
    : ""
}
## Request
${query}

## OUTPUT REQUIREMENTS

You are a **Social Media Ghostwriter** for top creators.
Write the ACTUAL CONTENT. No "Here is a draft".

**Formatting Rules:**
- **White Space:** Use single-sentence paragraphs often.
- **Visuals:** Use emojis tastefully (unless requested otherwise).
- **Punchy:** Cut fluff. Every word must earn its rent.
- **Formatting:** Use bolding for emphasis (if platform supports it) or caps.

**Structure:**
1. **The Hook:** The most important line.
2. **The Meat:** High value, skimmable points.
3. **The Payoff:** Why they read.
4. **The CTA:** What to do next.

If it's a Twitter Thread, number the tweets (1/X, 2/X).
If it's LinkedIn, use line breaks effectively.
If it's Instagram, include a visual description and hashtags.

Make it pop.
`,
};

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const SocialWriterOrchestrator: Orchestrator = {
  id: "social_writer",
  name: "Social Writer",
  description:
    "Writes viral, high-engagement content for Twitter, LinkedIn, etc.",

  classificationHint: `Use for social media content creation:
- "Write a tweet...", "LinkedIn post about...", "Twitter thread...", "Instagram caption..."
- "Make this viral", "Social media copy", "Engagement hooks"
- Keywords: twitter, linkedin, thread, viral, hook, copy, social, post, caption, hashtag`,

  totDecisionHint: `Use ToT for multi-part campaigns or long threads:
- NEEDS ToT when: Writing a 10-tweet thread, planning a launch week, creating a carousel structure
- SKIP ToT when: Single tweet, simple caption, rewriting a headline
- Key indicator: Does the content need structural planning beyond just writing sentences?`,

  outputFormat: "markdown",

  prompts: SOCIAL_WRITER_PROMPTS,

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
      SOCIAL_WRITER_PROMPTS
    );

    return {
      prompt: result.prompt,
      outputFormat: "markdown",
      thinkingProcess: result.thinkingProcess,
      totProcess: result.totProcess,
    };
  },
};
