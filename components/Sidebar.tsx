
import React from 'react';
import { MessageSquarePlus, MessageSquare } from 'lucide-react';
import { ChatSession, AppStats, GeminiModel } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  stats: AppStats;
  activeModel: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  stats,
  activeModel
}) => {
  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      <div 
        className={`fixed md:relative z-30 flex flex-col h-full bg-[#1e1f20] transition-all duration-300 border-r border-[#444746] ${
          isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0'
        } overflow-hidden`}
      >
        <div className="p-4 flex-none">
          <button 
            onClick={onNewChat}
            className="w-full flex items-center gap-3 bg-[#282a2c] hover:bg-[#37393b] text-[#e3e3e3] px-4 py-3 rounded-full transition-colors text-sm font-medium"
          >
            <MessageSquarePlus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="text-xs font-medium text-gray-400 px-4 py-2 uppercase tracking-wider">Recent</div>
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm rounded-full transition-colors text-left truncate ${
                  currentSessionId === session.id 
                    ? 'bg-[#004a77] text-[#c2e7ff]' 
                    : 'text-[#e3e3e3] hover:bg-[#282a2c]'
                }`}
              >
                <MessageSquare size={16} className="flex-none" />
                <span className="truncate">{session.title || 'Untitled Chat'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#444746] flex-none bg-[#1e1f20]">
          <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
             <div className={`w-2 h-2 rounded-full animate-pulse ${
               activeModel === GeminiModel.PRO_3_PREVIEW ? 'bg-green-500' : 'bg-teal-400'
             }`}></div>
             {activeModel === GeminiModel.PRO_3_PREVIEW ? 'Gemini 3 Pro Active' : 'Gemini 3 Flash Active'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 bg-[#282a2c] rounded-lg p-2">
             <div className="flex items-center gap-1">
               <span className="font-bold text-[#a8c7fa]">{stats.flashCount}</span> Flash
             </div>
             <div className="w-px h-3 bg-gray-600"></div>
             <div className="flex items-center gap-1">
               <span className="font-bold text-[#a8c7fa]">{stats.proCount}</span> Pro
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
