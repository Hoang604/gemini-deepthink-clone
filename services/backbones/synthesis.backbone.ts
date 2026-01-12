/**
 * SYNTHESIS BACKBONE
 *
 * Reusable Diverge → Critique → Synthesize reasoning framework.
 * Orchestrators provide their own prompts; this provides the logic.
 */

import {
  ThinkingProcess,
  Strategy,
  MasterBlueprint,
  ExecutionStep,
  GeminiModel,
} from "../../types";
import { generateContent } from "../geminiService";
import { SynthesisPrompts, BackboneContext, BackboneResult } from "./types";

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 9);

const getCondensedHistory = (
  history: { role: string; text: string }[]
): string => {
  return history
    .slice(-4)
    .map((m) => `${m.role.toUpperCase()}: ${m.text.slice(0, 100)}...`)
    .join(" | ");
};

// ============================================================================
// BACKBONE EXECUTION
// ============================================================================

/**
 * Execute the Synthesis backbone with provided prompts.
 *
 * @param query - The user's query
 * @param context - Backbone execution context
 * @param prompts - Orchestrator-provided prompts
 * @param history - Optional conversation history for context
 * @param isToTMode - Whether this is being called from ToT backbone (limits explore paths to 3)
 */
export const runSynthesis = async (
  query: string,
  context: BackboneContext,
  prompts: SynthesisPrompts,
  history: { role: string; text: string }[] = [],
  isToTMode: boolean = false
): Promise<BackboneResult> => {
  const isPro = context.config.model === GeminiModel.PRO_3_PREVIEW;
  const usageIncrement = { flash: isPro ? 0 : 1, pro: isPro ? 1 : 0 };

  let processState: ThinkingProcess = {
    state: "diverging",
    logs: [],
    trace: [],
    hypotheses: [],
  };

  const updateState = (update: Partial<ThinkingProcess>) => {
    processState = { ...processState, ...update };
    context.onThinkingUpdate?.({ ...processState });
  };

  const addTraceStep = (step: ExecutionStep) => {
    processState = { ...processState, trace: [...processState.trace, step] };
    context.onThinkingUpdate?.({ ...processState });
  };

  const updateTraceStep = (id: string, update: Partial<ExecutionStep>) => {
    processState = {
      ...processState,
      trace: processState.trace.map((t) =>
        t.id === id ? { ...t, ...update } : t
      ),
    };
    context.onThinkingUpdate?.({ ...processState });
  };

  updateState({});

  try {
    // PHASE 1: DIVERGENCE
    const divStepId = generateId();
    addTraceStep({
      id: divStepId,
      phase: "Divergence",
      title: "Path Generation",
      status: "running",
    });
    context.onUsage?.(usageIncrement);

    const historyContext =
      history.length > 0 ? getCondensedHistory(history) : undefined;
    const divergencePrompt = prompts.divergence(query, historyContext);
    const divergenceResponse = await generateContent(
      context.config.model,
      divergencePrompt,
      true
    );

    let strategies: Strategy[] = [];
    try {
      strategies = JSON.parse(divergenceResponse.text || "[]");
    } catch {
      strategies = [
        {
          id: "default",
          title: "Standard Analysis",
          strategy: "Direct execution.",
          assumption: "Direct response",
        },
      ];
    }

    // Limit to maximum 3 explore paths ONLY when in ToT mode to reduce API calls
    if (isToTMode) {
      const MAX_EXPLORE_PATHS = 3;
      if (strategies.length > MAX_EXPLORE_PATHS) {
        strategies = strategies.slice(0, MAX_EXPLORE_PATHS);
      }
    }

    updateTraceStep(divStepId, {
      status: "complete",
      thoughts: `Explored ${strategies.length} strategic paths.`,
      result: strategies,
    });
    updateState({ state: "critiquing", hypotheses: strategies });

    // PHASE 2: ADVERSARIAL CRITIQUE
    const critiqueSingle = async (
      s: Strategy,
      stepId: string
    ): Promise<Strategy> => {
      context.onUsage?.(usageIncrement);
      const critiquePrompt = prompts.critique(query, s.strategy, s.assumption);
      const res = await generateContent(
        context.config.model,
        critiquePrompt,
        true
      );

      let critiqueResult = {
        invalidity_triggers: [] as string[],
        critical_flaws: "Evaluation failed.",
      };
      try {
        critiqueResult = JSON.parse(res.text || "{}");
      } catch {}

      updateTraceStep(stepId, {
        status: "complete",
        thoughts: critiqueResult.critical_flaws,
        result: critiqueResult,
      });
      return { ...s, critique: critiqueResult };
    };

    const strategiesWithSteps = strategies.map((s) => ({
      ...s,
      stepId: generateId(),
    }));
    strategiesWithSteps.forEach((s) =>
      addTraceStep({
        id: s.stepId,
        phase: "Critique",
        title: `Testing: ${s.title}`,
        status: "running",
      })
    );

    const critiquedStrategies = await Promise.all(
      strategiesWithSteps.map((s) => critiqueSingle(s, s.stepId))
    );
    updateState({ state: "synthesizing", hypotheses: critiquedStrategies });

    // PHASE 3: MASTER SYNTHESIS
    const synthStepId = generateId();
    addTraceStep({
      id: synthStepId,
      phase: "Synthesis",
      title: "Blueprint Synthesis",
      status: "running",
    });
    context.onUsage?.(usageIncrement);

    const synthesisPrompt = prompts.synthesis(query, critiquedStrategies);
    const synthesisResponse = await generateContent(
      context.config.model,
      synthesisPrompt,
      true
    );

    let masterBlueprint: MasterBlueprint = {
      blueprint: "Execute standard response.",
      objective: "Help user",
      tone: "professional",
      safeguards: [],
    };
    try {
      masterBlueprint = JSON.parse(synthesisResponse.text || "{}");
    } catch {}

    updateTraceStep(synthStepId, {
      status: "complete",
      thoughts: `Master Blueprint synthesized with ${masterBlueprint.safeguards.length} safeguards.`,
      result: masterBlueprint,
    });
    updateState({ masterBlueprint });

    // Build final prompt using orchestrator's final prompt template
    const finalPrompt = prompts.final(query, masterBlueprint.blueprint);

    return {
      prompt: finalPrompt,
      thinkingProcess: processState,
    };
  } catch (e) {
    console.error("Synthesis Backbone Error:", e);
    return { prompt: prompts.final(query), thinkingProcess: processState };
  }
};
