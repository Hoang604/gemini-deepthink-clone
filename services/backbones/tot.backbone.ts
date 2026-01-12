/**
 * TOT BACKBONE
 *
 * Reusable Tree-of-Thought (Decompose → Execute → Aggregate) reasoning framework.
 * Orchestrators provide their own prompts; this provides the logic.
 */

import {
  ToTNode,
  ToTProcessState,
  ToTNodeResult,
  MasterBlueprint,
  GeminiModel,
} from "../../types";
import { generateContent } from "../geminiService";
import {
  ToTPrompts,
  BackboneContext,
  BackboneResult,
  ChildSolutionInput,
} from "./types";
import { runSynthesis } from "./synthesis.backbone";

// ============================================================================
// HELPERS
// ============================================================================

const generateId = (): string => Math.random().toString(36).substring(2, 9);

const createNode = (
  query: string,
  title: string,
  parentId: string | null,
  depth: number
): ToTNode => ({
  id: generateId(),
  parentId,
  depth,
  query,
  title,
  status: "pending",
  children: [],
  createdAt: Date.now(),
});

const updateNodeInState = (
  state: ToTProcessState,
  nodeId: string,
  update: Partial<ToTNode>
): ToTProcessState => ({
  ...state,
  nodes: {
    ...state.nodes,
    [nodeId]: { ...state.nodes[nodeId], ...update },
  },
});

const addChildrenToState = (
  state: ToTProcessState,
  parentId: string,
  children: ToTNode[]
): ToTProcessState => {
  const newNodes = { ...state.nodes };
  const childIds: string[] = [];

  for (const child of children) {
    newNodes[child.id] = child;
    childIds.push(child.id);
  }

  newNodes[parentId] = {
    ...newNodes[parentId],
    children: childIds,
  };

  return {
    ...state,
    nodes: newNodes,
    nodeOrder: [...state.nodeOrder, ...childIds],
  };
};

const getNodeSolution = (node: ToTNode): string => {
  if (!node.result) return "";

  if (node.result.type === "leaf") {
    return node.result.blueprint.blueprint;
  } else {
    return node.result.aggregatedSolution;
  }
};

// ============================================================================
// DECOMPOSITION
// ============================================================================

interface DecompositionResult {
  shouldDecompose: boolean;
  reasoning: string;
  subProblems: { id: string; title: string; query: string }[];
}

const analyzeDecomposition = async (
  model: string,
  prompt: string
): Promise<DecompositionResult> => {
  const response = await generateContent(model, prompt, true);

  try {
    const parsed = JSON.parse(response.text || "{}");
    return {
      shouldDecompose: Boolean(parsed.shouldDecompose),
      reasoning: parsed.reasoning || "",
      subProblems: Array.isArray(parsed.subProblems) ? parsed.subProblems : [],
    };
  } catch {
    return {
      shouldDecompose: false,
      reasoning: "Failed to parse",
      subProblems: [],
    };
  }
};

// ============================================================================
// AGGREGATION
// ============================================================================

interface AggregationResult {
  aggregatedSolution: string;
  childContributions: string[];
}

const aggregateChildSolutions = async (
  model: string,
  prompt: string
): Promise<AggregationResult> => {
  const response = await generateContent(model, prompt, true);

  try {
    const parsed = JSON.parse(response.text || "{}");
    return {
      aggregatedSolution: parsed.aggregatedSolution || "",
      childContributions: Array.isArray(parsed.childContributions)
        ? parsed.childContributions
        : [],
    };
  } catch {
    return { aggregatedSolution: response.text || "", childContributions: [] };
  }
};

// ============================================================================
// BACKBONE EXECUTION
// ============================================================================

/**
 * Execute the ToT backbone with provided prompts.
 *
 * @param query - The user's query
 * @param context - Backbone execution context
 * @param prompts - Orchestrator-provided prompts
 * @param maxDepth - Maximum decomposition depth
 */
export const runToT = async (
  query: string,
  context: BackboneContext,
  prompts: ToTPrompts,
  maxDepth: number = 3
): Promise<BackboneResult> => {
  const isPro = context.config.model === GeminiModel.PRO_3_PREVIEW;
  const usageIncrement = { flash: isPro ? 0 : 1, pro: isPro ? 1 : 0 };

  const rootNode = createNode(query, "Root Problem", null, 0);

  let state: ToTProcessState = {
    treeMode: true,
    rootNodeId: rootNode.id,
    nodes: { [rootNode.id]: rootNode },
    nodeOrder: [rootNode.id],
    maxDepth,
    status: "running",
  };

  context.onToTUpdate?.(state);

  const processNode = async (nodeId: string): Promise<void> => {
    const node = state.nodes[nodeId];
    if (!node) {
      console.error(`[ToT] Node ${nodeId} not found`);
      return;
    }

    // PHASE 1: DECOMPOSITION ANALYSIS
    state = updateNodeInState(state, nodeId, { status: "decomposing" });
    context.onToTUpdate?.(state);
    context.onUsage?.(usageIncrement);

    // ToT always forces decomposition at root level
    const shouldForce = node.depth === 0;
    const decompositionPrompt = prompts.decomposition(
      node.query,
      node.depth,
      maxDepth,
      shouldForce
    );

    const decomposition = await analyzeDecomposition(
      context.config.model,
      decompositionPrompt
    );

    // Check if we're at or beyond the depth limit
    const canDecompose = node.depth < maxDepth - 1;

    if (
      canDecompose &&
      decomposition.shouldDecompose &&
      decomposition.subProblems.length >= 2
    ) {
      // CREATE CHILD NODES
      const childNodes = decomposition.subProblems.map((sp) =>
        createNode(sp.query, sp.title, nodeId, node.depth + 1)
      );

      state = addChildrenToState(state, nodeId, childNodes);
      state = updateNodeInState(state, nodeId, {
        title:
          node.title === "Root Problem" ? "Decomposed Problem" : node.title,
      });
      context.onToTUpdate?.(state);

      // PROCESS CHILDREN IN PARALLEL
      await Promise.all(childNodes.map((child) => processNode(child.id)));

      // PHASE 2: AGGREGATION
      state = updateNodeInState(state, nodeId, { status: "aggregating" });
      context.onToTUpdate?.(state);
      context.onUsage?.(usageIncrement);

      const childSolutions: ChildSolutionInput[] = state.nodes[
        nodeId
      ].children.map((childId) => {
        const child = state.nodes[childId];
        return {
          query: child.query,
          solution: getNodeSolution(child),
        };
      });

      const aggregationPrompt = prompts.aggregation(node.query, childSolutions);
      const aggregation = await aggregateChildSolutions(
        context.config.model,
        aggregationPrompt
      );

      const result: ToTNodeResult = {
        type: "aggregated",
        aggregatedSolution: aggregation.aggregatedSolution,
        childSummaries: aggregation.childContributions,
      };

      state = updateNodeInState(state, nodeId, {
        status: "complete",
        result,
        completedAt: Date.now(),
      });
      context.onToTUpdate?.(state);
    } else {
      // LEAF NODE: Execute synthesis with orchestrator's prompts
      state = updateNodeInState(state, nodeId, { status: "executing" });
      context.onToTUpdate?.(state);

      try {
        // Use Synthesis backbone for leaf nodes with the same prompts
        const leafContext: BackboneContext = {
          ...context,
          onThinkingUpdate: undefined, // Don't propagate leaf thinking
        };

        const { prompt: leafPrompt, thinkingProcess } = await runSynthesis(
          node.query,
          leafContext,
          prompts,
          [],
          true // isToTMode: limit explore paths to 3
        );

        const blueprint: MasterBlueprint = thinkingProcess?.masterBlueprint || {
          blueprint: leafPrompt,
          objective: node.query,
          tone: "professional",
          safeguards: [],
        };

        const result: ToTNodeResult = {
          type: "leaf",
          blueprint,
          trace: thinkingProcess?.trace || [],
        };

        state = updateNodeInState(state, nodeId, {
          status: "complete",
          result,
          completedAt: Date.now(),
        });
        context.onToTUpdate?.(state);
      } catch (error) {
        console.error(`[ToT] Leaf execution failed for node ${nodeId}:`, error);
        state = updateNodeInState(state, nodeId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: Date.now(),
        });
        context.onToTUpdate?.(state);
      }
    }
  };

  try {
    await processNode(rootNode.id);

    const rootResult = state.nodes[rootNode.id];
    const finalSolution = rootResult?.result
      ? getNodeSolution(rootResult)
      : query;

    state = {
      ...state,
      status: "complete",
      finalResult: finalSolution,
    };
    context.onToTUpdate?.(state);

    // Build final prompt using orchestrator's final prompt template
    const finalPrompt = prompts.final(query, finalSolution);

    return { prompt: finalPrompt, totProcess: state };
  } catch (error) {
    console.error("[ToT] Backbone failed:", error);
    state = { ...state, status: "failed" };
    context.onToTUpdate?.(state);
    return { prompt: prompts.final(query), totProcess: state };
  }
};
