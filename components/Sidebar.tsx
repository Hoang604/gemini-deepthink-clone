import React from 'react';
import { MessageSquarePlus, MessageSquare, Menu, Settings as SettingsIcon } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      {/* Sidebar Container */}
      <div 
        className={`fixed md:relative z-30 flex flex-col h-full bg-[#1e1f20] transition-all duration-300 ease-in-out border-r border-[#444746] ${
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

        <div className="p-4 border-t border-[#444746] flex-none">
          <div className="flex items-center gap-2 text-xs text-gray-500">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             Gemini 3 Pro Active
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
