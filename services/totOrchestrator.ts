/**
 * TREE-OF-THOUGHT ORCHESTRATOR
 *
 * Coordinates recursive tree execution for problem decomposition.
 * Single responsibility: Tree traversal + node lifecycle management.
 */

import {
  ToTNode,
  ToTProcessState,
  ToTNodeResult,
  ToTUpdateCallback,
  UsageCallback,
  ChildSolution,
} from "../types/tot";
import {
  ModelConfig,
  GeminiModel,
  ThinkingProcess,
  MasterBlueprint,
} from "../types";
import { analyzeDecomposition } from "./decomposer";
import { aggregateChildSolutions } from "./aggregator";
import { orchestrateDeepThink } from "./orchestratorService";

// ============================================================================
// ID GENERATION
// ============================================================================

const generateId = (): string => Math.random().toString(36).substring(2, 9);

// ============================================================================
// NODE FACTORY
// ============================================================================

/**
 * Creates a new ToT node.
 */
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

// ============================================================================
// STATE HELPERS
// ============================================================================

/**
 * Immutably updates a node in the state.
 */
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

/**
 * Adds child nodes to the state.
 */
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

  // Update parent with child IDs
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

/**
 * Checks if all children of a node are complete.
 */
const areAllChildrenComplete = (
  state: ToTProcessState,
  nodeId: string
): boolean => {
  const node = state.nodes[nodeId];
  if (!node || node.children.length === 0) return true;

  return node.children.every((childId) => {
    const child = state.nodes[childId];
    return child && child.status === "complete";
  });
};

/**
 * Gets the solution string from a completed node.
 */
const getNodeSolution = (node: ToTNode): string => {
  if (!node.result) return "";

  if (node.result.type === "leaf") {
    return node.result.blueprint.blueprint;
  } else {
    return node.result.aggregatedSolution;
  }
};

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Execute the Tree-of-Thought reasoning process.
 *
 * @param query - The user's query
 * @param config - Model configuration
 * @param maxDepth - Maximum recursion depth
 * @param forceDecomposition - Whether to force decomposition at root
 * @param onUpdate - Callback for state updates (UI rendering)
 * @param onUsage - Callback for API usage tracking
 * @returns The final prompt and ToT state
 */
export const executeToT = async (
  query: string,
  config: ModelConfig,
  maxDepth: number,
  forceDecomposition: boolean,
  onUpdate: ToTUpdateCallback,
  onUsage: UsageCallback
): Promise<{ prompt: string; finalState: ToTProcessState }> => {
  const isPro = config.model === GeminiModel.PRO_3_PREVIEW;
  const usageIncrement = { flash: isPro ? 0 : 1, pro: isPro ? 1 : 0 };

  // Initialize root node
  const rootNode = createNode(query, "Root Problem", null, 0);

  let state: ToTProcessState = {
    treeMode: true,
    rootNodeId: rootNode.id,
    nodes: { [rootNode.id]: rootNode },
    nodeOrder: [rootNode.id],
    maxDepth,
    forceDecomposition,
    status: "running",
  };

  onUpdate(state);

  /**
   * Recursively process a node.
   */
  const processNode = async (nodeId: string): Promise<void> => {
    const node = state.nodes[nodeId];
    if (!node) {
      console.error(`[ToT] Node ${nodeId} not found`);
      return;
    }

    // PHASE 1: DECOMPOSITION ANALYSIS
    state = updateNodeInState(state, nodeId, { status: "decomposing" });
    onUpdate(state);
    onUsage(usageIncrement);

    // Only force decomposition at root level
    const shouldForce = forceDecomposition && node.depth === 0;

    const decomposition = await analyzeDecomposition(
      config.model,
      node.query,
      node.depth,
      maxDepth,
      shouldForce
    );

    if (
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
      onUpdate(state);

      // PROCESS CHILDREN IN PARALLEL
      await Promise.all(childNodes.map((child) => processNode(child.id)));

      // PHASE 2: AGGREGATION (after all children complete)
      state = updateNodeInState(state, nodeId, { status: "aggregating" });
      onUpdate(state);
      onUsage(usageIncrement);

      const childSolutions: ChildSolution[] = state.nodes[nodeId].children.map(
        (childId) => {
          const child = state.nodes[childId];
          return {
            query: child.query,
            solution: getNodeSolution(child),
          };
        }
      );

      const aggregation = await aggregateChildSolutions(
        config.model,
        node.query,
        childSolutions
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
      onUpdate(state);
    } else {
      // LEAF NODE: Execute standard Diverge→Critique→Synthesize
      state = updateNodeInState(state, nodeId, { status: "executing" });
      onUpdate(state);

      // Create a simple thinking process wrapper for the leaf
      let leafProcess: ThinkingProcess | undefined;

      try {
        const { finalState } = await orchestrateDeepThink(
          [], // No history for sub-problems
          node.query,
          config,
          (p) => {
            leafProcess = p;
          },
          onUsage
        );

        const blueprint: MasterBlueprint = finalState.masterBlueprint || {
          blueprint: "Direct response",
          objective: node.query,
          tone: "professional",
          safeguards: [],
        };

        const result: ToTNodeResult = {
          type: "leaf",
          blueprint,
          trace: finalState.trace,
        };

        state = updateNodeInState(state, nodeId, {
          status: "complete",
          result,
          completedAt: Date.now(),
        });
        onUpdate(state);
      } catch (error) {
        console.error(`[ToT] Leaf execution failed for node ${nodeId}:`, error);
        state = updateNodeInState(state, nodeId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: Date.now(),
        });
        onUpdate(state);
      }
    }
  };

  // START PROCESSING FROM ROOT
  try {
    await processNode(rootNode.id);

    const rootResult = state.nodes[rootNode.id];
    const finalSolution = rootResult?.result
      ? getNodeSolution(rootResult)
      : query; // Fallback to original query

    state = {
      ...state,
      status: "complete",
      finalResult: finalSolution,
    };
    onUpdate(state);

    // Create final generation prompt from root solution
    const finalPrompt = `
Based on the following comprehensive analysis, provide a well-structured response:

${finalSolution}

Important: Format your response in clear, readable markdown.
`;

    return { prompt: finalPrompt, finalState: state };
  } catch (error) {
    console.error("[ToT] Orchestration failed:", error);
    state = { ...state, status: "failed" };
    onUpdate(state);
    return { prompt: query, finalState: state };
  }
};
