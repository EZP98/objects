import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type {
  EditableContextValue,
  EditableElementInfo,
  ParentToIframeMessage,
  ElementRect,
} from './types';

const RUNTIME_VERSION = '1.0.0';

// ============================================
// CONTEXT
// ============================================

const EditableContext = createContext<EditableContextValue>({
  isEditMode: false,
  selectedId: null,
  hoveredId: null,
  selectElement: () => {},
  hoverElement: () => {},
  updateProps: () => {},
  registerElement: () => {},
  unregisterElement: () => {},
});

export const useEditable = () => useContext(EditableContext);

// ============================================
// HELPER: Send message to parent
// ============================================

function sendToParent(message: Record<string, unknown>) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  } catch (e) {
    console.warn('[EditableRuntime] Failed to send message to parent:', e);
  }
}

// ============================================
// HELPER: Get element rect
// ============================================

function getElementRect(id: string): ElementRect | null {
  const el = document.querySelector(`[data-objects-id="${id}"]`);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  };
}

// ============================================
// HELPER: Get element styles
// ============================================

function getElementStyles(id: string) {
  const el = document.querySelector(`[data-objects-id="${id}"]`) as HTMLElement;
  if (!el) return { inline: {}, computed: {} };

  // Get inline styles
  const inline: Record<string, string> = {};
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style[i];
    inline[prop] = el.style.getPropertyValue(prop);
  }

  // Get computed styles (only relevant properties)
  const computed = window.getComputedStyle(el);
  const relevantProps = [
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'position', 'top', 'right', 'bottom', 'left',
    'backgroundColor', 'color', 'opacity',
    'borderWidth', 'borderColor', 'borderRadius', 'borderStyle',
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'letterSpacing',
    'boxShadow', 'overflow',
  ];

  const computedStyles: Record<string, string> = {};
  for (const prop of relevantProps) {
    computedStyles[prop] = computed.getPropertyValue(
      prop.replace(/([A-Z])/g, '-$1').toLowerCase()
    );
  }

  return { inline, computed: computedStyles };
}

// ============================================
// HELPER: Get element info for selection
// ============================================

function getElementInfo(id: string) {
  const el = document.querySelector(`[data-objects-id="${id}"]`) as HTMLElement;
  if (!el) return null;

  return {
    tagName: el.tagName,
    className: el.className,
    textContent: el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE
      ? el.textContent
      : undefined,
  };
}

// ============================================
// PROVIDER COMPONENT
// ============================================

interface EditableProviderProps {
  children: React.ReactNode;
  /** Enable edit mode immediately (useful for testing) */
  defaultEditMode?: boolean;
}

export function EditableProvider({
  children,
  defaultEditMode = false,
}: EditableProviderProps) {
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Store for registered elements and their props
  const elementsRef = useRef<Map<string, EditableElementInfo>>(new Map());
  const propsRef = useRef<Record<string, Record<string, unknown>>>({});

  // Force re-render trigger for props updates
  const [propsVersion, setPropsVersion] = useState(0);

  // ==========================================
  // Initialize global runtime object
  // ==========================================

  useEffect(() => {
    window.__OBJECTS_RUNTIME__ = {
      version: RUNTIME_VERSION,
      isEditMode,
      elements: elementsRef.current,
      props: propsRef.current,
    };

    return () => {
      delete window.__OBJECTS_RUNTIME__;
    };
  }, [isEditMode]);

  // ==========================================
  // Listen for messages from parent
  // ==========================================

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ParentToIframeMessage>) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      // Only handle our messages
      if (!data.type.startsWith('objects:')) return;

      console.log('[EditableRuntime] Received:', data.type);

      switch (data.type) {
        case 'objects:enable-edit-mode':
          setIsEditMode(true);
          document.body.style.cursor = 'crosshair';
          break;

        case 'objects:disable-edit-mode':
          setIsEditMode(false);
          setSelectedId(null);
          setHoveredId(null);
          document.body.style.cursor = '';
          break;

        case 'objects:select':
          setSelectedId(data.id);
          if (data.id) {
            const info = elementsRef.current.get(data.id);
            if (info) {
              const styles = getElementStyles(data.id);
              const elInfo = getElementInfo(data.id);
              sendToParent({
                type: 'objects:selected',
                id: data.id,
                componentName: info.componentName,
                props: propsRef.current[data.id] || info.props,
                rect: getElementRect(data.id),
                styles: styles.inline,
                computedStyles: styles.computed,
                tagName: elInfo?.tagName,
                className: elInfo?.className,
                textContent: elInfo?.textContent,
              });
            }
          }
          break;

        case 'objects:update-props':
          if (data.id && data.props) {
            propsRef.current[data.id] = {
              ...propsRef.current[data.id],
              ...data.props,
            };
            setPropsVersion((v) => v + 1);

            // Notify parent of the change
            sendToParent({
              type: 'objects:props-changed',
              id: data.id,
              props: propsRef.current[data.id],
            });
          }
          break;

        case 'objects:update-style':
          if (data.id && data.style) {
            const el = document.querySelector(
              `[data-objects-id="${data.id}"]`
            ) as HTMLElement;
            if (el) {
              Object.assign(el.style, data.style);
            }
          }
          break;

        case 'objects:highlight':
          setHoveredId(data.id);
          break;

        case 'objects:ping':
          sendToParent({ type: 'objects:pong' });
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify parent that runtime is ready
    sendToParent({ type: 'objects:ready', version: RUNTIME_VERSION });
    console.log('[EditableRuntime] Ready - version', RUNTIME_VERSION);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // ==========================================
  // Context methods
  // ==========================================

  const selectElement = useCallback((id: string) => {
    setSelectedId(id);

    const info = elementsRef.current.get(id);
    if (info) {
      const styles = getElementStyles(id);
      const elInfo = getElementInfo(id);
      sendToParent({
        type: 'objects:selected',
        id,
        componentName: info.componentName,
        props: propsRef.current[id] || info.props,
        rect: getElementRect(id),
        styles: styles.inline,
        computedStyles: styles.computed,
        tagName: elInfo?.tagName,
        className: elInfo?.className,
        textContent: elInfo?.textContent,
      });
    }
  }, []);

  const hoverElement = useCallback((id: string | null) => {
    setHoveredId(id);

    sendToParent({
      type: 'objects:hover',
      id,
      rect: id ? getElementRect(id) : null,
    });
  }, []);

  const updateProps = useCallback((id: string, props: Record<string, unknown>) => {
    propsRef.current[id] = {
      ...propsRef.current[id],
      ...props,
    };
    setPropsVersion((v) => v + 1);

    sendToParent({
      type: 'objects:props-changed',
      id,
      props: propsRef.current[id],
    });
  }, []);

  const registerElement = useCallback(
    (id: string, info: Omit<EditableElementInfo, 'id'>) => {
      elementsRef.current.set(id, { id, ...info });
      if (!propsRef.current[id]) {
        propsRef.current[id] = info.props;
      }

      // Send updated tree to parent
      sendToParent({
        type: 'objects:element-tree',
        tree: Array.from(elementsRef.current.values()),
      });
    },
    []
  );

  const unregisterElement = useCallback((id: string) => {
    elementsRef.current.delete(id);
    delete propsRef.current[id];

    if (selectedId === id) {
      setSelectedId(null);
      sendToParent({ type: 'objects:deselected' });
    }
  }, [selectedId]);

  // ==========================================
  // Get current props for an element (with updates)
  // ==========================================

  const getProps = useCallback((id: string, defaultProps: Record<string, unknown>) => {
    // Access propsVersion to trigger re-render on updates
    void propsVersion;
    return propsRef.current[id] || defaultProps;
  }, [propsVersion]);

  // Expose getProps globally for Editable component
  useEffect(() => {
    (window as any).__OBJECTS_GET_PROPS__ = getProps;
    return () => {
      delete (window as any).__OBJECTS_GET_PROPS__;
    };
  }, [getProps]);

  // ==========================================
  // Render
  // ==========================================

  const contextValue: EditableContextValue = {
    isEditMode,
    selectedId,
    hoveredId,
    selectElement,
    hoverElement,
    updateProps,
    registerElement,
    unregisterElement,
  };

  return (
    <EditableContext.Provider value={contextValue}>
      {children}

      {/* Edit mode indicator */}
      {isEditMode && (
        <div
          style={{
            position: 'fixed',
            bottom: 8,
            right: 8,
            background: '#3b82f6',
            color: 'white',
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            zIndex: 99999,
            pointerEvents: 'none',
            opacity: 0.9,
          }}
        >
          Edit Mode
        </div>
      )}
    </EditableContext.Provider>
  );
}
