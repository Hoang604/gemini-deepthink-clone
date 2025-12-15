import React, { useState, useRef, useEffect } from 'react';
import { Menu, Send, Sparkles, StopCircle, Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import MessageBubble from './components/MessageBubble';
import { ChatSession, Message, ModelConfig, GeminiModel, DEFAULT_THINKING_BUDGET } from './types';
import { streamGeminiResponse } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid'; // Actually we will use simple random string for ID to avoid adding package

const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  // State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Configuration
  const [config, setConfig] = useState<ModelConfig>({
    model: GeminiModel.PRO_3_PREVIEW,
    temperature: 0.7,
    thinkingBudget: DEFAULT_THINKING_BUDGET,
    enableThinking: true,
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived state
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentMessages = currentSession?.messages || [];

  // Effects
  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, currentMessages.length > 0 ? currentMessages[currentMessages.length - 1].text : null]);

  useEffect(() => {
    // Initialize first session if none exists
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  // Handlers
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentSessionId || isGenerating) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      text: input.trim(),
      timestamp: Date.now()
    };

    const botMsgId = generateId();
    const botMsgPlaceholder: Message = {
      id: botMsgId,
      role: 'model',
      text: '', // Start empty
      timestamp: Date.now()
    };

    // Update UI immediately
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          messages: [...session.messages, userMsg, botMsgPlaceholder],
          title: session.messages.length === 0 ? userMsg.text.slice(0, 30) : session.title,
          updatedAt: Date.now()
        };
      }
      return session;
    }));

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsGenerating(true);

    try {
      // Prepare history (excluding the current user message and the placeholder)
      const history = currentSession!.messages;

      let fullResponseText = '';

      await streamGeminiResponse(
        history,
        userMsg.text,
        config,
        (chunk) => {
          fullResponseText += chunk;
          // Update the specific message in state
          setSessions(prev => prev.map(session => {
            if (session.id === currentSessionId) {
              const updatedMessages = session.messages.map(msg => 
                msg.id === botMsgId ? { ...msg, text: fullResponseText } : msg
              );
              return { ...session, messages: updatedMessages };
            }
            return session;
          }));
        }
      );
    } catch (error) {
      // Handle error in UI
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          const updatedMessages = session.messages.map(msg => 
            msg.id === botMsgId ? { 
              ...msg, 
              text: "Error: Failed to generate response. Please check your API key or connection.", 
              isError: true 
            } : msg
          );
          return { ...session, messages: updatedMessages };
        }
        return session;
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#131314] text-[#e3e3e3]">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => { setCurrentSessionId(id); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
        onNewChat={createNewSession}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#444746] bg-[#131314]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#282a2c] rounded-full transition-colors text-gray-400"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <span className="font-medium text-lg flex items-center gap-2">
                Gemini 3 Pro 
                {config.enableThinking && <span className="text-[10px] bg-[#004a77] text-[#c2e7ff] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">DeepThink</span>}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-[#282a2c] rounded-full transition-colors text-[#a8c7fa]"
            title="Configure DeepThink"
          >
            <Sparkles size={20} />
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4b90ff] to-[#ff5546] rounded-full mb-6 blur-md animate-pulse"></div>
              <h2 className="text-2xl font-semibold mb-2">Hello, Human.</h2>
              <p className="max-w-md text-gray-400">
                I'm Gemini 3 Pro with DeepThink. I can reason through complex problems. 
                Configure my thinking budget in the settings.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8">
              {currentMessages.map(msg => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isThinking={isGenerating && msg.role === 'model' && msg.text.length < 50 && config.enableThinking}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#131314]">
          <div className="max-w-3xl mx-auto relative bg-[#1e1f20] rounded-[28px] border border-[#444746] focus-within:border-[#a8c7fa] transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResizeTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="w-full bg-transparent text-white px-6 py-4 pr-14 focus:outline-none resize-none max-h-48 rounded-[28px]"
              disabled={isGenerating}
            />
            <div className="absolute right-2 bottom-2">
              <button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isGenerating}
                className={`p-2 rounded-full transition-all ${
                  input.trim() && !isGenerating
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-transparent text-gray-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? <StopCircle size={20} className="animate-pulse" /> : <Send size={20} />}
              </button>
            </div>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-500">
              Gemini may display inaccurate info, including about people, so double-check its responses.
            </p>
          </div>
        </div>

        {/* Settings Modal */}
        <SettingsPanel 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onConfigChange={setConfig}
        />
      </div>
    </div>
  );
};

export default App;
