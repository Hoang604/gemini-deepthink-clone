/**
 * CONTEXT SUMMARY SERVICE
 *
 * Summarizes thinking phases and manages context for conversation history.
 * Uses Flash model for speed.
 *
 * Rules:
 * - Thinking phases are summarized (strategies, critiques, blueprints)
 * - Full response is preserved (especially <<FILE>> blocks)
 * - When total tokens > 100k: keep last 2 full, summarize older messages
 */

import { generateContent } from "./geminiService";
import {
  ThinkingProcess,
  ToTProcessState,
  Message,
  GeminiModel,
} from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Approximate token limit before triggering summarization of older messages */
const TOKEN_LIMIT = 100_000;

/** Approximate characters per token (rough estimate) */
const CHARS_PER_TOKEN = 4;

/** Number of recent messages to keep fully intact */
const KEEP_FULL_COUNT = 2;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Estimate token count from text length.
 */
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
};

/**
 * Extract all <<FILE>> blocks from response.
 * Returns the blocks as-is to preserve them.
 */
const extractFileBlocks = (text: string): string[] => {
  const regex =
    /<<(TSX|TS|PYTHON|SQL|C|JS|HTML|MERMAID)\s+title="[^"]+">>[^]*?<<END>>/gi;
  const matches = text.match(regex) || [];
  return matches;
};

// ============================================================================
// THINKING PROCESS SUMMARIZATION
// ============================================================================

/**
 * Summarize ThinkingProcess (Synthesis backbone) comprehensively.
 * Captures strategies, critiques, blueprint, and execution trace.
 */
const summarizeThinkingProcess = (process: ThinkingProcess): string => {
  const sections: string[] = [];

  // Trace steps (Divergence → Critique → Synthesis)
  if (process.trace?.length > 0) {
    const traceSteps = process.trace
      .filter((t) => t.status === "complete")
      .map((t) => `${t.phase}: ${t.title} - ${t.thoughts || "done"}`)
      .join("\n  ");
    if (traceSteps) {
      sections.push(`Execution Trace:\n  ${traceSteps}`);
    }
  }

  // All strategies explored with their full details
  if (process.hypotheses?.length > 0) {
    const strategies = process.hypotheses.map((h, i) => {
      const parts = [`${i + 1}. ${h.title}`];
      if (h.strategy) parts.push(`   Strategy: ${h.strategy}`);
      if (h.assumption) parts.push(`   Assumption: ${h.assumption}`);
      if (h.critique) {
        if (h.critique.strengths?.length) {
          parts.push(`   Strengths: ${h.critique.strengths.join(", ")}`);
        }
        if (h.critique.invalidity_triggers?.length) {
          parts.push(`   Risks: ${h.critique.invalidity_triggers.join(", ")}`);
        }
        if (h.critique.critical_flaws) {
          parts.push(`   Flaws: ${h.critique.critical_flaws}`);
        }
      }
      return parts.join("\n");
    });
    sections.push(`Strategies Explored:\n${strategies.join("\n")}`);
  }

  // Master blueprint
  if (process.masterBlueprint) {
    const bp = process.masterBlueprint;
    const bpParts = [];
    if (bp.objective) bpParts.push(`Objective: ${bp.objective}`);
    if (bp.tone) bpParts.push(`Tone: ${bp.tone}`);
    if (bp.blueprint)
      bpParts.push(
        `Blueprint: ${bp.blueprint.slice(0, 500)}${
          bp.blueprint.length > 500 ? "..." : ""
        }`
      );
    if (bp.safeguards?.length)
      bpParts.push(`Safeguards: ${bp.safeguards.join(", ")}`);
    sections.push(`Master Blueprint:\n  ${bpParts.join("\n  ")}`);
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "Standard synthesis process";
};

/**
 * Summarize ToTProcessState comprehensively.
 * Captures tree structure, decomposition reasoning, and aggregated solutions.
 */
const summarizeToTProcess = (process: ToTProcessState): string => {
  const sections: string[] = [];

  // Tree overview
  const nodeCount = Object.keys(process.nodes || {}).length;
  sections.push(
    `Tree-of-Thought: ${nodeCount} nodes, max depth ${process.maxDepth}`
  );

  // Root node and decomposition
  if (process.rootNodeId && process.nodes?.[process.rootNodeId]) {
    const root = process.nodes[process.rootNodeId];

    if (root.children?.length > 0) {
      const childDetails = root.children.map((id, i) => {
        const child = process.nodes?.[id];
        if (!child) return `${i + 1}. Unknown`;
        const parts = [`${i + 1}. ${child.title}: ${child.query}`];
        if (child.status === "complete" && child.result) {
          if (child.result.type === "leaf" && child.result.blueprint) {
            parts.push(
              `   → ${child.result.blueprint.objective || "Completed"}`
            );
          } else if (child.result.type === "aggregated") {
            parts.push(
              `   → Aggregated: ${child.result.aggregatedSolution?.slice(
                0,
                200
              )}...`
            );
          }
        }
        return parts.join("\n");
      });
      sections.push(`Decomposed Sub-Problems:\n${childDetails.join("\n")}`);
    }
  }

  // Final aggregated result
  if (process.finalResult) {
    sections.push(
      `Final Solution:\n${process.finalResult.slice(0, 1000)}${
        process.finalResult.length > 1000 ? "..." : ""
      }`
    );
  }

  return sections.join("\n\n");
};

// ============================================================================
// MAIN SUMMARIZATION
// ============================================================================

/**
 * Generate context summary for a model message.
 * Combines thinking summary with full response (preserving files).
 *
 * @param thinkingProcess - Synthesis backbone thinking (if used)
 * @param totProcess - ToT backbone process (if used)
 * @param fullResponse - The complete model response text
 * @returns Summarized context string for history
 */
export const generateContextSummary = (
  thinkingProcess: ThinkingProcess | null | undefined,
  totProcess: ToTProcessState | null | undefined,
  fullResponse: string
): string => {
  const parts: string[] = [];

  // Summarize thinking phases
  if (thinkingProcess && thinkingProcess.state === "complete") {
    parts.push("[REASONING]");
    parts.push(summarizeThinkingProcess(thinkingProcess));
    parts.push("");
  }

  if (totProcess && totProcess.status === "complete") {
    parts.push("[REASONING]");
    parts.push(summarizeToTProcess(totProcess));
    parts.push("");
  }

  // Full response (with all files intact)
  parts.push("[RESPONSE]");
  parts.push(fullResponse);

  return parts.join("\n");
};

/**
 * Summarize an older message for context compression.
 * Uses LLM to create a concise summary while preserving file references.
 *
 * @param message - The message to summarize
 * @returns Summarized version
 */
export const summarizeOlderMessage = async (
  message: Message
): Promise<string> => {
  // Extract file blocks to preserve references
  const fileBlocks = extractFileBlocks(message.text);
  const fileReferences = fileBlocks
    .map((block) => {
      const titleMatch = block.match(/title="([^"]+)"/);
      const typeMatch = block.match(/<<(\w+)/);
      return titleMatch && typeMatch
        ? `${typeMatch[1]}: ${titleMatch[1]}`
        : null;
    })
    .filter(Boolean);

  const prompt = `
Summarize this conversation message concisely. Preserve:
1. The main intent/question (for user messages)
2. The key answer/solution approach (for model messages)
3. Any important decisions or trade-offs mentioned

MESSAGE:
${message.text.slice(0, 2000)}${message.text.length > 2000 ? "..." : ""}

${
  fileReferences.length > 0
    ? `FILES GENERATED: ${fileReferences.join(", ")}`
    : ""
}

OUTPUT: A 2-3 sentence summary. Do not include code.
`;

  try {
    const response = await generateContent(
      GeminiModel.FLASH_3_PREVIEW,
      prompt,
      false
    );
    const summary = response.text || message.text.slice(0, 500);

    // Append file references if any
    if (fileReferences.length > 0) {
      return `${summary}\n[Files: ${fileReferences.join(", ")}]`;
    }
    return summary;
  } catch (error) {
    console.error("[ContextSummary] Summarization failed:", error);
    // Fallback: truncate
    return message.text.slice(0, 500) + "...";
  }
};

// ============================================================================
// HISTORY MANAGEMENT
// ============================================================================

/**
 * Process message history for context passing.
 * When total tokens exceed limit, summarize older messages.
 *
 * @param history - Full message history
 * @returns Processed history with summarized older messages
 */
export const processHistoryForContext = async (
  history: Message[]
): Promise<{ role: string; parts: [{ text: string }] }[]> => {
  if (history.length === 0) return [];

  // Estimate total tokens
  const totalTokens = history.reduce((sum, m) => {
    const text = m.contextSummary || m.text;
    return sum + estimateTokens(text);
  }, 0);

  console.log(
    `[ContextSummary] History: ${history.length} messages, ~${totalTokens} tokens`
  );

  // If under limit, return as-is with context summaries
  if (totalTokens <= TOKEN_LIMIT) {
    return history.map((m) => ({
      role: m.role,
      parts: [{ text: m.contextSummary || m.text }],
    }));
  }

  // Over limit: summarize older messages
  console.log(
    `[ContextSummary] Over ${TOKEN_LIMIT} tokens, summarizing older messages...`
  );

  const result: { role: string; parts: [{ text: string }] }[] = [];
  const keepFullFrom = Math.max(0, history.length - KEEP_FULL_COUNT);

  for (let i = 0; i < history.length; i++) {
    const m = history[i];

    if (i >= keepFullFrom) {
      // Keep last N messages full
      result.push({
        role: m.role,
        parts: [{ text: m.contextSummary || m.text }],
      });
    } else {
      // Summarize older messages
      const summary = await summarizeOlderMessage(m);
      result.push({
        role: m.role,
        parts: [{ text: `[Earlier: ${summary}]` }],
      });
    }
  }

  return result;
};
