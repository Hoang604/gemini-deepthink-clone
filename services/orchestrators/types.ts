/**
 * ORCHESTRATOR TYPE DEFINITIONS
 *
 * Shared interface for all orchestrators in the plugin system.
 * Each orchestrator must implement this interface.
 */

import {
  Message,
  ModelConfig,
  ThinkingProcess,
  ToTProcessState,
} from "../../types";
import { SynthesisPrompts, ToTPrompts, Backbone } from "../backbones/types";

// ============================================================================
// OUTPUT FORMAT
// ============================================================================

/**
 * Supported output formats.
 */
export type OutputFormat =
  | "tsx"
  | "typescript"
  | "python"
  | "latex"
  | "markdown"
  | "json"
  | "auto";

// ============================================================================
// CONTEXT & RESULT TYPES
// ============================================================================

/**
 * Context passed to orchestrators.
 */
export interface OrchestratorContext {
  /** Conversation history */
  readonly history: Message[];

  /** Model configuration */
  readonly config: ModelConfig;

  /** Callback for Diverge→Critique→Synthesize updates */
  onThinkingUpdate?: (process: ThinkingProcess) => void;

  /** Callback for Tree-of-Thought updates */
  onToTUpdate?: (state: ToTProcessState) => void;

  /** Callback for API usage tracking */
  onUsage?: (usage: { flash: number; pro: number }) => void;
}

/**
 * Result returned by orchestrators.
 */
export interface OrchestratorResult {
  /** The prompt to send for final generation */
  prompt: string;

  /** Output format determined by the orchestrator */
  outputFormat: OutputFormat;

  /** ThinkingProcess state (for Synthesis-based orchestrators) */
  thinkingProcess?: ThinkingProcess;

  /** ToTProcessState (for ToT-based orchestrators) */
  totProcess?: ToTProcessState;
}

// ============================================================================
// ORCHESTRATOR INTERFACE
// ============================================================================

/**
 * Base interface for all orchestrators.
 *
 * To create a new orchestrator:
 * 1. Create: `services/orchestrators/myDomain.orchestrator.ts`
 * 2. Define your prompts (implements SynthesisPrompts or ToTPrompts)
 * 3. Export an object implementing this interface
 * 4. Import and add to the orchestrators array in `registry.ts`
 *
 * The classifier auto-adapts based on your classificationHint.
 */
export interface Orchestrator {
  /** Unique identifier for routing */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Brief description */
  readonly description: string;

  /** Classification hint for the LLM classifier */
  readonly classificationHint: string;

  /** Output format this orchestrator produces */
  readonly outputFormat: OutputFormat;

  /**
   * Self-contained prompts for this orchestrator.
   * Either SynthesisPrompts (for Synthesis backbone) or ToTPrompts (for ToT backbone).
   */
  readonly prompts: SynthesisPrompts | ToTPrompts;

  /**
   * Execute the reasoning process.
   * Backbone is injected by the router, not hardcoded.
   *
   * @param query - User's query
   * @param context - Orchestrator context
   * @param backbone - The backbone to use for reasoning (injected by router)
   */
  execute(
    query: string,
    context: OrchestratorContext,
    backbone: Backbone
  ): Promise<OrchestratorResult>;
}
