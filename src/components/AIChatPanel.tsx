import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useChatHistory } from '../lib/persistence/useChatHistory';
import { ChatMessage, FileSnapshot } from '../lib/persistence/db';

interface AIChatPanelProps {
  onApplyCode?: (code: string, filePath: string) => void;
  currentFile?: string;
  currentCode?: string;
  projectName?: string;
  currentFiles?: Record<string, string>;
  onRestoreSnapshot?: (files: FileSnapshot) => void;
}

export interface AIChatPanelRef {
  sendMessage: (content: string) => Promise<void>;
}

const AIChatPanel = forwardRef<AIChatPanelRef, AIChatPanelProps>(function AIChatPanelInner({
  onApplyCode,
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
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Expose sendMessage to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage: async (content: string) => {
      await sendMessageInternal(content);
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
      const response = await fetch('https://design-editor-api.eziopappalardo98.workers.dev/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          currentFile,
          currentCode,
          projectName,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
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

      // Extract code if present and apply it
      const codeMatch = fullContent.match(/```(?:jsx?|tsx?|css)?\n([\s\S]*?)```/);
      if (codeMatch && onApplyCode) {
        const code = codeMatch[1].trim();
        onApplyCode(code, currentFile || 'src/App.tsx');
      }

    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage = error instanceof Error
        ? `Errore: ${error.message}`
        : 'Errore di connessione. Riprova.';
      updateMessage(assistantMessage.id, errorMessage);
    }

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e5e5' }}>Chat</span>
          {chatHistory.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: showHistory ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                color: showHistory ? '#a78bfa' : '#71717a',
                cursor: 'pointer',
              }}
            >
              {chatHistory.length} chats
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* New Chat */}
          <button
            onClick={newChat}
            title="Nuova chat"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#5a5a5a',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
            onMouseLeave={e => e.currentTarget.style.color = '#5a5a5a'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {/* Clear Chat */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              title="Cancella chat"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#5a5a5a',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#5a5a5a'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat History Dropdown */}
      {showHistory && (
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          maxHeight: 200,
          overflowY: 'auto',
          background: '#111',
        }}>
          {chatHistory.map(chat => (
            <div
              key={chat.id}
              onClick={() => {
                loadChat(chat.id);
                setShowHistory(false);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                background: chat.id === chatId ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                borderLeft: chat.id === chatId ? '2px solid #8b5cf6' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (chat.id !== chatId) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }
              }}
              onMouseLeave={e => {
                if (chat.id !== chatId) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{
                fontSize: 12,
                color: '#e5e5e5',
                marginBottom: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {chat.description}
              </div>
              <div style={{ fontSize: 10, color: '#5a5a5a' }}>
                {formatDate(chat.updatedAt)} • {chat.messages.length} messaggi
              </div>
            </div>
          ))}
        </div>
      )}

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
      <div style={{ padding: '8px 12px 12px' }}>
        <div style={{
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
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
            justifyContent: 'flex-end',
            padding: '6px 10px 10px',
          }}>
            <button
              onClick={() => sendMessageInternal()}
              disabled={!input.trim() || isStreaming}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: 'none',
                background: input.trim() && !isStreaming
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                  : '#27272a',
                color: input.trim() && !isStreaming ? '#fff' : '#52525b',
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
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
