import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Send,
  Sparkles,
  Sidebar as SidebarIcon,
  Layout,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import SettingsPanel from "./components/SettingsPanel";
import MessageBubble from "./components/MessageBubble";
import Workbench from "./components/Workbench";
import {
  ChatSession,
  Message,
  ModelConfig,
  GeminiModel,
  AppStats,
  Artifact,
} from "./types";
import { streamGeminiResponse } from "./services/orchestratorService";

const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * Parse all artifacts from model output.
 * Supports multiple artifacts in a single response.
 */
const parseAllArtifacts = (
  fullText: string
): { cleanText: string; artifacts: Partial<Artifact>[] } => {
  const artifactRegex =
    /<<(?<type>TSX|HTML|C|PYTHON|JS|TS|SQL)(?:\s+title="(?<title>.*?)")?>>([\s\S]*?)(<<END>>|$)/gi;

  const artifacts: Partial<Artifact>[] = [];
  let cleanText = fullText;
  let match;

  while ((match = artifactRegex.exec(fullText)) !== null) {
    const type = match[1].toLowerCase() as Artifact["type"];
    const title = match[2] || "Generated Code";
    const content = match[3] || "";
    const isComplete = match[4] === "<<END>>";

    artifacts.push({
      type,
      title,
      content,
      status: isComplete ? "complete" : "streaming",
      timestamp: Date.now(),
    });

    cleanText = cleanText.replace(
      match[0],
      `\n*[${type.toUpperCase()}: ${title}]*\n`
    );
  }

  return { cleanText, artifacts };
};

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [isWorkbenchMaximized, setIsWorkbenchMaximized] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
    null
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<AppStats>({
    flashCount: 0,
    proCount: 0,
    traces: [],
  });

  const [config, setConfig] = useState<ModelConfig>({
    model: GeminiModel.PRO_3_PREVIEW,
    temperature: 0.7,
    maxToTDepth: 2,
    forceDeepMode: true,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentMessages = currentSession?.messages || [];
  // Get the selected artifact, or fall back to latest
  const activeArtifact = selectedArtifactId
    ? currentSession?.artifacts?.find((a) => a.id === selectedArtifactId) ||
      null
    : currentSession?.artifacts?.[currentSession.artifacts.length - 1] || null;

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages, isGenerating]);

  useEffect(() => {
    if (sessions.length === 0) createNewSession();
  }, []);

  useEffect(() => {
    if (activeArtifact && !isWorkbenchOpen) {
      setIsWorkbenchOpen(true);
    }
  }, [activeArtifact?.id]);

  // Intercept console.log to display in sidebar
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      const message = args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        )
        .join(" ");
      setConsoleLogs((prev) => [...prev.slice(-50), message]);
    };
    return () => {
      console.log = originalLog;
    };
  }, []);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      shouldAutoScrollRef.current =
        scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      artifacts: [],
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    shouldAutoScrollRef.current = true;
    setIsWorkbenchOpen(false);
    setIsWorkbenchMaximized(false);
  };

  const handleCreateArtifact = () => {
    if (!currentSessionId) return;
    const newArtifact: Artifact = {
      id: generateId(),
      type: "tsx",
      title: "New Scratchpad",
      content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="p-8 flex items-center justify-center min-h-screen bg-slate-900 text-white font-sans">\n      <h1 className="text-4xl font-bold">Hello from Scratchpad</h1>\n    </div>\n  );\n}`,
      status: "complete",
      isVisible: true,
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;
        return {
          ...s,
          artifacts: [...s.artifacts, newArtifact],
        };
      })
    );
  };

  const handleUpdateArtifact = (artifactId: string, content: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSessionId) return s;
        return {
          ...s,
          artifacts: s.artifacts.map((a) =>
            a.id === artifactId ? { ...a, content } : a
          ),
        };
      })
    );
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentSessionId || isGenerating) return;
    shouldAutoScrollRef.current = true;
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      text: input.trim(),
      timestamp: Date.now(),
    };
    const botMsgId = generateId();
    const botMsgPlaceholder: Message = {
      id: botMsgId,
      role: "model",
      text: "",
      timestamp: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? {
              ...s,
              messages: [...s.messages, userMsg, botMsgPlaceholder],
              title:
                s.messages.length === 0 ? userMsg.text.slice(0, 30) : s.title,
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setInput("");
    setIsGenerating(true);
    let rawResponseAccumulator = "";
    let trackedArtifactIds: string[] = [];

    try {
      const { durationMs } = await streamGeminiResponse(
        currentSession!.messages,
        userMsg.text,
        config,
        (chunk) => {
          rawResponseAccumulator += chunk;
          const { cleanText, artifacts: parsedArtifacts } = parseAllArtifacts(
            rawResponseAccumulator
          );

          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== currentSessionId) return s;

              let updatedArtifacts = [...s.artifacts];

              // Process each parsed artifact
              parsedArtifacts.forEach((parsed, idx) => {
                if (idx < trackedArtifactIds.length) {
                  // Update existing artifact
                  const existingId = trackedArtifactIds[idx];
                  updatedArtifacts = updatedArtifacts.map((a) =>
                    a.id === existingId ? { ...a, ...(parsed as any) } : a
                  );
                } else {
                  // Create new artifact
                  const newId = generateId();
                  trackedArtifactIds.push(newId);
                  updatedArtifacts.push({
                    id: newId,
                    ...(parsed as any),
                    isVisible: true,
                  });
                }
              });

              return {
                ...s,
                artifacts: updatedArtifacts,
                messages: s.messages.map((m) =>
                  m.id === botMsgId
                    ? {
                        ...m,
                        text: cleanText,
                        artifactIds: [...trackedArtifactIds],
                      }
                    : m
                ),
              };
            })
          );
        },
        (p) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === botMsgId ? { ...m, thinkingProcess: p } : m
                    ),
                  }
                : s
            )
          );
        },
        (inc) =>
          setStats((prev) => ({
            ...prev,
            flashCount: prev.flashCount + inc.flash,
            proCount: prev.proCount + inc.pro,
          })),
        // ToT update callback
        (totState) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === botMsgId ? { ...m, totProcess: totState } : m
                    ),
                  }
                : s
            )
          );
        }
      );
      setStats((prev) => ({
        ...prev,
        traces: [
          {
            id: generateId(),
            timestamp: Date.now(),
            model: config.model,
            durationMs,
          },
          ...prev.traces,
        ].slice(0, 50),
      }));
    } catch (error) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === botMsgId
                    ? {
                        ...m,
                        text: "Generation failed. Verify API Key.",
                        isError: true,
                      }
                    : m
                ),
              }
            : s
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  };

  // Reset textarea height when input is cleared (e.g., after sending)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      if (input) {
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + "px";
      }
    }
  }, [input]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#131314] text-[#e3e3e3] font-inter">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => {
          setCurrentSessionId(id);
          const sess = sessions.find((s) => s.id === id);
          setIsWorkbenchOpen(!!sess?.artifacts.length);
          if (!sess?.artifacts.length) setIsWorkbenchMaximized(false);
        }}
        onNewChat={createNewSession}
        stats={stats}
        activeModel={config.model}
        consoleLogs={consoleLogs}
      />

      <div className="flex-1 flex flex-col min-w-0 relative transition-all duration-300">
        {!isWorkbenchMaximized && (
          <header className="flex items-center justify-between px-6 py-4 z-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-[#282a2c] rounded-full transition-colors text-gray-400"
              >
                <SidebarIcon size={20} />
              </button>
              <span className="font-medium text-lg flex items-center gap-2 text-white/90">
                Gemini 3{" "}
                {config.model === GeminiModel.PRO_3_PREVIEW ? "Pro" : "Flash"}
                <span className="text-[10px] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider font-bold shadow-lg shadow-blue-900/20">
                  DeepThink
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsWorkbenchOpen(!isWorkbenchOpen);
                  if (isWorkbenchOpen) setIsWorkbenchMaximized(false);
                }}
                className={`p-2 rounded-full transition-all relative ${
                  isWorkbenchOpen
                    ? "bg-[#282a2c] text-[#a8c7fa]"
                    : activeArtifact
                    ? "bg-[#004a77]/20 text-[#a8c7fa] animate-pulse ring-1 ring-[#004a77]"
                    : "text-gray-400 hover:bg-[#282a2c]"
                }`}
                title={isWorkbenchOpen ? "Hide Workbench" : "Show Workbench"}
              >
                <Layout size={20} />
                {activeArtifact && !isWorkbenchOpen && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#a8c7fa] rounded-full border-2 border-[#131314]"></span>
                )}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-[#282a2c] rounded-full transition-colors text-[#a8c7fa]"
              >
                <Sparkles size={20} />
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div
            className={`flex flex-col min-w-0 transition-all duration-300 h-full ${
              isWorkbenchOpen
                ? isWorkbenchMaximized
                  ? "w-0 opacity-0 overflow-hidden pointer-events-none"
                  : "w-[30%] opacity-100"
                : "w-full opacity-100"
            }`}
          >
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto scroll-smooth px-4"
            >
              {currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-6 relative group cursor-default">
                    <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full group-hover:bg-blue-500/20 transition-colors duration-500"></div>
                    <Sparkles
                      size={56}
                      className="relative z-10 text-[#a8c7fa] drop-shadow-[0_0_15px_rgba(168,199,250,0.5)]"
                    />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-medium mb-4 bg-gradient-to-r from-[#4b90ff] via-[#d96570] to-[#4b90ff] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient pb-1">
                    Gemini DeepThink Clone
                  </h1>
                  <p className="max-w-lg text-gray-400 text-lg font-light leading-relaxed">
                    A high-fidelity clone of Google's Gemini DeepThink.
                  </p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto py-8">
                  {currentMessages.map((msg) => {
                    // Get artifacts that belong to this message
                    const messageArtifacts = msg.artifactIds
                      ? currentSession?.artifacts.filter((a) =>
                          msg.artifactIds!.includes(a.id)
                        ) || []
                      : [];

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        isThinking={
                          isGenerating && msg.role === "model" && !msg.text
                        }
                        artifacts={messageArtifacts}
                        onOpenArtifact={(id) => {
                          setSelectedArtifactId(id);
                          setIsWorkbenchOpen(true);
                        }}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="p-6 bg-[#131314]">
              <div className="max-w-3xl mx-auto relative bg-[#1e1f20] rounded-[32px] ring-1 ring-white/5 focus-within:ring-white/10 transition-all shadow-xl hover:shadow-2xl hover:shadow-black/20">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResizeTextarea();
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    (e.preventDefault(), handleSendMessage())
                  }
                  placeholder="Ask anything..."
                  rows={1}
                  className="w-full bg-transparent text-white px-8 py-5 pr-14 focus:outline-none resize-none max-h-48 rounded-[32px] placeholder:text-gray-500 text-lg font-light"
                />
                <div className="absolute right-3 bottom-3">
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isGenerating}
                    className={`p-3 rounded-full transition-all duration-300 ${
                      input.trim() && !isGenerating
                        ? "bg-white text-black shadow-lg shadow-white/10 hover:scale-105"
                        : "text-gray-600"
                    }`}
                  >
                    <Send
                      size={20}
                      className={isGenerating ? "opacity-50" : ""}
                    />
                  </button>
                </div>
              </div>
              <p className="text-center text-[11px] text-gray-600 mt-4">
                Gemini may display inaccurate info, including about people, so
                double-check its responses.
              </p>
            </div>
          </div>

          {isWorkbenchOpen && (
            <div
              className={`h-full flex-none shadow-2xl z-10 transition-all duration-300 pb-6 pr-6 ${
                isWorkbenchMaximized ? "w-full" : "w-[70%]"
              }`}
            >
              <Workbench
                artifact={activeArtifact}
                isOpen={isWorkbenchOpen}
                onClose={() => {
                  setIsWorkbenchOpen(false);
                  setIsWorkbenchMaximized(false);
                }}
                isMaximized={isWorkbenchMaximized}
                onToggleMaximize={() =>
                  setIsWorkbenchMaximized(!isWorkbenchMaximized)
                }
                onCreateArtifact={handleCreateArtifact}
                onUpdateContent={(content) =>
                  activeArtifact &&
                  handleUpdateArtifact(activeArtifact.id, content)
                }
              />
            </div>
          )}
        </div>

        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onConfigChange={setConfig}
          stats={stats}
        />
      </div>
    </div>
  );
};

export default App;
