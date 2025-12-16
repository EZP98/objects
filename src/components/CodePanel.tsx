import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { generateFormattedReactCode, DesignElement } from '../utils/codeGenerator';

// Get Monaco language from file extension
function getLanguageFromFile(filePath?: string): string {
  if (!filePath) return 'typescript';
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'md': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'svg': 'xml',
    'py': 'python',
    'sh': 'shell',
    'bash': 'shell',
    'sql': 'sql',
    'graphql': 'graphql',
    'gql': 'graphql',
  };
  return languageMap[ext || ''] || 'plaintext';
}

interface CodePanelProps {
  elements: DesignElement[];
  showPanel?: boolean;
  onClose?: () => void;
  onCodeChange?: (code: string) => void;
  componentName?: string;
  fileContent?: string;
  fileName?: string;
  selectedFile?: string;
  onFileContentChange?: (content: string) => void;
}

const CodePanel: React.FC<CodePanelProps> = ({
  elements,
  showPanel = true,
  onClose,
  onCodeChange,
  componentName = 'DesignComponent',
  fileContent,
  fileName,
  selectedFile,
  onFileContentChange,
}) => {
  const [code, setCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lastElementsRef = useRef<string>('');

  // Use file content if provided
  useEffect(() => {
    if (fileContent !== undefined) {
      setCode(fileContent);
    }
  }, [fileContent]);

  // Generate code when elements change (only if no file content)
  useEffect(() => {
    if (fileContent !== undefined) return;

    const elementsJson = JSON.stringify(elements);

    // Skip if elements haven't changed
    if (elementsJson === lastElementsRef.current) {
      return;
    }
    lastElementsRef.current = elementsJson;

    const generateCode = async () => {
      setIsGenerating(true);
      try {
        const generatedCode = await generateFormattedReactCode(elements, componentName);
        setCode(generatedCode);
        onCodeChange?.(generatedCode);
      } catch (error) {
        console.error('Code generation error:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    // Debounce code generation
    const timeoutId = setTimeout(generateCode, 300);
    return () => clearTimeout(timeoutId);
  }, [elements, componentName, onCodeChange]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentName}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!showPanel) {
    return null;
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#111111',
      borderLeft: '1px solid rgba(255, 255, 255, 0.06)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: '#111111',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span style={{ color: '#e9e8e3', fontWeight: 500, fontSize: 13 }}>
            {selectedFile ? selectedFile.split('/').pop() : 'Live React Code'}
          </span>
          {isGenerating && (
            <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 500 }}>Generating...</span>
          )}
          {selectedFile && (
            <span style={{ color: '#5a5a5a', fontSize: 11 }}>{selectedFile}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handleCopy}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#5a5a5a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Copy Code"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#8a8a8a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#5a5a5a';
            }}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#5a5a5a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Download File"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#8a8a8a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#5a5a5a';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            onClick={onClose}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#5a5a5a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Close Panel"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#8a8a8a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#5a5a5a';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Monaco Editor or Placeholder */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {!selectedFile ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: '#5a5a5a',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>Seleziona un file</div>
              <div style={{ fontSize: 12, color: '#404040' }}>Clicca su un file nella lista per visualizzare il codice</div>
            </div>
          </div>
        ) : code === '[binary file]' ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            color: '#5a5a5a',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>File binario</div>
              <div style={{ fontSize: 12, color: '#404040' }}>Questo file non può essere visualizzato come testo</div>
            </div>
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguageFromFile(selectedFile)}
            value={code}
            theme="vs-dark"
            onMount={handleEditorMount}
            onChange={(value) => {
              setCode(value || '');
              onFileContentChange?.(value || '');
            }}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
              fontLigatures: true,
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 12, bottom: 12 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              bracketPairColorization: { enabled: true },
              lineHeight: 1.6,
              letterSpacing: 0.3,
            }}
          />
        )}
      </div>

      {/* Footer Stats */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        background: '#111111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#404040',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {selectedFile ? (
            <span>{code.split('\n').length} righe</span>
          ) : (
            <>
              <span>{elements.length} elementi</span>
              <span>{elements.filter(e => e.animations.length > 0).length} animati</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#4ade80', fontWeight: 500 }}>
            {selectedFile ? selectedFile.split('.').pop()?.toUpperCase() || 'TXT' : 'TSX'}
          </span>
          <span style={{ color: '#5a5a5a' }}>
            {selectedFile ? getLanguageFromFile(selectedFile) : 'Framer Motion'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodePanel;
