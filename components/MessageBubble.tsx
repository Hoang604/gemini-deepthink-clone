import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { Bot, User, AlertCircle, BrainCircuit } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isThinking?: boolean;
}

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
        <div className="font-medium text-sm text-gray-400 mb-1 flex items-center gap-2">
          {isUser ? 'You' : 'Gemini 3 Pro'}
          {!isUser && isThinking && (
             <span className="flex items-center gap-1 text-[#a8c7fa] text-xs bg-[#004a77]/20 px-2 py-0.5 rounded-full animate-pulse">
                <BrainCircuit size={12} />
                DeepThink Active
             </span>
          )}
        </div>
        
        <div className="markdown-body prose prose-invert max-w-none text-[15px] leading-relaxed text-[#e3e3e3]">
          {message.text ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text}
            </ReactMarkdown>
          ) : (
             <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
