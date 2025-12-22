
import React, { useState, useRef, useEffect } from 'react';
import { Menu, Send, Sparkles, StopCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import MessageBubble from './components/MessageBubble';
import { ChatSession, Message, ModelConfig, GeminiModel, AppStats, ApiTrace, ThinkingProcess } from './types';
import { streamGeminiResponse } from './services/geminiService';

const generateId = () => Math.random().toString(36).substring(2, 15);

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [stats, setStats] = useState<AppStats>({ flashCount: 0, proCount: 0, traces: [] });
  
  const [config, setConfig] = useState<ModelConfig>({
    model: GeminiModel.PRO_3_PREVIEW,
    temperature: 0.7,
    thinkingLevel: 'high',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentMessages = currentSession?.messages || [];

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages]);

  useEffect(() => {
    if (sessions.length === 0) createNewSession();
  }, []);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    shouldAutoScrollRef.current = true;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentSessionId || isGenerating) return;

    shouldAutoScrollRef.current = true;
    const userMsg: Message = { id: generateId(), role: 'user', text: input.trim(), timestamp: Date.now() };
    const botMsgId = generateId();
    const botMsgPlaceholder: Message = { id: botMsgId, role: 'model', text: '', timestamp: Date.now() };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? {
      ...s, 
      messages: [...s.messages, userMsg, botMsgPlaceholder],
      title: s.messages.length === 0 ? userMsg.text.slice(0, 30) : s.title,
      updatedAt: Date.now()
    } : s));

    setInput('');
    setIsGenerating(true);

    try {
      let fullResponseText = '';
      const { durationMs } = await streamGeminiResponse(
        currentSession!.messages, userMsg.text, config,
        (chunk) => {
          fullResponseText += chunk;
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s, messages: s.messages.map(m => m.id === botMsgId ? { ...m, text: fullResponseText } : m)
          } : s));
        },
        (p) => {
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s, messages: s.messages.map(m => m.id === botMsgId ? { ...m, thinkingProcess: p } : m)
          } : s));
        },
        (inc) => setStats(prev => ({ ...prev, flashCount: prev.flashCount + inc.flash, proCount: prev.proCount + inc.pro }))
      );

      setStats(prev => ({ ...prev, traces: [{ id: generateId(), timestamp: Date.now(), model: config.model, durationMs }, ...prev.traces].slice(0, 50) }));
    } catch (error) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s, messages: s.messages.map(m => m.id === botMsgId ? { ...m, text: "Generation failed. Verify API Key.", isError: true } : m)
      } : s));
    } finally {
      setIsGenerating(false);
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
        isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions} currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId} onNewChat={createNewSession}
        stats={stats} activeModel={config.model}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#444746] bg-[#131314]">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[#282a2c] rounded-full transition-colors text-gray-400">
              <Menu size={20} />
            </button>
            <span className="font-medium text-lg flex items-center gap-2">
              Gemini 3 {config.model === GeminiModel.PRO_3_PREVIEW ? 'Pro' : 'Flash'}
              <span className="text-[10px] bg-[#004a77] text-[#c2e7ff] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">DeepThink</span>
            </span>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-[#282a2c] rounded-full transition-colors text-[#a8c7fa]">
            <Sparkles size={20} />
          </button>
        </header>

        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scroll-smooth">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-50">
              <div className="w-16 h-16 bg-gradient-to-br from-[#4b90ff] to-[#ff5546] rounded-full mb-6 blur-md"></div>
              <h2 className="text-2xl font-semibold mb-2">Ready to Think.</h2>
              <p className="max-w-md text-gray-400">Select a model and reasoning level to begin.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-8">
              {currentMessages.map(msg => <MessageBubble key={msg.id} message={msg} isThinking={isGenerating && msg.role === 'model' && !msg.text} />)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 bg-[#131314]">
          <div className="max-w-3xl mx-auto relative bg-[#1e1f20] rounded-[28px] border border-[#444746] focus-within:border-[#a8c7fa]">
            <textarea
              ref={textareaRef} value={input}
              onChange={(e) => { setInput(e.target.value); autoResizeTextarea(); }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
              placeholder="DeepThink is listening..." rows={1}
              className="w-full bg-transparent text-white px-6 py-4 pr-14 focus:outline-none resize-none max-h-48 rounded-[28px]"
            />
            <div className="absolute right-2 bottom-2">
              <button onClick={handleSendMessage} disabled={!input.trim() || isGenerating} className={`p-2 rounded-full ${input.trim() && !isGenerating ? 'bg-white text-black' : 'text-gray-500'}`}>
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={config} onConfigChange={setConfig} stats={stats} />
      </div>
    </div>
  );
};

export default App;
