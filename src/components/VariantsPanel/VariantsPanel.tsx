/**
 * VariantsPanel
 *
 * Manage element variants/states like Plasmic.
 *
 * Variant Types:
 * 1. Interaction Variants - hover, active, focus, disabled
 * 2. Component Variants - size, theme, etc.
 * 3. Responsive Variants - screen breakpoints
 *
 * Features:
 * - Add/edit variants
 * - Style overrides per variant
 * - Variant combinations
 * - Visual state preview
 */

import React, { useState } from 'react';

// Variant types
export type InteractionState = 'default' | 'hover' | 'active' | 'focus' | 'disabled';
export type BreakpointVariant = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface Variant {
  id: string;
  name: string;
  type: 'interaction' | 'component' | 'responsive';
  state?: InteractionState;
  breakpoint?: BreakpointVariant;
  isActive: boolean;
  styles: Record<string, string>;
}

export interface VariantGroup {
  id: string;
  name: string;
  type: 'single' | 'multi'; // single = only one active, multi = multiple can be active
  variants: Variant[];
}

interface VariantsPanelProps {
  elementId: string | null;
  componentName?: string;
  variants: VariantGroup[];
  activeVariants: string[];
  onToggleVariant: (variantId: string) => void;
  onAddVariant?: (groupId: string, variant: Omit<Variant, 'id' | 'isActive'>) => void;
  onUpdateVariantStyles?: (variantId: string, styles: Record<string, string>) => void;
  onCreateGroup?: (group: Omit<VariantGroup, 'id' | 'variants'>) => void;
}

// Default interaction variants
export const DEFAULT_INTERACTION_VARIANTS: VariantGroup = {
  id: 'interactions',
  name: 'Interactions',
  type: 'single',
  variants: [
    { id: 'default', name: 'Default', type: 'interaction', state: 'default', isActive: true, styles: {} },
    { id: 'hover', name: 'Hover', type: 'interaction', state: 'hover', isActive: false, styles: {} },
    { id: 'active', name: 'Active', type: 'interaction', state: 'active', isActive: false, styles: {} },
    { id: 'focus', name: 'Focus', type: 'interaction', state: 'focus', isActive: false, styles: {} },
    { id: 'disabled', name: 'Disabled', type: 'interaction', state: 'disabled', isActive: false, styles: {} },
  ],
};

// Default responsive variants
export const DEFAULT_RESPONSIVE_VARIANTS: VariantGroup = {
  id: 'responsive',
  name: 'Responsive',
  type: 'single',
  variants: [
    { id: 'base', name: 'Base', type: 'responsive', breakpoint: 'base', isActive: true, styles: {} },
    { id: 'sm', name: 'SM (640px)', type: 'responsive', breakpoint: 'sm', isActive: false, styles: {} },
    { id: 'md', name: 'MD (768px)', type: 'responsive', breakpoint: 'md', isActive: false, styles: {} },
    { id: 'lg', name: 'LG (1024px)', type: 'responsive', breakpoint: 'lg', isActive: false, styles: {} },
    { id: 'xl', name: 'XL (1280px)', type: 'responsive', breakpoint: 'xl', isActive: false, styles: {} },
  ],
};

// State icons
const StateIcon: React.FC<{ state: InteractionState }> = ({ state }) => {
  switch (state) {
    case 'hover':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2L11 7L7 8L6 12L3 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      );
    case 'active':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="7" cy="7" r="2" fill="currentColor"/>
        </svg>
      );
    case 'focus':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
        </svg>
      );
    case 'disabled':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
          <line x1="3" y1="11" x2="11" y2="3" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
  }
};

// Breakpoint icons
const BreakpointIcon: React.FC<{ breakpoint: BreakpointVariant }> = ({ breakpoint }) => {
  switch (breakpoint) {
    case 'sm':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="4" y="1" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
    case 'md':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
    case 'lg':
    case 'xl':
    case '2xl':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="4" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
  }
};

// Variant item component
const VariantItem: React.FC<{
  variant: Variant;
  isActive: boolean;
  groupType: 'single' | 'multi';
  onToggle: () => void;
  hasOverrides: boolean;
}> = ({ variant, isActive, groupType, onToggle, hasOverrides }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-all
        ${isActive
          ? 'bg-violet-500/20 border border-violet-500/50 text-white'
          : 'bg-white/5 border border-transparent text-gray-400 hover:bg-white/10 hover:text-gray-300'
        }
      `}
    >
      {/* Radio/Checkbox indicator */}
      {groupType === 'single' ? (
        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
          isActive ? 'border-violet-500' : 'border-gray-500'
        }`}>
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
        </div>
      ) : (
        <div className={`w-3 h-3 rounded border-2 flex items-center justify-center ${
          isActive ? 'border-violet-500 bg-violet-500' : 'border-gray-500'
        }`}>
          {isActive && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      )}

      {/* Icon */}
      <span className="opacity-70">
        {variant.type === 'interaction' && variant.state && <StateIcon state={variant.state} />}
        {variant.type === 'responsive' && variant.breakpoint && <BreakpointIcon breakpoint={variant.breakpoint} />}
        {variant.type === 'component' && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        )}
      </span>

      {/* Name */}
      <span className="text-xs font-medium">{variant.name}</span>

      {/* Override indicator */}
      {hasOverrides && (
        <span className="w-2 h-2 rounded-full bg-violet-500 ml-auto" title="Has style overrides" />
      )}
    </button>
  );
};

// Variant group section
const VariantGroupSection: React.FC<{
  group: VariantGroup;
  activeVariants: string[];
  onToggle: (variantId: string) => void;
}> = ({ group, activeVariants, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-4">
      {/* Group header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs font-medium text-gray-300">{group.name}</span>
        <span className="text-[10px] text-gray-600 ml-auto">
          {group.type === 'single' ? 'Single' : 'Multi'}
        </span>
      </button>

      {/* Variants */}
      {isExpanded && (
        <div className="mt-2 space-y-1 pl-2">
          {group.variants.map(variant => (
            <VariantItem
              key={variant.id}
              variant={variant}
              isActive={activeVariants.includes(variant.id)}
              groupType={group.type}
              onToggle={() => onToggle(variant.id)}
              hasOverrides={Object.keys(variant.styles).length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Quick state selector (horizontal pills)
const QuickStateSelector: React.FC<{
  activeState: InteractionState;
  onSelect: (state: InteractionState) => void;
}> = ({ activeState, onSelect }) => {
  const states: { state: InteractionState; label: string }[] = [
    { state: 'default', label: 'Default' },
    { state: 'hover', label: 'Hover' },
    { state: 'active', label: 'Active' },
    { state: 'focus', label: 'Focus' },
    { state: 'disabled', label: 'Disabled' },
  ];

  return (
    <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
      {states.map(({ state, label }) => (
        <button
          key={state}
          onClick={() => onSelect(state)}
          className={`
            flex-1 px-2 py-1.5 text-[10px] font-medium rounded transition-all
            ${activeState === state
              ? 'bg-violet-500 text-white'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

// Add custom variant modal
const AddVariantModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (variant: { name: string; type: 'component' }) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      onAdd({ name, type: 'component' });
      setName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-72 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-white">Add Variant</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Variant Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Primary, Large, Outlined"
              className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full h-9 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded transition-colors"
          >
            Add Variant
          </button>
        </form>
      </div>
    </div>
  );
};

export const VariantsPanel: React.FC<VariantsPanelProps> = ({
  elementId,
  componentName,
  variants,
  activeVariants,
  onToggleVariant,
  onAddVariant,
  onCreateGroup,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeInteractionState, setActiveInteractionState] = useState<InteractionState>('default');

  // Handle interaction state change
  const handleStateChange = (state: InteractionState) => {
    setActiveInteractionState(state);
    // Find and toggle the corresponding variant
    const interactionGroup = variants.find(g => g.id === 'interactions');
    if (interactionGroup) {
      const variant = interactionGroup.variants.find(v => v.state === state);
      if (variant) {
        onToggleVariant(variant.id);
      }
    }
  };

  if (!elementId) {
    return (
      <div className="flex flex-col h-full bg-[#1a1a1a]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Variants</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-2 opacity-50">
            <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8" y="8" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="17" y="8" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8" y="17" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="text-xs text-center">Select an element to<br/>edit its variants</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Variants</span>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Element info */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-violet-400">
            <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          <span className="text-xs font-medium text-white">{componentName || 'Element'}</span>
        </div>
      </div>

      {/* Quick state selector */}
      <div className="px-3 py-3 border-b border-white/5">
        <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
          Interaction State
        </label>
        <QuickStateSelector
          activeState={activeInteractionState}
          onSelect={handleStateChange}
        />
      </div>

      {/* Variant groups */}
      <div className="flex-1 overflow-y-auto p-3">
        {variants.map(group => (
          <VariantGroupSection
            key={group.id}
            group={group}
            activeVariants={activeVariants}
            onToggle={onToggleVariant}
          />
        ))}

        {/* Add component variant group */}
        {onCreateGroup && (
          <button
            onClick={() => onCreateGroup({ name: 'Custom', type: 'single' })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 border border-dashed border-white/20 rounded-lg text-gray-500 hover:text-gray-300 hover:border-white/30 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-xs">Add Variant Group</span>
          </button>
        )}
      </div>

      {/* Tips */}
      <div className="px-3 py-2 border-t border-white/10 bg-white/5">
        <p className="text-[10px] text-gray-500">
          Tip: Use variants to create hover, active, and responsive styles without writing CSS.
        </p>
      </div>

      {/* Add variant modal */}
      <AddVariantModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(variant) => {
          // Add to first component group or create new
          const componentGroup = variants.find(g => g.type === 'single' && g.id !== 'interactions' && g.id !== 'responsive');
          if (componentGroup && onAddVariant) {
            onAddVariant(componentGroup.id, { ...variant, styles: {} });
          }
        }}
      />
    </div>
  );
};

export default VariantsPanel;
