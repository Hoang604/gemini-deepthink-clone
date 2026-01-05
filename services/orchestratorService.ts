import {
  Message,
  ModelConfig,
  GeminiModel,
  Strategy,
  ThinkingProcess,
  ExecutionStep,
  MasterBlueprint,
  ToTProcessState,
} from "../types";
import * as Prompts from "./prompts";
import { generateContent, createChatSession } from "./geminiService";
import { executeToT } from "./totOrchestrator";

const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Summarizes the master objective for model memory.
 */
const summarizeThinking = (process: ThinkingProcess): string => {
  const objective = process.masterBlueprint?.objective || "Standard response";
  return `[System Reflection: Unified Synthesis. Objective: ${objective}]`;
};

/**
 * Condenses history into a lightweight string for context-aware reasoning.
 */
const getCondensedHistory = (history: Message[]): string => {
  return history
    .slice(-4)
    .map((m) => `${m.role.toUpperCase()}: ${m.text.slice(0, 100)}...`)
    .join(" | ");
};

/**
 * THE UNIFIED SYNTHESIS ORCHESTRATOR
 * Implements Divergence -> Adversarial Critique -> Master Synthesis -> Final Generation.
 */
export const orchestrateDeepThink = async (
  history: Message[],
  currentMessage: string,
  config: ModelConfig,
  onUpdate: (process: ThinkingProcess) => void,
  onUsage: (usage: { flash: number; pro: number }) => void
): Promise<{ prompt: string; finalState: ThinkingProcess }> => {
  const isPro = config.model === GeminiModel.PRO_3_PREVIEW;
  const usageIncrement = { flash: isPro ? 0 : 1, pro: isPro ? 1 : 0 };

  let processState: ThinkingProcess = {
    state: "diverging",
    logs: [],
    trace: [],
    hypotheses: [],
  };

  const updateState = (update: Partial<ThinkingProcess>) => {
    processState = { ...processState, ...update };
    onUpdate({ ...processState });
  };

  const addTraceStep = (step: ExecutionStep) => {
    processState = { ...processState, trace: [...processState.trace, step] };
    onUpdate({ ...processState });
  };

  const updateTraceStep = (id: string, update: Partial<ExecutionStep>) => {
    processState = {
      ...processState,
      trace: processState.trace.map((t) =>
        t.id === id ? { ...t, ...update } : t
      ),
    };
    onUpdate({ ...processState });
  };

  updateState({});

  try {
    // PHASE 1: DIVERGENCE (3-10 Strategic Paths)
    const divStepId = generateId();
    addTraceStep({
      id: divStepId,
      phase: "Divergence",
      title: "Path Generation",
      status: "running",
    });
    onUsage(usageIncrement);

    const context =
      history.length > 0 ? getCondensedHistory(history) : undefined;
    const divergenceResponse = await generateContent(
      config.model,
      Prompts.GET_DIVERGENCE_PROMPT(currentMessage, context),
      true
    );
    const divergenceText = divergenceResponse.text;

    let strategies: Strategy[] = [];
    try {
      strategies = JSON.parse(divergenceText || "[]");
    } catch (e) {
      strategies = [
        {
          id: "default",
          title: "Standard Analysis",
          strategy: "Direct execution.",
          assumption: "Direct response",
        },
      ];
    }

    updateTraceStep(divStepId, {
      status: "complete",
      thoughts: `Explored ${strategies.length} strategic paths.`,
      result: strategies,
    });
    updateState({ state: "critiquing", hypotheses: strategies });

    // PHASE 2: ADVERSARIAL CRITIQUE (Parallel Stress-Testing)
    const critiqueSingle = async (
      s: Strategy,
      stepId: string
    ): Promise<Strategy> => {
      onUsage(usageIncrement);
      const res = await generateContent(
        config.model,
        Prompts.GET_BALANCED_CRITIQUE_PROMPT(
          currentMessage,
          s.strategy,
          s.assumption
        ),
        true
      );
      const critiqueText = res.text;

      let critiqueResult = {
        invalidity_triggers: [],
        critical_flaws: "Evaluation failed.",
      };
      try {
        critiqueResult = JSON.parse(critiqueText || "{}");
      } catch (e) {}

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

    // PHASE 3: MASTER SYNTHESIS (The Blueprint)
    const synthStepId = generateId();
    addTraceStep({
      id: synthStepId,
      phase: "Synthesis",
      title: "Blueprint Synthesis",
      status: "running",
    });
    onUsage(usageIncrement);

    const synthesisResponse = await generateContent(
      config.model,
      Prompts.GET_MASTER_SYNTHESIS_PROMPT(currentMessage, critiquedStrategies),
      true
    );
    const synthesisText = synthesisResponse.text;

    let masterBlueprint: MasterBlueprint = {
      blueprint: "Execute standard response.",
      objective: "Help user",
      tone: "professional",
      safeguards: [],
    };
    try {
      masterBlueprint = JSON.parse(synthesisText || "{}");
    } catch (e) {}

    updateTraceStep(synthStepId, {
      status: "complete",
      thoughts: `Master Blueprint synthesized with ${masterBlueprint.safeguards.length} safeguards.`,
      result: masterBlueprint,
    });
    updateState({ masterBlueprint });

    return {
      prompt: Prompts.GET_FINAL_GENERATION_PROMPT(
        currentMessage,
        masterBlueprint
      ),
      finalState: processState,
    };
  } catch (e) {
    console.error("Orchestration Error:", e);
    return { prompt: currentMessage, finalState: processState };
  }
};

/**
 * Main streaming entry point.
 * Routes to ToT orchestrator when forceDeepMode is enabled.
 */
export const streamGeminiResponse = async (
  history: Message[],
  currentMessage: string,
  config: ModelConfig,
  onChunk: (text: string) => void,
  onThinkingUpdate?: (process: ThinkingProcess) => void,
  onUsageUpdate?: (increment: { flash: number; pro: number }) => void,
  onToTUpdate?: (process: ToTProcessState) => void
): Promise<{ text: string; durationMs: number }> => {
  const startTime = Date.now();
  let finalPrompt = currentMessage;
  let orchestratorFinalState: ThinkingProcess | undefined;
  let totFinalState: ToTProcessState | undefined;

  const isPro = config.model === GeminiModel.PRO_3_PREVIEW;
  const usageIncrement = { flash: isPro ? 0 : 1, pro: isPro ? 1 : 0 };

  // Route to ToT orchestrator if Deep Mode is enabled
  if (config.forceDeepMode && onToTUpdate) {
    const result = await executeToT(
      currentMessage,
      config,
      config.maxToTDepth,
      config.forceDeepMode,
      onToTUpdate,
      (u) => onUsageUpdate?.(u)
    );
    finalPrompt = result.prompt;
    totFinalState = result.finalState;
  } else if (onThinkingUpdate) {
    // Standard Diverge→Critique→Synthesize pipeline
    const result = await orchestrateDeepThink(
      history,
      currentMessage,
      config,
      onThinkingUpdate,
      (u) => onUsageUpdate?.(u)
    );
    finalPrompt = result.prompt;
    orchestratorFinalState = result.finalState;
  }

  onUsageUpdate?.(usageIncrement);

  const mappedHistory = history.map((m) => {
    let textContent = m.text;
    if (
      m.role === "model" &&
      m.thinkingProcess &&
      m.thinkingProcess.state === "complete"
    ) {
      textContent = `${summarizeThinking(m.thinkingProcess)}\n\n${m.text}`;
    }
    return { role: m.role, parts: [{ text: textContent }] };
  });

  const chat = createChatSession(
    config.model,
    mappedHistory,
    config.temperature
  );
  const resultStream = await chat.sendMessageStream({ message: finalPrompt });

  let fullText = "";
  for await (const chunk of resultStream) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  if (onThinkingUpdate && orchestratorFinalState) {
    onThinkingUpdate({ ...orchestratorFinalState, state: "complete" });
  }

  return { text: fullText, durationMs: Date.now() - startTime };
};
