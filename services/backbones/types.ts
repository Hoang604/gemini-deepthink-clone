/**
 * BACKBONE TYPES
 *
 * Type definitions for reasoning backbones.
 * Backbones are reusable reasoning strategies that orchestrators can use.
 */

import { ModelConfig, ThinkingProcess, ToTProcessState } from "../../types";

// ============================================================================
// PROMPT INTERFACES
// ============================================================================

/**
 * Prompts required by the Synthesis backbone (Diverge → Critique → Synthesize).
 */
export interface SynthesisPrompts {
  /** Generate multiple strategic approaches */
  divergence: (query: string, context?: string) => string;

  /** Evaluate strengths and weaknesses of a strategy */
  critique: (query: string, strategy: string, assumption: string) => string;

  /** Combine strategies into a master blueprint */
  synthesis: (query: string, critiquedStrategies: unknown[]) => string;

  /** Format the final output */
  final: (query: string, blueprint?: string) => string;
}

/**
 * Prompts required by the ToT backbone (Decompose → Execute → Aggregate).
 */
export interface ToTPrompts extends SynthesisPrompts {
  /** Decide whether to decompose and extract sub-problems */
  decomposition: (
    query: string,
    depth: number,
    maxDepth: number,
    force: boolean
  ) => string;

  /** Combine child solutions into parent solution */
  aggregation: (query: string, childSolutions: ChildSolutionInput[]) => string;
}

/**
 * Child solution input for aggregation.
 */
export interface ChildSolutionInput {
  query: string;
  solution: string;
}

// ============================================================================
// BACKBONE CONTEXT & RESULT
// ============================================================================

/**
 * Context passed to backbone execution.
 */
export interface BackboneContext {
  /** Model configuration */
  config: ModelConfig;

  /** Callback for thinking updates (Synthesis) */
  onThinkingUpdate?: (process: ThinkingProcess) => void;

  /** Callback for ToT updates */
  onToTUpdate?: (state: ToTProcessState) => void;

  /** Callback for API usage tracking */
  onUsage?: (usage: { flash: number; pro: number }) => void;
}

/**
 * Result from backbone execution.
 */
export interface BackboneResult {
  /** The enriched prompt/blueprint for final generation */
  prompt: string;

  /** ThinkingProcess state (if Synthesis backbone was used) */
  thinkingProcess?: ThinkingProcess;

  /** ToTProcessState (if ToT backbone was used) */
  totProcess?: ToTProcessState;
}

// ============================================================================
// BACKBONE CONTRACT
// ============================================================================

/**
 * Available backbone types.
 */
export type BackboneType = "synthesis" | "tot" | "direct";

/**
 * Backbone execution function signature.
 * All backbones must conform to this contract.
 */
export type BackboneExecutor = (
  query: string,
  context: BackboneContext,
  prompts: SynthesisPrompts | ToTPrompts
) => Promise<BackboneResult>;

/**
 * Backbone definition.
 */
export interface Backbone {
  /** Backbone identifier */
  type: BackboneType;

  /** Human-readable name */
  name: string;

  /** Execute the backbone reasoning */
  execute: BackboneExecutor;
}
