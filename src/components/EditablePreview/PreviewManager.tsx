/**
 * PreviewManager
 *
 * Manages communication between the editor and the preview iframe
 * that contains the editable-runtime.
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type {
  IframeToParentMessage,
  ElementRect,
} from '../../../packages/editable-runtime/src/types';

// ============================================
// TYPES
// ============================================

export interface SelectedElement {
  id: string;
  componentName: string;
  props: Record<string, unknown>;
  rect: ElementRect | null;
}

export interface PreviewManagerRef {
  enableEditMode: () => void;
  disableEditMode: () => void;
  selectElement: (id: string | null) => void;
  updateProps: (id: string, props: Record<string, unknown>) => void;
  updateStyle: (id: string, style: React.CSSProperties) => void;
  highlightElement: (id: string | null) => void;
}

interface PreviewManagerProps {
  /** Preview URL from WebContainer */
  previewUrl: string | null;
  /** External iframe ref (if provided, uses existing iframe instead of creating one) */
  externalIframeRef?: React.RefObject<HTMLIFrameElement | null>;
  /** Called when an element is selected in the preview */
  onElementSelect?: (element: SelectedElement | null) => void;
  /** Called when hovering over an element */
  onElementHover?: (element: { id: string; rect: ElementRect } | null) => void;
  /** Called when the runtime is ready */
  onReady?: () => void;
  /** Called when props change */
  onPropsChange?: (id: string, props: Record<string, unknown>) => void;
  /** Called when element tree updates */
  onTreeUpdate?: (tree: unknown[]) => void;
  /** Width of the preview */
  width?: number | string;
  /** Height of the preview */
  height?: number | string;
  /** Zoom level */
  zoom?: number;
  /** Whether to show as overlay only (no iframe) */
  overlayOnly?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const PreviewManager = forwardRef<PreviewManagerRef, PreviewManagerProps>(
  (
    {
      previewUrl,
      externalIframeRef,
      onElementSelect,
      onElementHover,
      onReady,
      onPropsChange,
      onTreeUpdate,
      width = '100%',
      height = '100%',
      zoom = 1,
      overlayOnly = false,
    },
    ref
  ) => {
    const internalIframeRef = useRef<HTMLIFrameElement>(null);
    // Use external iframe if provided, otherwise use internal
    const iframeRef = externalIframeRef || internalIframeRef;
    const [isReady, setIsReady] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [hoverRect, setHoverRect] = useState<ElementRect | null>(null);
    const [selectedRect, setSelectedRect] = useState<ElementRect | null>(null);

    // ==========================================
    // Send message to iframe
    // ==========================================

    const sendToIframe = useCallback((message: Record<string, unknown>) => {
      if (!iframeRef.current?.contentWindow) {
        console.warn('[PreviewManager] Iframe not ready');
        return;
      }

      try {
        iframeRef.current.contentWindow.postMessage(message, '*');
      } catch (e) {
        console.error('[PreviewManager] Failed to send message:', e);
      }
    }, []);

    // ==========================================
    // Imperative handle
    // ==========================================

    useImperativeHandle(ref, () => ({
      enableEditMode: () => {
        setEditMode(true);
        sendToIframe({ type: 'objects:enable-edit-mode' });
      },
      disableEditMode: () => {
        setEditMode(false);
        setHoverRect(null);
        setSelectedRect(null);
        sendToIframe({ type: 'objects:disable-edit-mode' });
      },
      selectElement: (id: string | null) => {
        sendToIframe({ type: 'objects:select', id });
      },
      updateProps: (id: string, props: Record<string, unknown>) => {
        sendToIframe({ type: 'objects:update-props', id, props });
      },
      updateStyle: (id: string, style: React.CSSProperties) => {
        sendToIframe({ type: 'objects:update-style', id, style });
      },
      highlightElement: (id: string | null) => {
        sendToIframe({ type: 'objects:highlight', id });
      },
    }), [sendToIframe]);

    // ==========================================
    // Listen for messages from iframe
    // ==========================================

    useEffect(() => {
      const handleMessage = (event: MessageEvent<IframeToParentMessage>) => {
        const data = event.data;
        if (!data || typeof data !== 'object' || !data.type) return;

        // Only handle our messages
        if (!data.type.startsWith('objects:')) return;

        console.log('[PreviewManager] Received:', data.type, data);

        switch (data.type) {
          case 'objects:ready':
            console.log('[PreviewManager] Runtime ready, version:', data.version);
            setIsReady(true);
            onReady?.();
            // Auto-enable edit mode if already set
            if (editMode) {
              sendToIframe({ type: 'objects:enable-edit-mode' });
            }
            break;

          case 'objects:selected':
            setSelectedRect(data.rect);
            onElementSelect?.({
              id: data.id,
              componentName: data.componentName,
              props: data.props,
              rect: data.rect,
            });
            break;

          case 'objects:deselected':
            setSelectedRect(null);
            onElementSelect?.(null);
            break;

          case 'objects:hover':
            setHoverRect(data.rect);
            if (data.id && data.rect) {
              onElementHover?.({ id: data.id, rect: data.rect });
            } else {
              onElementHover?.(null);
            }
            break;

          case 'objects:props-changed':
            onPropsChange?.(data.id, data.props);
            break;

          case 'objects:element-tree':
            onTreeUpdate?.(data.tree);
            break;

          case 'objects:pong':
            // Connection confirmed
            break;
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [editMode, onElementSelect, onElementHover, onReady, onPropsChange, onTreeUpdate, sendToIframe]);

    // ==========================================
    // Ping to check connection
    // ==========================================

    useEffect(() => {
      if (!previewUrl) return;

      const pingInterval = setInterval(() => {
        if (!isReady) {
          sendToIframe({ type: 'objects:ping' });
        }
      }, 1000);

      return () => clearInterval(pingInterval);
    }, [previewUrl, isReady, sendToIframe]);

    // ==========================================
    // Reset state when URL changes
    // ==========================================

    useEffect(() => {
      setIsReady(false);
      setHoverRect(null);
      setSelectedRect(null);
    }, [previewUrl]);

    // ==========================================
    // Render
    // ==========================================

    // In overlay mode, only render overlays (no iframe)
    if (overlayOnly) {
      return (
        <>
          {/* Edit mode indicator */}
          {editMode && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                background: isReady
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 500,
                zIndex: 50,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              }}
            >
              {isReady ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Mode - Click to select
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  Connecting...
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </>
              )}
            </div>
          )}

          {/* Hover overlay */}
          {editMode && hoverRect && !selectedRect && (
            <div
              style={{
                position: 'absolute',
                top: hoverRect.top * zoom,
                left: hoverRect.left * zoom,
                width: hoverRect.width * zoom,
                height: hoverRect.height * zoom,
                border: '2px solid #93c5fd',
                background: 'rgba(147, 197, 253, 0.1)',
                borderRadius: 2,
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            />
          )}

          {/* Selection overlay */}
          {editMode && selectedRect && (
            <div
              style={{
                position: 'absolute',
                top: selectedRect.top * zoom,
                left: selectedRect.left * zoom,
                width: selectedRect.width * zoom,
                height: selectedRect.height * zoom,
                border: '2px solid #3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 2,
                pointerEvents: 'none',
                zIndex: 1001,
              }}
            />
          )}
        </>
      );
    }

    // Full mode with own iframe
    if (!previewUrl) {
      return (
        <div
          style={{
            width,
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a1a',
            color: '#666',
          }}
        >
          No preview URL
        </div>
      );
    }

    return (
      <div
        style={{
          width,
          height,
          position: 'relative',
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {/* Preview iframe */}
        <iframe
          ref={internalIframeRef}
          src={previewUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        />

        {/* Hover overlay */}
        {editMode && hoverRect && !selectedRect && (
          <div
            style={{
              position: 'absolute',
              top: hoverRect.top * zoom,
              left: hoverRect.left * zoom,
              width: hoverRect.width * zoom,
              height: hoverRect.height * zoom,
              border: '2px solid #93c5fd',
              borderRadius: 2,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          />
        )}

        {/* Selection overlay */}
        {editMode && selectedRect && (
          <div
            style={{
              position: 'absolute',
              top: selectedRect.top * zoom,
              left: selectedRect.left * zoom,
              width: selectedRect.width * zoom,
              height: selectedRect.height * zoom,
              border: '2px solid #3b82f6',
              borderRadius: 2,
              pointerEvents: 'none',
              zIndex: 1001,
            }}
          />
        )}

        {/* Connection status */}
        {editMode && !isReady && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 12,
              zIndex: 1002,
            }}
          >
            Connecting to preview...
          </div>
        )}
      </div>
    );
  }
);

PreviewManager.displayName = 'PreviewManager';

export default PreviewManager;
