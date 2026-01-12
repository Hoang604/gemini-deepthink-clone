/**
 * QUERY CLASSIFIER
 *
 * Uses a fast LLM call to classify query complexity and type.
 * Dynamically builds prompt from registered orchestrators' hints.
 */

import { generateContent } from "../geminiService";
import { GeminiModel } from "../../types";
import { Orchestrator } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface ClassificationResult {
  /** Recommended orchestrator ID */
  recommended: string;

  /** Confidence scores for each orchestrator (0-1) */
  scores: Record<string, number>;

  /** Brief reasoning for the classification */
  reasoning: string;
}

// ============================================================================
// DYNAMIC PROMPT BUILDER
// ============================================================================

/**
 * Build the classification prompt dynamically from orchestrator hints.
 * When a new orchestrator is added, the prompt auto-adapts.
 */
const buildClassifierPrompt = (
  query: string,
  orchestrators: Orchestrator[]
): string => {
  const orchestratorOptions = orchestrators
    .map(
      (o, i) => `
${i + 1}. **${o.id}** - ${o.description}
${o.classificationHint}`
    )
    .join("\n");

  const orchestratorIds = orchestrators.map((o) => `"${o.id}"`).join(" | ");
  const scoresExample = orchestrators
    .map((o) => `"${o.id}": 0.0-1.0`)
    .join(", ");

  return `
You are a Query Classifier. Analyze the query and determine the best reasoning strategy.

# QUERY
"${query}"

# ORCHESTRATOR OPTIONS
${orchestratorOptions}

# OUTPUT (JSON only)
{
  "recommended": ${orchestratorIds},
  "scores": { ${scoresExample} },
  "reasoning": "One sentence explanation"
}

CRITICAL: Scores should sum to approximately 1.0. Be decisive - the recommended option should have the highest score.
`;
};

// ============================================================================
// CLASSIFIER
// ============================================================================

/**
 * Classify a query to determine the best orchestrator.
 * Uses Flash model for speed (this is a quick routing decision).
 *
 * @param query - The user's query
 * @param orchestrators - All registered orchestrators with their hints
 */
export const classifyQuery = async (
  query: string,
  orchestrators: Orchestrator[]
): Promise<ClassificationResult> => {
  const prompt = buildClassifierPrompt(query, orchestrators);

  try {
    const response = await generateContent(
      GeminiModel.FLASH_3_PREVIEW,
      prompt,
      true
    );

    const parsed = JSON.parse(response.text || "{}");

    // Validate response structure
    if (!parsed.recommended || !parsed.scores) {
      console.warn("[Classifier] Invalid response, using fallback");
      return getDefaultClassification(query, orchestrators);
    }

    // Normalize scores to 0-1 range
    const normalizedScores: Record<string, number> = {};
    for (const o of orchestrators) {
      const score = parsed.scores[o.id];
      normalizedScores[o.id] =
        typeof score === "number" ? Math.max(0, Math.min(1, score)) : 0;
    }

    return {
      recommended: parsed.recommended,
      scores: normalizedScores,
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch (error) {
    console.error("[Classifier] Classification failed:", error);
    return getDefaultClassification(query, orchestrators);
  }
};

/**
 * Fallback classification based on simple heuristics.
 */
const getDefaultClassification = (
  query: string,
  orchestrators: Orchestrator[]
): ClassificationResult => {
  const length = query.length;

  // Default scores
  const scores: Record<string, number> = {};
  for (const o of orchestrators) {
    scores[o.id] = 0.33;
  }

  let recommended = "synthesis";

  if (length < 50 && scores["direct"] !== undefined) {
    scores["direct"] = 0.7;
    scores["synthesis"] = 0.2;
    scores["tot"] = 0.1;
    recommended = "direct";
  } else if (length > 300 && scores["tot"] !== undefined) {
    scores["direct"] = 0.1;
    scores["synthesis"] = 0.3;
    scores["tot"] = 0.6;
    recommended = "tot";
  } else if (scores["synthesis"] !== undefined) {
    scores["direct"] = 0.2;
    scores["synthesis"] = 0.6;
    scores["tot"] = 0.2;
    recommended = "synthesis";
  }

  return {
    recommended,
    scores,
    reasoning: `Fallback classification based on query length (${length} chars)`,
  };
};

// ============================================================================
// TOT NECESSITY CLASSIFIER
// ============================================================================

export interface ToTNecessityResult {
  needsToT: boolean;
  reasoning: string;
  complexity: "simple" | "moderate" | "complex";
}

/**
 * Determine if a query needs Tree-of-Thought reasoning.
 * Used when Deep Mode is OFF to decide if ToT should be used.
 */
export const classifyNeedsToT = async (
  query: string
): Promise<ToTNecessityResult> => {
  const prompt = `
You are a Query Complexity Analyzer. Determine if this query requires deep, multi-step reasoning (Tree-of-Thought).

# QUERY
"${query}"

# WHEN TO USE TREE-OF-THOUGHT (ToT)
Use ToT when the query:
- Requires exploring multiple solution paths
- Has complex architectural decisions
- Needs decomposition into sub-problems
- Benefits from critique and synthesis of alternatives
- Is open-ended with trade-offs to consider

# WHEN TO SKIP ToT
Skip ToT when the query:
- Is a simple factual question
- Has a single obvious answer
- Is a straightforward implementation request
- Asks for explanation of a concept
- Is conversational/casual

# OUTPUT (JSON only)
{
  "needsToT": true | false,
  "complexity": "simple" | "moderate" | "complex",
  "reasoning": "One sentence explanation"
}
`;

  try {
    const response = await generateContent(
      GeminiModel.FLASH_3_PREVIEW,
      prompt,
      true
    );

    const parsed = JSON.parse(response.text || "{}");

    return {
      needsToT: Boolean(parsed.needsToT),
      complexity: parsed.complexity || "moderate",
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch (error) {
    console.error("[ToT Classifier] Classification failed:", error);
    // Default to NOT needing ToT if classification fails
    return {
      needsToT: false,
      complexity: "moderate",
      reasoning: "Fallback: classification failed",
    };
  }
};
