/**
 * DIRECT ORCHESTRATOR
 *
 * For simple queries that don't need reasoning.
 * Direct pass-through to final generation.
 * Backbone is injected at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { ToTPrompts, Backbone } from "../backbones";

// ============================================================================
// MINIMAL PROMPTS
// ============================================================================

const DIRECT_PROMPTS: ToTPrompts = {
  divergence: () => "",
  critique: () => "",
  synthesis: () => "",
  decomposition: () =>
    JSON.stringify({
      shouldDecompose: false,
      reasoning: "Direct mode",
      subProblems: [],
    }),
  aggregation: () =>
    JSON.stringify({ aggregatedSolution: "", childContributions: [] }),
  final: (query: string) => `
Answer the following question directly and concisely:

${query}

Be helpful and accurate.
`,
};

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const DirectOrchestrator: Orchestrator = {
  id: "direct",
  name: "Direct Response",
  description: "Simple direct answers without deep reasoning",

  classificationHint: `Use for simple, factual queries:
- Very short questions
- Simple greetings or casual chat
- Direct factual lookups
- Keywords: hi, hello, thanks, what time, simple questions`,

  totDecisionHint: `NEVER use ToT for direct responses. These are simple queries that need immediate answers.
- Always return needsToT: false
- Always return complexity: "simple"`,

  outputFormat: "auto",

  prompts: DIRECT_PROMPTS,

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
      DIRECT_PROMPTS
    );

    return {
      prompt: result.prompt,
      outputFormat: "auto",
      thinkingProcess: result.thinkingProcess,
      totProcess: result.totProcess,
    };
  },
};
