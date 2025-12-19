/**
 * Visual Canvas Component
 *
 * A Figma-style canvas where ALL pages/artboards are visible at once.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useDragControls } from 'framer-motion';
import { useCanvasStore } from '../../lib/canvas/canvasStore';

// Draggable Page Component - only header triggers drag
function DraggablePage({
  page,
  header,
  content,
  zoom,
  onDragEnd
}: {
  page: { id: string; x?: number; y?: number };
  header: React.ReactNode;
  content: React.ReactNode;
  zoom: number;
  onDragEnd: (pageId: string, offset: { x: number; y: number }) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false} // Disable automatic drag - only header triggers it
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        onDragEnd(page.id, {
          x: info.offset.x / zoom,
          y: info.offset.y / zoom
        });
        x.set(0);
        y.set(0);
        setIsDragging(false);
      }}
      style={{
        x,
        y,
        position: 'absolute',
        left: page.x || 0,
        top: page.y || 0,
        zIndex: isDragging ? 9999 : 1,
      }}
      whileDrag={{ scale: 1.02 }}
    >
      <div style={{ position: 'relative' }}>
        {/* Header - ONLY this triggers page drag */}
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            dragControls.start(e);
          }}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {header}
        </div>
        {/* Content - does NOT trigger page drag */}
        {content}
      </div>
    </motion.div>
  );
}
import { CanvasElement, CanvasPage, Position, ElementType } from '../../lib/canvas/types';
import { CanvasElementRenderer } from './CanvasElementRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { CanvasToolbar } from './CanvasToolbar';
import { ContextMenu } from './ContextMenu';

interface CanvasProps {
  zoom: number;
  pan: Position;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: Position) => void;
}

export function Canvas({ zoom, pan, onZoomChange, onPanChange }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'frame' | 'text'>('select');

  // Refs for pan/zoom to avoid stale closures in event handlers
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  // View mode: 'multi' shows all pages, 'single' shows only current page
  const [viewMode, setViewMode] = useState<'multi' | 'single'>('multi');

  // Page dragging state
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string | null } | null>(null);

  // Marquee selection state
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);


  const {
    elements,
    pages,
    currentPageId,
    selectedElementIds,
    hoveredElementId,
    selectElement,
    deselectAll,
    setHoveredElement,
    addElement,
    addBlock,
    movePagePosition,
    setCurrentPage,
    saveToHistory,
  } = useCanvasStore();

  // Initialize history on mount
  useEffect(() => {
    const { saveInitialState } = useCanvasStore.getState();
    saveInitialState();
  }, []);

  // Handle canvas click (deselect) - only if not marquee selecting
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (marquee) return; // Don't deselect if we just finished marquee
      if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvasBackground) {
        deselectAll();
      }
    },
    [deselectAll, marquee]
  );


  // Track if Space is pressed for temporary hand tool
  const [spacePressed, setSpacePressed] = useState(false);

  // Handle Space key for temporary hand tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setSpacePressed(true);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pan: Space+drag, middle mouse, or hand tool
  // Marquee: Left click drag on canvas background with select tool
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse, hand tool, or Space pressed = pan anywhere
      if (e.button === 1 || activeTool === 'hand' || spacePressed) {
        e.preventDefault();
        e.stopPropagation();
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      // Left click on canvas background with select tool = start marquee selection
      if (e.button === 0 && activeTool === 'select') {
        const target = e.target as HTMLElement;
        const isCanvasBackground = target === canvasRef.current ||
                                   target.dataset.canvasBackground === 'true' ||
                                   target.dataset.artboardBackground === 'true';
        if (isCanvasBackground) {
          e.preventDefault();
          setMarquee({
            startX: e.clientX,
            startY: e.clientY,
            currentX: e.clientX,
            currentY: e.clientY,
          });
        }
      }
    },
    [pan, activeTool, spacePressed]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && panStart) {
        e.preventDefault();
        onPanChange({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }

      // Update marquee
      if (marquee) {
        e.preventDefault();
        setMarquee(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      }
    },
    [isPanning, panStart, onPanChange, marquee]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);

    // Complete marquee selection
    if (marquee) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        // Calculate marquee bounds in canvas coordinates
        const minX = Math.min(marquee.startX, marquee.currentX);
        const maxX = Math.max(marquee.startX, marquee.currentX);
        const minY = Math.min(marquee.startY, marquee.currentY);
        const maxY = Math.max(marquee.startY, marquee.currentY);

        // Only select if marquee is big enough (not just a click)
        if (maxX - minX > 5 || maxY - minY > 5) {
          // Convert screen coordinates to canvas coordinates
          const canvasCenterX = rect.width / 2;
          const canvasCenterY = rect.height / 2;

          const marqueeCanvasMinX = (minX - rect.left - canvasCenterX - pan.x) / zoom;
          const marqueeCanvasMaxX = (maxX - rect.left - canvasCenterX - pan.x) / zoom;
          const marqueeCanvasMinY = (minY - rect.top - canvasCenterY - pan.y) / zoom;
          const marqueeCanvasMaxY = (maxY - rect.top - canvasCenterY - pan.y) / zoom;

          // Find all elements that intersect with the marquee
          const currentPage = pages[currentPageId];
          if (currentPage) {
            const pageX = currentPage.x || 0;
            const pageY = currentPage.y || 0;
            const rootElement = elements[currentPage.rootElementId];

            const selectedIds: string[] = [];

            // Check each child of the current page
            const checkElement = (elementId: string, offsetX: number, offsetY: number) => {
              const el = elements[elementId];
              if (!el || !el.visible || el.locked) return;

              // Skip the page root element itself
              if (el.type === 'page') {
                el.children.forEach(childId => checkElement(childId, offsetX, offsetY));
                return;
              }

              const elX = offsetX + el.position.x;
              const elY = offsetY + el.position.y;
              const elRight = elX + el.size.width;
              const elBottom = elY + el.size.height;

              // Check if element intersects with marquee
              if (elX < marqueeCanvasMaxX && elRight > marqueeCanvasMinX &&
                  elY < marqueeCanvasMaxY && elBottom > marqueeCanvasMinY) {
                selectedIds.push(elementId);
              }

              // Check children
              el.children.forEach(childId => checkElement(childId, elX, elY));
            };

            if (rootElement) {
              checkElement(currentPage.rootElementId, pageX, pageY);
            }

            // Select all found elements
            if (selectedIds.length > 0) {
              // Use selectElement with add=true for each element after the first
              const { selectElement, deselectAll } = useCanvasStore.getState();
              deselectAll();
              selectedIds.forEach((id, index) => {
                selectElement(id, index > 0);
              });
            }
          }
        }
      }
      setMarquee(null);
    }
  }, [marquee, zoom, pan, elements, pages, currentPageId]);

  // Add element handler - adds to selected container if it can contain children
  const handleAddElement = useCallback(
    (type: string) => {
      // Check if there's a selected element that can be a parent (frame, stack, grid, page)
      let targetParentId: string | undefined;

      if (selectedElementIds.length === 1) {
        const selectedElement = elements[selectedElementIds[0]];
        if (selectedElement && ['frame', 'stack', 'grid', 'page'].includes(selectedElement.type)) {
          // Add as child of the selected container
          targetParentId = selectedElement.id;
        } else if (selectedElement?.parentId) {
          // If selected element is not a container, add as sibling (to the same parent)
          const parent = elements[selectedElement.parentId];
          if (parent && ['frame', 'stack', 'grid', 'page'].includes(parent.type)) {
            targetParentId = parent.id;
          }
        }
      }

      addElement(type as ElementType, targetParentId);
    },
    [addElement, selectedElementIds, elements]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in an input
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping) return;

      // Tool shortcuts (only when Cmd/Ctrl is NOT pressed)
      if (!e.metaKey && !e.ctrlKey) {
        if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          setActiveTool('select');
        }
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          setActiveTool('hand');
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          addElement('frame');
        }
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          addElement('text');
        }
        // Image shortcut
        if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          addElement('image');
        }
        // Button shortcut
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          addElement('button');
        }
        // Rectangle/Box shortcut
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          addElement('frame');
        }
      }

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
        e.preventDefault();
        const { deleteElement, deletePage, elements, pages } = useCanvasStore.getState();
        for (const id of selectedElementIds) {
          const element = elements[id];
          if (!element) continue;

          // Check if this is a page root element
          if (element.type === 'page') {
            // Find the page that has this element as rootElementId
            const pageEntry = Object.entries(pages).find(
              ([_, page]) => page.rootElementId === id
            );
            if (pageEntry) {
              deletePage(pageEntry[0]);
            }
          } else {
            deleteElement(id);
          }
        }
      }

      // Arrow keys for moving selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElementIds.length > 0) {
        e.preventDefault();
        const { moveElement } = useCanvasStore.getState();
        const delta = e.shiftKey ? 10 : 1;

        for (const id of selectedElementIds) {
          const element = elements[id];
          if (!element || element.locked) continue;

          let newX = element.position.x;
          let newY = element.position.y;

          switch (e.key) {
            case 'ArrowUp': newY -= delta; break;
            case 'ArrowDown': newY += delta; break;
            case 'ArrowLeft': newX -= delta; break;
            case 'ArrowRight': newX += delta; break;
          }

          moveElement(id, { x: newX, y: newY });
        }
        saveToHistory('Move element');
      }

      // Copy/Paste/Cut/Undo/Redo and Frame/Group operations
      if (e.metaKey || e.ctrlKey) {
        const { copy, paste, cut, undo, redo, selectAll, wrapInFrame, groupElements, ungroupElements, duplicateElement, toggleLock, toggleVisibility } = useCanvasStore.getState();

        // Wrap in Frame: Cmd+Option+G (Mac) / Ctrl+Alt+G (Windows)
        if (e.key === 'g' && e.altKey && !e.shiftKey) {
          e.preventDefault();
          wrapInFrame();
          return;
        }

        // Ungroup: Shift+Cmd+G (Mac) / Shift+Ctrl+G (Windows)
        if (e.key === 'g' && e.shiftKey && !e.altKey) {
          e.preventDefault();
          ungroupElements();
          return;
        }

        // Group: Cmd+G (Mac) / Ctrl+G (Windows)
        if (e.key === 'g' && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          groupElements();
          return;
        }

        // Lock: Cmd+Shift+L (Figma style)
        if ((e.key === 'l' || e.key === 'L') && e.shiftKey) {
          e.preventDefault();
          for (const id of selectedElementIds) {
            toggleLock(id);
          }
          return;
        }

        // Hide: Cmd+Shift+H (Figma style)
        if ((e.key === 'h' || e.key === 'H') && e.shiftKey) {
          e.preventDefault();
          for (const id of selectedElementIds) {
            toggleVisibility(id);
          }
          return;
        }

        if (e.key === 'c') {
          e.preventDefault();
          copy();
        }
        if (e.key === 'v') {
          e.preventDefault();
          paste();
        }
        if (e.key === 'x') {
          e.preventDefault();
          cut();
        }
        if (e.key === 'd') {
          e.preventDefault();
          for (const id of selectedElementIds) {
            duplicateElement(id);
          }
        }
        // Undo: Cmd+Z
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        // Redo: Cmd+Shift+Z or Cmd+Y
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          redo();
        }
        if (e.key === 'a') {
          e.preventDefault();
          selectAll();
        }
        // Zoom shortcuts
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          onZoomChange(Math.min(4, zoom + 0.25));
        }
        if (e.key === '-') {
          e.preventDefault();
          onZoomChange(Math.max(0.1, zoom - 0.25));
        }
        if (e.key === '0') {
          e.preventDefault();
          onZoomChange(1);
          onPanChange({ x: 0, y: 0 });
        }
        // Zoom to fit: Cmd+1
        if (e.key === '1') {
          e.preventDefault();
          onZoomChange(1);
        }
      }

      // Escape
      if (e.key === 'Escape') {
        deselectAll();
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElementIds, deselectAll, addElement, zoom, onZoomChange, onPanChange]);

  // Wheel handling - Figma style with smooth pan and zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Momentum state for smooth inertial scrolling
    let velocityX = 0;
    let velocityY = 0;
    let animationFrame: number | null = null;
    let lastWheelTime = 0;

    const applyMomentum = () => {
      const friction = 0.92;
      velocityX *= friction;
      velocityY *= friction;

      if (Math.abs(velocityX) < 0.5 && Math.abs(velocityY) < 0.5) {
        velocityX = 0;
        velocityY = 0;
        animationFrame = null;
        return;
      }

      // Use ref to get current pan value (avoids stale closure)
      onPanChange({
        x: panRef.current.x + velocityX,
        y: panRef.current.y + velocityY,
      });

      animationFrame = requestAnimationFrame(applyMomentum);
    };

    // Get zoom target point - selected element center or cursor
    const getZoomTarget = (e: WheelEvent, rect: DOMRect): { x: number; y: number } => {
      const state = useCanvasStore.getState();
      const { selectedElementIds, elements, pages, currentPageId } = state;

      // If element(s) selected, zoom towards their center
      if (selectedElementIds.length > 0) {
        const currentPage = pages[currentPageId];
        if (!currentPage) return { x: e.clientX - rect.left, y: e.clientY - rect.top };

        // Calculate bounding box of all selected elements
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const id of selectedElementIds) {
          const el = elements[id];
          if (!el) continue;

          // Get element position relative to page
          const elX = el.position.x + (currentPage.x || 0);
          const elY = el.position.y + (currentPage.y || 0);

          minX = Math.min(minX, elX);
          minY = Math.min(minY, elY);
          maxX = Math.max(maxX, elX + el.size.width);
          maxY = Math.max(maxY, elY + el.size.height);
        }

        if (minX !== Infinity) {
          // Center of selected elements in canvas coordinates
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          // Convert to screen coordinates - use refs for current values
          const currentPan = panRef.current;
          const currentZoom = zoomRef.current;
          const screenCenterX = rect.width / 2 + currentPan.x + centerX * currentZoom;
          const screenCenterY = rect.height / 2 + currentPan.y + centerY * currentZoom;

          return { x: screenCenterX, y: screenCenterY };
        }
      }

      // No selection - use cursor position
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      const timeDelta = now - lastWheelTime;
      lastWheelTime = now;

      // Get current values from refs
      const currentPan = panRef.current;
      const currentZoom = zoomRef.current;

      const isDeltaPixels = e.deltaMode === 0;
      const hasHorizontalScroll = Math.abs(e.deltaX) > 0;
      const isPinchZoom = e.ctrlKey && isDeltaPixels;
      // More reliable trackpad detection - trackpad sends many small deltas
      const isTrackpad = hasHorizontalScroll || (isDeltaPixels && !e.ctrlKey);

      // Pinch zoom (trackpad) or Cmd+scroll
      if (isPinchZoom || e.metaKey) {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        velocityX = 0;
        velocityY = 0;

        const rect = canvas.getBoundingClientRect();
        const target = getZoomTarget(e, rect);

        const sensitivity = isPinchZoom ? 0.008 : 0.003;
        const zoomDelta = Math.exp(-e.deltaY * sensitivity);
        const newZoom = Math.min(4, Math.max(0.1, currentZoom * zoomDelta));

        if (Math.abs(newZoom - currentZoom) < 0.001) return;

        const zoomRatio = newZoom / currentZoom;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = target.x - centerX - currentPan.x;
        const offsetY = target.y - centerY - currentPan.y;

        const newPanX = currentPan.x - offsetX * (zoomRatio - 1);
        const newPanY = currentPan.y - offsetY * (zoomRatio - 1);

        onZoomChange(newZoom);
        onPanChange({ x: newPanX, y: newPanY });
      } else if (isTrackpad || hasHorizontalScroll) {
        // Trackpad two-finger scroll = pan
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }

        const newPan = {
          x: currentPan.x - e.deltaX,
          y: currentPan.y - e.deltaY,
        };
        onPanChange(newPan);

        if (timeDelta < 50) {
          velocityX = -e.deltaX * 0.3;
          velocityY = -e.deltaY * 0.3;
        }

        setTimeout(() => {
          if (Date.now() - lastWheelTime > 80 && (Math.abs(velocityX) > 1 || Math.abs(velocityY) > 1)) {
            if (!animationFrame) {
              animationFrame = requestAnimationFrame(applyMomentum);
            }
          }
        }, 100);
      } else {
        // Mouse wheel = zoom towards selected element or cursor
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        velocityX = 0;
        velocityY = 0;

        const rect = canvas.getBoundingClientRect();
        const target = getZoomTarget(e, rect);

        const zoomDelta = Math.exp(-e.deltaY * 0.002);
        const newZoom = Math.min(4, Math.max(0.1, currentZoom * zoomDelta));

        if (Math.abs(newZoom - currentZoom) < 0.001) return;

        const zoomRatio = newZoom / currentZoom;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = target.x - centerX - currentPan.x;
        const offsetY = target.y - centerY - currentPan.y;

        const newPanX = currentPan.x - offsetX * (zoomRatio - 1);
        const newPanY = currentPan.y - offsetY * (zoomRatio - 1);

        onZoomChange(newZoom);
        onPanChange({ x: newPanX, y: newPanY });
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [onZoomChange, onPanChange]); // Removed zoom, pan since we use refs

  // Handle page drag end - update store position
  const handlePageDragEnd = useCallback((pageId: string, offset: { x: number; y: number }) => {
    const page = pages[pageId];
    if (!page) return;

    const newX = Math.round((page.x || 0) + offset.x);
    const newY = Math.round((page.y || 0) + offset.y);
    movePagePosition(pageId, { x: newX, y: newY });
    saveToHistory('Move page');
  }, [pages, movePagePosition, saveToHistory]);

  // Render a single page/artboard
  const renderPage = (page: CanvasPage, forceCenter = false) => {
    const rootElement = elements[page.rootElementId];
    if (!rootElement) return null;

    const isCurrentPage = page.id === currentPageId;

    // In single mode, center the page (ignore x,y position)
    const usePosition = forceCenter ? { x: 0, y: 0 } : { x: page.x || 0, y: page.y || 0 };

    // Page header (drag handle)
    const pageHeader = (
      <div
        style={{
          position: 'absolute',
          top: -40,
          left: 0,
          width: rootElement.size.width,
          height: 36,
          background: isCurrentPage ? '#A83248' : '#27272a',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          userSelect: 'none',
          zIndex: 1000,
          touchAction: 'none',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" opacity={0.6}>
          <circle cx="2.5" cy="2.5" r="2" />
          <circle cx="7.5" cy="2.5" r="2" />
          <circle cx="2.5" cy="7" r="2" />
          <circle cx="7.5" cy="7" r="2" />
          <circle cx="2.5" cy="11.5" r="2" />
          <circle cx="7.5" cy="11.5" r="2" />
        </svg>
        <span>{page.name}</span>
        <span style={{ opacity: 0.6, fontSize: 11 }}>{rootElement.size.width} × {rootElement.size.height}</span>
      </div>
    );

    // Page content (artboard)
    const pageContent = (
      <>
        {/* Artboard content */}
          <div
            className="relative shadow-2xl"
            style={{
              width: rootElement.size.width,
              height: rootElement.size.height,
              backgroundColor: rootElement.styles.backgroundColor || '#ffffff',
              borderRadius: 8,
              boxShadow: isCurrentPage
                ? '0 25px 100px rgba(0,0,0,0.5), 0 0 0 2px #A83248'
                : '0 25px 100px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
              cursor: activeTool === 'select' ? 'default' : undefined,
              // Auto Layout styles from page
              display: rootElement.styles.display || 'block',
              flexDirection: rootElement.styles.flexDirection,
              justifyContent: rootElement.styles.justifyContent,
              alignItems: rootElement.styles.alignItems,
              gap: rootElement.styles.gap,
              padding: rootElement.styles.padding,
              paddingTop: rootElement.styles.paddingTop,
              paddingRight: rootElement.styles.paddingRight,
              paddingBottom: rootElement.styles.paddingBottom,
              paddingLeft: rootElement.styles.paddingLeft,
              overflow: rootElement.styles.overflow || 'hidden',
            }}
            onClick={(e) => {
              // Select page when clicking on artboard background
              const target = e.target as HTMLElement;
              const isClickOnArtboard = target === e.currentTarget || target.dataset.artboardBackground === 'true';
              if (isClickOnArtboard && activeTool === 'select') {
                e.stopPropagation();
                setCurrentPage(page.id);
                selectElement(rootElement.id);
              }
            }}
          >
          {/* Invisible click layer for page selection */}
          <div
            data-artboard-background="true"
            onClick={(e) => {
              e.stopPropagation();
              if (activeTool === 'select') {
                setCurrentPage(page.id);
                selectElement(rootElement.id);
              }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              cursor: activeTool === 'select' ? 'default' : undefined,
            }}
          />

          {/* Render elements */}
          {(() => {
            const pageHasAutoLayout = rootElement.styles.display === 'flex' || rootElement.styles.display === 'grid';
            const pageFlexDirection = rootElement.styles.flexDirection || 'column';
            return rootElement.children.map((childId) => {
              const child = elements[childId];
              if (!child || !child.visible) return null;
              return (
                <CanvasElementRenderer
                  key={childId}
                  element={child}
                  elements={elements}
                  zoom={zoom}
                  isSelected={selectedElementIds.includes(childId)}
                  isHovered={hoveredElementId === childId}
                  onSelect={(id, add) => {
                    setCurrentPage(page.id);
                    selectElement(id, add);
                  }}
                  onHover={setHoveredElement}
                  parentHasAutoLayout={pageHasAutoLayout}
                  parentFlexDirection={pageFlexDirection}
                />
              );
            });
          })()}

          {/* Selection overlays - only for current page, SOLO per frame/page */}
          {isCurrentPage && selectedElementIds.map((id) => {
            const element = elements[id];
            if (!element) return null;

            // SOLO frame e page ottengono SelectionOverlay
            // Altri elementi usano outline inline da CanvasElementRenderer
            if (element.type !== 'frame' && element.type !== 'page') {
              return null;
            }

            // Page root element
            if (element.type === 'page' && element.id === rootElement.id) {
              const pageElement = {
                ...element,
                position: { x: 0, y: 0 },
              };
              return <SelectionOverlay key={`sel-${id}`} element={pageElement} zoom={zoom} />;
            }

            // Frame - calcola offset se ha parent con posizione assoluta
            let current = element;
            let offsetX = 0;
            let offsetY = 0;

            while (current.parentId) {
              if (current.parentId === rootElement.id) break;
              const parent = elements[current.parentId];
              if (!parent) return null;

              // Se il parent ha auto-layout, il frame è posizionato dal flexbox
              // In questo caso non usiamo offset (position è 0,0)
              if (parent.styles.display === 'flex' || parent.styles.display === 'grid') {
                // Frame dentro auto-layout - mostra solo outline inline, no resize handles
                return null;
              }

              offsetX += parent.position.x;
              offsetY += parent.position.y;
              current = parent;
            }
            if (current.parentId !== rootElement.id) return null;

            // IMPORTANTE: Controlla anche se il rootElement (Page) ha auto-layout
            // In questo caso, i figli diretti sono posizionati dal flexbox, non da position.x/y
            if (rootElement.styles.display === 'flex' || rootElement.styles.display === 'grid') {
              // Frame è figlio diretto di una pagina con auto-layout
              // La posizione è gestita dal flexbox - usa outline inline invece
              return null;
            }

            return (
              <SelectionOverlay
                key={`sel-${id}`}
                element={element}
                zoom={zoom}
                displayOffset={{ x: offsetX, y: offsetY }}
              />
            );
          })}

          {/* Empty state - only for current page */}
          {isCurrentPage && rootElement.children.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-gray-300 text-lg mb-2">Empty canvas</div>
                <div className="text-gray-500 text-sm">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">F</kbd> for frame,{' '}
                  <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">T</kbd> for text
                </div>
              </div>
            </div>
          )}
          </div>
      </>
    );

    return (
      <DraggablePage
        key={page.id}
        page={{ id: page.id, x: usePosition.x, y: usePosition.y }}
        zoom={zoom}
        onDragEnd={handlePageDragEnd}
        header={pageHeader}
        content={pageContent}
      />
    );
  };

  return (
    <div
      ref={canvasRef}
      className="relative"
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 0, // Important for flex children
        background: '#0a0808',
        cursor: isPanning ? 'grabbing' : (activeTool === 'hand' || spacePressed) ? 'grab' : 'default',
        overflow: 'hidden',
        // Prevent browser back/forward gestures on horizontal scroll
        overscrollBehavior: 'none',
        touchAction: 'none',
      }}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => {
        e.preventDefault();
        // Find clicked element
        const target = e.target as HTMLElement;
        const elementId = target.closest('[data-element-id]')?.getAttribute('data-element-id') || null;
        if (elementId && !selectedElementIds.includes(elementId)) {
          selectElement(elementId);
        }
        setContextMenu({ x: e.clientX, y: e.clientY, elementId });
      }}
    >
      {/* Grid pattern background */}
      <div
        data-canvas-background="true"
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
          pointerEvents: 'none',
        }}
      />

      {/* All pages container - centered and panned */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          paddingTop: 50, // Space for drag handles
        }}
      >
        {/* Render pages based on view mode */}
        {viewMode === 'multi'
          ? Object.values(pages).map((page) => renderPage(page, false))
          : pages[currentPageId] && renderPage(pages[currentPageId], false)
        }
      </div>

      {/* Floating Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onAddElement={handleAddElement}
        onAddBlock={addBlock}
        zoom={zoom}
        onZoomChange={onZoomChange}
      />


      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Marquee Selection Rectangle */}
      {marquee && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(marquee.startX, marquee.currentX),
            top: Math.min(marquee.startY, marquee.currentY),
            width: Math.abs(marquee.currentX - marquee.startX),
            height: Math.abs(marquee.currentY - marquee.startY),
            backgroundColor: 'rgba(139, 30, 43, 0.1)',
            border: '1px solid rgba(139, 30, 43, 0.6)',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        />
      )}
    </div>
  );
}
