/**
 * StylePresetsPanel
 *
 * Create and manage reusable style presets.
 * Like Plasmic's style presets - collections of CSS properties
 * that can be applied to elements without enforcing structure.
 *
 * Features:
 * - Save current styles as preset
 * - Apply preset to element
 * - Edit/delete presets
 * - Categorize presets
 */

import React, { useState } from 'react';

export interface StylePreset {
  id: string;
  name: string;
  category: string;
  styles: Record<string, string>;
  preview?: {
    backgroundColor?: string;
    color?: string;
    borderRadius?: string;
  };
}

// Default style presets
export const DEFAULT_STYLE_PRESETS: StylePreset[] = [
  // Cards
  {
    id: 'card-basic',
    name: 'Basic Card',
    category: 'Cards',
    styles: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    preview: { backgroundColor: '#ffffff', borderRadius: '12px' },
  },
  {
    id: 'card-elevated',
    name: 'Elevated Card',
    category: 'Cards',
    styles: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    },
    preview: { backgroundColor: '#ffffff', borderRadius: '16px' },
  },
  {
    id: 'card-glass',
    name: 'Glass Card',
    category: 'Cards',
    styles: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.2)',
    },
    preview: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: '16px' },
  },
  {
    id: 'card-dark',
    name: 'Dark Card',
    category: 'Cards',
    styles: {
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid rgba(255,255,255,0.1)',
    },
    preview: { backgroundColor: '#1a1a1a', borderRadius: '12px' },
  },

  // Buttons
  {
    id: 'btn-primary',
    name: 'Primary Button',
    category: 'Buttons',
    styles: {
      backgroundColor: '#8B5CF6',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
    },
    preview: { backgroundColor: '#8B5CF6', color: '#ffffff', borderRadius: '8px' },
  },
  {
    id: 'btn-secondary',
    name: 'Secondary Button',
    category: 'Buttons',
    styles: {
      backgroundColor: 'transparent',
      color: '#8B5CF6',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '500',
      border: '2px solid #8B5CF6',
      cursor: 'pointer',
    },
    preview: { backgroundColor: 'transparent', color: '#8B5CF6', borderRadius: '8px' },
  },
  {
    id: 'btn-ghost',
    name: 'Ghost Button',
    category: 'Buttons',
    styles: {
      backgroundColor: 'transparent',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
    },
    preview: { backgroundColor: 'transparent', color: '#9CA3AF', borderRadius: '8px' },
  },
  {
    id: 'btn-pill',
    name: 'Pill Button',
    category: 'Buttons',
    styles: {
      backgroundColor: '#8B5CF6',
      color: '#ffffff',
      padding: '12px 32px',
      borderRadius: '9999px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
    },
    preview: { backgroundColor: '#8B5CF6', color: '#ffffff', borderRadius: '9999px' },
  },

  // Text Styles
  {
    id: 'text-heading',
    name: 'Heading',
    category: 'Typography',
    styles: {
      fontSize: '32px',
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
    },
    preview: { color: '#ffffff' },
  },
  {
    id: 'text-subheading',
    name: 'Subheading',
    category: 'Typography',
    styles: {
      fontSize: '20px',
      fontWeight: '600',
      lineHeight: '1.4',
    },
    preview: { color: '#E5E7EB' },
  },
  {
    id: 'text-body',
    name: 'Body Text',
    category: 'Typography',
    styles: {
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '1.6',
      color: '#9CA3AF',
    },
    preview: { color: '#9CA3AF' },
  },
  {
    id: 'text-caption',
    name: 'Caption',
    category: 'Typography',
    styles: {
      fontSize: '12px',
      fontWeight: '500',
      lineHeight: '1.4',
      color: '#6B7280',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    preview: { color: '#6B7280' },
  },

  // Containers
  {
    id: 'container-centered',
    name: 'Centered Container',
    category: 'Layout',
    styles: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 24px',
    },
  },
  {
    id: 'container-full',
    name: 'Full Width',
    category: 'Layout',
    styles: {
      width: '100%',
      padding: '0 24px',
    },
  },
  {
    id: 'flex-center',
    name: 'Flex Center',
    category: 'Layout',
    styles: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  {
    id: 'flex-between',
    name: 'Flex Space Between',
    category: 'Layout',
    styles: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },

  // Effects
  {
    id: 'gradient-purple',
    name: 'Purple Gradient',
    category: 'Effects',
    styles: {
      background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
    },
    preview: { backgroundColor: '#8B5CF6' },
  },
  {
    id: 'gradient-blue',
    name: 'Blue Gradient',
    category: 'Effects',
    styles: {
      background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
    },
    preview: { backgroundColor: '#3B82F6' },
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset Gradient',
    category: 'Effects',
    styles: {
      background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    },
    preview: { backgroundColor: '#F59E0B' },
  },
];

interface StylePresetsPanelProps {
  presets: StylePreset[];
  onApplyPreset: (preset: StylePreset) => void;
  onSavePreset: (styles: Record<string, string>, name: string, category: string) => void;
  onDeletePreset: (id: string) => void;
  currentStyles?: Record<string, string>;
}

// Preset card component
const PresetCard: React.FC<{
  preset: StylePreset;
  onApply: () => void;
  onDelete: () => void;
}> = ({ preset, onApply, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={onApply}
        className="w-full flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
      >
        {/* Preview */}
        <div
          className="w-8 h-8 rounded flex-shrink-0 border border-white/10"
          style={{
            backgroundColor: preset.preview?.backgroundColor || '#333',
            borderRadius: preset.preview?.borderRadius || '4px',
          }}
        />

        {/* Info */}
        <div className="flex-1 text-left">
          <div className="text-xs text-white truncate">{preset.name}</div>
          <div className="text-[10px] text-gray-500">{Object.keys(preset.styles).length} properties</div>
        </div>
      </button>

      {/* Delete action */}
      {showActions && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
};

// Category section
const CategorySection: React.FC<{
  category: string;
  presets: StylePreset[];
  onApply: (preset: StylePreset) => void;
  onDelete: (id: string) => void;
}> = ({ category, presets, onApply, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded transition-colors"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="M3 1L7 5L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-xs font-medium text-gray-400">{category}</span>
        <span className="ml-auto text-[10px] text-gray-600">{presets.length}</span>
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-1 pl-2">
          {presets.map(preset => (
            <PresetCard
              key={preset.id}
              preset={preset}
              onApply={() => onApply(preset)}
              onDelete={() => onDelete(preset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Save preset modal
const SavePresetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, category: string) => void;
  existingCategories: string[];
}> = ({ isOpen, onClose, onSave, existingCategories }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(existingCategories[0] || 'Custom');
  const [newCategory, setNewCategory] = useState('');
  const [useNewCategory, setUseNewCategory] = useState(false);

  const handleSave = () => {
    if (name) {
      onSave(name, useNewCategory ? newCategory : category);
      setName('');
      setNewCategory('');
      setUseNewCategory(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-80 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-white">Save Style Preset</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Preset Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Style Preset"
              className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Category</label>
            {!useNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-violet-500/50"
                >
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={() => setUseNewCategory(true)}
                  className="px-3 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-gray-400 hover:text-white transition-colors"
                >
                  New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={() => setUseNewCategory(false)}
                  className="px-3 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full h-9 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded transition-colors"
          >
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
};

export const StylePresetsPanel: React.FC<StylePresetsPanelProps> = ({
  presets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  currentStyles,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Group presets by category
  const categories = Array.from(new Set(presets.map(p => p.category)));
  const groupedPresets: Record<string, StylePreset[]> = {};
  categories.forEach(cat => {
    groupedPresets[cat] = presets.filter(p => p.category === cat);
  });

  // Filter by search
  const filteredCategories = searchQuery
    ? categories.filter(cat =>
        cat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        groupedPresets[cat].some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : categories;

  const canSave = currentStyles && Object.keys(currentStyles).length > 0;

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Style Presets</span>
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={!canSave}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
            canSave
              ? 'text-gray-500 hover:text-white hover:bg-white/10'
              : 'text-gray-700 cursor-not-allowed'
          }`}
          title={canSave ? 'Save current styles as preset' : 'Select an element to save its styles'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 7V11C11 11.5 10.5 12 10 12H4C3.5 12 3 11.5 3 11V3C3 2.5 3.5 2 4 2H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M9 2H12V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="2" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
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
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-7 pr-2 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Presets list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(category => (
            <CategorySection
              key={category}
              category={category}
              presets={searchQuery
                ? groupedPresets[category].filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : groupedPresets[category]
              }
              onApply={onApplyPreset}
              onDelete={onDeletePreset}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-2 opacity-50">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 9H21" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 9V21" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span className="text-xs">No presets found</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-3 py-2 border-t border-white/10 bg-white/5">
        <span className="text-xs text-gray-500">
          {presets.length} presets in {categories.length} categories
        </span>
      </div>

      {/* Save modal */}
      <SavePresetModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={(name, category) => {
          if (currentStyles) {
            onSavePreset(currentStyles, name, category);
          }
        }}
        existingCategories={categories}
      />
    </div>
  );
};

export default StylePresetsPanel;
