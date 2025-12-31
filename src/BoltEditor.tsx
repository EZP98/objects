/**
 * BoltEditor - Simplified AI Code Editor
 *
 * Like bolt.diy: AI generates code, you can edit it, and see live preview.
 * No complex canvas system - just code and preview.
 */

import React, { useState, useRef, useEffect, Suspense, lazy, useCallback } from 'react';

// Lazy load heavy components
const MonacoEditor = lazy(() => import('@monaco-editor/react'));
const WebContainerPreview = lazy(() => import('./components/WebContainerPreview').then(m => ({ default: m.default })));

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  content?: string;
}

// Default project files
const DEFAULT_FILES: Record<string, string> = {
  'src/App.tsx': `export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-4">Welcome</h1>
        <p className="text-xl opacity-80">Ask AI to generate something!</p>
      </div>
    </div>
  );
}`,
  'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Generated App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`,
  'package.json': `{
  "name": "ai-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}`,
  'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};`,
  'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
};

// Supabase config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const AI_ENDPOINT = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ai-chat` : '';

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full bg-zinc-900">
    <div className="animate-pulse text-zinc-500">Loading...</div>
  </div>
);

export default function BoltEditor() {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>(DEFAULT_FILES);
  const [currentFile, setCurrentFile] = useState('src/App.tsx');
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(500);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewRef = useRef<any>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, assistantMessage]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          mode: 'code',
          model: 'claude-sonnet-4-5-20250929',
          projectContext: `Current files:\n${Object.entries(files).map(([path, content]) =>
            `### ${path}\n\`\`\`tsx\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\n\`\`\``
          ).join('\n\n')}`,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            const lines = event.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    fullContent += parsed.text;
                    setMessages(prev =>
                      prev.map(m =>
                        m.id === assistantMessage.id
                          ? { ...m, content: fullContent }
                          : m
                      )
                    );
                  }
                } catch {}
              }
            }
          }
        }
      }

      // Extract code from response
      const codeMatch = fullContent.match(/```(?:tsx?|jsx?)\n([\s\S]*?)```/);
      if (codeMatch) {
        const newCode = codeMatch[1].trim();
        setFiles(prev => ({
          ...prev,
          'src/App.tsx': newCode,
        }));

        // Update preview
        if (previewRef.current?.updateFiles) {
          previewRef.current.updateFiles({
            ...files,
            'src/App.tsx': newCode,
          });
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: m.content + '\n\n*[Interrotto]*' }
              : m
          )
        );
      } else {
        console.error('AI error:', error);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: 'Errore di connessione. Riprova.' }
              : m
          )
        );
      }
    }

    setIsStreaming(false);
    abortControllerRef.current = null;
  };

  // Stop generation
  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  // Handle code changes from editor
  const handleCodeChange = useCallback((newCode: string) => {
    setFiles(prev => ({
      ...prev,
      [currentFile]: newCode,
    }));
  }, [currentFile]);

  // Convert files to FileNode tree
  const fileTree: FileNode[] = Object.keys(files).reduce((tree, path) => {
    const parts = path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      let existing = current.find(n => n.name === part);
      if (!existing) {
        existing = {
          name: part,
          type: isFile ? 'file' : 'directory',
          path: currentPath,
          children: isFile ? undefined : [],
          content: isFile ? files[path] : undefined,
        };
        current.push(existing);
      }

      if (!isFile && existing.children) {
        current = existing.children;
      }
    }

    return tree;
  }, [] as FileNode[]);

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">
      {/* Left Panel - AI Chat */}
      <div
        className="flex flex-col border-r border-zinc-800"
        style={{ width: leftPanelWidth }}
      >
        {/* Header */}
        <div className="h-12 px-4 flex items-center border-b border-zinc-800">
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 mt-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <p className="text-sm">Describe what you want to build</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-violet-500/20 border border-violet-500/30 ml-4'
                    : 'bg-zinc-800/50 border border-zinc-700/50'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{msg.content || '...'}</pre>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Describe what to build..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-violet-500"
              rows={3}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-zinc-500">Shift+Enter for new line</span>
            {isStreaming ? (
              <button
                onClick={stopGeneration}
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="px-4 py-1.5 bg-violet-500 hover:bg-violet-600 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Middle Panel - Code Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
          <span className="text-sm font-medium text-zinc-400">App.tsx</span>
        </div>

        {/* Editor */}
        <div className="flex-1">
          <Suspense fallback={<LoadingFallback />}>
            <MonacoEditor
              height="100%"
              language={currentFile.endsWith('.css') ? 'css' : 'typescript'}
              value={files[currentFile] || ''}
              onChange={(value) => handleCodeChange(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 16 },
              }}
            />
          </Suspense>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div
        className="border-l border-zinc-800 flex flex-col"
        style={{ width: rightPanelWidth }}
      >
        <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4">
          <span className="text-sm font-medium text-zinc-400">Preview</span>
        </div>
        <div className="flex-1 bg-white">
          <Suspense fallback={<LoadingFallback />}>
            <WebContainerPreview
              ref={previewRef}
              files={files}
              height="100%"
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
