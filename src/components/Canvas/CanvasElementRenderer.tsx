/**
 * Canvas Element Renderer
 *
 * Renders individual canvas elements with their styles.
 * Supports dragging like Figma/Framer.
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CanvasElement } from '../../lib/canvas/types';
import { useCanvasStore } from '../../lib/canvas/canvasStore';

// Container element types that can accept children
const CONTAINER_TYPES = ['frame', 'stack', 'grid', 'section', 'container', 'row', 'page', 'box'];

interface CanvasElementRendererProps {
  element: CanvasElement;
  elements: Record<string, CanvasElement>;
  zoom: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, addToSelection?: boolean) => void;
  onHover: (id: string | null) => void;
  /** If true, parent has auto layout - don't use absolute positioning */
  parentHasAutoLayout?: boolean;
  /** Parent's flex direction */
  parentFlexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
}

export function CanvasElementRenderer({
  element,
  elements,
  zoom,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  parentHasAutoLayout = false,
  parentFlexDirection = 'column',
}: CanvasElementRendererProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const textEditRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingContent, setEditingContent] = useState(element.content || '');
  const dragStartPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const hasDraggedRef = useRef(false);
  const lastClickTimeRef = useRef(0);

  const moveElement = useCanvasStore((state) => state.moveElement);
  const saveToHistory = useCanvasStore((state) => state.saveToHistory);
  const updateElementContent = useCanvasStore((state) => state.updateElementContent);
  const resizeElement = useCanvasStore((state) => state.resizeElement);

  // Check if this is a text element
  const isTextElement = element.type === 'text' || element.type === 'heading' || element.type === 'paragraph';

  // Sync editing content with element content when not editing
  useEffect(() => {
    if (!isEditingText) {
      setEditingContent(element.content || '');
    }
  }, [element.content, isEditingText]);

  // Focus text editor when entering edit mode
  useEffect(() => {
    if (isEditingText && textEditRef.current) {
      // Set the content first
      textEditRef.current.textContent = editingContent;
      textEditRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      if (textEditRef.current.childNodes.length > 0) {
        range.selectNodeContents(textEditRef.current);
        range.collapse(false);
      } else {
        range.setStart(textEditRef.current, 0);
        range.collapse(true);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditingText]);

  // Exit edit mode when element is deselected
  useEffect(() => {
    if (!isSelected && isEditingText) {
      // Save before exiting
      if (textEditRef.current) {
        const newContent = textEditRef.current.textContent || '';
        updateElementContent(element.id, newContent);
      }
      setIsEditingText(false);
    }
  }, [isSelected, isEditingText, element.id, updateElementContent]);

  // Handle element click with manual double-click detection
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (element.locked) return;

      // If editing text, don't change selection
      if (isEditingText) return;

      // Check for double-click (manual detection for better compatibility with framer-motion)
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTimeRef.current;
      lastClickTimeRef.current = now;

      if (timeSinceLastClick < 400 && isTextElement && !hasDraggedRef.current) {
        // Double-click detected - enter edit mode
        setIsEditingText(true);
        return;
      }

      // Only select if we didn't just finish dragging
      if (!hasDraggedRef.current) {
        onSelect(element.id, e.shiftKey);
      }
      hasDraggedRef.current = false;
    },
    [element.id, element.locked, onSelect, isEditingText, isTextElement]
  );

  // Keep native double-click as backup
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (element.locked) return;
      if (isTextElement && !isEditingText) {
        setIsEditingText(true);
      }
    },
    [element.locked, isTextElement, isEditingText]
  );

  // Handle text input changes - only auto-resize, don't save to store yet
  const handleTextInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      // Auto-resize if in "hug" mode
      const resizeX = (element.styles as any).resizeX || 'fixed';
      const resizeY = (element.styles as any).resizeY || 'fixed';

      if (textEditRef.current && (resizeX === 'hug' || resizeY === 'hug')) {
        const rect = textEditRef.current.getBoundingClientRect();
        const newWidth = resizeX === 'hug' ? Math.max(20, rect.width / zoom + 4) : element.size.width;
        const newHeight = resizeY === 'hug' ? Math.max(20, rect.height / zoom + 4) : element.size.height;
        resizeElement(element.id, { width: newWidth, height: newHeight });
      }
    },
    [element.id, element.styles, element.size, resizeElement, zoom]
  );

  // Handle text edit keyboard events
  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // Save content before exiting
        if (textEditRef.current) {
          const newContent = textEditRef.current.textContent || '';
          updateElementContent(element.id, newContent);
        }
        setIsEditingText(false);
        saveToHistory('Edit text');
      }
      // Don't propagate other keys to prevent canvas shortcuts
      e.stopPropagation();
    },
    [element.id, updateElementContent, saveToHistory]
  );

  // Handle blur to exit edit mode and save content
  const handleTextBlur = useCallback(() => {
    if (textEditRef.current) {
      const newContent = textEditRef.current.textContent || '';
      updateElementContent(element.id, newContent);
    }
    setIsEditingText(false);
    saveToHistory('Edit text');
  }, [element.id, updateElementContent, saveToHistory]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    if (element.locked || parentHasAutoLayout) return;
    setIsDragging(true);
    hasDraggedRef.current = false;

    // Store start positions of ALL selected elements (or just this one if not selected)
    const state = useCanvasStore.getState();
    const selectedIds = isSelected ? state.selectedElementIds : [element.id];
    const startPositions: Record<string, { x: number; y: number }> = {};

    for (const id of selectedIds) {
      const el = state.elements[id];
      if (el && !el.locked) {
        startPositions[id] = { x: el.position.x, y: el.position.y };
      }
    }
    dragStartPositionsRef.current = startPositions;

    // Select if not already selected
    if (!isSelected) {
      onSelect(element.id, false);
    }
  }, [element.id, element.locked, isSelected, onSelect, parentHasAutoLayout]);

  // Handle drag - update ALL selected elements in real-time
  const handleDrag = useCallback((event: any, info: { offset: { x: number; y: number } }) => {
    if (Object.keys(dragStartPositionsRef.current).length === 0 || element.locked || parentHasAutoLayout) return;

    hasDraggedRef.current = true;
    const offsetX = info.offset.x / zoom;
    const offsetY = info.offset.y / zoom;

    // Move ALL selected elements together
    for (const [id, startPos] of Object.entries(dragStartPositionsRef.current)) {
      moveElement(id, {
        x: Math.round(startPos.x + offsetX),
        y: Math.round(startPos.y + offsetY),
      });
    }
  }, [element.locked, zoom, moveElement, parentHasAutoLayout]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (hasDraggedRef.current) {
      saveToHistory('Move element');
    }
    setIsDragging(false);
    dragStartPositionsRef.current = {};
  }, [saveToHistory]);

  // Convert styles to CSS
  const getStyles = (): React.CSSProperties => {
    const { styles } = element;

    // When parent has auto layout, use relative positioning
    // When parent doesn't have auto layout, use absolute positioning
    const useAbsolute = !parentHasAutoLayout;

    // For auto-layout containers, text should fill width by default for proper alignment
    const isTextType = element.type === 'text' || element.type === 'heading' || element.type === 'paragraph';
    const autoFillText = isTextType && parentHasAutoLayout;

    // Determine outline/border for selection/hover state
    // Show inline outline for:
    // 1. Non-frame elements (they don't get SelectionOverlay anymore)
    // 2. Any element in auto-layout (position can't be calculated for SelectionOverlay)
    const isFrame = element.type === 'frame' || element.type === 'page';
    const needsInlineOutline = !isFrame || parentHasAutoLayout;

    let outlineStyle: string = 'none';
    let outlineOffset: number | string = 0;
    if (isSelected && needsInlineOutline) {
      outlineStyle = '2px solid #8B1E2B';
      outlineOffset = 2; // Esterno all'elemento per non sovrapporsi al contenuto
    } else if (isHovered && !isSelected) {
      outlineStyle = '1px solid rgba(139, 30, 43, 0.5)';
      outlineOffset = 1;
    }

    // Handle Fill/Hug resizing modes
    const resizeX = (styles as any).resizeX || 'fixed';
    const resizeY = (styles as any).resizeY || 'fixed';

    // Determine width based on resize mode
    let width: number | string = element.size.width;
    if (parentHasAutoLayout && resizeX === 'fill') {
      width = '100%';
    } else if (resizeX === 'hug') {
      width = 'auto';
    } else if (autoFillText && resizeX === 'fixed') {
      // Text in auto-layout should fill width by default for proper text alignment
      width = '100%';
    }

    // Determine height based on resize mode
    let height: number | string = element.size.height;
    if (parentHasAutoLayout && resizeY === 'fill') {
      height = '100%';
    } else if (resizeY === 'hug') {
      height = 'auto';
    } else if (autoFillText && resizeY === 'fixed') {
      // Text height can stay auto for natural text flow
      height = 'auto';
    }

    const css: React.CSSProperties = {
      position: useAbsolute ? 'absolute' : 'relative',
      ...(useAbsolute ? {
        left: element.position.x,
        top: element.position.y,
      } : {}),
      width,
      height,
      cursor: element.locked ? 'not-allowed' : (parentHasAutoLayout ? 'default' : 'move'),
      outline: outlineStyle,
      outlineOffset,
      opacity: element.visible ? (styles.opacity ?? 1) : 0.3,
      userSelect: 'none',
      boxSizing: 'border-box',
      zIndex: 1, // Ensure elements are above the artboard background click layer
      // Flex child properties when in auto layout
      ...(parentHasAutoLayout ? (() => {
        // In flex-direction: row, main axis is horizontal (width), cross axis is vertical (height)
        // In flex-direction: column, main axis is vertical (height), cross axis is horizontal (width)
        const isRow = parentFlexDirection === 'row' || parentFlexDirection === 'row-reverse';

        // For main axis (flexGrow affects this):
        // - row: resizeX fill uses flexGrow
        // - column: resizeY fill uses flexGrow
        const mainAxisFill = isRow ? resizeX === 'fill' : resizeY === 'fill';

        // For cross axis (alignSelf: stretch affects this):
        // - row: resizeY fill uses alignSelf stretch
        // - column: resizeX fill uses alignSelf stretch
        const crossAxisFill = isRow ? resizeY === 'fill' : resizeX === 'fill';

        return {
          flexShrink: mainAxisFill ? 1 : 0,
          flexGrow: mainAxisFill ? 1 : 0,
          flexBasis: mainAxisFill ? 0 : 'auto',
          alignSelf: crossAxisFill ? 'stretch' : undefined,
        };
      })() : {}),
      // Layout - for text with vertical alignment, use flex to align content
      ...(() => {
        // Check if this is a text element with vertical alignment
        const isTextElement = element.type === 'text' || element.type === 'heading' || element.type === 'paragraph';
        const hasVerticalAlign = styles.textAlignVertical && styles.textAlignVertical !== 'top';

        if (isTextElement && hasVerticalAlign) {
          // Use flexbox for vertical text alignment
          const verticalAlignMap: Record<string, string> = {
            'top': 'flex-start',
            'center': 'center',
            'bottom': 'flex-end',
          };
          return {
            display: 'flex' as const,
            flexDirection: 'column' as const,
            justifyContent: verticalAlignMap[styles.textAlignVertical || 'top'],
          };
        }
        // Normal layout
        return {
          display: styles.display || 'block',
          flexDirection: styles.flexDirection,
          justifyContent: styles.justifyContent,
          alignItems: styles.alignItems,
        };
      })(),
      gap: styles.gap,
      gridTemplateColumns: styles.gridTemplateColumns,
      // Spacing - resolve padding values consistently (shorthand fallback like PropertiesPanel)
      ...(() => {
        const basePadding = typeof styles.padding === 'number' ? styles.padding : (parseInt(String(styles.padding)) || 0);
        const pt = styles.paddingTop ?? basePadding;
        const pr = styles.paddingRight ?? basePadding;
        const pb = styles.paddingBottom ?? basePadding;
        const pl = styles.paddingLeft ?? basePadding;
        // Set individual values - only include if > 0 to avoid clutter, but 0 is valid
        return {
          paddingTop: pt,
          paddingRight: pr,
          paddingBottom: pb,
          paddingLeft: pl,
        };
      })(),
      // Background
      backgroundColor: styles.backgroundColor,
      backgroundImage: styles.backgroundImage,
      // Border
      borderRadius: styles.borderRadius,
      borderWidth: styles.borderWidth,
      borderColor: styles.borderColor,
      borderStyle: styles.borderStyle,
      // Typography
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      fontFamily: styles.fontFamily,
      color: styles.color,
      textAlign: styles.textAlign,
      lineHeight: styles.lineHeight,
      letterSpacing: styles.letterSpacing !== undefined ? `${styles.letterSpacing}px` : undefined,
      textDecoration: styles.textDecoration,
      textTransform: styles.textTransform,
      whiteSpace: styles.whiteSpace,
      // Border - individual radius
      borderTopLeftRadius: styles.borderTopLeftRadius,
      borderTopRightRadius: styles.borderTopRightRadius,
      borderBottomLeftRadius: styles.borderBottomLeftRadius,
      borderBottomRightRadius: styles.borderBottomRightRadius,
      // Background
      backgroundSize: styles.backgroundSize,
      backgroundPosition: styles.backgroundPosition,
      backgroundRepeat: styles.backgroundRepeat,
      // Effects
      boxShadow: styles.boxShadow,
      filter: styles.filter,
      backdropFilter: styles.backdropFilter,
      overflow: styles.overflow || (element.type === 'frame' || element.type === 'image' ? 'hidden' : undefined),
    };

    return css;
  };

  // Parse padding values for visualization
  const getPaddingValues = () => {
    const { styles } = element;
    const parsePx = (val: string | number | undefined): number => {
      if (val === undefined || val === null) return NaN; // Return NaN to indicate "not set"
      if (typeof val === 'number') return val;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? NaN : parsed;
    };

    // Check for individual padding or shorthand (use ?? to match PropertiesPanel logic)
    const basePadding = typeof styles.padding === 'number' ? styles.padding : (parseInt(String(styles.padding)) || 0);
    const top = parsePx(styles.paddingTop);
    const right = parsePx(styles.paddingRight);
    const bottom = parsePx(styles.paddingBottom);
    const left = parsePx(styles.paddingLeft);

    return {
      top: isNaN(top) ? basePadding : top,
      right: isNaN(right) ? basePadding : right,
      bottom: isNaN(bottom) ? basePadding : bottom,
      left: isNaN(left) ? basePadding : left,
    };
  };

  const paddingValues = getPaddingValues();
  const hasPadding = paddingValues.top > 0 || paddingValues.right > 0 ||
                     paddingValues.bottom > 0 || paddingValues.left > 0;

  // Show padding visualization on selection (like Figma)
  const showPaddingOverlay = isSelected && hasPadding;

  // Render based on element type
  const renderContent = () => {
    switch (element.type) {
      case 'text':
      case 'heading':
      case 'paragraph':
        // Text content - editable on double-click (Figma-style)
        if (isEditingText) {
          return (
            <div
              ref={textEditRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleTextInput}
              onKeyDown={handleTextKeyDown}
              onBlur={handleTextBlur}
              style={{
                outline: 'none',
                display: 'block',
                width: '100%',
                minHeight: '1em',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: 'text',
                caretColor: '#8B1E2B',
                background: 'rgba(139, 30, 43, 0.05)',
                borderRadius: 2,
                // Typography styles are on the container div via getStyles()
              }}
            />
          );
        }
        return (
          <span
            style={{
              pointerEvents: 'none',
              display: 'block',
              width: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              // Typography styles are on the container div via getStyles()
            }}
          >
            {element.content || ''}
          </span>
        );

      case 'button':
        return (
          <span style={{ pointerEvents: 'none' }}>
            {element.content || 'Button'}
          </span>
        );

      case 'image':
        return (
          <img
            src={element.src || 'https://via.placeholder.com/200x150'}
            alt={element.alt || 'Image'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
            draggable={false}
          />
        );

      case 'input':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
          >
            {element.placeholder || 'Enter text...'}
          </div>
        );

      case 'link':
        return (
          <span
            style={{
              textDecoration: 'underline',
              pointerEvents: 'none',
            }}
          >
            {element.content || 'Link text'}
          </span>
        );

      case 'icon':
        // Render icon - either as image or placeholder
        return element.src ? (
          <img
            src={element.src}
            alt={element.alt || 'Icon'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: element.styles.color || '#666',
              pointerEvents: 'none',
            }}
          >
            <svg width="50%" height="50%" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        );

      case 'video':
        return element.src ? (
          <video
            src={element.src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
            muted
            playsInline
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#666">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        );

      case 'frame':
      case 'stack':
      case 'grid':
      case 'section':
      case 'box':
      case 'container':
      case 'row':
      case 'page':
        // Check if this element has auto layout enabled
        const hasAutoLayout = element.styles.display === 'flex' || element.styles.display === 'grid';
        const flexDirection = element.styles.flexDirection || 'column';
        // Render children
        return element.children.map((childId) => {
          const child = elements[childId];
          if (!child || !child.visible) return null;
          return (
            <CanvasElementRenderer
              key={childId}
              element={child}
              elements={elements}
              zoom={zoom}
              isSelected={useCanvasStore.getState().selectedElementIds.includes(childId)}
              isHovered={useCanvasStore.getState().hoveredElementId === childId}
              onSelect={onSelect}
              onHover={onHover}
              parentHasAutoLayout={hasAutoLayout}
              parentFlexDirection={flexDirection}
            />
          );
        });

      default:
        // For any other element type with children, still render them
        if (element.children && element.children.length > 0) {
          const defaultHasAutoLayout = element.styles.display === 'flex' || element.styles.display === 'grid';
          const defaultFlexDirection = element.styles.flexDirection || 'column';
          return element.children.map((childId) => {
            const child = elements[childId];
            if (!child || !child.visible) return null;
            return (
              <CanvasElementRenderer
                key={childId}
                element={child}
                elements={elements}
                zoom={zoom}
                isSelected={useCanvasStore.getState().selectedElementIds.includes(childId)}
                isHovered={useCanvasStore.getState().hoveredElementId === childId}
                onSelect={onSelect}
                onHover={onHover}
                parentHasAutoLayout={defaultHasAutoLayout}
                parentFlexDirection={defaultFlexDirection}
              />
            );
          });
        }
        return null;
    }
  };

  // Can this element be dragged?
  const canDrag = !element.locked && !parentHasAutoLayout && !isEditingText;

  return (
    <motion.div
      ref={elementRef}
      data-element-id={element.id}
      drag={canDrag}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      style={{
        ...getStyles(),
        zIndex: isDragging ? 9999 : getStyles().zIndex,
      }}
      whileDrag={{ cursor: 'grabbing' }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => onHover(element.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Padding visualization overlay - Figma style */}
      {showPaddingOverlay && (
        <>
          {/* Top padding */}
          {paddingValues.top > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: paddingValues.left,
                right: paddingValues.right,
                height: paddingValues.top,
                background: 'rgba(139, 30, 43, 0.15)',
                borderBottom: '1px dashed rgba(139, 30, 43, 0.4)',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 9,
                fontWeight: 600,
                color: '#fff',
                background: '#8B1E2B',
                padding: '2px 6px',
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                {paddingValues.top}
              </span>
            </div>
          )}
          {/* Bottom padding */}
          {paddingValues.bottom > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: paddingValues.left,
                right: paddingValues.right,
                height: paddingValues.bottom,
                background: 'rgba(139, 30, 43, 0.15)',
                borderTop: '1px dashed rgba(139, 30, 43, 0.4)',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 9,
                fontWeight: 600,
                color: '#fff',
                background: '#8B1E2B',
                padding: '2px 6px',
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}>
                {paddingValues.bottom}
              </span>
            </div>
          )}
          {/* Left padding */}
          {paddingValues.left > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: paddingValues.top,
                bottom: paddingValues.bottom,
                width: paddingValues.left,
                background: 'rgba(139, 30, 43, 0.15)',
                borderRight: '1px dashed rgba(139, 30, 43, 0.4)',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-90deg)',
                fontSize: 9,
                fontWeight: 600,
                color: '#fff',
                background: '#8B1E2B',
                padding: '2px 6px',
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
              }}>
                {paddingValues.left}
              </span>
            </div>
          )}
          {/* Right padding */}
          {paddingValues.right > 0 && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: paddingValues.top,
                bottom: paddingValues.bottom,
                width: paddingValues.right,
                background: 'rgba(139, 30, 43, 0.15)',
                borderLeft: '1px dashed rgba(139, 30, 43, 0.4)',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(90deg)',
                fontSize: 9,
                fontWeight: 600,
                color: '#fff',
                background: '#8B1E2B',
                padding: '2px 6px',
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
              }}>
                {paddingValues.right}
              </span>
            </div>
          )}
        </>
      )}
      {renderContent()}
    </motion.div>
  );
}
