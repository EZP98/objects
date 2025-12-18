/**
 * ResponsiveToolbar
 *
 * Horizontal toolbar for switching between responsive breakpoints.
 * Like Plasmic's responsive design toolbar.
 *
 * Features:
 * - Breakpoint selector
 * - Custom viewport size input
 * - Rotate viewport
 * - Zoom controls
 */

import React, { useState } from 'react';

export interface Breakpoint {
  id: string;
  name: string;
  width: number;
  icon: 'mobile' | 'tablet' | 'desktop' | 'wide';
}

// Tailwind-like breakpoints
export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: 'mobile', name: 'Mobile', width: 375, icon: 'mobile' },
  { id: 'tablet', name: 'Tablet', width: 768, icon: 'tablet' },
  { id: 'desktop', name: 'Desktop', width: 1024, icon: 'desktop' },
  { id: 'wide', name: 'Wide', width: 1440, icon: 'wide' },
];

interface ResponsiveToolbarProps {
  activeBreakpoint: string;
  customWidth?: number;
  customHeight?: number;
  zoom: number;
  isRotated?: boolean;
  onBreakpointChange: (breakpointId: string) => void;
  onCustomSizeChange?: (width: number, height: number) => void;
  onZoomChange: (zoom: number) => void;
  onRotate?: () => void;
  breakpoints?: Breakpoint[];
}

// Device icons
const DeviceIcon: React.FC<{ type: 'mobile' | 'tablet' | 'desktop' | 'wide'; isActive: boolean }> = ({ type, isActive }) => {
  const color = isActive ? 'currentColor' : 'currentColor';

  switch (type) {
    case 'mobile':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="4" y="1" width="8" height="14" rx="1.5" stroke={color} strokeWidth="1.2"/>
          <line x1="6" y1="12" x2="10" y2="12" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'tablet':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="1.5" stroke={color} strokeWidth="1.2"/>
          <circle cx="8" cy="11" r="0.5" fill={color}/>
        </svg>
      );
    case 'desktop':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="2" width="14" height="10" rx="1" stroke={color} strokeWidth="1.2"/>
          <line x1="5" y1="14" x2="11" y2="14" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="8" y1="12" x2="8" y2="14" stroke={color} strokeWidth="1.2"/>
        </svg>
      );
    case 'wide':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="0" y="3" width="16" height="10" rx="1" stroke={color} strokeWidth="1.2"/>
          <line x1="5" y1="15" x2="11" y2="15" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="8" y1="13" x2="8" y2="15" stroke={color} strokeWidth="1.2"/>
        </svg>
      );
  }
};

// Zoom presets
const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200];

export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  activeBreakpoint,
  customWidth,
  customHeight,
  zoom,
  isRotated = false,
  onBreakpointChange,
  onCustomSizeChange,
  onZoomChange,
  onRotate,
  breakpoints = DEFAULT_BREAKPOINTS,
}) => {
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const [editingWidth, setEditingWidth] = useState(false);
  const [editingHeight, setEditingHeight] = useState(false);
  const [widthValue, setWidthValue] = useState(customWidth?.toString() || '');
  const [heightValue, setHeightValue] = useState(customHeight?.toString() || '');

  const activeBreakpointData = breakpoints.find(b => b.id === activeBreakpoint);
  const displayWidth = customWidth || activeBreakpointData?.width || 1024;
  const displayHeight = customHeight || 768;

  const handleWidthSubmit = () => {
    const width = parseInt(widthValue, 10);
    if (width > 0 && onCustomSizeChange) {
      onCustomSizeChange(width, displayHeight);
    }
    setEditingWidth(false);
  };

  const handleHeightSubmit = () => {
    const height = parseInt(heightValue, 10);
    if (height > 0 && onCustomSizeChange) {
      onCustomSizeChange(displayWidth, height);
    }
    setEditingHeight(false);
  };

  return (
    <div className="flex items-center justify-center gap-2 h-10 px-4 bg-[#1a1a1a] border-b border-white/10">
      {/* Breakpoint selector */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
        {breakpoints.map(breakpoint => (
          <button
            key={breakpoint.id}
            onClick={() => onBreakpointChange(breakpoint.id)}
            title={`${breakpoint.name} (${breakpoint.width}px)`}
            className={`
              w-8 h-6 flex items-center justify-center rounded transition-all
              ${activeBreakpoint === breakpoint.id
                ? 'bg-violet-500 text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }
            `}
          >
            <DeviceIcon type={breakpoint.icon} isActive={activeBreakpoint === breakpoint.id} />
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10" />

      {/* Viewport size */}
      <div className="flex items-center gap-1 text-xs">
        {/* Width */}
        {editingWidth ? (
          <input
            type="number"
            value={widthValue}
            onChange={(e) => setWidthValue(e.target.value)}
            onBlur={handleWidthSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleWidthSubmit()}
            className="w-14 h-6 px-1 bg-white/10 border border-violet-500/50 rounded text-center text-white focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setWidthValue(displayWidth.toString());
              setEditingWidth(true);
            }}
            className="min-w-[40px] h-6 px-2 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
          >
            {displayWidth}
          </button>
        )}

        <span className="text-gray-600">×</span>

        {/* Height */}
        {editingHeight ? (
          <input
            type="number"
            value={heightValue}
            onChange={(e) => setHeightValue(e.target.value)}
            onBlur={handleHeightSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleHeightSubmit()}
            className="w-14 h-6 px-1 bg-white/10 border border-violet-500/50 rounded text-center text-white focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => {
              setHeightValue(displayHeight.toString());
              setEditingHeight(true);
            }}
            className="min-w-[40px] h-6 px-2 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
          >
            {displayHeight}
          </button>
        )}

        <span className="text-gray-500 text-[10px] ml-1">px</span>
      </div>

      {/* Rotate button */}
      {onRotate && (
        <>
          <div className="w-px h-5 bg-white/10" />
          <button
            onClick={onRotate}
            title="Rotate viewport"
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors ${
              isRotated ? 'text-violet-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3V7H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 11C3 11 3.5 9 5 7.5C6.5 6 9 5 11 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </>
      )}

      {/* Divider */}
      <div className="w-px h-5 bg-white/10" />

      {/* Zoom controls */}
      <div className="relative flex items-center gap-1">
        {/* Zoom out */}
        <button
          onClick={() => {
            const idx = ZOOM_PRESETS.findIndex(z => z >= zoom);
            if (idx > 0) onZoomChange(ZOOM_PRESETS[idx - 1]);
          }}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Zoom value dropdown */}
        <button
          onClick={() => setShowZoomDropdown(!showZoomDropdown)}
          className="min-w-[48px] h-6 px-2 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-400 hover:text-white transition-colors"
        >
          {zoom}%
        </button>

        {/* Zoom dropdown */}
        {showZoomDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowZoomDropdown(false)}
            />
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 py-1 bg-[#252525] border border-white/10 rounded-lg shadow-xl min-w-[80px]">
              {ZOOM_PRESETS.map(preset => (
                <button
                  key={preset}
                  onClick={() => {
                    onZoomChange(preset);
                    setShowZoomDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:bg-white/10 transition-colors ${
                    zoom === preset ? 'text-violet-400' : 'text-gray-300'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <div className="border-t border-white/10 mt-1 pt-1">
                <button
                  onClick={() => {
                    onZoomChange(100);
                    setShowZoomDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Fit to screen
                </button>
              </div>
            </div>
          </>
        )}

        {/* Zoom in */}
        <button
          onClick={() => {
            const idx = ZOOM_PRESETS.findIndex(z => z > zoom);
            if (idx !== -1) onZoomChange(ZOOM_PRESETS[idx]);
          }}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Breakpoint name indicator */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          {activeBreakpointData?.name || 'Custom'}
        </span>
        {/* Recording indicator (when editing a breakpoint-specific style) */}
        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded text-red-400 text-[10px] opacity-0 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Recording
        </div>
      </div>
    </div>
  );
};

export default ResponsiveToolbar;
