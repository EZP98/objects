/**
 * LayersPanel
 *
 * Tree view of all elements in the document.
 * Similar to Figma/Plasmic layer panels.
 *
 * Features:
 * - Hierarchical tree view
 * - Click to select element
 * - Visibility toggle
 * - Lock toggle
 * - Drag to reorder (future)
 */

import React, { useState, useCallback } from 'react';

// Element node in the tree
export interface LayerNode {
  id: string;
  name: string;
  tagName: string;
  componentName?: string;
  children: LayerNode[];
  isVisible: boolean;
  isLocked: boolean;
  depth: number;
}

interface LayersPanelProps {
  layers: LayerNode[];
  selectedId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onReorder?: (dragId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
}

// Icons
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    style={{
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.15s ease'
    }}
  >
    <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    {visible ? (
      <>
        <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7C13 7 11 11 7 11C3 11 1 7 1 7Z" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2"/>
      </>
    ) : (
      <>
        <path d="M1 7C1 7 3 3 7 3C11 3 13 7 13 7" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
        <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
      </>
    )}
  </svg>
);

const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    {locked ? (
      <>
        <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4 5V3.5C4 2.67 4.67 2 5.5 2H6.5C7.33 2 8 2.67 8 3.5V5" stroke="currentColor" strokeWidth="1.2"/>
      </>
    ) : (
      <>
        <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
        <path d="M4 5V3.5C4 2.67 4.67 2 5.5 2H6.5C7.33 2 8 2.67 8 3.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
      </>
    )}
  </svg>
);

// Element type icons
const getElementIcon = (tagName: string, componentName?: string) => {
  // Component
  if (componentName && componentName !== tagName) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="2" width="10" height="10" rx="2" stroke="#A78BFA" strokeWidth="1.2"/>
        <path d="M5 7L6.5 8.5L9 5.5" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  switch (tagName.toLowerCase()) {
    case 'div':
    case 'section':
    case 'article':
    case 'main':
    case 'header':
    case 'footer':
    case 'nav':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="1" stroke="#60A5FA" strokeWidth="1.2"/>
        </svg>
      );
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="3" y="11" fontSize="10" fontWeight="bold" fill="#F472B6">H</text>
        </svg>
      );
    case 'p':
    case 'span':
    case 'text':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="3" y="11" fontSize="10" fill="#94A3B8">T</text>
        </svg>
      );
    case 'button':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="4" width="12" height="6" rx="2" stroke="#34D399" strokeWidth="1.2"/>
        </svg>
      );
    case 'input':
    case 'textarea':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="4" width="12" height="6" rx="1" stroke="#FBBF24" strokeWidth="1.2"/>
          <line x1="3" y1="7" x2="7" y2="7" stroke="#FBBF24" strokeWidth="1.2"/>
        </svg>
      );
    case 'img':
    case 'image':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="1" stroke="#38BDF8" strokeWidth="1.2"/>
          <circle cx="5" cy="5" r="1" fill="#38BDF8"/>
          <path d="M2 10L5 7L7 9L10 6L12 8" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'a':
    case 'link':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M6 8L8 6M5 9L3 11C2.5 11.5 2.5 12.5 3 13C3.5 13.5 4.5 13.5 5 13L7 11M9 5L11 3C11.5 2.5 11.5 1.5 11 1C10.5 0.5 9.5 0.5 9 1L7 3" stroke="#818CF8" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'ul':
    case 'ol':
    case 'li':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="3" cy="4" r="1" fill="#94A3B8"/>
          <line x1="5" y1="4" x2="12" y2="4" stroke="#94A3B8" strokeWidth="1.2"/>
          <circle cx="3" cy="7" r="1" fill="#94A3B8"/>
          <line x1="5" y1="7" x2="12" y2="7" stroke="#94A3B8" strokeWidth="1.2"/>
          <circle cx="3" cy="10" r="1" fill="#94A3B8"/>
          <line x1="5" y1="10" x2="12" y2="10" stroke="#94A3B8" strokeWidth="1.2"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="1" stroke="#64748B" strokeWidth="1.2"/>
        </svg>
      );
  }
};

// Single layer item
const LayerItem: React.FC<{
  node: LayerNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
}> = ({ node, selectedId, expandedIds, onSelect, onToggleExpand, onToggleVisibility, onToggleLock }) => {
  const isSelected = node.id === selectedId;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`
          group flex items-center h-7 px-2 cursor-pointer
          hover:bg-white/5 transition-colors
          ${isSelected ? 'bg-violet-500/20 hover:bg-violet-500/30' : ''}
        `}
        style={{ paddingLeft: `${8 + node.depth * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand/Collapse */}
        <button
          className={`w-4 h-4 flex items-center justify-center mr-1 text-gray-500 hover:text-white transition-colors ${!hasChildren ? 'invisible' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.id);
          }}
        >
          <ChevronIcon expanded={isExpanded} />
        </button>

        {/* Element icon */}
        <span className="mr-2 opacity-70">
          {getElementIcon(node.tagName, node.componentName)}
        </span>

        {/* Name */}
        <span className={`flex-1 text-xs truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
          {node.componentName || node.name || node.tagName}
        </span>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleVisibility && (
            <button
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(node.id);
              }}
            >
              <EyeIcon visible={node.isVisible} />
            </button>
          )}
          {onToggleLock && (
            <button
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLock(node.id);
              }}
            >
              <LockIcon locked={node.isLocked} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <LayerItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-expand parents when an element is selected
  React.useEffect(() => {
    if (selectedId) {
      // Find path to selected and expand all parents
      const findPath = (nodes: LayerNode[], targetId: string, path: string[] = []): string[] | null => {
        for (const node of nodes) {
          if (node.id === targetId) {
            return path;
          }
          if (node.children.length > 0) {
            const found = findPath(node.children, targetId, [...path, node.id]);
            if (found) return found;
          }
        }
        return null;
      };

      const path = findPath(layers, selectedId);
      if (path && path.length > 0) {
        setExpandedIds(prev => {
          const next = new Set(prev);
          path.forEach(id => next.add(id));
          return next;
        });
      }
    }
  }, [selectedId, layers]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter layers by search
  const filterLayers = useCallback((nodes: LayerNode[], query: string): LayerNode[] => {
    if (!query) return nodes;

    const lowerQuery = query.toLowerCase();
    const filterNode = (node: LayerNode): LayerNode | null => {
      const matches =
        node.name.toLowerCase().includes(lowerQuery) ||
        node.tagName.toLowerCase().includes(lowerQuery) ||
        (node.componentName?.toLowerCase().includes(lowerQuery) ?? false);

      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is LayerNode => n !== null);

      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };

    return nodes.map(filterNode).filter((n): n is LayerNode => n !== null);
  }, []);

  const filteredLayers = filterLayers(layers, searchQuery);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Layers</span>
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-white/5">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="7.5" y1="7.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-7 pr-2 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Layer tree */}
      <div className="flex-1 overflow-y-auto">
        {filteredLayers.length > 0 ? (
          filteredLayers.map(node => (
            <LayerItem
              key={node.id}
              node={node}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelectLayer}
              onToggleExpand={handleToggleExpand}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-2 opacity-50">
              <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="4" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="12" y1="12" x2="12" y2="28" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="text-xs">No elements</span>
          </div>
        )}
      </div>

      {/* Footer info */}
      {selectedId && (
        <div className="px-3 py-2 border-t border-white/10 bg-white/5">
          <span className="text-xs text-gray-500">
            Selected: <span className="text-gray-300">{selectedId}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default LayersPanel;
