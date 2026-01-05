import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BrainCircuit,
} from "lucide-react";
import { ToTProcessState, ToTNode } from "../types/tot";

interface ToTVisualizerProps {
  process: ToTProcessState;
}

/**
 * Status indicator component for ToT nodes.
 */
const StatusIndicator: React.FC<{ status: ToTNode["status"] }> = ({
  status,
}) => {
  const configs = {
    pending: { icon: null, color: "bg-gray-600", pulse: false },
    decomposing: { icon: GitBranch, color: "bg-purple-500", pulse: true },
    executing: { icon: BrainCircuit, color: "bg-blue-500", pulse: true },
    aggregating: { icon: Layers, color: "bg-amber-500", pulse: true },
    complete: { icon: CheckCircle2, color: "bg-emerald-500", pulse: false },
    failed: { icon: AlertCircle, color: "bg-red-500", pulse: false },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div
      className={`w-5 h-5 rounded-full ${
        config.color
      } flex items-center justify-center ${
        config.pulse ? "animate-pulse" : ""
      }`}
    >
      {Icon && <Icon size={12} className="text-white" />}
    </div>
  );
};

/**
 * Single node in the tree visualization.
 */
const ToTNodeView: React.FC<{
  node: ToTNode;
  state: ToTProcessState;
  depth: number;
}> = ({ node, state, depth }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const childNodes = node.children.map((id) => state.nodes[id]).filter(Boolean);

  // Status labels
  const statusLabels: Record<ToTNode["status"], string> = {
    pending: "Pending",
    decomposing: "Decomposing...",
    executing: "Thinking...",
    aggregating: "Synthesizing...",
    complete: "Complete",
    failed: "Failed",
  };

  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute -left-4 top-0 w-4 h-6 border-l-2 border-b-2 border-[#444746] rounded-bl" />
      )}

      {/* Node header */}
      <div
        className={`
          flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all
          ${
            hasChildren
              ? "bg-[#282a2c] hover:bg-[#37393b]"
              : "bg-[#1e1f20] hover:bg-[#282a2c]"
          }
          ${node.status === "complete" ? "border border-emerald-900/30" : ""}
          ${node.status === "failed" ? "border border-red-900/30" : ""}
        `}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <div className="text-gray-500">
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </div>
        ) : (
          <div className="w-4" />
        )}

        {/* Status indicator */}
        <StatusIndicator status={node.status} />

        {/* Node info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200 truncate">
              {node.title}
            </span>
            <span
              className={`
              text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider
              ${
                node.status === "complete"
                  ? "bg-emerald-900/30 text-emerald-400"
                  : ""
              }
              ${node.status === "failed" ? "bg-red-900/30 text-red-400" : ""}
              ${
                ["decomposing", "executing", "aggregating"].includes(
                  node.status
                )
                  ? "bg-[#004a77] text-[#c2e7ff]"
                  : ""
              }
              ${node.status === "pending" ? "bg-gray-700 text-gray-400" : ""}
            `}
            >
              {statusLabels[node.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {node.query.slice(0, 80)}
            {node.query.length > 80 ? "..." : ""}
          </p>
        </div>

        {/* Depth badge */}
        {hasChildren && (
          <span className="text-[10px] bg-[#131314] text-gray-500 px-2 py-0.5 rounded">
            {node.children.length} sub-problems
          </span>
        )}
      </div>

      {/* Leaf node result preview */}
      {!hasChildren &&
        node.status === "complete" &&
        node.result?.type === "leaf" && (
          <div className="ml-6 mt-2 p-2 bg-[#131314] rounded border border-[#444746] text-xs text-gray-400">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 mb-1">
              <CheckCircle2 size={10} />
              <span>Diverge → Critique → Synthesize complete</span>
            </div>
            <p className="truncate">{node.result.blueprint.objective}</p>
          </div>
        )}

      {/* Aggregation result preview */}
      {node.status === "complete" && node.result?.type === "aggregated" && (
        <div className="ml-6 mt-2 p-2 bg-[#004a77]/10 rounded border border-[#a8c7fa]/30 text-xs text-[#a8c7fa]">
          <div className="flex items-center gap-1 text-[10px] mb-1">
            <Layers size={10} />
            <span>Aggregated from {node.children.length} solutions</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {node.status === "failed" && node.error && (
        <div className="ml-6 mt-2 p-2 bg-red-900/20 rounded border border-red-900/30 text-xs text-red-400">
          {node.error}
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-[#444746] pl-4">
          {childNodes.map((child) => (
            <ToTNodeView
              key={child.id}
              node={child}
              state={state}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main Tree-of-Thought Visualizer component.
 * Renders a hierarchical view of the problem decomposition process.
 */
const ToTVisualizer: React.FC<ToTVisualizerProps> = ({ process }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const rootNode = process.nodes[process.rootNodeId];

  if (!rootNode) return null;

  // Count nodes by status
  const nodeArray = Object.values(process.nodes);
  const completeCount = nodeArray.filter((n) => n.status === "complete").length;
  const totalCount = nodeArray.length;

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-[#444746] bg-[#1e1f20] w-full max-w-2xl shadow-lg">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#282a2c] to-[#1e1f20] cursor-pointer hover:from-[#37393b] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <GitBranch
            size={16}
            className={`${
              process.status === "complete"
                ? "text-emerald-400"
                : "text-purple-400 animate-pulse"
            }`}
          />
          <span className="text-xs font-medium text-gray-300">
            Tree-of-Thought Orchestrator
          </span>
          {process.status !== "complete" && (
            <Loader2 size={12} className="text-[#a8c7fa] animate-spin" />
          )}
          {process.status === "complete" && (
            <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full">
              Complete
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Depth: {process.maxDepth}</span>
          <span>
            {completeCount}/{totalCount} nodes
          </span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {/* Tree content */}
      {isExpanded && (
        <div className="p-4 bg-[#1a1b1c]">
          <ToTNodeView node={rootNode} state={process} depth={0} />
        </div>
      )}
    </div>
  );
};

export default ToTVisualizer;
