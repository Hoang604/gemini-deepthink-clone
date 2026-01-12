/**
 * ORCHESTRATOR REGISTRY
 *
 * Central registry for all orchestrators.
 * Uses LLM-based classification with self-describing orchestrators.
 *
 * Routing Logic:
 * - Deep Mode ON  → Always use ToT backbone
 * - Deep Mode OFF → API call decides if ToT is needed
 *
 * Backbone is injected into orchestrators at runtime.
 */

import { Orchestrator, OrchestratorContext, OrchestratorResult } from "./types";
import { DirectOrchestrator } from "./direct.orchestrator";
import { ConsumerOrchestrator } from "./consumer.orchestrator";
import { DeveloperOrchestrator } from "./developer.orchestrator";
import { ArchitectOrchestrator } from "./architect.orchestrator";
import { GeneralOrchestrator } from "./general.orchestrator";
import { SocialWriterOrchestrator } from "./social_writer.orchestrator";
import {
  classifyQuery,
  classifyNeedsToT,
  ClassificationResult,
  ToTNecessityResult,
} from "./classifier";
import {
  getBackbone,
  SynthesisBackbone,
  ToTBackbone,
  DirectBackbone,
} from "../backbones";

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * All registered orchestrators.
 * The classifier auto-adapts based on each orchestrator's classificationHint.
 */
const orchestrators: Orchestrator[] = [
  DirectOrchestrator,
  ConsumerOrchestrator,
  DeveloperOrchestrator,
  ArchitectOrchestrator,
  SocialWriterOrchestrator,
  GeneralOrchestrator,
];

/**
 * Map of orchestrator ID to implementation for O(1) lookup.
 */
const orchestratorMap: Record<string, Orchestrator> = Object.fromEntries(
  orchestrators.map((o) => [o.id, o])
);

// ============================================================================
// ROUTING
// ============================================================================

/**
 * Route a query to the most appropriate orchestrator.
 *
 * Logic:
 * 1. First, classify which persona (orchestrator) to use
 * 2. Then, use persona's totDecisionHint to decide if ToT is needed
 * 3. Execute with the selected backbone
 *
 * Backbone is injected into the orchestrator at execution time.
 */
export const routeToOrchestrator = async (
  query: string,
  context: OrchestratorContext
): Promise<OrchestratorResult> => {
  const isDeepModeForced = context.config.forceDeepMode;

  // STEP 1: Classify which orchestrator (persona) to use FIRST
  console.log("[Router] STEP 1: Classifying query for orchestrator...");
  const classification = await classifyQuery(query, orchestrators);

  console.log(
    `[Router] Orchestrator: ${classification.recommended} (${classification.reasoning})`
  );
  console.log(
    "[Router] Scores:",
    Object.entries(classification.scores)
      .map(([id, score]) => `${id}:${score.toFixed(2)}`)
      .join(", ")
  );

  // Track classification API call
  context.onUsage?.({ flash: 1, pro: 0 });

  // Get the orchestrator
  const orchestrator = orchestratorMap[classification.recommended];
  if (!orchestrator) {
    console.warn(
      `[Router] Unknown orchestrator: ${classification.recommended}, using general`
    );
    // Fallback to general orchestrator with Synthesis backbone
    return GeneralOrchestrator.execute(query, context, SynthesisBackbone);
  }

  // STEP 2: Determine which backbone to use (using persona's hint)
  let useToT = false;
  let totReasoning = "";

  if (isDeepModeForced) {
    // Deep Mode ON → Always use ToT
    useToT = true;
    totReasoning = "Deep Mode is enabled (forced)";
    console.log("[Router] STEP 2: Deep Mode ON → Using ToT backbone");
  } else {
    // Deep Mode OFF → Ask classifier using persona's hint
    console.log(
      `[Router] STEP 2: Checking if ToT needed (using ${orchestrator.id}'s hint)...`
    );
    context.onUsage?.({ flash: 1, pro: 0 }); // Track API call

    const totDecision = await classifyNeedsToT(
      query,
      orchestrator.totDecisionHint
    );
    useToT = totDecision.needsToT;
    totReasoning = totDecision.reasoning;

    console.log(
      `[Router] ToT Decision: ${useToT ? "YES" : "NO"} (${
        totDecision.complexity
      }) - ${totReasoning}`
    );
  }

  // Select backbone based on decision
  const backbone = useToT ? ToTBackbone : SynthesisBackbone;
  console.log(`[Router] Selected backbone: ${backbone.name}`);

  console.log(
    `[Router] STEP 3: Executing ${orchestrator.id} with ${backbone.name} backbone`
  );

  // STEP 3: Execute with injected backbone
  return orchestrator.execute(query, context, backbone);
};

/**
 * Get classification result without executing.
 */
export const getClassification = async (
  query: string
): Promise<ClassificationResult> => {
  return classifyQuery(query, orchestrators);
};

/**
 * Get ToT necessity result without executing.
 */
export const getToTNecessity = async (
  query: string
): Promise<ToTNecessityResult> => {
  return classifyNeedsToT(query);
};

/**
 * Get all registered orchestrators.
 */
export const getOrchestrators = (): Orchestrator[] => [...orchestrators];

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DirectOrchestrator,
  ConsumerOrchestrator,
  DeveloperOrchestrator,
  ArchitectOrchestrator,
  SocialWriterOrchestrator,
  GeneralOrchestrator,
};
export type {
  Orchestrator,
  OrchestratorContext,
  OrchestratorResult,
  OutputFormat,
} from "./types";
export type { ClassificationResult, ToTNecessityResult } from "./classifier";
