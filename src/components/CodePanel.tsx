import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { generateFormattedReactCode, DesignElement } from '../utils/codeGenerator';

interface CodePanelProps {
  elements: DesignElement[];
  isVisible: boolean;
  onToggle: () => void;
  onCodeChange?: (code: string) => void;
  componentName?: string;
}

const CodePanel: React.FC<CodePanelProps> = ({
  elements,
  isVisible,
  onToggle,
  onCodeChange,
  componentName = 'DesignComponent',
}) => {
  const [code, setCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lastElementsRef = useRef<string>('');

  // Generate code when elements change
  useEffect(() => {
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

  if (!isVisible) {
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
          <span style={{ color: '#e9e8e3', fontWeight: 500, fontSize: 13 }}>Live React Code</span>
          {isGenerating && (
            <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 500 }}>Generating...</span>
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
            onClick={onToggle}
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

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Editor
          height="100%"
          defaultLanguage="typescript"
          value={code}
          theme="vs-dark"
          onMount={handleEditorMount}
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
          <span>{elements.length} elements</span>
          <span>{elements.filter(e => e.animations.length > 0).length} animated</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#4ade80', fontWeight: 500 }}>TSX</span>
          <span style={{ color: '#5a5a5a' }}>Framer Motion</span>
        </div>
      </div>
    </div>
  );
};

export default CodePanel;
