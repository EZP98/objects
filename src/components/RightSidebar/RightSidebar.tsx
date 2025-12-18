/**
 * RightSidebar
 *
 * Properties panel with tabs:
 * 1. Style - CSS properties editor
 * 2. Variants - Hover, active, disabled states
 * 3. Animations - Keyframe animations
 * 4. Presets - Saved style presets
 */

import React, { useState } from 'react';
import { StylePanel, type SelectedElementInfo, type ElementStyles } from '../StylePanel';
import { VariantsPanel, DEFAULT_INTERACTION_VARIANTS, DEFAULT_RESPONSIVE_VARIANTS, type VariantGroup, type Variant } from '../VariantsPanel';
import { AnimationsPanel, type Animation } from '../AnimationsPanel';
import { StylePresetsPanel, DEFAULT_STYLE_PRESETS, type StylePreset } from '../StylePresets';

type RightSidebarTab = 'style' | 'variants' | 'animations' | 'presets';

interface RightSidebarProps {
  // Element
  element: SelectedElementInfo | null;

  // Style changes
  onStyleChange: (styles: Partial<ElementStyles>) => void;
  onTextChange?: (text: string) => void;
  onApplyToCode?: () => Promise<void>;
  isApplying?: boolean;

  // Variants
  variants?: VariantGroup[];
  activeVariants?: string[];
  onToggleVariant?: (variantId: string) => void;
  onAddVariant?: (groupId: string, variant: Omit<Variant, 'id' | 'isActive'>) => void;

  // Animations
  animations?: Animation[];
  onAddAnimation?: (animation: Omit<Animation, 'id'>) => void;
  onUpdateAnimation?: (id: string, updates: Partial<Animation>) => void;
  onRemoveAnimation?: (id: string) => void;

  // Presets
  presets?: StylePreset[];
  onApplyPreset?: (preset: StylePreset) => void;
  onSavePreset?: (styles: Record<string, string>, name: string, category: string) => void;
  onDeletePreset?: (id: string) => void;

  // Close
  onClose?: () => void;
}

// Tab icons
const TabIcon: React.FC<{ tab: RightSidebarTab; active: boolean }> = ({ tab, active }) => {
  const color = active ? 'currentColor' : 'currentColor';

  switch (tab) {
    case 'style':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" />
          <rect x="9" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" />
          <rect x="2" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" />
          <rect x="9" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" />
        </svg>
      );
    case 'variants':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5" stroke={color} strokeWidth="1.2" />
          <circle cx="8" cy="8" r="2" fill={color} />
        </svg>
      );
    case 'animations':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5" stroke={color} strokeWidth="1.2" />
          <path d="M8 5V8L10 10" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'presets':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke={color} strokeWidth="1.2" />
          <path d="M2 6H14" stroke={color} strokeWidth="1.2" />
          <path d="M6 6V14" stroke={color} strokeWidth="1.2" />
        </svg>
      );
  }
};

export const RightSidebar: React.FC<RightSidebarProps> = ({
  element,
  onStyleChange,
  onTextChange,
  onApplyToCode,
  isApplying,
  variants = [DEFAULT_INTERACTION_VARIANTS, DEFAULT_RESPONSIVE_VARIANTS],
  activeVariants = ['default', 'base'],
  onToggleVariant,
  onAddVariant,
  animations = [],
  onAddAnimation,
  onUpdateAnimation,
  onRemoveAnimation,
  presets = DEFAULT_STYLE_PRESETS,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('style');

  const tabs: { id: RightSidebarTab; label: string }[] = [
    { id: 'style', label: 'Style' },
    { id: 'variants', label: 'States' },
    { id: 'animations', label: 'Animate' },
    { id: 'presets', label: 'Presets' },
  ];

  return (
    <div className="w-72 min-w-72 bg-[#1a1a1a] border-l border-white/10 flex flex-col h-full overflow-hidden">
      {/* Header with element info */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          {element ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-violet-400">
                <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span className="text-xs font-medium text-white truncate max-w-32">
                {element.tagName}
              </span>
              {element.className && (
                <span className="text-[10px] text-gray-500 truncate max-w-20">
                  .{element.className.split(' ')[0]}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-500">No selection</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-400 rounded transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex flex-col items-center gap-1 py-2 transition-colors
              ${activeTab === tab.id
                ? 'text-violet-400 bg-violet-500/10'
                : 'text-gray-500 hover:text-gray-400 hover:bg-white/5'
              }
            `}
          >
            <TabIcon tab={tab.id} active={activeTab === tab.id} />
            <span className="text-[9px] font-medium uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'style' && (
          <StylePanel
            element={element}
            onStyleChange={onStyleChange}
            onTextChange={onTextChange}
            onApplyToCode={onApplyToCode}
            isApplying={isApplying}
          />
        )}

        {activeTab === 'variants' && (
          <VariantsPanel
            elementId={element?.id || null}
            componentName={element?.tagName}
            variants={variants}
            activeVariants={activeVariants}
            onToggleVariant={onToggleVariant || (() => {})}
            onAddVariant={onAddVariant}
          />
        )}

        {activeTab === 'animations' && (
          <AnimationsPanel
            elementId={element?.id || null}
            animations={animations}
            onAddAnimation={onAddAnimation || (() => {})}
            onUpdateAnimation={onUpdateAnimation || (() => {})}
            onRemoveAnimation={onRemoveAnimation || (() => {})}
          />
        )}

        {activeTab === 'presets' && (
          <StylePresetsPanel
            presets={presets}
            onApplyPreset={onApplyPreset || (() => {})}
            onSavePreset={onSavePreset || (() => {})}
            onDeletePreset={onDeletePreset || (() => {})}
            currentStyles={element?.styles}
          />
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
