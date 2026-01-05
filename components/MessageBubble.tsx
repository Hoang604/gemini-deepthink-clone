import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Message,
  ThinkingProcess,
  ExecutionStep,
  Strategy,
  ToTProcessState,
} from "../types";
import {
  Bot,
  User,
  AlertCircle,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import ToTVisualizer from "./ToTVisualizer";

interface MessageBubbleProps {
  message: Message;
  isThinking?: boolean;
}

/**
 * DeepThinkResultCard
 * A decoupled component responsible for rendering the specific output of an AI reasoning step.
 */
const DeepThinkResultCard: React.FC<{
  variant: "strategy" | "critique" | "synthesis";
  data: any;
}> = ({ variant, data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  switch (variant) {
    case "strategy":
      return (
        <div
          className="group bg-[#1e1f20] rounded-xl border border-[#444746] hover:border-[#a8c7fa] hover:bg-[#282a2c] transition-all cursor-pointer overflow-hidden"
          onClick={toggle}
        >
          <div className="p-3 flex items-center gap-3">
            <div className="flex-none">
              <div className="w-5 h-5 rounded-full bg-[#004a77] flex items-center justify-center text-[#c2e7ff]">
                <Lightbulb size={12} />
              </div>
            </div>
            <div className="flex-1 font-semibold text-xs text-[#e3e3e3] group-hover:text-[#a8c7fa] transition-colors truncate">
              {data.title}
            </div>
            <div className="flex-none text-gray-500">
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </div>
          </div>
          {isExpanded && (
            <div className="px-3 pb-4 ml-8 animate-fadeIn space-y-2">
              <div className="text-xs text-gray-300 leading-relaxed border-l border-[#a8c7fa]/30 pl-3">
                {data.strategy}
              </div>
              <div className="text-[10px] text-gray-500 bg-[#131314] p-2 rounded border border-[#444746]">
                <span className="font-bold text-gray-400">Assumption:</span>{" "}
                {data.assumption}
              </div>
            </div>
          )}
        </div>
      );

    case "critique":
      return (
        <div
          className="bg-[#282a2c]/30 rounded-xl border border-[#444746] hover:border-red-900/50 transition-all cursor-pointer overflow-hidden"
          onClick={toggle}
        >
          <div className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-red-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                Adversarial Stress Test
              </span>
            </div>
            <div className="text-gray-500">
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </div>
          </div>
          {isExpanded && (
            <div className="px-3 pb-3 animate-fadeIn space-y-3">
              <div className="space-y-1">
                {data.invalidity_triggers?.map((t: string, i: number) => (
                  <div
                    key={i}
                    className="text-[10px] text-red-300 flex items-start gap-1.5"
                  >
                    <span className="mt-1 w-1 h-1 rounded-full bg-red-400 flex-none" />
                    {t}
                  </div>
                ))}
              </div>
              {data.critical_flaws && (
                <div className="text-[10px] text-gray-400 italic leading-snug bg-black/20 p-2 rounded border border-[#444746]">
                  {data.critical_flaws}
                </div>
              )}
            </div>
          )}
        </div>
      );

    case "synthesis":
      return (
        <div
          className="bg-[#004a77]/20 border border-[#a8c7fa] rounded-xl relative overflow-hidden cursor-pointer hover:bg-[#004a77]/30 transition-all"
          onClick={toggle}
        >
          <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
            <CheckCircle2 size={48} className="text-[#a8c7fa]" />
          </div>
          <div className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="px-2 py-0.5 rounded bg-[#a8c7fa] text-black text-[9px] font-black uppercase tracking-widest">
                Master Blueprint
              </div>
              <div className="text-[#a8c7fa]">
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </div>
            </div>
            <div className="text-sm font-bold text-white mt-1 truncate pr-8">
              {data.objective}
            </div>
          </div>
          {isExpanded && (
            <div className="px-4 pb-4 animate-fadeIn space-y-4">
              <div className="text-xs text-gray-300 leading-relaxed border-t border-[#a8c7fa]/20 pt-3">
                {data.blueprint}
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#a8c7fa] uppercase">
                  Active Safeguards
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.safeguards?.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-[#131314] border border-[#a8c7fa]/30 text-[9px] text-gray-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
};

const TraceStepViewer: React.FC<{ step: ExecutionStep }> = ({ step }) => {
  const [isOpen, setIsOpen] = useState(
    step.status === "running" ||
      step.phase === "Divergence" ||
      step.phase === "Synthesis"
  );

  return (
    <div className="border-l-2 border-[#444746] pl-4 pb-6 relative last:pb-0">
      <div
        className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-[#1e1f20] ${
          step.status === "complete"
            ? "bg-[#a8c7fa]"
            : step.status === "running"
            ? "bg-[#a8c7fa] animate-pulse"
            : "bg-gray-600"
        }`}
      ></div>

      <div
        className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-bold text-[#a8c7fa] uppercase tracking-wider">
          {step.phase}
        </span>
        <span className="text-sm font-medium text-gray-300">{step.title}</span>
        {step.status === "running" && (
          <span className="text-[10px] text-[#a8c7fa] animate-pulse">
            (Processing...)
          </span>
        )}
        {isOpen ? (
          <ChevronDown size={14} className="text-gray-500 ml-auto" />
        ) : (
          <ChevronRight size={14} className="text-gray-500 ml-auto" />
        )}
      </div>

      {isOpen && (
        <div className="space-y-4 animate-fadeIn">
          {step.thoughts && (
            <div className="bg-[#131314] rounded-lg border border-[#444746] overflow-hidden">
              <div className="bg-[#282a2c] px-3 py-1.5 flex items-center gap-2 border-b border-[#444746]">
                <BrainCircuit size={12} className="text-[#a8c7fa]" />
                <span className="text-[10px] font-mono text-gray-400 uppercase">
                  Internal Monologue
                </span>
              </div>
              <div className="p-3 text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                {step.thoughts}
              </div>
            </div>
          )}

          {step.result && (
            <div className="grid gap-3 mt-2">
              {step.phase === "Divergence" && Array.isArray(step.result) ? (
                step.result.map((s: Strategy) => (
                  <DeepThinkResultCard key={s.id} variant="strategy" data={s} />
                ))
              ) : step.phase === "Critique" ? (
                <DeepThinkResultCard variant="critique" data={step.result} />
              ) : step.phase === "Synthesis" ? (
                <DeepThinkResultCard variant="synthesis" data={step.result} />
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ThinkingVisualizer: React.FC<{ process: ThinkingProcess }> = ({
  process,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!process || process.trace.length === 0) return null;

  const isComplete = process.state === "complete";

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-[#444746] bg-[#1e1f20] w-full max-w-2xl shadow-lg">
      <div
        className="flex items-center justify-between px-4 py-3 bg-[#282a2c] cursor-pointer hover:bg-[#37393b] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <BrainCircuit
            size={16}
            className={`${
              isComplete ? "text-[#a8c7fa]" : "text-[#a8c7fa] animate-pulse"
            }`}
          />
          <span className="text-xs font-medium text-gray-300">
            DeepThink Orchestrator
          </span>
          {process.state !== "complete" && (
            <span className="text-[10px] bg-[#004a77] text-[#c2e7ff] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {process.state}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{process.trace.length} steps</span>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 bg-[#1a1b1c] space-y-2">
          {process.trace.map((step) => (
            <TraceStepViewer key={step.id} step={step} />
          ))}
          {process.state !== "complete" && (
            <div className="border-l-2 border-[#444746] pl-4 pt-1 flex items-center gap-2 text-xs text-gray-500 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#a8c7fa]"></div>
              Computing...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isThinking,
}) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full gap-4 p-6 ${
        isUser ? "bg-transparent" : "bg-[#1e1f20]/50"
      }`}
    >
      <div className="flex-none mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-[#444746] flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
        ) : (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              message.isError
                ? "bg-red-900/50"
                : "bg-gradient-to-br from-[#4b90ff] to-[#ff5546]"
            }`}
          >
            {message.isError ? (
              <AlertCircle size={18} className="text-red-200" />
            ) : (
              <Bot size={18} className="text-white" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden min-w-0">
        <div className="font-medium text-sm text-gray-400 mb-2 flex items-center gap-2">
          {isUser ? "You" : "Gemini 3 Pro"}
        </div>
        {!isUser && message.totProcess && (
          <ToTVisualizer process={message.totProcess} />
        )}
        {!isUser && message.thinkingProcess && !message.totProcess && (
          <ThinkingVisualizer process={message.thinkingProcess} />
        )}
        {!isUser && isThinking && !message.thinkingProcess && !message.text && (
          <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse mb-2">
            <BrainCircuit size={16} />
            <span>Thinking...</span>
          </div>
        )}
        <div className="markdown-body prose prose-invert max-w-none text-[15px] leading-relaxed text-[#e3e3e3]">
          {message.text ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          ) : (
            !message.thinkingProcess && (
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
