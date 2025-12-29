import React, { useState, useEffect } from 'react';
import { Code2, Play, Copy, X, Terminal, FileCode, Check, Braces, Maximize2, Minimize2 } from 'lucide-react';
import { Artifact } from '../types';

interface WorkbenchProps {
  artifact: Artifact | null;
  onClose: () => void;
  isOpen: boolean;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

const Workbench: React.FC<WorkbenchProps> = ({ artifact, onClose, isOpen, isMaximized, onToggleMaximize }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Auto-switch to code when a new streaming artifact appears
    if (artifact?.status === 'streaming') {
      setActiveTab('code');
    }
  }, [artifact?.id]);

  const handleCopy = () => {
    if (artifact?.content) {
      navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  if (!artifact) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#131314] text-gray-500 border-l border-[#444746]">
        <div className="w-16 h-16 rounded-2xl bg-[#1e1f20] border border-[#444746] flex items-center justify-center mb-4">
          <Terminal size={32} className="opacity-50" />
        </div>
        <p className="text-sm font-medium">Workbench Ready</p>
        <p className="text-xs opacity-60 mt-2 max-w-[200px] text-center">Generate code to see it appear here in the artifacts stage.</p>
      </div>
    );
  }

  const getIcon = () => {
    switch (artifact.type) {
      case 'tsx': 
      case 'ts': 
      case 'js': return <Code2 size={16} className="text-[#a8c7fa]" />;
      case 'html': return <FileCode size={16} className="text-orange-400" />;
      case 'c': return <Terminal size={16} className="text-green-400" />;
      case 'python': return <Terminal size={16} className="text-blue-400" />;
      default: return <Braces size={16} />;
    }
  };

  const getLanguageLabel = () => {
    switch (artifact.type) {
      case 'tsx': return 'React / TypeScript';
      case 'ts': return 'TypeScript';
      case 'js': return 'JavaScript';
      case 'html': return 'HTML5';
      case 'c': return 'C / C++';
      case 'python': return 'Python 3';
      default: return 'Plain Text';
    }
  };

  return (
    <div className={`h-full flex flex-col bg-[#1e1f20] border-l border-[#444746] transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#444746] bg-[#131314]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-lg bg-[#282a2c] border border-[#444746]">
            {getIcon()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#e3e3e3] truncate">
              {artifact.title || 'Untitled Artifact'}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {getLanguageLabel()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
           <button 
              onClick={onToggleMaximize} 
              className="p-2 hover:bg-[#282a2c] rounded-full text-gray-400 transition-colors"
              title={isMaximized ? "Restore Chat" : "Maximize Workbench"}
            >
             {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
           </button>
           <button 
              onClick={onClose} 
              className="p-2 hover:bg-[#282a2c] rounded-full text-gray-400 transition-colors"
              title="Close Workbench"
            >
             <X size={18} />
           </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1f20] border-b border-[#444746]">
         <div className="flex p-1 bg-[#131314] rounded-lg border border-[#444746]">
            <button 
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'code' ? 'bg-[#282a2c] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Code2 size={14} />
              Code
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-[#282a2c] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Play size={14} />
              Preview
            </button>
         </div>

         <div className="flex items-center gap-2">
            <button 
              onClick={handleCopy}
              className="p-2 hover:bg-[#282a2c] rounded-lg text-gray-400 transition-colors relative"
              title="Copy to Clipboard"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative group">
        {activeTab === 'code' ? (
          <div className="h-full overflow-auto custom-scrollbar p-4 bg-[#131314]">
            <pre className="font-mono text-sm text-[#e3e3e3] leading-relaxed whitespace-pre-wrap">
              <code>{artifact.content}</code>
              {artifact.status === 'streaming' && (
                <span className="inline-block w-2 h-4 bg-[#a8c7fa] animate-pulse ml-1 align-middle" />
              )}
            </pre>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-[#131314] text-gray-500 relative">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
             <div className="z-10 text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#1e1f20] border border-[#444746] flex items-center justify-center">
                  <Play size={32} className="text-gray-600" />
                </div>
                <div>
                   <h3 className="text-lg font-medium text-gray-300">Execution Engine Offline</h3>
                   <p className="text-xs text-gray-500 mt-1">Artifact Slice 1: Visualization Only</p>
                </div>
                <div className="px-4 py-2 bg-[#282a2c] rounded border border-[#444746] text-xs font-mono text-[#a8c7fa]">
                   Render logic pending implementation in Slice 2
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workbench;