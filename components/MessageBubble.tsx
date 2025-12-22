import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ThinkingProcess, ExecutionStep, Hypothesis } from '../types';
import { Bot, User, AlertCircle, BrainCircuit, ChevronDown, ChevronRight, GitBranch, Terminal, ArrowRight, CheckCircle2, Loader2, ListTree, Lightbulb } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isThinking?: boolean;
}

const PhaseIcon = ({ phase, status }: { phase: string, status: string }) => {
  if (status === 'running') return <Loader2 size={16} className="animate-spin text-[#a8c7fa]" />;
  if (status === 'failed') return <AlertCircle size={16} className="text-red-400" />;
  
  switch(phase) {
    case 'Divergence': return <ListTree size={16} className="text-[#a8c7fa]" />;
    case 'Verification': return <CheckCircle2 size={16} className="text-[#a8c7fa]" />;
    case 'Selection': return <GitBranch size={16} className="text-[#a8c7fa]" />;
    default: return <Terminal size={16} className="text-gray-400" />;
  }
};

const TraceStepViewer: React.FC<{ step: ExecutionStep }> = ({ step }) => {
  const [isOpen, setIsOpen] = useState(step.status === 'running' || step.phase === 'Divergence');

  return (
    <div className="border-l-2 border-[#444746] pl-4 pb-6 relative last:pb-0">
      {/* Timeline Dot */}
      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-[#1e1f20] ${
        step.status === 'complete' ? 'bg-[#a8c7fa]' : 
        step.status === 'running' ? 'bg-[#a8c7fa] animate-pulse' : 'bg-gray-600'
      }`}></div>

      {/* Header */}
      <div 
        className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-bold text-[#a8c7fa] uppercase tracking-wider">{step.phase}</span>
        <span className="text-sm font-medium text-gray-300">{step.title}</span>
        {step.status === 'running' && <span className="text-[10px] text-[#a8c7fa] animate-pulse">(Processing...)</span>}
        {isOpen ? <ChevronDown size={14} className="text-gray-500 ml-auto" /> : <ChevronRight size={14} className="text-gray-500 ml-auto" />}
      </div>

      {/* Content */}
      {isOpen && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Internal Monologue / Thoughts */}
          {step.thoughts && (
            <div className="bg-[#131314] rounded-lg border border-[#444746] overflow-hidden">
              <div className="bg-[#282a2c] px-3 py-1.5 flex items-center gap-2 border-b border-[#444746]">
                <BrainCircuit size={12} className="text-[#a8c7fa]" />
                <span className="text-[10px] font-mono text-gray-400 uppercase">Internal Monologue</span>
              </div>
              <div className="p-3 text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                {step.thoughts}
              </div>
            </div>
          )}

          {/* Structured Result Visualization */}
          {step.result && step.phase === 'Divergence' && Array.isArray(step.result) && (
            <div className="grid gap-3 mt-2">
              {step.result.map((h: Hypothesis) => (
                <div key={h.id} className="group relative bg-[#1e1f20] p-4 rounded-xl border border-[#444746] hover:border-[#a8c7fa] hover:bg-[#282a2c] transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-none mt-0.5">
                       <div className="w-5 h-5 rounded-full bg-[#004a77] flex items-center justify-center text-[#c2e7ff]">
                         <Lightbulb size={12} />
                       </div>
                    </div>
                    <div>
                       <div className="font-semibold text-sm text-[#e3e3e3] mb-1 group-hover:text-[#a8c7fa] transition-colors">{h.title}</div>
                       <div className="text-xs text-gray-400 leading-relaxed">{h.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step.result && step.phase === 'Verification' && (
             <div className="flex items-center gap-3 bg-[#282a2c]/30 p-2 rounded border border-[#444746]">
               <div className="text-xs text-gray-400">Confidence Score:</div>
               <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#a8c7fa]" 
                    style={{ width: `${(step.result.confidence || 0) * 100}%` }}
                  ></div>
               </div>
               <div className="font-mono text-xs font-bold text-[#a8c7fa]">{Math.round((step.result.confidence || 0) * 100)}%</div>
             </div>
          )}
          
          {step.result && step.phase === 'Selection' && (
            <div className="bg-[#004a77]/20 border border-[#a8c7fa] p-4 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                 <CheckCircle2 size={64} className="text-[#a8c7fa]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                   <div className="px-2 py-0.5 rounded bg-[#a8c7fa] text-black text-[10px] font-bold uppercase tracking-wider">Winning Strategy</div>
                </div>
                <div className="text-sm font-bold text-white text-lg mb-2">{step.result.title}</div>
                <div className="text-xs text-gray-300 leading-relaxed">{step.result.reasoning}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ThinkingVisualizer: React.FC<{ process: ThinkingProcess }> = ({ process }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!process || process.trace.length === 0) return null;

  const isComplete = process.state === 'complete' || process.state === 'synthesizing';
  
  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-[#444746] bg-[#1e1f20] w-full max-w-2xl shadow-lg">
      <div 
        className="flex items-center justify-between px-4 py-3 bg-[#282a2c] cursor-pointer hover:bg-[#37393b] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} className={`${isComplete ? 'text-[#a8c7fa]' : 'text-[#a8c7fa] animate-pulse'}`} />
          <span className="text-xs font-medium text-gray-300">
            DeepThink Orchestrator
          </span>
          {process.state !== 'complete' && (
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
           
           {process.state !== 'complete' && (
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

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isThinking }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full gap-4 p-6 ${isUser ? 'bg-transparent' : 'bg-[#1e1f20]/50'}`}>
      <div className="flex-none mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-[#444746] flex items-center justify-center">
            <User size={18} className="text-white" />
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.isError ? 'bg-red-900/50' : 'bg-gradient-to-br from-[#4b90ff] to-[#ff5546]'}`}>
            {message.isError ? <AlertCircle size={18} className="text-red-200" /> : <Bot size={18} className="text-white" />}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden min-w-0">
        <div className="font-medium text-sm text-gray-400 mb-2 flex items-center gap-2">
          {isUser ? 'You' : 'Gemini 3 Pro'}
        </div>
        
        {/* DeepThink Visualizer */}
        {!isUser && message.thinkingProcess && (
          <ThinkingVisualizer process={message.thinkingProcess} />
        )}

        {/* Fallback Loading State */}
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
             !message.thinkingProcess && <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
