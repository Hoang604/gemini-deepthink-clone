
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
        className={`fixed md:relative z-30 flex flex-col h-full bg-[#18181a] transition-all duration-300 ${
          isOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0'
        } overflow-hidden`}
      >
        <div className="p-4 flex-none mt-2">
          <button 
            onClick={onNewChat}
            className="w-full flex items-center gap-3 bg-[#202124] hover:bg-[#303134] text-[#e3e3e3] px-4 py-3.5 rounded-full transition-all text-sm font-medium shadow-sm hover:shadow-md ring-1 ring-white/5"
          >
            <div className="bg-[#2c2d31] p-1 rounded-full text-gray-300">
               <MessageSquarePlus size={16} />
            </div>
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="text-[10px] font-bold text-gray-500 px-5 py-3 uppercase tracking-widest opacity-80">Recent</div>
          <div className="space-y-0.5 px-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-full transition-all text-left truncate group ${
                  currentSessionId === session.id 
                    ? 'bg-[#004a77]/40 text-[#c2e7ff] font-medium' 
                    : 'text-[#e3e3e3] hover:bg-[#282a2c] text-gray-400'
                }`}
              >
                <MessageSquare size={14} className={`flex-none ${currentSessionId === session.id ? 'text-[#c2e7ff]' : 'text-gray-600 group-hover:text-gray-400'}`} />
                <span className="truncate">{session.title || 'Untitled Chat'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 flex-none bg-[#18181a]">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 px-1">
             <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${
               activeModel === GeminiModel.PRO_3_PREVIEW ? 'bg-emerald-500 text-emerald-500' : 'bg-blue-400 text-blue-400'
             }`}></div>
             {activeModel === GeminiModel.PRO_3_PREVIEW ? 'Gemini 3 Pro' : 'Gemini 3 Flash'}
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 bg-[#202124] rounded-xl p-3 border border-white/5">
             <div className="flex items-center gap-1.5">
               <span className="font-bold text-[#e3e3e3] text-xs">{stats.flashCount}</span> Flash
             </div>
             <div className="w-px h-3 bg-gray-700"></div>
             <div className="flex items-center gap-1.5">
               <span className="font-bold text-[#e3e3e3] text-xs">{stats.proCount}</span> Pro
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
