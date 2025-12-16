import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useWebContainer, WebContainerStatus } from '../lib/hooks/useWebContainer';

interface WebContainerPreviewProps {
  files?: Record<string, string>;
  autoStart?: boolean;
  onStatusChange?: (status: WebContainerStatus) => void;
  onUrlReady?: (url: string) => void;
  width?: number | string;
  height?: number | string;
  currentPath?: string;
  onPathChange?: (path: string) => void;
}

export interface WebContainerPreviewRef {
  getIframe: () => HTMLIFrameElement | null;
}

const WebContainerPreview = forwardRef<WebContainerPreviewRef, WebContainerPreviewProps>(({
  files,
  autoStart = true,
  onStatusChange,
  onUrlReady,
  width = '100%',
  height = '100%',
  currentPath,
  onPathChange,
}, ref) => {
  const {
    status,
    previewUrl,
    logs,
    error,
    runProject,
  } = useWebContainer();

  const hasStarted = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Expose iframe ref to parent
  useImperativeHandle(ref, () => ({
    getIframe: () => iframeRef.current,
  }));

  // Auto-start if enabled and files are ready
  useEffect(() => {
    if (autoStart && !hasStarted.current && status === 'idle' && files && Object.keys(files).length > 0) {
      hasStarted.current = true;
      runProject(files);
    }
  }, [autoStart, status, files, runProject]);

  // Show loading files state
  const isLoadingFiles = !files || Object.keys(files).length === 0;

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Notify parent when URL is ready
  useEffect(() => {
    if (previewUrl) {
      onUrlReady?.(previewUrl);
    }
  }, [previewUrl, onUrlReady]);

  // Navigate iframe when currentPath changes
  useEffect(() => {
    if (!currentPath || !previewUrl || !iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      if (iframe.contentWindow) {
        // Try using history API for SPA navigation
        iframe.contentWindow.history.pushState({}, '', currentPath);
        iframe.contentWindow.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (e) {
      // Cross-origin fallback: reload with new path
      if (previewUrl && iframeRef.current) {
        const url = new URL(previewUrl);
        url.pathname = currentPath;
        iframeRef.current.src = url.toString();
      }
    }
  }, [currentPath, previewUrl]);

  // Listen for navigation events from iframe
  useEffect(() => {
    if (!onPathChange || !iframeRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigation' && event.data?.path) {
        onPathChange(event.data.path);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPathChange]);

  const renderStatus = () => {
    // Show loading files state first
    if (isLoadingFiles) {
      return (
        <StatusDisplay
          icon="package"
          title="Caricamento file..."
          subtitle="Download da GitHub"
        />
      );
    }

    switch (status) {
      case 'booting':
        return (
          <StatusDisplay
            icon="rocket"
            title="Avvio WebContainer..."
            subtitle="Inizializzazione ambiente"
          />
        );
      case 'installing':
        return (
          <StatusDisplay
            icon="package"
            title="Installazione dipendenze..."
            subtitle="npm install"
            logs={logs}
          />
        );
      case 'starting':
        return (
          <StatusDisplay
            icon="server"
            title="Avvio server..."
            subtitle="npm run dev"
            logs={logs}
          />
        );
      case 'error':
        return (
          <StatusDisplay
            icon="error"
            title="Errore"
            subtitle={error || 'Si è verificato un errore'}
            logs={logs}
            isError
          />
        );
      case 'idle':
        return (
          <StatusDisplay
            icon="play"
            title="Pronto"
            subtitle="Clicca per avviare il preview"
            onClick={() => runProject(files)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width,
        height,
        background: '#0a0a0a',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {status === 'ready' && previewUrl ? (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#fff',
          }}
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        />
      ) : (
        renderStatus()
      )}
    </div>
  );
});

interface StatusDisplayProps {
  icon: 'rocket' | 'package' | 'server' | 'error' | 'play';
  title: string;
  subtitle: string;
  logs?: string[];
  isError?: boolean;
  onClick?: () => void;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({
  icon,
  title,
  subtitle,
  logs,
  isError,
  onClick,
}) => {
  const icons = {
    rocket: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
      </svg>
    ),
    package: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="m16.5 9.4-9-5.19"/>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.29 7 12 12 20.71 7"/>
        <line x1="12" x2="12" y1="22" y2="12"/>
      </svg>
    ),
    server: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
        <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
        <line x1="6" x2="6.01" y1="6" y2="6"/>
        <line x1="6" x2="6.01" y1="18" y2="18"/>
      </svg>
    ),
    error: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="8" y2="12"/>
        <line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
    ),
    play: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'linear-gradient(135deg, #141414 0%, #1a1a1a 100%)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* Spinner or Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: isError
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          animation: !isError && icon !== 'play' && icon !== 'error' ? 'pulse 2s infinite' : 'none',
        }}
      >
        {icons[icon]}
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          color: '#fff',
          fontSize: 16,
          fontWeight: 500,
          marginBottom: 4,
        }}>
          {title}
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
        }}>
          {subtitle}
        </div>
      </div>

      {/* Logs */}
      {logs && logs.length > 0 && (
        <div
          style={{
            width: '80%',
            maxWidth: 400,
            maxHeight: 150,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 8,
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {logs.slice(-8).map((log, i) => (
            <div key={i} style={{ marginBottom: 2, whiteSpace: 'pre-wrap' }}>
              {log}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
      `}</style>
    </div>
  );
};

export default WebContainerPreview;
