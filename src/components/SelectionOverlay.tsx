/**
 * SelectionOverlay - Visual editing overlay for iframe preview
 * Handles element selection, resize handles, and visual feedback
 * Based on Plasmic's FreestyleManipulator approach
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

export interface SelectedElement {
  tagName: string;
  className: string;
  id: string;
  rect: DOMRect;
  computedStyles: CSSStyleDeclaration;
  xpath: string;
  sourceFile?: string;
  sourceLine?: number;
}

export interface HoveredElement {
  tagName: string;
  rect: DOMRect;
}

interface SelectionOverlayProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  enabled: boolean;
  zoom: number;
  onElementSelect?: (element: SelectedElement | null) => void;
  onElementHover?: (element: HoveredElement | null) => void;
  onStyleChange?: (property: string, value: string) => void;
  onPositionChange?: (deltaX: number, deltaY: number) => void;
  onSizeChange?: (width: number, height: number) => void;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  iframeRef,
  enabled,
  zoom,
  onElementSelect,
  onElementHover,
  onStyleChange,
  onPositionChange,
  onSizeChange,
}) => {
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HoveredElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if iframe is accessible (same-origin)
  const isIframeAccessible = useCallback((): boolean => {
    const iframe = iframeRef.current;
    if (!iframe) return false;
    try {
      // This will throw if cross-origin
      return iframe.contentDocument !== null;
    } catch {
      return false;
    }
  }, [iframeRef]);

  // Get element from point in iframe
  const getElementFromPoint = useCallback((clientX: number, clientY: number): SelectedElement | null => {
    const iframe = iframeRef.current;
    if (!iframe) return null;

    // Check cross-origin access
    try {
      if (!iframe.contentDocument) return null;
    } catch {
      // Cross-origin - can't access
      console.log('[SelectionOverlay] Cross-origin iframe, selection disabled');
      return null;
    }

    const iframeRect = iframe.getBoundingClientRect();
    const x = (clientX - iframeRect.left) / zoom;
    const y = (clientY - iframeRect.top) / zoom;

    const element = iframe.contentDocument.elementFromPoint(x, y) as HTMLElement;
    if (!element || element === iframe.contentDocument.body || element === iframe.contentDocument.documentElement) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const computedStyles = iframe.contentWindow!.getComputedStyle(element);

    return {
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      id: element.id,
      rect: new DOMRect(
        rect.left * zoom + iframeRect.left,
        rect.top * zoom + iframeRect.top,
        rect.width * zoom,
        rect.height * zoom
      ),
      computedStyles,
      xpath: getXPath(element),
      sourceFile: element.dataset.sourceFile,
      sourceLine: element.dataset.sourceLine ? parseInt(element.dataset.sourceLine) : undefined,
    };
  }, [iframeRef, zoom]);

  // Generate XPath for element
  const getXPath = (element: HTMLElement): string => {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      const part = index > 1 ? `${tagName}[${index}]` : tagName;
      parts.unshift(part);

      current = current.parentElement;
    }

    return '/' + parts.join('/');
  };

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enabled || isDragging || isResizing) return;

    const element = getElementFromPoint(e.clientX, e.clientY);
    if (element) {
      setHoveredElement({
        tagName: element.tagName,
        rect: element.rect,
      });
      onElementHover?.({
        tagName: element.tagName,
        rect: element.rect,
      });
    } else {
      setHoveredElement(null);
      onElementHover?.(null);
    }
  }, [enabled, isDragging, isResizing, getElementFromPoint, onElementHover]);

  // Handle click for selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();

    const element = getElementFromPoint(e.clientX, e.clientY);
    setSelectedElement(element);
    onElementSelect?.(element);
  }, [enabled, getElementFromPoint, onElementSelect]);

  // Handle drag start for moving element
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!selectedElement || isResizing) return;
    e.preventDefault();

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [selectedElement, isResizing]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  // Handle mouse move during drag/resize
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;

      if (isDragging && selectedElement) {
        onPositionChange?.(deltaX, deltaY);
        // Update visual feedback
        setSelectedElement(prev => prev ? {
          ...prev,
          rect: new DOMRect(
            prev.rect.x + (e.clientX - dragStart.x),
            prev.rect.y + (e.clientY - dragStart.y),
            prev.rect.width,
            prev.rect.height
          )
        } : null);
        setDragStart({ x: e.clientX, y: e.clientY });
      }

      if (isResizing && selectedElement && activeHandle) {
        let newWidth = selectedElement.rect.width;
        let newHeight = selectedElement.rect.height;
        let newX = selectedElement.rect.x;
        let newY = selectedElement.rect.y;

        // Calculate new dimensions based on handle
        if (activeHandle.includes('e')) {
          newWidth += e.clientX - dragStart.x;
        }
        if (activeHandle.includes('w')) {
          newWidth -= e.clientX - dragStart.x;
          newX += e.clientX - dragStart.x;
        }
        if (activeHandle.includes('s')) {
          newHeight += e.clientY - dragStart.y;
        }
        if (activeHandle.includes('n')) {
          newHeight -= e.clientY - dragStart.y;
          newY += e.clientY - dragStart.y;
        }

        // Minimum size
        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);

        onSizeChange?.(newWidth / zoom, newHeight / zoom);

        setSelectedElement(prev => prev ? {
          ...prev,
          rect: new DOMRect(newX, newY, newWidth, newHeight)
        } : null);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, selectedElement, activeHandle, zoom, onPositionChange, onSizeChange]);

  // Update selection when iframe content changes
  useEffect(() => {
    if (!selectedElement) return;

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const observer = new MutationObserver(() => {
      // Re-calculate selection rect
      // This is simplified - would need xpath to re-find element
    });

    observer.observe(iframe.contentDocument!.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [selectedElement, iframeRef]);

  // Don't render overlay if iframe is cross-origin (WebContainer)
  const canAccessIframe = isIframeAccessible();

  if (!enabled) return null;

  // If cross-origin, show info message instead of overlay
  if (!canAccessIframe) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 12,
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        Visual editing non disponibile per WebContainer. Usa la Chat per modificare il codice.
      </div>
    );
  }

  const renderResizeHandles = () => {
    if (!selectedElement) return null;

    const handles: { position: ResizeHandle; cursor: string; style: React.CSSProperties }[] = [
      { position: 'n', cursor: 'ns-resize', style: { top: -4, left: '50%', transform: 'translateX(-50%)' } },
      { position: 's', cursor: 'ns-resize', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)' } },
      { position: 'e', cursor: 'ew-resize', style: { right: -4, top: '50%', transform: 'translateY(-50%)' } },
      { position: 'w', cursor: 'ew-resize', style: { left: -4, top: '50%', transform: 'translateY(-50%)' } },
      { position: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4 } },
      { position: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4 } },
      { position: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4 } },
      { position: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4 } },
    ];

    return handles.map(({ position, cursor, style }) => (
      <div
        key={position}
        onMouseDown={(e) => handleResizeStart(e, position)}
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          background: '#fff',
          border: '1px solid #8b5cf6',
          borderRadius: 2,
          cursor,
          zIndex: 10,
          ...style,
        }}
      />
    ));
  };

  return (
    <div
      ref={overlayRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={() => setHoveredElement(null)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: enabled ? 'auto' : 'none',
        cursor: isDragging ? 'grabbing' : isResizing ? 'default' : 'default',
        zIndex: 50,
      }}
    >
      {/* Hover highlight */}
      {hoveredElement && !selectedElement && (
        <div
          style={{
            position: 'fixed',
            left: hoveredElement.rect.x,
            top: hoveredElement.rect.y,
            width: hoveredElement.rect.width,
            height: hoveredElement.rect.height,
            border: '2px solid #60a5fa',
            background: 'rgba(96, 165, 250, 0.1)',
            pointerEvents: 'none',
            transition: 'all 0.1s ease',
          }}
        >
          {/* Tag label */}
          <div
            style={{
              position: 'absolute',
              top: -24,
              left: -2,
              background: '#60a5fa',
              color: '#fff',
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {hoveredElement.tagName}
          </div>
        </div>
      )}

      {/* Selection box */}
      {selectedElement && (
        <div
          onMouseDown={handleDragStart}
          style={{
            position: 'fixed',
            left: selectedElement.rect.x,
            top: selectedElement.rect.y,
            width: selectedElement.rect.width,
            height: selectedElement.rect.height,
            border: '2px solid #8b5cf6',
            background: isDragging ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.05)',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging || isResizing ? 'none' : 'all 0.1s ease',
          }}
        >
          {/* Element info label */}
          <div
            style={{
              position: 'absolute',
              top: -28,
              left: -2,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#8b5cf6',
              color: '#fff',
              fontSize: 11,
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span>{selectedElement.tagName}</span>
            {selectedElement.className && (
              <span style={{ opacity: 0.7 }}>.{selectedElement.className.split(' ')[0]}</span>
            )}
            {selectedElement.id && (
              <span style={{ opacity: 0.7 }}>#{selectedElement.id}</span>
            )}
          </div>

          {/* Dimensions label */}
          <div
            style={{
              position: 'absolute',
              bottom: -24,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
            }}
          >
            {Math.round(selectedElement.rect.width / zoom)} × {Math.round(selectedElement.rect.height / zoom)}
          </div>

          {/* Resize handles */}
          {renderResizeHandles()}
        </div>
      )}

      {/* Guides (for alignment) */}
      {(isDragging || isResizing) && selectedElement && (
        <>
          {/* Horizontal center guide */}
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              top: selectedElement.rect.y + selectedElement.rect.height / 2,
              height: 1,
              background: '#f472b6',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />
          {/* Vertical center guide */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: selectedElement.rect.x + selectedElement.rect.width / 2,
              width: 1,
              background: '#f472b6',
              opacity: 0.5,
              pointerEvents: 'none',
            }}
          />
        </>
      )}
    </div>
  );
};

export default SelectionOverlay;
