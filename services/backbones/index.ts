/**
 * BACKBONES INDEX
 *
 * Central export for backbone frameworks.
 */

// Types
export type {
  SynthesisPrompts,
  ToTPrompts,
  BackboneContext,
  BackboneResult,
  ChildSolutionInput,
  BackboneType,
  BackboneExecutor,
  Backbone,
} from "./types";

// Backbone execution functions
export { runSynthesis } from "./synthesis.backbone";
export { runToT } from "./tot.backbone";

// ============================================================================
// BACKBONE INSTANCES
// ============================================================================

import {
  Backbone,
  BackboneContext,
  BackboneResult,
  SynthesisPrompts,
  ToTPrompts,
} from "./types";
import { runSynthesis } from "./synthesis.backbone";
import { runToT } from "./tot.backbone";

/**
 * Synthesis Backbone Instance.
 * Uses Diverge → Critique → Synthesize reasoning.
 */
export const SynthesisBackbone: Backbone = {
  type: "synthesis",
  name: "Synthesis",
  execute: async (
    query: string,
    context: BackboneContext,
    prompts: SynthesisPrompts | ToTPrompts
  ): Promise<BackboneResult> => {
    return runSynthesis(query, context, prompts as SynthesisPrompts, []);
  },
};

/**
 * ToT Backbone Instance.
 * Uses Decompose → Execute → Aggregate reasoning.
 */
export const ToTBackbone: Backbone = {
  type: "tot",
  name: "Tree-of-Thought",
  execute: async (
    query: string,
    context: BackboneContext,
    prompts: SynthesisPrompts | ToTPrompts
  ): Promise<BackboneResult> => {
    return runToT(
      query,
      context,
      prompts as ToTPrompts,
      context.config.maxToTDepth
    );
  },
};

/**
 * Direct Backbone Instance.
 * No reasoning - just passes through.
 */
export const DirectBackbone: Backbone = {
  type: "direct",
  name: "Direct",
  execute: async (
    query: string,
    _context: BackboneContext,
    prompts: SynthesisPrompts | ToTPrompts
  ): Promise<BackboneResult> => {
    return { prompt: prompts.final(query) };
  },
};

/**
 * Get backbone by type.
 */
export const getBackbone = (type: "synthesis" | "tot" | "direct"): Backbone => {
  switch (type) {
    case "tot":
      return ToTBackbone;
    case "synthesis":
      return SynthesisBackbone;
    case "direct":
      return DirectBackbone;
  }
};
