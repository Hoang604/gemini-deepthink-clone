/**
 * ORCHESTRATOR SERVICE
 *
 * Main entry point for streaming responses.
 * Routes to appropriate orchestrator via registry, then streams final generation.
 * Orchestrators now have self-contained prompts.
 */

import {
  Message,
  ModelConfig,
  GeminiModel,
  ThinkingProcess,
  ToTProcessState,
} from "../types";
import { createChatSession } from "./geminiService";
import {
  routeToOrchestrator,
  OrchestratorContext,
} from "./orchestrators/registry";
import {
  generateContextSummary,
  processHistoryForContext,
} from "./contextSummaryService";

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main streaming entry point.
 * Routes to appropriate orchestrator, then streams final generation.
 *
 * @returns Object containing response text, duration, and context summary for storage
 */
export const streamGeminiResponse = async (
  history: Message[],
  currentMessage: string,
  config: ModelConfig,
  onChunk: (text: string) => void,
  onThinkingUpdate?: (process: ThinkingProcess) => void,
  onUsageUpdate?: (increment: { flash: number; pro: number }) => void,
  onToTUpdate?: (process: ToTProcessState) => void
): Promise<{
  text: string;
  durationMs: number;
  contextSummary: string;
  thinkingProcess?: ThinkingProcess;
  totProcess?: ToTProcessState;
}> => {
  const startTime = Date.now();

  const isPro = config.model === GeminiModel.PRO_3_PREVIEW;
  const usageIncrement = { flash: isPro ? 0 : 1, pro: isPro ? 1 : 0 };

  // Build orchestrator context
  const context: OrchestratorContext = {
    history,
    config,
    onThinkingUpdate,
    onToTUpdate,
    onUsage: onUsageUpdate,
  };

  // Route to appropriate orchestrator
  // The orchestrator returns a complete prompt with its own format instructions
  const { prompt, outputFormat, thinkingProcess, totProcess } =
    await routeToOrchestrator(currentMessage, context);

  console.log(`[Service] Using orchestrator output format: ${outputFormat}`);

  // Track final generation call
  onUsageUpdate?.(usageIncrement);

  // Process history with context summarization (handles token limits)
  const mappedHistory = await processHistoryForContext(history);

  // Final generation
  const chat = createChatSession(
    config.model,
    mappedHistory,
    config.temperature
  );
  const resultStream = await chat.sendMessageStream({ message: prompt });

  let fullText = "";
  for await (const chunk of resultStream) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  // Mark thinking process as complete
  if (onThinkingUpdate && thinkingProcess) {
    onThinkingUpdate({ ...thinkingProcess, state: "complete" });
  }

  // Generate context summary for this response (for future history)
  const contextSummary = generateContextSummary(
    thinkingProcess,
    totProcess,
    fullText
  );

  return {
    text: fullText,
    durationMs: Date.now() - startTime,
    contextSummary,
    thinkingProcess,
    totProcess,
  };
};

// ============================================================================
// RE-EXPORTS
// ============================================================================

export { routeToOrchestrator } from "./orchestrators/registry";
export type {
  Orchestrator,
  OrchestratorContext,
  OrchestratorResult,
} from "./orchestrators/types";
