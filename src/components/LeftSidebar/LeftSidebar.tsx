/**
 * LeftSidebar
 *
 * Left sidebar with tabs:
 * - Pages: Navigation between pages/frames
 * - Layers: Element hierarchy tree
 */

import React, { useState } from 'react';
import { LayersPanel, type LayerNode } from '../LayersPanel';

type LeftSidebarTab = 'pages' | 'layers';

interface Page {
  path: string;
  name: string;
  component?: string;
}

interface Frame {
  id: string;
  name: string;
  width: number;
  height: number;
}

interface LeftSidebarProps {
  // Pages/Frames
  pages: Page[];
  frames: Frame[];
  currentPagePath: string;
  currentFrameId: string | null;
  onSelectPage: (path: string) => void;
  onSelectFrame: (id: string) => void;
  onAddPage?: () => void;
  onAddFrame?: () => void;

  // Layers
  layers: LayerNode[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility?: (id: string) => void;
  onToggleLayerLock?: (id: string) => void;

  // Collapse
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;

  // Mode
  isGitHubProject?: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  pages,
  frames,
  currentPagePath,
  currentFrameId,
  onSelectPage,
  onSelectFrame,
  onAddPage,
  onAddFrame,
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  isCollapsed = false,
  onToggleCollapse,
  isGitHubProject = false,
}) => {
  const [activeTab, setActiveTab] = useState<LeftSidebarTab>('pages');

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className="w-12 min-w-12 bg-[#111] border-r border-white/[0.06] flex flex-col items-center py-3 gap-2">
        <button
          onClick={onToggleCollapse}
          className="w-8 h-8 rounded-lg bg-white/5 text-gray-400 hover:text-white flex items-center justify-center"
          title="Expand"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div className="w-6 h-px bg-white/10 my-1" />
        <button
          onClick={() => { onToggleCollapse?.(); setActiveTab('pages'); }}
          className="w-8 h-8 rounded-lg text-gray-600 hover:text-gray-400 flex items-center justify-center"
          title="Pages"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>
        <button
          onClick={() => { onToggleCollapse?.(); setActiveTab('layers'); }}
          className="w-8 h-8 rounded-lg text-gray-600 hover:text-gray-400 flex items-center justify-center"
          title="Layers"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 min-w-72 bg-[#111] border-r border-white/[0.06] flex flex-col h-full overflow-hidden">
      {/* Header with tabs */}
      <div className="flex items-center border-b border-white/[0.06]">
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-400 transition-colors border-r border-white/[0.06]"
          title="Collapse"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Tab buttons */}
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 h-10 flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
            activeTab === 'pages'
              ? 'text-white bg-white/5'
              : 'text-gray-500 hover:text-gray-400 hover:bg-white/[0.02]'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          {isGitHubProject ? 'Pages' : 'Frames'}
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 h-10 flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
            activeTab === 'layers'
              ? 'text-white bg-white/5'
              : 'text-gray-500 hover:text-gray-400 hover:bg-white/[0.02]'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          Layers
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'pages' ? (
          // Pages/Frames Grid
          <div className="h-full flex flex-col">
            {/* Add button header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                {isGitHubProject ? pages.length : frames.length} {isGitHubProject ? 'pages' : 'frames'}
              </span>
              {(onAddPage || onAddFrame) && (
                <button
                  onClick={() => isGitHubProject ? onAddPage?.() : onAddFrame?.()}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                  title={isGitHubProject ? 'Add page' : 'Add frame'}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-2">
                {isGitHubProject ? (
                  pages.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-gray-600 text-xs">
                      No pages found
                    </div>
                  ) : (
                    pages.map(page => (
                      <button
                        key={page.path}
                        onClick={() => onSelectPage(page.path)}
                        className={`
                          p-2 rounded-lg text-left transition-all
                          ${currentPagePath === page.path
                            ? 'bg-violet-500/15 border-2 border-violet-500'
                            : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06]'
                          }
                        `}
                      >
                        <div className="w-full aspect-video bg-[#1a1a1a] rounded mb-2 flex items-center justify-center text-gray-700">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18" />
                            <path d="M9 21V9" />
                          </svg>
                        </div>
                        <div className="text-[11px] font-medium text-gray-200 truncate">{page.name}</div>
                        <div className="text-[9px] text-gray-600 font-mono truncate">{page.path}</div>
                      </button>
                    ))
                  )
                ) : (
                  frames.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-gray-600 text-xs">
                      No frames yet
                    </div>
                  ) : (
                    frames.map(frame => (
                      <button
                        key={frame.id}
                        onClick={() => onSelectFrame(frame.id)}
                        className={`
                          p-2 rounded-lg text-left transition-all
                          ${currentFrameId === frame.id
                            ? 'bg-violet-500/15 border-2 border-violet-500'
                            : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06]'
                          }
                        `}
                      >
                        <div className="w-full aspect-video bg-[#1a1a1a] rounded mb-2 flex items-center justify-center text-gray-700">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                          </svg>
                        </div>
                        <div className="text-[11px] font-medium text-gray-200 truncate">{frame.name}</div>
                        <div className="text-[9px] text-gray-600">{frame.width} × {frame.height}</div>
                      </button>
                    ))
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          // Layers Panel
          <LayersPanel
            layers={layers}
            selectedId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            onToggleVisibility={onToggleLayerVisibility}
            onToggleLock={onToggleLayerLock}
          />
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
