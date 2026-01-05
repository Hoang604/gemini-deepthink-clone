/**
 * TREE-OF-THOUGHT PROMPT REGISTRY
 *
 * Prompts for decomposition analysis and solution aggregation.
 */

/**
 * DECOMPOSITION_ANALYSIS_PROMPT
 *
 * Analyzes a query to determine if it should be decomposed into sub-problems.
 * When forceDecomposition is true, the model must decompose regardless of complexity.
 *
 * @param query - The user's query or sub-problem
 * @param depth - Current depth in the tree (0 = root)
 * @param maxDepth - Maximum allowed depth
 * @param forceDecomposition - If true, must decompose
 */
export const GET_DECOMPOSITION_PROMPT = (
  query: string,
  depth: number,
  maxDepth: number,
  forceDecomposition: boolean
) => `
You are a Problem Decomposition Analyst. Your task is to analyze whether a query should be broken into smaller sub-problems.

# QUERY
"${query}"

# CONTEXT
- Current Depth: ${depth}
- Maximum Depth: ${maxDepth}
- Remaining Depth: ${maxDepth - depth}
- Force Decomposition: ${forceDecomposition}

# DECISION RULES
${
  forceDecomposition
    ? `
**FORCED MODE ACTIVE**: You MUST decompose this query into sub-problems.
Generate 2-5 distinct sub-problems that together fully address the original query.
`
    : `
Analyze whether decomposition would improve the quality of the response:

1. **DECOMPOSE IF**:
   - Query has multiple distinct parts (e.g., "Compare X, Y, and Z")
   - Query requires different types of expertise for different aspects
   - Query can be naturally split into independent sub-problems
   - Solving sub-problems first would lead to a more thorough answer

2. **DO NOT DECOMPOSE IF**:
   - Query is simple and direct
   - Query is already atomic (single concept)
   - Remaining depth is 0
   - Decomposition would be artificial or unhelpful
`
}

# OUTPUT FORMAT (JSON only)
{
  "shouldDecompose": boolean,
  "reasoning": "Clear explanation of the decision",
  "subProblems": [
    {
      "id": "sp1",
      "title": "Short descriptive title",
      "query": "The complete reformulated sub-problem as a question",
      "dependency": null
    }
  ]
}

CRITICAL: If shouldDecompose is false, subProblems MUST be an empty array.
CRITICAL: Each sub-problem query must be self-contained and answerable independently.
`;

/**
 * AGGREGATION_PROMPT
 *
 * Combines multiple child solutions into a coherent parent solution.
 *
 * @param parentQuery - The original query being answered
 * @param childSolutions - Array of {query, solution} from child nodes
 */
export const GET_AGGREGATION_PROMPT = (
  parentQuery: string,
  childSolutions: Array<{ query: string; solution: string }>
) => `
You are a Solution Synthesizer. Your task is to combine multiple partial solutions into a comprehensive answer.

# ORIGINAL QUERY
"${parentQuery}"

# CHILD SOLUTIONS
${childSolutions
  .map(
    (child, i) => `
## Sub-Problem ${i + 1}: ${child.query}
${child.solution}
`
  )
  .join("\n---\n")}

# YOUR TASK
Synthesize these solutions into a single, coherent response that:
1. Directly addresses the original query
2. Integrates insights from all child solutions
3. Maintains logical flow and consistency
4. Adds any necessary connecting context
5. Provides a unified conclusion if appropriate

# OUTPUT FORMAT (JSON only)
{
  "aggregatedSolution": "The complete synthesized answer as a markdown string",
  "childContributions": [
    "Brief summary of what each child solution contributed (one per child)"
  ]
}
`;

/**
 * LEAF_EXECUTION_CONTEXT_PROMPT
 *
 * Provides context when executing a leaf node that is part of a larger tree.
 * This wraps the standard divergence prompt with tree context.
 *
 * @param subProblemQuery - The specific sub-problem query
 * @param parentQuery - The parent query for context
 * @param siblingQueries - Other sub-problems being solved in parallel
 */
export const GET_LEAF_CONTEXT_PROMPT = (
  subProblemQuery: string,
  parentQuery: string | null,
  siblingQueries: string[]
) => `
# CONTEXT
${
  parentQuery
    ? `This is a sub-problem of: "${parentQuery}"`
    : "This is the root problem."
}
${
  siblingQueries.length > 0
    ? `
Related sub-problems being solved in parallel:
${siblingQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Focus ONLY on your assigned sub-problem. Do not attempt to answer sibling problems.
`
    : ""
}

# YOUR SUB-PROBLEM
"${subProblemQuery}"

Provide a thorough, focused answer to this specific sub-problem.
`;
