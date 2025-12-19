/**
 * Canvas Layers Panel
 *
 * Shows a tree view of canvas elements similar to Figma/Plasmic.
 * Supports drag and drop to reparent elements.
 */

import React, { useState, useRef } from 'react';
import { useCanvasStore } from '../../lib/canvas/canvasStore';
import { CanvasElement, ElementType } from '../../lib/canvas/types';

// Element type icons
const TYPE_ICONS: Record<ElementType, React.ReactNode> = {
  page: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  frame: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  section: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  ),
  stack: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="6" rx="1" />
      <rect x="4" y="14" width="16" height="6" rx="1" />
    </svg>
  ),
  grid: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  text: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  button: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="18" height="12" rx="4" />
    </svg>
  ),
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  input: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <line x1="7" y1="12" x2="7" y2="12" />
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  video: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  ),
};

// Drag and drop state
interface DragState {
  draggedId: string | null;
  targetId: string | null;
  dropPosition: 'inside' | 'before' | 'after' | null;
}

const dragState: DragState = {
  draggedId: null,
  targetId: null,
  dropPosition: null,
};

interface LayerItemProps {
  element: CanvasElement;
  depth: number;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string, position: 'inside' | 'before' | 'after') => void;
  onDrop: (targetId: string, position: 'inside' | 'before' | 'after') => void;
  draggedId: string | null;
  dropTarget: { id: string; position: 'inside' | 'before' | 'after' } | null;
}

function LayerItem({
  element,
  depth,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedId,
  dropTarget,
}: LayerItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);

  const {
    elements,
    selectedElementIds,
    hoveredElementId,
    selectElement,
    setHoveredElement,
    toggleVisibility,
    toggleLock,
    renameElement,
  } = useCanvasStore();

  const isSelected = selectedElementIds.includes(element.id);
  const isHovered = hoveredElementId === element.id;
  const hasChildren = element.children.length > 0;
  const isDragging = draggedId === element.id;
  const isDropTarget = dropTarget?.id === element.id;
  const canAcceptDrop = element.type === 'frame' || element.type === 'page' || element.type === 'section';

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(element.name);

  const handleRename = () => {
    if (newName.trim() && newName !== element.name) {
      renameElement(element.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', element.id);
    onDragStart(element.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!rowRef.current || draggedId === element.id) return;

    const rect = rowRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: 'inside' | 'before' | 'after';

    if (canAcceptDrop) {
      // For containers, check if dropping inside or before/after
      if (y < height * 0.25) {
        position = 'before';
      } else if (y > height * 0.75) {
        position = 'after';
      } else {
        position = 'inside';
      }
    } else {
      // For non-containers, only before/after
      position = y < height / 2 ? 'before' : 'after';
    }

    onDragOver(element.id, position);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (dropTarget && draggedId !== element.id) {
      onDrop(dropTarget.id, dropTarget.position);
    }
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  // Calculate drop indicator style
  const getDropIndicatorStyle = (): React.CSSProperties | null => {
    if (!isDropTarget || !dropTarget) return null;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: depth * 16 + 8,
      right: 8,
      height: 2,
      background: '#0099FF',
      borderRadius: 1,
      pointerEvents: 'none',
    };

    if (dropTarget.position === 'before') {
      return { ...baseStyle, top: 0 };
    } else if (dropTarget.position === 'after') {
      return { ...baseStyle, bottom: 0 };
    } else if (dropTarget.position === 'inside') {
      return {
        position: 'absolute',
        inset: 2,
        border: '2px solid #0099FF',
        borderRadius: 4,
        pointerEvents: 'none',
      };
    }
    return null;
  };

  const dropIndicatorStyle = getDropIndicatorStyle();

  return (
    <div>
      {/* Layer row */}
      <div
        ref={rowRef}
        draggable={element.type !== 'page'}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onDragLeave={() => {}}
        className={`
          relative flex items-center gap-1 px-2 py-1 cursor-pointer text-xs group
          ${isSelected ? 'bg-[#8B1E2B]/40 text-white' : 'text-gray-400 hover:bg-white/5'}
          ${isHovered && !isSelected ? 'bg-white/10' : ''}
          ${isDragging ? 'opacity-50' : ''}
        `}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => selectElement(element.id)}
        onMouseEnter={() => setHoveredElement(element.id)}
        onMouseLeave={() => setHoveredElement(null)}
        onDoubleClick={() => setIsRenaming(true)}
      >
        {/* Drop indicator */}
        {dropIndicatorStyle && <div style={dropIndicatorStyle} />}

        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Type icon */}
        <span className={isSelected ? 'text-[#ff6b6b]' : 'text-gray-500'}>
          {TYPE_ICONS[element.type] || TYPE_ICONS.frame}
        </span>

        {/* Name */}
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setNewName(element.name);
                setIsRenaming(false);
              }
            }}
            className="flex-1 bg-transparent border border-[#8B1E2B] rounded px-1 text-white outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{element.name}</span>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          {/* Visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleVisibility(element.id);
            }}
            className={`w-5 h-5 flex items-center justify-center rounded ${
              element.visible ? 'text-gray-500 hover:text-white' : 'text-gray-600'
            }`}
            title={element.visible ? 'Hide' : 'Show'}
          >
            {element.visible ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>

          {/* Lock toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLock(element.id);
            }}
            className={`w-5 h-5 flex items-center justify-center rounded ${
              element.locked ? 'text-yellow-500' : 'text-gray-500 hover:text-white'
            }`}
            title={element.locked ? 'Unlock' : 'Lock'}
          >
            {element.locked ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {element.children.map((childId) => {
            const child = elements[childId];
            if (!child) return null;
            return (
              <LayerItem
                key={childId}
                element={child}
                depth={depth + 1}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                draggedId={draggedId}
                dropTarget={dropTarget}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CanvasLayers() {
  const { pages, elements, currentPageId, addPage, setCurrentPage, reparentElement } = useCanvasStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'inside' | 'before' | 'after' } | null>(null);

  const currentPage = pages[currentPageId];
  const rootElement = currentPage ? elements[currentPage.rootElementId] : null;

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTarget(null);
  };

  const handleDragOver = (id: string, position: 'inside' | 'before' | 'after') => {
    if (draggedId && id !== draggedId) {
      setDropTarget({ id, position });
    }
  };

  const handleDrop = (targetId: string, position: 'inside' | 'before' | 'after') => {
    if (!draggedId || draggedId === targetId) return;

    const draggedElement = elements[draggedId];
    const targetElement = elements[targetId];

    if (!draggedElement || !targetElement) return;

    // Prevent dropping parent into child
    const isDescendant = (parentId: string, childId: string): boolean => {
      const parent = elements[parentId];
      if (!parent) return false;
      if (parent.children.includes(childId)) return true;
      return parent.children.some(id => isDescendant(id, childId));
    };

    if (isDescendant(draggedId, targetId)) {
      console.warn('Cannot drop parent into its own child');
      handleDragEnd();
      return;
    }

    if (position === 'inside') {
      // Drop inside target (reparent)
      reparentElement(draggedId, targetId);
    } else {
      // Drop before/after target (reorder within same parent)
      const targetParentId = targetElement.parentId;
      if (!targetParentId) {
        handleDragEnd();
        return;
      }

      // First reparent to target's parent if different
      if (draggedElement.parentId !== targetParentId) {
        reparentElement(draggedId, targetParentId);
      }

      // Then reorder within parent
      const parent = elements[targetParentId];
      if (parent) {
        const newChildren = [...parent.children.filter(id => id !== draggedId)];
        const targetIndex = newChildren.indexOf(targetId);
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        newChildren.splice(insertIndex, 0, draggedId);

        // Update parent's children order
        useCanvasStore.setState((state) => ({
          elements: {
            ...state.elements,
            [targetParentId]: {
              ...state.elements[targetParentId],
              children: newChildren,
            },
          },
        }));
      }
    }

    handleDragEnd();
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white">
      {/* Pages section */}
      <div className="border-b border-white/5">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Pages {Object.keys(pages).length}
          </span>
          <button
            onClick={() => addPage()}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-500 hover:text-white"
            title="Add page"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Page list */}
        <div className="px-1 pb-2">
          {Object.values(pages).map((page) => (
            <div
              key={page.id}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs
                ${page.id === currentPageId ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}
              `}
              onClick={() => setCurrentPage(page.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              <span>{page.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Layers section */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Layers
          </span>
        </div>

        {/* Layer tree */}
        <div className="py-1">
          {rootElement && rootElement.children.length > 0 ? (
            rootElement.children.map((childId) => {
              const child = elements[childId];
              if (!child) return null;
              return (
                <LayerItem
                  key={childId}
                  element={child}
                  depth={0}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  draggedId={draggedId}
                  dropTarget={dropTarget}
                />
              );
            })
          ) : (
            <div className="px-3 py-8 text-center text-gray-600 text-xs">
              <div className="mb-2">No elements yet</div>
              <div className="text-gray-700">Click "+ Add" to add elements</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
