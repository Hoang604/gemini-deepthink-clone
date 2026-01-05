/**
 * TREE-OF-THOUGHT TYPE DEFINITIONS
 *
 * Hierarchical reasoning types for recursive problem decomposition.
 * These types extend the base ThinkingProcess to support tree structures.
 */

import { MasterBlueprint, ExecutionStep } from "../types";

// ============================================================================
// CORE NODE TYPES
// ============================================================================

/**
 * Status lifecycle for a ToT node.
 *
 * Flow: pending → decomposing → (children created OR executing) → aggregating → complete
 *       └─ failed (can happen at any stage)
 */
export type ToTNodeStatus =
  | "pending" // Node created, not yet processed
  | "decomposing" // Analyzing whether to decompose
  | "executing" // Leaf node: running Diverge→Critique→Synthesize
  | "aggregating" // Non-leaf: combining child solutions
  | "complete" // Finished successfully
  | "failed"; // Error occurred

/**
 * Result of a completed ToT node.
 * Discriminated union based on whether node is a leaf or aggregated parent.
 */
export type ToTNodeResult =
  | { type: "leaf"; blueprint: MasterBlueprint; trace: ExecutionStep[] }
  | {
      type: "aggregated";
      aggregatedSolution: string;
      childSummaries: string[];
    };

/**
 * A single node in the Tree-of-Thought.
 *
 * INVARIANTS:
 * - If parentId is null, this is the root node
 * - If children.length > 0, this node was decomposed (non-leaf)
 * - If children.length === 0, this is a leaf node that runs the standard pipeline
 * - A node cannot be 'complete' until all children are 'complete'
 */
export interface ToTNode {
  /** Unique identifier for this node */
  readonly id: string;

  /** Parent node ID. Null for root node. */
  readonly parentId: string | null;

  /** Depth in the tree. Root = 0. */
  readonly depth: number;

  /** The query/sub-problem this node is solving */
  readonly query: string;

  /** Human-readable title for UI display */
  title: string;

  /** Current processing status */
  status: ToTNodeStatus;

  /** Child node IDs (empty array = leaf node) */
  children: readonly string[];

  /** Result populated after completion */
  result?: ToTNodeResult;

  /** Error message if status === 'failed' */
  error?: string;

  /** Timestamp when node was created */
  readonly createdAt: number;

  /** Timestamp when node completed or failed */
  completedAt?: number;
}

// ============================================================================
// DECOMPOSITION TYPES
// ============================================================================

/**
 * A sub-problem extracted during decomposition.
 */
export interface SubProblem {
  /** Unique ID within the decomposition (e.g., "sp1", "sp2") */
  id: string;

  /** Human-readable title */
  title: string;

  /** The reformulated query for this sub-problem */
  query: string;

  /**
   * Optional dependency on another sub-problem.
   * If set, this sub-problem should be solved AFTER the dependency.
   * Currently not implemented (parallel execution), reserved for future.
   */
  dependency?: string | null;
}

/**
 * Result of the decomposition analysis.
 */
export interface DecompositionResult {
  /** Whether the model decided to decompose */
  shouldDecompose: boolean;

  /** Model's reasoning for the decision */
  reasoning: string;

  /** Sub-problems (only populated if shouldDecompose is true) */
  subProblems: SubProblem[];
}

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

/**
 * Input for aggregation: a solved child with its result.
 */
export interface ChildSolution {
  /** The sub-problem query */
  query: string;

  /** The solution/answer for this sub-problem */
  solution: string;
}

/**
 * Result of the aggregation step.
 */
export interface AggregationResult {
  /** The synthesized solution combining all child solutions */
  aggregatedSolution: string;

  /** Brief summaries of how each child contributed */
  childContributions: string[];
}

// ============================================================================
// TREE PROCESS STATE
// ============================================================================

/**
 * The complete state of a Tree-of-Thought execution.
 * This is the hierarchical equivalent of ThinkingProcess.
 */
export interface ToTProcessState {
  /** Whether ToT mode is active */
  readonly treeMode: true;

  /** Root node ID */
  readonly rootNodeId: string;

  /** All nodes indexed by ID for O(1) lookup */
  nodes: Record<string, ToTNode>;

  /** Ordered list of node IDs for traversal (BFS order) */
  nodeOrder: readonly string[];

  /** User-configured maximum depth */
  readonly maxDepth: number;

  /** Whether decomposition was forced (Deep Mode) */
  readonly forceDecomposition: boolean;

  /** Overall status of the tree execution */
  status: "running" | "complete" | "failed";

  /** Final aggregated result from root node */
  finalResult?: string;
}

// ============================================================================
// CONFIGURATION EXTENSION
// ============================================================================

/**
 * Extended model configuration with ToT settings.
 */
export interface ToTConfig {
  /** Maximum recursion depth (1-5, default 3) */
  maxToTDepth: number;

  /** Force decomposition regardless of model decision */
  forceDeepMode: boolean;
}

// ============================================================================
// CALLBACK TYPES
// ============================================================================

/**
 * Callback for ToT state updates.
 * Called whenever the tree state changes.
 */
export type ToTUpdateCallback = (state: ToTProcessState) => void;

/**
 * Callback for usage tracking.
 */
export type UsageCallback = (usage: { flash: number; pro: number }) => void;
