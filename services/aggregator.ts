/**
 * AGGREGATOR SERVICE
 *
 * Combines child node solutions into a parent solution.
 * Single responsibility: Bottom-up result synthesis.
 */

import { AggregationResult, ChildSolution } from "../types/tot";
import { GET_AGGREGATION_PROMPT } from "./totPrompts";
import { generateContent } from "./geminiService";

/**
 * Default aggregation result when parsing fails.
 * Concatenates child solutions as fallback.
 */
const createFallbackAggregation = (
  children: ChildSolution[]
): AggregationResult => ({
  aggregatedSolution: children
    .map((c, i) => `## Part ${i + 1}: ${c.query}\n\n${c.solution}`)
    .join("\n\n---\n\n"),
  childContributions: children.map((c, i) => `Part ${i + 1}: ${c.query}`),
});

/**
 * Aggregate child solutions into a coherent parent solution.
 *
 * @param model - The Gemini model to use
 * @param parentQuery - The parent query being answered
 * @param childSolutions - Array of solved child sub-problems
 * @returns AggregationResult with synthesized solution
 */
export const aggregateChildSolutions = async (
  model: string,
  parentQuery: string,
  childSolutions: ChildSolution[]
): Promise<AggregationResult> => {
  // INVARIANT: Must have at least one child solution
  if (childSolutions.length === 0) {
    return {
      aggregatedSolution: "No child solutions to aggregate.",
      childContributions: [],
    };
  }

  // Edge case: Single child, no aggregation needed
  if (childSolutions.length === 1) {
    return {
      aggregatedSolution: childSolutions[0].solution,
      childContributions: [
        `Directly used solution from: ${childSolutions[0].query}`,
      ],
    };
  }

  const prompt = GET_AGGREGATION_PROMPT(parentQuery, childSolutions);

  try {
    const response = await generateContent(model, prompt, true);
    const text = response.text;

    if (!text) {
      console.warn("[Aggregator] Empty response from model");
      return createFallbackAggregation(childSolutions);
    }

    const parsed = JSON.parse(text);

    // Validate required fields
    if (typeof parsed.aggregatedSolution !== "string") {
      console.warn("[Aggregator] Missing aggregatedSolution in response");
      return createFallbackAggregation(childSolutions);
    }

    return {
      aggregatedSolution: parsed.aggregatedSolution,
      childContributions: Array.isArray(parsed.childContributions)
        ? parsed.childContributions.filter(
            (c: unknown): c is string => typeof c === "string"
          )
        : childSolutions.map((_, i) => `Child ${i + 1} contribution`),
    };
  } catch (error) {
    console.error("[Aggregator] Error during aggregation:", error);
    return createFallbackAggregation(childSolutions);
  }
};
