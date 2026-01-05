/**
 * DECOMPOSER SERVICE
 *
 * Analyzes query complexity and extracts sub-problems.
 * Single responsibility: Decomposition decision + sub-problem extraction.
 */

import { DecompositionResult, SubProblem } from "../types/tot";
import { GET_DECOMPOSITION_PROMPT } from "./totPrompts";
import { generateContent } from "./geminiService";

/**
 * Default decomposition result when parsing fails or model refuses.
 * Fallback to NOT decomposing (safe default).
 */
const DEFAULT_DECOMPOSITION: DecompositionResult = {
  shouldDecompose: false,
  reasoning: "Decomposition analysis failed, defaulting to direct execution.",
  subProblems: [],
};

/**
 * Validates sub-problems from model response.
 * Ensures each sub-problem has required fields.
 */
const validateSubProblems = (raw: unknown[]): SubProblem[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (sp): sp is Record<string, unknown> =>
        typeof sp === "object" && sp !== null
    )
    .filter(
      (sp) =>
        typeof sp.id === "string" &&
        typeof sp.title === "string" &&
        typeof sp.query === "string"
    )
    .map((sp) => ({
      id: sp.id as string,
      title: sp.title as string,
      query: sp.query as string,
      dependency: typeof sp.dependency === "string" ? sp.dependency : null,
    }));
};

/**
 * Analyze a query to determine if it should be decomposed.
 *
 * @param model - The Gemini model to use
 * @param query - The query to analyze
 * @param depth - Current depth in the tree
 * @param maxDepth - Maximum allowed depth
 * @param forceDecomposition - If true, force the model to decompose
 * @returns DecompositionResult with decision and sub-problems
 */
export const analyzeDecomposition = async (
  model: string,
  query: string,
  depth: number,
  maxDepth: number,
  forceDecomposition: boolean
): Promise<DecompositionResult> => {
  // INVARIANT: Cannot decompose if at max depth
  if (depth >= maxDepth) {
    return {
      shouldDecompose: false,
      reasoning: `Max depth (${maxDepth}) reached. Executing as leaf node.`,
      subProblems: [],
    };
  }

  const prompt = GET_DECOMPOSITION_PROMPT(
    query,
    depth,
    maxDepth,
    forceDecomposition
  );

  try {
    const response = await generateContent(model, prompt, true);
    const text = response.text;

    if (!text) {
      console.warn("[Decomposer] Empty response from model");
      return DEFAULT_DECOMPOSITION;
    }

    const parsed = JSON.parse(text);

    // Validate required fields
    if (typeof parsed.shouldDecompose !== "boolean") {
      console.warn("[Decomposer] Missing shouldDecompose in response");
      return DEFAULT_DECOMPOSITION;
    }

    const result: DecompositionResult = {
      shouldDecompose: parsed.shouldDecompose,
      reasoning:
        typeof parsed.reasoning === "string"
          ? parsed.reasoning
          : "No reasoning provided",
      subProblems: parsed.shouldDecompose
        ? validateSubProblems(parsed.subProblems)
        : [],
    };

    // INVARIANT: If shouldDecompose is true, must have at least 2 sub-problems
    if (result.shouldDecompose && result.subProblems.length < 2) {
      console.warn("[Decomposer] Decomposition requested but < 2 sub-problems");
      return {
        ...result,
        shouldDecompose: false,
        reasoning:
          "Decomposition cancelled: insufficient sub-problems extracted.",
      };
    }

    return result;
  } catch (error) {
    console.error("[Decomposer] Error during decomposition analysis:", error);
    return DEFAULT_DECOMPOSITION;
  }
};
