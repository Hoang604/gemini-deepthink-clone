import React, { useEffect, useState, useMemo, useRef } from "react";
import { transform } from "sucrase";
import {
  AlertCircle,
  RefreshCw,
  Terminal,
  Cpu,
  Box,
  ShieldCheck,
} from "lucide-react";

interface PreviewFrameProps {
  code: string;
  type: string;
  status: "streaming" | "complete";
}

/**
 * Generates the HTML document string for the sandboxed iframe.
 * Uses a robust Blob + Dynamic Import strategy to load the user's code as a module.
 */
const generateSrcDoc = (transpiledCode: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; background: #131314; color: #e3e3e3; font-family: -apple-system, sans-serif; overflow-x: hidden; }
    #root { min-height: 100vh; }
  </style>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    // Robust error reporting to parent
    window.onerror = function(message, source, lineno, colno, error) {
      window.parent.postMessage({
        type: 'PREVIEW_ERROR',
        payload: { message: message, type: 'Runtime Error' }
      }, '*');
    };
    window.addEventListener('unhandledrejection', function(event) {
      window.parent.postMessage({
        type: 'PREVIEW_ERROR',
        payload: { message: event.reason ? event.reason.message : 'Unhandled Promise Rejection', type: 'Async Error' }
      }, '*');
    });
  </script>
  <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.3.1",
        "react-dom": "https://esm.sh/react-dom@18.3.1",
        "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
        "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
        "lucide-react": "https://esm.sh/lucide-react@0.294.0",
        "framer-motion": "https://esm.sh/framer-motion@11.15.0?external=react,react-dom",
        "recharts": "https://esm.sh/recharts@2.12.7?external=react,react-dom"
      }
    }
  </script>
</head>
<body>
  <div id="root"></div>
  
  <script type="module">
    import React from 'react';
    import { createRoot } from 'react-dom/client';

    // The User's Code (Transpiled)
    const rawCode = ${JSON.stringify(transpiledCode)};

    async function boot() {
      try {
        // 1. Create a Blob from the user's code to treat it as a virtual file/module
        const blob = new Blob([rawCode], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);

        // 2. Dynamically import the blob. This forces the browser to resolve imports
        //    and return the exports object, regardless of what the variables are named.
        const userModule = await import(url);
        
        // 3. Find the main component (default export)
        const EntryPoint = userModule.default;

        if (!EntryPoint) {
           throw new Error("No default export found. Please ensure your component is exported as 'export default function...' or 'export default class...'");
        }

        // 4. Mount
        const rootElement = document.getElementById('root');
        const root = createRoot(rootElement);
        root.render(React.createElement(EntryPoint));

        // Cleanup
        URL.revokeObjectURL(url);

      } catch (err) {
        window.parent.postMessage({
          type: 'PREVIEW_ERROR',
          payload: { message: err.message, type: 'Execution Error' }
        }, '*');
      }
    }

    boot();
  </script>
</body>
</html>
  `;
};

const PreviewFrame: React.FC<PreviewFrameProps> = ({ code, type, status }) => {
  const [error, setError] = useState<{ message: string; type: string } | null>(
    null
  );
  const [transpiled, setTranspiled] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // We only attempt transpilation once generation is complete to ensure a stable module environment.
    if (status === "complete" && type === "tsx") {
      try {
        const result = transform(code, {
          transforms: ["typescript", "jsx"],
          jsxRuntime: "classic", // Classic is safer for standard component injection
        }).code;
        setTranspiled(result);
        setError(null);
      } catch (err: any) {
        setError({ message: err.message, type: "Compilation Error" });
      }
    }
  }, [code, status, type]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "PREVIEW_ERROR") {
        setError(event.data.payload);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const srcDocContent = useMemo(() => {
    if (!transpiled) return "";
    return generateSrcDoc(transpiled);
  }, [transpiled, key]);

  // Mermaid diagram rendering
  if (type === "mermaid") {
    const mermaidSrcDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { 
      margin: 0; 
      padding: 24px; 
      background: #131314; 
      display: flex; 
      justify-content: center; 
      align-items: flex-start;
      min-height: 100vh;
    }
    .mermaid { 
      background: transparent; 
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head>
<body>
  <pre class="mermaid">
${code}
  </pre>
  <script>
    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'dark',
      themeVariables: {
        primaryColor: '#004a77',
        primaryTextColor: '#e3e3e3',
        primaryBorderColor: '#444746',
        lineColor: '#a8c7fa',
        secondaryColor: '#282a2c',
        tertiaryColor: '#1e1f20',
        background: '#131314',
        mainBkg: '#1e1f20',
        nodeBorder: '#444746',
        clusterBkg: '#282a2c',
        titleColor: '#e3e3e3',
        edgeLabelBackground: '#1e1f20'
      }
    });
  </script>
</body>
</html>
    `;

    return (
      <div className="h-full w-full bg-[#131314] relative flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-[#1e1f20] border-b border-[#444746] z-10 flex-none h-10">
          <div className="flex items-center gap-2">
            <Box size={14} className="text-[#a8c7fa]" />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              Mermaid Diagram
            </span>
          </div>
          <button
            onClick={() => setKey((k) => k + 1)}
            className="p-1 hover:bg-[#282a2c] rounded transition-colors text-gray-500 hover:text-white"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <iframe
            key={key}
            title="Mermaid Diagram Preview"
            srcDoc={mermaidSrcDoc}
            className="w-full h-full border-none min-h-[400px]"
          />
        </div>
      </div>
    );
  }

  if (type !== "tsx") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-[#131314]">
        <Terminal size={40} className="mb-4 opacity-20" />
        <h3 className="text-sm font-medium">Non-Visual Artifact</h3>
        <p className="text-xs mt-2 max-w-[240px]">
          This code is not meant for rendering.
        </p>
      </div>
    );
  }

  if (status === "streaming") {
    return (
      <div className="h-full w-full bg-[#131314] flex flex-col items-center justify-center p-12 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#a8c7fa]/20 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative p-6 bg-[#1e1f20] rounded-3xl border border-[#444746] shadow-2xl">
            <Cpu size={48} className="text-[#a8c7fa] animate-pulse" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[#e3e3e3] mb-2">
          Syncing Environment...
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Generating output from the DeepThink model.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#131314] relative flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1f20] border-b border-[#444746] z-10 flex-none h-10">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
            Secure Sandbox
          </span>
        </div>
        <button
          onClick={() => {
            setError(null);
            setKey((k) => k + 1);
          }}
          className="p-1 hover:bg-[#282a2c] rounded transition-colors text-gray-500 hover:text-white"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-white">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-red-900/95 border border-red-500 p-4 rounded-lg flex gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="text-red-400 flex-none" size={20} />
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-bold text-red-200 uppercase tracking-tighter mb-1">
                {error.type}
              </p>
              <p className="text-xs text-red-100 font-mono break-words leading-relaxed">
                {error.message}
              </p>
            </div>
          </div>
        )}

        {srcDocContent ? (
          <iframe
            key={key}
            title="Artifact Preview"
            srcDoc={srcDocContent}
            className="w-full h-full border-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#131314]">
            <RefreshCw className="animate-spin text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewFrame;
