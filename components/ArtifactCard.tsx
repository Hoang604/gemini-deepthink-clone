/**
 * ARTIFACT CARD
 *
 * Inline card component for artifacts within chat messages.
 * Shows icon, title, timestamp, and Open button.
 */

import React from "react";
import { Artifact } from "../types";
import { FileCode2, FileText, Database, ExternalLink } from "lucide-react";

interface ArtifactCardProps {
  artifact: Artifact;
  onOpen: (artifactId: string) => void;
}

const getArtifactIcon = (type: Artifact["type"]) => {
  switch (type) {
    case "tsx":
    case "ts":
    case "js":
      return <FileCode2 size={16} className="text-blue-400" />;
    case "python":
      return <FileCode2 size={16} className="text-yellow-400" />;
    case "sql":
      return <Database size={16} className="text-green-400" />;
    case "html":
    case "c":
      return <FileCode2 size={16} className="text-orange-400" />;
    default:
      return <FileText size={16} className="text-gray-400" />;
  }
};

const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onOpen }) => {
  return (
    <div
      className="group flex items-center justify-between bg-[#1e1f20] hover:bg-[#282a2c] border border-[#444746] hover:border-[#a8c7fa] rounded-xl px-4 py-3 transition-all cursor-pointer"
      onClick={() => onOpen(artifact.id)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-none w-8 h-8 rounded-lg bg-[#282a2c] flex items-center justify-center">
          {getArtifactIcon(artifact.type)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate group-hover:text-[#a8c7fa] transition-colors">
            {artifact.title}
          </div>
          {artifact.timestamp && (
            <div className="text-xs text-gray-500">
              {formatTimestamp(artifact.timestamp)}
            </div>
          )}
        </div>
      </div>
      <button
        className="flex-none ml-4 px-3 py-1.5 text-xs font-medium text-[#a8c7fa] bg-[#004a77]/30 hover:bg-[#004a77]/50 rounded-lg flex items-center gap-1.5 transition-colors opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(artifact.id);
        }}
      >
        Open
        <ExternalLink size={12} />
      </button>
    </div>
  );
};

export default ArtifactCard;
