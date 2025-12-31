import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useChatHistory } from '../lib/persistence/useChatHistory';
import { ChatMessage, FileSnapshot } from '../lib/persistence/db';
import { parseArtifacts, formatFilesForContext, ParsedArtifact } from '../lib/artifactParser';
import { getSystemPrompt, getDesignPromptWithIntent, getAvailableStylePresets, extractDesignIntent, getTopicColorOptions, StylePresetOption } from '../lib/prompts/system-prompt';
import { TopicPalette } from '../lib/designSystem';
import { addElementsFromAI, processAIDesignResponse } from '../lib/canvas/addElementsFromAI';
import { parseJSXToCanvas, extractJSXFromResponse } from '../lib/canvas/jsxToCanvas';
import { generateProjectFromReactCode } from '../lib/canvas/codeGenerator';
import { useTokensStore } from '../lib/canvas/tokens';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useCanvasStore } from '../lib/canvas/canvasStore';
import { THEME_COLORS } from '../lib/canvas/types';

/**
 * Simple markdown-like formatter for chat messages
 */
function formatMessageContent(content: string): React.ReactNode {
  if (!content) return null;

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map((part, index) => {
    // Multi-line code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const codeContent = part.slice(3, -3);
      const firstNewline = codeContent.indexOf('\n');
      const lang = firstNewline > 0 ? codeContent.slice(0, firstNewline).trim() : '';
      const code = firstNewline > 0 ? codeContent.slice(firstNewline + 1) : codeContent;

      return (
        <pre key={index} style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 6,
          padding: '8px 10px',
          margin: '8px 0',
          overflow: 'auto',
          fontSize: 11,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {lang && <div style={{ color: '#6b7280', fontSize: 10, marginBottom: 4 }}>{lang}</div>}
          <code>{code}</code>
        </pre>
      );
    }

    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '1px 4px',
          borderRadius: 3,
          fontSize: 11,
          fontFamily: 'monospace',
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }

    // Process regular text for bold, italic, etc.
    return formatTextPart(part, index);
  });
}

function formatTextPart(text: string, key: number): React.ReactNode {
  // Split by formatting markers
  const formatted = text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g)
    .map((segment, i) => {
      // Bold
      if ((segment.startsWith('**') && segment.endsWith('**')) ||
          (segment.startsWith('__') && segment.endsWith('__'))) {
        return <strong key={i}>{segment.slice(2, -2)}</strong>;
      }
      // Italic
      if ((segment.startsWith('*') && segment.endsWith('*')) ||
          (segment.startsWith('_') && segment.endsWith('_'))) {
        return <em key={i}>{segment.slice(1, -1)}</em>;
      }
      return segment;
    });

  return <span key={key}>{formatted}</span>;
}

/**
 * Individual chat message component with copy functionality
 */
function ChatMessageItem({
  message,
  colors,
  isStreaming,
  onRestore,
}: {
  message: { id: string; role: 'user' | 'assistant'; content: string };
  colors: (typeof THEME_COLORS)[keyof typeof THEME_COLORS];
  isStreaming: boolean;
  onRestore: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isJson = message.content?.trim().startsWith('{');

  const handleCopy = async (e?: React.MouseEvent) => {
    // Prevent copy if clicking on buttons
    if (e && (e.target as HTMLElement).closest('button')) return;

    // Don't copy if user is selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      onClick={handleCopy}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: message.role === 'user'
          ? colors.accentLight
          : colors.inputBg,
        border: message.role === 'user'
          ? `1px solid ${colors.accentMedium}`
          : `1px solid ${colors.borderColor}`,
        marginLeft: message.role === 'user' ? 'auto' : 0,
        maxWidth: message.role === 'user' ? '90%' : '100%',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.15s ease',
        userSelect: 'text',
      }}
    >
      {/* Copied feedback */}
      {copied && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          background: 'rgba(34, 197, 94, 0.9)',
          color: '#fff',
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 4,
          pointerEvents: 'none',
        }}>
          ✓ Copiato!
        </div>
      )}
      <div style={{
        color: colors.textPrimary,
        fontSize: 12,
        lineHeight: 1.5,
      }}>
        {message.content ? (
          isJson && message.role === 'assistant' ? (
            <pre style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 6,
              padding: '8px 10px',
              margin: 0,
              overflow: 'auto',
              maxHeight: 200,
              maxWidth: '100%',
              fontSize: 10,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              overflowWrap: 'anywhere',
            }}>
              <code style={{ display: 'block', maxWidth: '100%' }}>{message.content.substring(0, 1000)}{message.content.length > 1000 ? '...' : ''}</code>
            </pre>
          ) : (
            formatMessageContent(message.content)
          )
        ) : (
          <span style={{ color: colors.textDimmed }}>...</span>
        )}
      </div>
      {/* Restore button - only for assistant messages */}
      {message.role === 'assistant' && message.content && !isStreaming && (
        <div style={{
          marginTop: 8,
          display: 'flex',
          gap: 6,
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Don't trigger copy
              onRestore(message.id);
            }}
            title="Ripristina snapshot"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
              e.currentTarget.style.color = '#A78BFA';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
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
  );
}

// Get Supabase URL for Edge Functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback to Cloudflare Worker if Supabase not configured
const AI_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ai-chat`
  : 'https://design-editor-api.eziopappalardo98.workers.dev/api/ai/chat/stream';

/**
 * Repair truncated JSON by closing unclosed brackets/braces
 * and removing incomplete elements
 */
function repairTruncatedJSON(json: string): string {
  let repaired = json;

  // Clean up common issues
  // Remove trailing incomplete strings (unclosed quotes)
  repaired = repaired.replace(/"[^"\\]*$/, '""');

  // Fix missing colons after property names (common AI error)
  repaired = repaired.replace(/"(\w+)"\s*(?=["{[\d])/g, '"$1":');

  // Fix trailing commas before closing brackets
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // Count brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }

  // Remove trailing incomplete object/array entries
  // Look for last complete element (ends with } or ] followed by optional comma)
  const lastCompleteMatch = repaired.match(/^([\s\S]*[\}\]])\s*,?\s*[\{\["']?[^,\}\]]*$/);
  if (lastCompleteMatch) {
    repaired = lastCompleteMatch[1];
    // Recount after truncation
    openBraces = 0;
    openBrackets = 0;
    inString = false;
    escaped = false;

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }
  }

  // Close unclosed brackets
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }

  // Close unclosed braces
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }

  return repaired;
}

/**
 * Extract valid section objects from potentially broken JSON
 * Fallback when normal parsing fails
 */
function extractSectionsFromBrokenJSON(content: string): Array<Record<string, unknown>> {
  const sections: Array<Record<string, unknown>> = [];
  const foundHashes = new Set<string>();

  // Strategy 1: Find objects that contain "type":"section" (or frame/stack) at ANY depth
  // Use a stack to track all object start positions
  const objectStarts: number[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        objectStarts.push(i);
      } else if (char === '}' && objectStarts.length > 0) {
        const start = objectStarts.pop()!;
        const objStr = content.slice(start, i + 1);

        // Check if it looks like a section/frame/stack element (but not too small)
        if (objStr.length > 50 && objStr.includes('"type"')) {
          const isSection = objStr.includes('"section"') || objStr.includes('"frame"') || objStr.includes('"stack"');
          const hasStructure = objStr.includes('"name"') || objStr.includes('"children"') || objStr.includes('"styles"');

          if (isSection && hasStructure) {
            try {
              const obj = JSON.parse(objStr);
              // Verify it's a valid element
              if (obj.type && (obj.name || obj.children || obj.styles)) {
                // Deduplicate by hash
                const hash = JSON.stringify({ name: obj.name, type: obj.type });
                if (!foundHashes.has(hash)) {
                  foundHashes.add(hash);
                  sections.push(obj);
                }
              }
            } catch {
              // Try to repair truncated JSON
              try {
                const repaired = repairTruncatedJSON(objStr);
                const obj = JSON.parse(repaired);
                if (obj.type && (obj.name || obj.children || obj.styles)) {
                  const hash = JSON.stringify({ name: obj.name, type: obj.type });
                  if (!foundHashes.has(hash)) {
                    foundHashes.add(hash);
                    sections.push(obj);
                  }
                }
              } catch {
                // Skip this object
              }
            }
          }
        }
      }
    }
  }

  // Strategy 2: If no sections found, try to find the elements array and parse what we can
  if (sections.length === 0) {
    const elementsMatch = content.match(/"elements"\s*:\s*\[/);
    if (elementsMatch && elementsMatch.index !== undefined) {
      const arrayStart = elementsMatch.index + elementsMatch[0].length;
      // Try parsing objects from the array start
      let depth = 0;
      let objStart = -1;
      inString = false;
      escaped = false;

      for (let i = arrayStart; i < content.length; i++) {
        const char = content[i];

        if (escaped) { escaped = false; continue; }
        if (char === '\\' && inString) { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }

        if (!inString) {
          if (char === '{') {
            if (depth === 0) objStart = i;
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0 && objStart !== -1) {
              const objStr = content.slice(objStart, i + 1);
              try {
                const obj = JSON.parse(objStr);
                if (obj.type && (obj.name || obj.styles)) {
                  const hash = JSON.stringify({ name: obj.name, type: obj.type });
                  if (!foundHashes.has(hash)) {
                    foundHashes.add(hash);
                    sections.push(obj);
                  }
                }
              } catch {
                // Object incomplete, skip
              }
              objStart = -1;
            }
          } else if (char === ']' && depth === 0) {
            // End of elements array
            break;
          }
        }
      }
    }
  }

  return sections;
}

/**
 * Robust JSON parser with multiple fallback strategies
 */
function parseDesignJSON(content: string): { elements: Array<Record<string, unknown>>; error?: string } {
  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(content);
    const elements = parsed.elements || (Array.isArray(parsed) ? parsed : [parsed]);
    return { elements: elements.filter((e: unknown) => e && typeof e === 'object') };
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Parse with repair
  try {
    const repaired = repairTruncatedJSON(content);
    const parsed = JSON.parse(repaired);
    const elements = parsed.elements || (Array.isArray(parsed) ? parsed : [parsed]);
    console.log('[parseDesignJSON] Repaired JSON successfully');
    return { elements: elements.filter((e: unknown) => e && typeof e === 'object') };
  } catch {
    // Continue to next strategy
  }

  // Strategy 3: Extract individual sections
  const extracted = extractSectionsFromBrokenJSON(content);
  if (extracted.length > 0) {
    console.log('[parseDesignJSON] Extracted', extracted.length, 'sections from broken JSON');
    return { elements: extracted };
  }

  // Strategy 4: Try to find just the elements array
  const elementsMatch = content.match(/"elements"\s*:\s*\[([\s\S]*)\]/);
  if (elementsMatch) {
    try {
      const elementsStr = '[' + elementsMatch[1] + ']';
      const repaired = repairTruncatedJSON(elementsStr);
      const elements = JSON.parse(repaired);
      if (Array.isArray(elements) && elements.length > 0) {
        console.log('[parseDesignJSON] Extracted elements array');
        return { elements: elements.filter((e: unknown) => e && typeof e === 'object') };
      }
    } catch {
      // Continue
    }
  }

  return { elements: [], error: 'Could not parse JSON with any strategy' };
}

type ClaudeModel = 'claude-sonnet-4-5' | 'claude-haiku-4-5' | 'claude-opus-4-5';
type OutputMode = 'design' | 'code' | 'smart';

interface ClaudeModelOption {
  id: ClaudeModel;
  name: string;
  fullName: string;
  apiId: string;
  description: string;
  speed: 'Fast' | 'Fastest' | 'Moderate';
  price: string;
}

interface OutputModeOption {
  id: OutputMode;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const OUTPUT_MODES: OutputModeOption[] = [
  {
    id: 'design',
    name: 'Design',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    description: 'Crea elementi visivi sul canvas',
  },
  {
    id: 'smart',
    name: 'Smart',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    description: 'Genera React → Converti in Canvas (Best Quality)',
  },
  {
    id: 'code',
    name: 'Code',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    description: 'Genera codice React + Tailwind',
  },
];

const CLAUDE_MODELS: ClaudeModelOption[] = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Sonnet 4.5',
    fullName: 'Claude Sonnet 4.5',
    apiId: 'claude-sonnet-4-5-20250929',
    description: 'Smart model for complex agents and coding',
    speed: 'Fast',
    price: '$3 / $15',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Haiku 4.5',
    fullName: 'Claude Haiku 4.5',
    apiId: 'claude-haiku-4-5-20251001',
    description: 'Fastest model with near-frontier intelligence',
    speed: 'Fastest',
    price: '$1 / $5',
  },
  {
    id: 'claude-opus-4-5',
    name: 'Opus 4.5',
    fullName: 'Claude Opus 4.5',
    apiId: 'claude-opus-4-5-20251101',
    description: 'Premium model with maximum intelligence',
    speed: 'Moderate',
    price: '$5 / $25',
  },
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
    // Cloud sync
    syncStatus,
    syncNow,
    isCloudEnabled,
  } = useChatHistory({
    projectName,
    currentFiles,
    onRestoreSnapshot,
  });

  // Get design tokens for AI context
  const designTokens = useTokensStore((state) => state.tokens);

  // Theme support
  const canvasSettings = useCanvasStore((state) => state.canvasSettings);
  const theme = canvasSettings?.editorTheme || 'dark';
  const colors = THEME_COLORS[theme];

  // Get current canvas elements for AI context (design mode only)
  const canvasElements = useCanvasStore((state) => state.elements);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>('claude-sonnet-4-5');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [outputMode, setOutputMode] = useState<OutputMode>('design');
  const [createAsNewPage, setCreateAsNewPage] = useState(false);
  const [selectedStylePreset, setSelectedStylePreset] = useState<string>('framer-dark');
  const [showStylePresets, setShowStylePresets] = useState(false);
  const [detectedTopic, setDetectedTopic] = useState<string | null>(null);
  const [selectedTopicPalette, setSelectedTopicPalette] = useState<number>(0);
  const [showTopicPalettes, setShowTopicPalettes] = useState(false);
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

  // Detect topic from input for palette suggestions
  useEffect(() => {
    if (outputMode !== 'design' || !input.trim()) {
      setDetectedTopic(null);
      return;
    }
    const intent = extractDesignIntent(input);
    if (intent.topic !== 'general') {
      setDetectedTopic(intent.topic);
    } else {
      setDetectedTopic(null);
    }
  }, [input, outputMode]);

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

    // Track streamed content outside try block so it's accessible in catch
    let fullContent = '';

    // STREAMING UI: Track elements added incrementally (outside try for abort handling)
    const addedElementHashes = new Set<string>();
    let streamingPageId: string | undefined;
    let streamingParentId: string | undefined;
    let totalElementsAdded = 0;
    const addedElementNames: string[] = [];

    // Create abort controller and timeout outside try block
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, 180000); // 180 second timeout (3 minutes for complex designs)

    try {
      // Build full project context for AI (only for code mode)
      const projectContext = outputMode === 'code' && currentFiles
        ? formatFilesForContext(currentFiles, 8, 6000)
        : outputMode === 'code' && currentCode
        ? `### ${currentFile || 'src/App.tsx'}\n\`\`\`tsx\n${currentCode}\n\`\`\`\n\n`
        : '';

      const systemContext = projectContext
        ? `## Current Project Files\n\n${projectContext}`
        : '';

      // Build system prompt based on mode
      // For design mode, pass current canvas elements so AI understands context
      const currentCanvasForAI = outputMode === 'design'
        ? Object.values(canvasElements).map(el => ({
            id: el.id,
            type: el.type as string,
            name: el.name,
            styles: el.styles as Record<string, unknown>,
            content: el.content,
            children: el.children,
          }))
        : undefined;

      // Smart mode uses 'code' prompt to generate React/Tailwind
      const promptMode = outputMode === 'smart' ? 'code' : outputMode;

      // Use enhanced design prompt for design mode (includes style presets, components, few-shot examples)
      // Use regular system prompt for code/smart modes
      // In design mode: use getDesignPromptWithIntent which auto-extracts topic, colors, mood from user message
      let systemPrompt: string;
      if (outputMode === 'design') {
        const intent = extractDesignIntent(messageContent);

        // Get selected topic palette if available
        let selectedPaletteObj: TopicPalette | undefined;
        if (detectedTopic) {
          const palettes = getTopicColorOptions(detectedTopic);
          if (palettes.length > 0) {
            selectedPaletteObj = palettes[selectedTopicPalette] || palettes[0];
          }
        }

        console.log('[AIChatPanel] Design Intent Detected:', {
          topic: intent.topic,
          mood: intent.mood,
          colors: selectedPaletteObj?.colors || intent.suggestedColors,
          stylePreset: selectedStylePreset,
          language: intent.language,
        });

        systemPrompt = getDesignPromptWithIntent(messageContent, {
          stylePresetId: selectedStylePreset,
          selectedPalette: selectedPaletteObj,
        });
      } else {
        systemPrompt = getSystemPrompt({
            mode: promptMode,
            projectFiles: (outputMode === 'code' || outputMode === 'smart') ? projectContext : undefined,
            userMessage: messageContent,
            currentCanvas: currentCanvasForAI,
          });
      }

      // Build headers - include auth for Supabase Edge Functions
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Supabase auth headers if using Supabase endpoint
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        headers['apikey'] = SUPABASE_ANON_KEY;
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      }

      // Get the API model ID for the selected model
      const modelConfig = CLAUDE_MODELS.find(m => m.id === selectedModel);
      const modelApiId = modelConfig?.apiId || 'claude-sonnet-4-5-20250929';

      console.log(`[AIChatPanel] Sending request to ${AI_ENDPOINT} in ${outputMode} mode with model ${modelApiId}`);

      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage.content,
          mode: promptMode, // Pass 'code' for smart mode, actual mode otherwise
          model: modelApiId, // Pass the selected Claude model
          systemPrompt, // Full system prompt based on mode
          projectContext: systemContext,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      // Helper to hash an element for deduplication
      const hashElement = (el: Record<string, unknown>): string => {
        return JSON.stringify({ name: el.name, type: el.type, content: el.content });
      };

      // Helper to add elements incrementally during streaming
      const addElementsIncrementally = (elements: Record<string, unknown>[]) => {
        if (elements.length === 0) return;

        const store = useCanvasStore.getState();

        // Create new page on first element if toggle is on
        if (createAsNewPage && !streamingPageId) {
          const pageName = (elements[0]?.name as string) || 'AI Generated';
          streamingPageId = store.addPage();
          if (streamingPageId) {
            store.renamePage(streamingPageId, pageName);
            const page = store.pages[streamingPageId];
            if (page) {
              store.renameElement(page.rootElementId, pageName);
              streamingParentId = page.rootElementId;
            }
            store.setCurrentPage(streamingPageId);
            console.log('[Streaming] Created new page:', pageName);
          }
        }

        // Add only new elements (not already added)
        for (const element of elements) {
          const hash = hashElement(element);
          if (!addedElementHashes.has(hash)) {
            addedElementHashes.add(hash);
            try {
              const ids = addElementsFromAI([element] as any, streamingParentId);
              if (ids.length > 0) {
                totalElementsAdded += ids.length;
                addedElementNames.push((element.name as string) || (element.type as string) || 'element');
                console.log('[Streaming] Added element:', element.name || element.type, 'total:', totalElementsAdded);

                // Update message to show progress
                updateMessage(
                  assistantMessage.id,
                  `⏳ Generando design... ${totalElementsAdded} elementi aggiunti\n${addedElementNames.slice(-3).join(', ')}${addedElementNames.length > 3 ? '...' : ''}`
                );
              }
            } catch (err) {
              console.warn('[Streaming] Failed to add element:', err);
            }
          }
        }
      };

      // Streaming loop with buffer for partial lines
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Append new chunk to buffer
          buffer += decoder.decode(value, { stream: true });

          // Split by double newline (SSE event separator)
          const events = buffer.split('\n\n');
          // Keep the last partial event in buffer
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

                    // Show content directly for all modes
                    updateMessage(assistantMessage.id, fullContent);
                  }
                } catch (e) {
                  console.log('[AIChatPanel] JSON parse error for:', data.substring(0, 50));
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const lines = buffer.split('\n');
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

      // Handle response based on output mode
      if (outputMode === 'design' || outputMode === 'smart') {
        // DESIGN/SMART MODE: Parse boltArtifact format with canvas elements
        console.log(`[AIChatPanel] ${outputMode} mode - parsing boltArtifact for canvas`);
        console.log('[AIChatPanel] fullContent length:', fullContent.length);
        console.log('[AIChatPanel] fullContent preview:', fullContent.substring(0, 500));
        console.log('[AIChatPanel] contains boltArtifact:', fullContent.includes('boltArtifact'));
        console.log('[AIChatPanel] contains boltAction:', fullContent.includes('boltAction'));

        try {
          // Try boltArtifact format first (new approach)
          const { artifacts, explanation } = parseArtifacts(fullContent);
          const canvasArtifacts = artifacts.filter(a => a.type === 'canvas' && a.canvasElements);

          console.log('[AIChatPanel] Found', artifacts.length, 'total artifacts,', canvasArtifacts.length, 'canvas artifacts');

          let allElements: any[] = [];
          const elementNames: string[] = [];

          if (canvasArtifacts.length > 0) {
            // Use canvas elements from boltArtifact
            for (const artifact of canvasArtifacts) {
              if (artifact.canvasElements) {
                allElements = allElements.concat(artifact.canvasElements);
                console.log('[AIChatPanel] Added', artifact.canvasElements.length, 'elements from canvas artifact');
              }
            }
          } else {
            // Fallback: try legacy JSX parsing
            console.log('[AIChatPanel] No canvas artifacts found, trying JSX fallback...');

            const codeBlocks = extractJSXFromResponse(fullContent);
            console.log('[AIChatPanel] Found', codeBlocks.length, 'JSX code blocks');

            if (codeBlocks.length === 0) {
              // Fallback: try to find any code block
              const codeMatch = fullContent.match(/```(?:tsx?|jsx?)\n([\s\S]*?)```/);
              if (codeMatch) {
                codeBlocks.push(codeMatch[1]);
              }
            }

            // Parse each code block to canvas elements
            for (const codeBlock of codeBlocks) {
              const elements = parseJSXToCanvas(codeBlock);
              console.log('[AIChatPanel] Parsed', elements.length, 'elements from JSX block');
              allElements = allElements.concat(elements);
            }
          }

          if (allElements.length === 0) {
            console.log('[AIChatPanel] No canvas elements extracted');
            // Show the response content instead
            updateMessage(assistantMessage.id, fullContent);
            return;
          }

          // Add elements to canvas - ALWAYS create new page for clean slate
          const store = useCanvasStore.getState();
          const pageName = (allElements[0]?.name as string) || 'AI Design';
          const pageId = store.addPage();
          let parentId: string | undefined;

          if (pageId) {
            store.renamePage(pageId, pageName);
            const page = store.pages[pageId];
            if (page) {
              store.renameElement(page.rootElementId, pageName);
              parentId = page.rootElementId;
            }
            store.setCurrentPage(pageId);
          }
          setCreateAsNewPage(false);

          const ids = addElementsFromAI(allElements, parentId);
          allElements.forEach(e => elementNames.push(e.name || e.type || 'element'));

          // Update message with success
          const pageInfo = pageId ? ' (nuova pagina)' : '';
          updateMessage(
            assistantMessage.id,
            `Creati ${ids.length} elementi sul canvas${pageInfo}\n\n${elementNames.slice(0, 8).join(', ')}${elementNames.length > 8 ? '...' : ''}`
          );
        } catch (err) {
          console.error('[AIChatPanel] Error parsing design response:', err);
          // Show content as fallback
          updateMessage(assistantMessage.id, fullContent);
        }
      } else if (false) {
        // Legacy smart mode block - keeping structure for now
        // SMART MODE: AI generates React/Tailwind → Live Preview + Canvas elements
        console.log('[AIChatPanel] Smart mode - parsing React code for preview and canvas');

        try {
          // Extract JSX code blocks from response
          const codeBlocks = extractJSXFromResponse(fullContent);
          console.log('[AIChatPanel] Found', codeBlocks.length, 'JSX code blocks');

          if (codeBlocks.length === 0) {
            // Fallback: try to find any code block
            const codeMatch = fullContent.match(/```(?:tsx?|jsx?)\n([\s\S]*?)```/);
            if (codeMatch) {
              codeBlocks.push(codeMatch[1]);
            }
          }

          // Find the best code block (full component with export default)
          let bestCodeBlock = codeBlocks.find(block =>
            block.includes('export default') || block.includes('function App')
          ) || codeBlocks[0] || '';

          // If we found React code, send it to WebContainer for live preview
          if (bestCodeBlock && onFilesUpdate) {
            console.log('[AIChatPanel] Generating project files for WebContainer preview');
            const projectFiles = generateProjectFromReactCode(bestCodeBlock);
            onFilesUpdate(projectFiles);
            console.log('[AIChatPanel] Project files sent to WebContainer:', Object.keys(projectFiles));
          }

          let allElements: any[] = [];
          const elementNames: string[] = [];

          // Parse each code block
          for (const codeBlock of codeBlocks) {
            const elements = parseJSXToCanvas(codeBlock);
            console.log('[AIChatPanel] Parsed', elements.length, 'elements from code block');
            allElements = allElements.concat(elements);
          }

          // Determine success based on what we achieved
          const hasPreview = bestCodeBlock && onFilesUpdate;
          const hasCanvasElements = allElements.length > 0;

          if (!hasPreview && !hasCanvasElements) {
            // Show the code as fallback
            updateMessage(
              assistantMessage.id,
              `💡 Nessun elemento convertibile trovato. Ecco il codice generato:\n\n${fullContent.substring(0, 800)}${fullContent.length > 800 ? '...' : ''}`
            );
            return;
          }

          // Add elements to canvas (optional - preview is primary output)
          const store = useCanvasStore.getState();
          let pageId: string | undefined;
          let parentId: string | undefined;
          let canvasCount = 0;

          if (hasCanvasElements) {
            if (createAsNewPage) {
              const pageName = (allElements[0]?.name as string) || 'AI Generated';
              pageId = store.addPage();
              if (pageId) {
                store.renamePage(pageId, pageName);
                const page = store.pages[pageId];
                if (page) {
                  store.renameElement(page.rootElementId, pageName);
                  parentId = page.rootElementId;
                }
                store.setCurrentPage(pageId);
              }
              setCreateAsNewPage(false);
            }

            const ids = addElementsFromAI(allElements, parentId);
            canvasCount = ids.length;
            allElements.forEach(e => elementNames.push(e.name || e.type || 'element'));
          }

          // Build success message
          const messages: string[] = [];
          if (hasPreview) {
            messages.push('🖥️ Live preview aggiornato');
          }
          if (canvasCount > 0) {
            const pageInfo = pageId ? ' (nuova pagina)' : '';
            messages.push(`📐 ${canvasCount} elementi canvas${pageInfo}`);
          }

          updateMessage(
            assistantMessage.id,
            `✅ Smart Mode:\n${messages.join('\n')}${elementNames.length > 0 ? '\n\n' + elementNames.slice(0, 5).join(', ') + (elementNames.length > 5 ? '...' : '') : ''}`
          );

        } catch (smartErr) {
          console.error('[AIChatPanel] Smart mode error:', smartErr);
          // Show the code as fallback
          updateMessage(
            assistantMessage.id,
            `⚠️ Errore conversione: ${smartErr instanceof Error ? smartErr.message : 'Unknown'}\n\nCodice generato:\n\`\`\`tsx\n${fullContent.substring(0, 600)}...\n\`\`\``
          );
        }
      } else {
        // CODE MODE: Parse artifacts (boltArtifact format)
        const { artifacts, explanation } = parseArtifacts(fullContent);

        if (artifacts.length > 0) {
          console.log('[AIChatPanel] Parsed artifacts:', artifacts.map(a => a.path || a.type));

          // Apply each artifact based on type
          const updatedFiles: Record<string, string> = {};
          let canvasElementsAdded = 0;

          for (const artifact of artifacts) {
            if (artifact.type === 'canvas' && artifact.canvasElements) {
              // Add elements to the visual canvas
              console.log('[AIChatPanel] Adding canvas elements:', artifact.canvasElements.length);
              try {
                const createdIds = addElementsFromAI(artifact.canvasElements);
                canvasElementsAdded += createdIds.length;
                console.log('[AIChatPanel] Canvas elements created:', createdIds);
              } catch (err) {
                console.error('[AIChatPanel] Failed to add canvas elements:', err);
              }
            } else if (artifact.type === 'file' && artifact.path) {
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

          // Log summary
          if (canvasElementsAdded > 0) {
            console.log(`[AIChatPanel] Summary: ${canvasElementsAdded} canvas elements, ${Object.keys(updatedFiles).length} files`);
          }
        } else {
          // Fallback: try simple code extraction (backwards compatibility)
          const codeMatch = fullContent.match(/```(?:jsx?|tsx?|css)?\n([\s\S]*?)```/);
          if (codeMatch && onApplyCode) {
            const code = codeMatch[1].trim();
            onApplyCode(code, currentFile || 'src/App.tsx');
          }
        }
      }

    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);

      // Don't show error if user aborted
      if (error instanceof Error && error.name === 'AbortError') {
        // Check if we have partial work from streaming
        if (totalElementsAdded > 0) {
          // Success! We saved partial work
          console.log('[AIChatPanel] Aborted but preserved', totalElementsAdded, 'elements');
          if (createAsNewPage) setCreateAsNewPage(false);
          const pageInfo = streamingPageId ? `\n📄 Nuova pagina creata` : '';
          updateMessage(
            assistantMessage.id,
            `⚠️ Generazione interrotta - ${totalElementsAdded} elementi salvati${pageInfo}\n${addedElementNames.join(', ')}`
          );
        } else if (fullContent.length === 0) {
          updateMessage(assistantMessage.id, '⏱️ Timeout - la richiesta ha impiegato troppo tempo. Riprova.');
        } else {
          // Try one last parse attempt to save any complete elements
          if (outputMode === 'design') {
            const extracted = extractSectionsFromBrokenJSON(fullContent);
            if (extracted.length > 0) {
              try {
                const ids = addElementsFromAI(extracted as any);
                if (ids.length > 0) {
                  updateMessage(
                    assistantMessage.id,
                    `⚠️ Generazione interrotta - salvati ${ids.length} elementi\n${extracted.map((e: Record<string, unknown>) => e.name || e.type).join(', ')}`
                  );
                  return;
                }
              } catch (e) {
                console.warn('[AIChatPanel] Last-ditch parse failed:', e);
              }
            }
          }
          updateMessage(assistantMessage.id, fullContent + '\n\n*[Generazione interrotta]*');
        }
      } else {
        console.error('AI Chat error:', error);
        const errorMessage = error instanceof Error
          ? `Errore: ${error.message}`
          : 'Errore di connessione. Riprova.';
        updateMessage(assistantMessage.id, errorMessage);
      }
    }

    // Clear timeout on success
    clearTimeout(timeoutId);
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
      background: colors.sidebarBg,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: `1px solid ${colors.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>Chat</span>
        {/* Cloud sync status */}
        {isCloudEnabled && (
          <div
            onClick={() => syncNow()}
            title={
              syncStatus.isSyncing
                ? 'Sincronizzazione in corso...'
                : syncStatus.lastSyncAt
                ? `Ultimo sync: ${new Date(syncStatus.lastSyncAt).toLocaleTimeString('it-IT')}`
                : syncStatus.isOnline
                ? 'Clicca per sincronizzare'
                : 'Offline - sync disabilitato'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 6,
              background: syncStatus.isSyncing
                ? 'rgba(59, 130, 246, 0.15)'
                : syncStatus.error
                ? 'rgba(239, 68, 68, 0.15)'
                : colors.inputBg,
              cursor: syncStatus.isSyncing ? 'wait' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke={
                syncStatus.isSyncing
                  ? '#3b82f6'
                  : syncStatus.error
                  ? '#ef4444'
                  : syncStatus.isOnline
                  ? '#22c55e'
                  : '#6b7280'
              }
              strokeWidth="2"
              style={{
                animation: syncStatus.isSyncing ? 'spin 1s linear infinite' : 'none',
              }}
            >
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
            {syncStatus.pendingChanges > 0 && !syncStatus.isSyncing && (
              <span style={{ fontSize: 10, color: '#f59e0b' }}>
                {syncStatus.pendingChanges}
              </span>
            )}
          </div>
        )}
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
              background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
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
          messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              colors={colors}
              isStreaming={isStreaming}
              onRestore={handleRestore}
            />
          ))
        )}

        {isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 16,
              height: 16,
              border: '2px solid rgba(255, 255, 255, 0.08)',
              borderTopColor: '#8B5CF6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '8px 12px 12px', position: 'relative' }}>
        {/* Model Selector Dropdown - Bolt-inspired Clean Design */}
        {showModelSelector && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowModelSelector(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99,
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              overflow: 'hidden',
              zIndex: 100,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
            }}>
              {/* Models List - Compact like Bolt */}
              {CLAUDE_MODELS.map((model, index) => {
                const isSelected = selectedModel === model.id;
                const speedColor = model.speed === 'Fastest' ? '#22c55e' : model.speed === 'Fast' ? '#3b82f6' : '#f59e0b';
                const isLast = index === CLAUDE_MODELS.length - 1;

                return (
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
                      cursor: 'pointer',
                      background: isSelected
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'transparent',
                      borderBottom: !isLast ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {/* Selection Indicator */}
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: isSelected ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                      background: isSelected ? '#8B5CF6' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    {/* Model Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: isSelected ? '#fff' : '#e5e5e5',
                        }}>
                          {model.name}
                        </span>
                        {/* Speed Badge */}
                        <span style={{
                          fontSize: 9,
                          fontWeight: 500,
                          padding: '1px 5px',
                          borderRadius: 3,
                          background: `${speedColor}15`,
                          color: speedColor,
                        }}>
                          {model.speed}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 10,
                        color: '#6b7280',
                        margin: 0,
                        marginTop: 1,
                      }}>
                        {model.description}
                      </p>
                    </div>

                    {/* Price */}
                    <span style={{
                      fontSize: 10,
                      color: '#52525b',
                      fontFamily: 'monospace',
                      flexShrink: 0,
                    }}>
                      {model.price}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{
          background: colors.panelBg,
          border: `1px solid ${colors.borderColor}`,
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
              color: colors.textPrimary,
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
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              {/* Model Selector Button - Clean Bolt Style */}
              <button
                onClick={() => setShowModelSelector(!showModelSelector)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  background: showModelSelector
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: showModelSelector
                    ? '1px solid rgba(139, 92, 246, 0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!showModelSelector) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  }
                }}
                onMouseLeave={e => {
                  if (!showModelSelector) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }
                }}
              >
                {/* Anthropic/Claude Logo */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M17.3 3H14.1L21 21H24L17.3 3ZM6.8 3H10L13.7 13L11.4 18.6L6.8 3ZM0 21H3.2L7.7 8.4L10 14.1L6.5 21H3.3L6.8 14.1L4.5 8.4L0 21Z" fill={showModelSelector ? '#8B5CF6' : 'rgba(255,255,255,0.5)'}/>
                </svg>
                <span style={{
                  fontSize: 11,
                  color: showModelSelector ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                  fontWeight: 500,
                }}>
                  {CLAUDE_MODELS.find(m => m.id === selectedModel)?.name || 'Sonnet 4.5'}
                </span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={showModelSelector ? '#8B5CF6' : 'rgba(255,255,255,0.4)'}
                  strokeWidth="2"
                  style={{ transform: showModelSelector ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Design/Code Mode Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: 2,
                }}
              >
                {OUTPUT_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setOutputMode(mode.id)}
                    title={mode.name + ' - ' + mode.description}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                      background: outputMode === mode.id
                        ? mode.id === 'design'
                          ? 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)'
                          : mode.id === 'smart'
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: outputMode === mode.id ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {mode.icon}
                  </button>
                ))}
              </div>

              {/* Style Preset Selector - only for design mode */}
              {outputMode === 'design' && (
                <div style={{ position: 'relative' }}>
                  {(() => {
                    const selectedPreset = getAvailableStylePresets().find(p => p.id === selectedStylePreset);
                    return (
                      <button
                        onClick={() => setShowStylePresets(!showStylePresets)}
                        title="Seleziona stile design"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px',
                          background: showStylePresets ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                          border: showStylePresets ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                      >
                        {/* Color dots preview */}
                        {selectedPreset && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: selectedPreset.colors.bg,
                              border: '1px solid rgba(255,255,255,0.2)',
                            }} />
                            <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: selectedPreset.colors.primary,
                            }} />
                          </div>
                        )}
                        {selectedPreset?.name || 'Style'}
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    );
                  })()}

                  {/* Style Preset Dropdown with Color Preview */}
                  {showStylePresets && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        marginBottom: 4,
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: 6,
                        minWidth: 240,
                        maxHeight: 320,
                        overflowY: 'auto',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        zIndex: 100,
                      }}
                    >
                      <div style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.4)',
                        padding: '4px 8px',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}>
                        Style Presets
                      </div>
                      {getAvailableStylePresets().map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setSelectedStylePreset(preset.id);
                            setShowStylePresets(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 10px',
                            background: selectedStylePreset === preset.id
                              ? 'rgba(139, 92, 246, 0.2)'
                              : 'transparent',
                            border: selectedStylePreset === preset.id
                              ? '1px solid rgba(139, 92, 246, 0.4)'
                              : '1px solid transparent',
                            borderRadius: 8,
                            cursor: 'pointer',
                            color: selectedStylePreset === preset.id ? '#fff' : 'rgba(255,255,255,0.8)',
                            fontSize: 11,
                            transition: 'all 0.15s ease',
                            marginBottom: 2,
                          }}
                        >
                          {/* Color Preview Circles */}
                          <div style={{
                            display: 'flex',
                            gap: 3,
                            flexShrink: 0,
                          }}>
                            <div style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: preset.colors.bg,
                              border: '1px solid rgba(255,255,255,0.2)',
                            }} />
                            <div style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: preset.colors.primary,
                            }} />
                            <div style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: preset.colors.accent,
                            }} />
                          </div>
                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, marginBottom: 1 }}>{preset.name}</div>
                            <div style={{
                              fontSize: 9,
                              opacity: 0.6,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {preset.description.slice(0, 40)}...
                            </div>
                          </div>
                          {/* Selected indicator */}
                          {selectedStylePreset === preset.id && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Topic Palette Selector - appears when topic is detected */}
              {outputMode === 'design' && detectedTopic && (
                <div style={{ position: 'relative' }}>
                  {(() => {
                    const palettes = getTopicColorOptions(detectedTopic);
                    if (palettes.length === 0) return null;
                    const selected = palettes[selectedTopicPalette] || palettes[0];
                    return (
                      <>
                        <button
                          onClick={() => setShowTopicPalettes(!showTopicPalettes)}
                          title={`Palette ${detectedTopic}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 10px',
                            background: showTopicPalettes ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.08)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            color: '#fbbf24',
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          {/* Color dots */}
                          <div style={{ display: 'flex', gap: 2 }}>
                            <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: selected.colors.primary,
                            }} />
                            <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: selected.colors.secondary,
                            }} />
                          </div>
                          {selected.name.split(' ')[0]}
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {/* Topic Palette Dropdown */}
                        {showTopicPalettes && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '100%',
                              left: 0,
                              marginBottom: 4,
                              background: '#1a1a1a',
                              border: '1px solid rgba(251, 191, 36, 0.2)',
                              borderRadius: 10,
                              padding: 6,
                              minWidth: 200,
                              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                              zIndex: 100,
                            }}
                          >
                            <div style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: 'rgba(251, 191, 36, 0.8)',
                              padding: '4px 8px',
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                            }}>
                              {detectedTopic} Palettes
                            </div>
                            {palettes.map((palette, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedTopicPalette(idx);
                                  setShowTopicPalettes(false);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '10px 10px',
                                  background: selectedTopicPalette === idx
                                    ? 'rgba(251, 191, 36, 0.15)'
                                    : 'transparent',
                                  border: selectedTopicPalette === idx
                                    ? '1px solid rgba(251, 191, 36, 0.3)'
                                    : '1px solid transparent',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.9)',
                                  fontSize: 11,
                                  transition: 'all 0.15s ease',
                                  marginBottom: 2,
                                }}
                              >
                                {/* Color circles */}
                                <div style={{ display: 'flex', gap: 3 }}>
                                  <div style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: palette.colors.primary,
                                  }} />
                                  <div style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: palette.colors.secondary,
                                  }} />
                                  <div style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: palette.colors.accent,
                                  }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600 }}>{palette.name}</div>
                                  <div style={{ fontSize: 9, opacity: 0.6 }}>
                                    {palette.mood.slice(0, 2).join(', ')}
                                  </div>
                                </div>
                                {selectedTopicPalette === idx && (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* New Page Toggle - for design and smart modes */}
              {(outputMode === 'design' || outputMode === 'smart') && (
                <button
                  onClick={() => setCreateAsNewPage(!createAsNewPage)}
                  title={createAsNewPage ? 'Crea come nuova pagina' : 'Aggiungi alla pagina corrente'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 8px',
                    background: createAsNewPage ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.03)',
                    border: createAsNewPage ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: createAsNewPage ? '#22c55e' : '#6b7280',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 500 }}>
                    {createAsNewPage ? 'New' : '+Page'}
                  </span>
                </button>
              )}
            </div>

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
                    ? '#8B5CF6'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: input.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: input.trim() ? '0 0 20px rgba(139, 92, 246, 0.4)' : 'none',
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
