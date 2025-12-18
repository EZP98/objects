import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useChatHistory } from '../lib/persistence/useChatHistory';
import { ChatMessage, FileSnapshot } from '../lib/persistence/db';
import { parseArtifacts, formatFilesForContext, ParsedArtifact } from '../lib/artifactParser';
import { getSystemPrompt } from '../lib/prompts/system-prompt';

type AIModel = 'claude' | 'gpt4' | 'image' | 'video' | 'audio';

interface ModelOption {
  id: AIModel;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const AI_MODELS: ModelOption[] = [
  { id: 'claude', name: 'Claude', icon: '✨', description: 'Code & Design', color: '#8b5cf6' },
  // Coming soon:
  // { id: 'gpt4', name: 'GPT-4', icon: '🧠', description: 'General AI', color: '#10b981' },
  // { id: 'image', name: 'Image', icon: '🎨', description: 'DALL-E / Midjourney', color: '#f59e0b' },
  // { id: 'video', name: 'Video', icon: '🎬', description: 'Runway / Sora', color: '#ef4444' },
  // { id: 'audio', name: 'Audio', icon: '🎵', description: 'ElevenLabs / Suno', color: '#3b82f6' },
];

interface AIChatPanelProps {
  onApplyCode?: (code: string, filePath: string) => void;
  onFilesUpdate?: (files: Record<string, string>) => void;
  onArtifactsApplied?: (artifacts: ParsedArtifact[]) => void;
  currentFile?: string;
  currentCode?: string;
  projectName?: string;
  currentFiles?: Record<string, string>;
  onRestoreSnapshot?: (files: FileSnapshot) => void;
}

export interface AIChatPanelRef {
  sendMessage: (content: string) => Promise<void>;
  sendErrorForFix: (error: string, file?: string, code?: string) => Promise<void>;
}

const AIChatPanel = forwardRef<AIChatPanelRef, AIChatPanelProps>(function AIChatPanelInner({
  onApplyCode,
  onFilesUpdate,
  onArtifactsApplied,
  currentFile,
  currentCode,
  projectName = 'default',
  currentFiles,
  onRestoreSnapshot,
}, ref) {
  const {
    chatId,
    messages,
    isLoading: historyLoading,
    addMessage,
    updateMessage,
    clearChat,
    chatHistory,
    loadChat,
    newChat,
    takeSnapshot,
    restoreSnapshot,
  } = useChatHistory({
    projectName,
    currentFiles,
    onRestoreSnapshot,
  });

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ESC to stop AI generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStreaming) {
        e.preventDefault();
        stopGeneration();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '60px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [input]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: async (content: string) => {
      await sendMessageInternal(content);
    },
    sendErrorForFix: async (error: string, file?: string, code?: string) => {
      const errorContext = `## Error to Fix\n\n\`\`\`\n${error}\n\`\`\`\n\n` +
        (file ? `**File:** ${file}\n\n` : '') +
        (code ? `**Current Code:**\n\`\`\`\n${code}\n\`\`\`\n\n` : '') +
        `Fix this error and return the complete corrected file. Use code blocks with the file path.`;
      await sendMessageInternal(errorContext);
    },
  }));

  const sendMessageInternal = async (externalMessage?: string) => {
    const messageContent = externalMessage || input.trim();
    if (!messageContent || isStreaming) return;

    const userMessage = addMessage('user', messageContent);
    if (!externalMessage) {
      setInput('');
    }
    setIsStreaming(true);

    // Take snapshot before AI response
    await takeSnapshot(userMessage.id);

    // Create placeholder for streaming response
    const assistantMessage = addMessage('assistant', '');

    try {
      // Build full project context for AI
      const projectContext = currentFiles
        ? formatFilesForContext(currentFiles, 8, 6000)
        : currentCode
        ? `### ${currentFile || 'src/App.tsx'}\n\`\`\`tsx\n${currentCode}\n\`\`\`\n\n`
        : '';

      const systemContext = projectContext
        ? `## Current Project Files\n\n${projectContext}`
        : '';

      // Build system prompt with project context
      const systemPrompt = getSystemPrompt({
        projectFiles: projectContext,
      });

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch('https://design-editor-api.eziopappalardo98.workers.dev/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          currentFile,
          currentCode,
          projectName,
          systemPrompt, // Full OBJECTS system prompt
          projectContext: systemContext, // Full project context
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullContent += parsed.text;
                  updateMessage(assistantMessage.id, fullContent);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Take snapshot after AI response
      await takeSnapshot(assistantMessage.id);

      // Parse artifacts from AI response
      const { artifacts, explanation } = parseArtifacts(fullContent);

      if (artifacts.length > 0) {
        console.log('[AIChatPanel] Parsed artifacts:', artifacts.map(a => a.path || a.type));

        // Apply each file artifact
        const updatedFiles: Record<string, string> = {};
        for (const artifact of artifacts) {
          if (artifact.type === 'file' && artifact.path) {
            updatedFiles[artifact.path] = artifact.content;

            // Also call single file callback for backwards compatibility
            if (onApplyCode) {
              onApplyCode(artifact.content, artifact.path);
            }
          }
        }

        // Batch update all files
        if (Object.keys(updatedFiles).length > 0 && onFilesUpdate) {
          onFilesUpdate(updatedFiles);
        }

        // Notify about applied artifacts
        if (onArtifactsApplied) {
          onArtifactsApplied(artifacts);
        }
      } else {
        // Fallback: try simple code extraction (backwards compatibility)
        const codeMatch = fullContent.match(/```(?:jsx?|tsx?|css)?\n([\s\S]*?)```/);
        if (codeMatch && onApplyCode) {
          const code = codeMatch[1].trim();
          onApplyCode(code, currentFile || 'src/App.tsx');
        }
      }

    } catch (error) {
      // Don't show error if user aborted
      if (error instanceof Error && error.name === 'AbortError') {
        updateMessage(assistantMessage.id, (prev) => prev + '\n\n*[Generazione interrotta]*');
      } else {
        console.error('AI Chat error:', error);
        const errorMessage = error instanceof Error
          ? `Errore: ${error.message}`
          : 'Errore di connessione. Riprova.';
        updateMessage(assistantMessage.id, errorMessage);
      }
    }

    abortControllerRef.current = null;
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageInternal();
    }
  };

  const handleRestore = async (messageId: string) => {
    await restoreSnapshot(messageId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return 'Oggi';
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0a0a0a',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e5e5' }}>Chat</span>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {historyLoading ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#5a5a5a',
            fontSize: 12,
          }}>
            Caricamento...
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 2 }}>
                Come posso aiutarti?
              </div>
              <div style={{ color: '#52525b', fontSize: 11 }}>
                Descrivi le modifiche al design
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: message.role === 'user'
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(255,255,255,0.03)',
                border: message.role === 'user'
                  ? '1px solid rgba(139, 92, 246, 0.2)'
                  : '1px solid rgba(255,255,255,0.05)',
                marginLeft: message.role === 'user' ? 'auto' : 0,
                maxWidth: message.role === 'user' ? '90%' : '100%',
              }}
            >
              <div style={{
                color: '#e4e4e7',
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {message.content || (
                  <span style={{ color: '#5a5a5a' }}>...</span>
                )}
              </div>
              {/* Message actions */}
              {message.role === 'assistant' && message.content && !isStreaming && (
                <div style={{
                  marginTop: 8,
                  display: 'flex',
                  gap: 6,
                }}>
                  <button
                    onClick={() => handleRestore(message.id)}
                    title="Ripristina snapshot"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 10,
                      color: '#71717a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                      e.currentTarget.style.color = '#a78bfa';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = '#71717a';
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Ripristina
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 16,
              height: 16,
              border: '2px solid #27272a',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ color: '#71717a', fontSize: 11 }}>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '8px 12px 12px', position: 'relative' }}>
        {/* Model Selector Dropdown */}
        {showModelSelector && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 12,
            right: 12,
            marginBottom: 8,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 8,
            zIndex: 100,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 10, color: '#5a5a5a', padding: '4px 8px', marginBottom: 4 }}>
              SELEZIONA MODELLO
            </div>
            {AI_MODELS.map(model => (
              <div
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setShowModelSelector(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selectedModel === model.id ? `${model.color}20` : 'transparent',
                  border: selectedModel === model.id ? `1px solid ${model.color}40` : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (selectedModel !== model.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedModel !== model.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: 18 }}>{model.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: selectedModel === model.id ? model.color : '#e5e5e5'
                  }}>
                    {model.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#5a5a5a' }}>{model.description}</div>
                </div>
                {selectedModel === model.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={model.color} strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedModel === 'image' ? 'Descrivi l\'immagine da generare...' :
              selectedModel === 'video' ? 'Descrivi il video da creare...' :
              selectedModel === 'audio' ? 'Descrivi l\'audio o la musica...' :
              'Scrivi un messaggio...'
            }
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '12px 14px',
              paddingBottom: 6,
              color: '#e4e4e7',
              fontSize: 13,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              minHeight: 60,
              maxHeight: 150,
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px 10px',
          }}>
            {/* Model Selector Button */}
            <button
              onClick={() => AI_MODELS.length > 1 && setShowModelSelector(!showModelSelector)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                background: showModelSelector ? `${AI_MODELS.find(m => m.id === selectedModel)?.color}20` : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                cursor: AI_MODELS.length > 1 ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14 }}>
                {AI_MODELS.find(m => m.id === selectedModel)?.icon}
              </span>
              <span style={{
                fontSize: 11,
                color: AI_MODELS.find(m => m.id === selectedModel)?.color,
                fontWeight: 500,
              }}>
                {AI_MODELS.find(m => m.id === selectedModel)?.name}
              </span>
              {AI_MODELS.length > 1 && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5a5a5a"
                  strokeWidth="2"
                  style={{ transform: showModelSelector ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </button>

            {/* Send / Stop Button */}
            {isStreaming ? (
              <button
                onClick={stopGeneration}
                title="Stop (ESC)"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="1" y="1" width="8" height="8" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => sendMessageInternal()}
                disabled={!input.trim()}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: 'none',
                  background: input.trim()
                    ? AI_MODELS.find(m => m.id === selectedModel)?.color || '#8b5cf6'
                    : '#27272a',
                  color: input.trim() ? '#fff' : '#52525b',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default AIChatPanel;
