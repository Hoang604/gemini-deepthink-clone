
import React, { useState, useEffect, useRef } from 'react';
import { Code2, Play, Copy, X, Terminal, FileCode, Check, Braces, Maximize2, Minimize2, Edit3, Plus, Share2, History, Cloud } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { Artifact } from '../types';
import PreviewFrame from './PreviewFrame';

interface WorkbenchProps {
  artifact: Artifact | null;
  onClose: () => void;
  isOpen: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onUpdateContent?: (content: string) => void;
  onCreateArtifact?: () => void;
}

const Workbench: React.FC<WorkbenchProps> = ({ artifact, onClose, isOpen, isMaximized, onToggleMaximize, onUpdateContent, onCreateArtifact }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const prevStatusRef = useRef<'streaming' | 'complete' | null>(null);

  // HANDLE TAB SWITCHING LOGIC
  useEffect(() => {
    if (!artifact) {
      prevStatusRef.current = null;
      return;
    }

    // Rule 1: Always force 'code' tab when a new artifact starts streaming
    if (artifact.status === 'streaming' && prevStatusRef.current !== 'streaming') {
      setActiveTab('code');
    }

    // Rule 2: Auto-switch to 'preview' tab when artifact transitions to 'complete'
    if (artifact.status === 'complete' && prevStatusRef.current === 'streaming') {
      setActiveTab('preview');
    }

    prevStatusRef.current = artifact.status;
  }, [artifact?.id, artifact?.status]);

  const handleCopy = () => {
    if (artifact?.content) {
      navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to determine Prism language class
  const getLanguage = (type: string) => {
    switch (type) {
      case 'tsx':
      case 'ts': return 'typescript';
      case 'js': return 'javascript';
      case 'python': return 'python';
      case 'html': return 'markup';
      case 'c': return 'c';
      default: return 'clike';
    }
  };

  // Syntax highlighter function using global Prism
  const highlightCode = (code: string) => {
    if (typeof window !== 'undefined' && (window as any).Prism && artifact) {
      const prism = (window as any).Prism;
      const lang = getLanguage(artifact.type);
      // Fallback to plain text if grammar not loaded
      const grammar = prism.languages[lang] || prism.languages.clike;
      return prism.highlight(code, grammar, lang);
    }
    return code; // Fallback
  };

  if (!isOpen) return null;

  if (!artifact) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1e1f20] text-gray-500 rounded-2xl border border-white/5 p-8 shadow-2xl">
        <div className="w-20 h-20 rounded-3xl bg-[#282a2c] border border-[#444746] flex items-center justify-center mb-6 text-gray-700 shadow-2xl relative">
          <Terminal size={40} className="text-gray-600" />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#004a77] flex items-center justify-center text-[#c2e7ff] border-4 border-[#1e1f20]">
            <Plus size={16} />
          </div>
        </div>
        <h3 className="text-lg font-medium text-[#e3e3e3] mb-2">Workbench Empty</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-8">
          The model hasn't generated any code yet, or you haven't started a scratchpad.
        </p>
        
        <div className="flex gap-3">
          <button 
            onClick={onCreateArtifact}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#a8c7fa] hover:bg-[#c2e7ff] text-black font-semibold rounded-full transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} />
            Start Coding
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-[#282a2c] hover:bg-[#37393b] text-gray-300 rounded-full transition-colors border border-[#444746]"
          >
            Close Pane
          </button>
        </div>
      </div>
    );
  }

  const isStreaming = artifact.status === 'streaming';
  const lineCount = artifact.content.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="h-full flex flex-col bg-[#1e1f20] rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
      {/* GEMINI-STYLE HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e1f20] border-b border-white/5 flex-none h-16">
        
        {/* Left: File Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-[#282a2c] text-gray-300">
             <FileCode size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-white truncate max-w-[200px]">{artifact.title}</span>
               {isStreaming ? (
                 <Cloud size={12} className="text-[#a8c7fa] animate-pulse" />
               ) : (
                 <Cloud size={12} className="text-gray-500" />
               )}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">{artifact.type.toUpperCase()}</span>
          </div>
        </div>

        {/* Center: Tabs Pill (Segmented Control) */}
        <div className="flex items-center bg-[#282a2c] rounded-full p-1 mx-4">
          <button 
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'code' 
                ? 'bg-[#004a77] text-[#c2e7ff] shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code2 size={14} />
            Code
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'preview' 
                ? 'bg-[#004a77] text-[#c2e7ff] shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Play size={14} />
            Preview
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
           <button 
             className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#a8c7fa] hover:bg-[#c2e7ff] text-[#003355] rounded-full text-xs font-bold transition-colors"
             title="Share Artifact"
           >
             <Share2 size={14} />
             Share
           </button>
           
           <button onClick={handleCopy} className="p-2 hover:bg-[#282a2c] rounded-full text-gray-400 hover:text-white transition-colors">
              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
           </button>
           
           <button onClick={onToggleMaximize} className="p-2 hover:bg-[#282a2c] rounded-full text-gray-400 hover:text-white transition-colors">
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
           </button>

           <button onClick={onClose} className="p-2 hover:bg-[#282a2c] rounded-full text-gray-400 hover:text-white transition-colors">
              <X size={18} />
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[#131314]">
        {activeTab === 'code' ? (
          <div className="h-full relative flex flex-col group">
            <div className="flex-1 relative overflow-auto custom-scrollbar flex bg-[#131314]">
               {/* Line Numbers Gutter */}
               <div className="flex-none w-12 bg-[#131314] border-r border-white/5 text-right py-4 pr-3 select-none">
                 {lineNumbers.map(n => (
                   <div key={n} className="text-[14px] leading-[1.6] text-gray-500 font-mono font-medium">
                     {n}
                   </div>
                 ))}
               </div>

               {/* Syntax Highlighted Editor */}
               <div className="flex-1 relative font-mono text-[14px] leading-[1.6]">
                 <Editor
                   value={artifact.content}
                   onValueChange={(code) => onUpdateContent?.(code)}
                   highlight={highlightCode}
                   padding={16}
                   disabled={isStreaming}
                   className="prism-editor min-h-full"
                   style={{
                     fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                     fontSize: 14,
                     backgroundColor: 'transparent',
                   }}
                   textareaClassName="focus:outline-none"
                 />
               </div>
            </div>
            
            {isStreaming && (
              <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[#282a2c] border border-[#444746] px-4 py-2 rounded-full text-xs text-gray-300 shadow-xl z-10 animate-in fade-in slide-in-from-bottom-2">
                <span className="w-2 h-2 bg-[#a8c7fa] rounded-full animate-pulse"></span>
                Generating...
              </div>
            )}
          </div>
        ) : (
          <PreviewFrame code={artifact.content} type={artifact.type} status={artifact.status} />
        )}
      </div>
    </div>
  );
};

export default Workbench;
