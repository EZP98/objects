/**
 * DesignTokensPanel
 *
 * Design tokens management panel like Plasmic.
 * Tokens are reusable design values (colors, spacing, typography).
 *
 * Features:
 * - Color tokens
 * - Spacing tokens
 * - Typography tokens
 * - Token groups/folders
 * - Token references
 */

import React, { useState, useCallback } from 'react';

// Token types
export type TokenType = 'color' | 'spacing' | 'fontSize' | 'fontFamily' | 'fontWeight' | 'lineHeight' | 'borderRadius' | 'shadow';

export interface DesignToken {
  id: string;
  name: string;
  type: TokenType;
  value: string;
  reference?: string; // Reference to another token
  group?: string; // Folder/group path like "Colors/Primary"
}

export interface TokenGroup {
  name: string;
  tokens: DesignToken[];
  subgroups: TokenGroup[];
}

interface DesignTokensPanelProps {
  tokens: DesignToken[];
  onAddToken: (token: Omit<DesignToken, 'id'>) => void;
  onUpdateToken: (id: string, updates: Partial<DesignToken>) => void;
  onDeleteToken: (id: string) => void;
  onSelectToken?: (token: DesignToken) => void;
}

// Default tokens
export const DEFAULT_TOKENS: DesignToken[] = [
  // Colors
  { id: 'color-primary', name: 'Primary', type: 'color', value: '#8B5CF6', group: 'Colors' },
  { id: 'color-secondary', name: 'Secondary', type: 'color', value: '#06B6D4', group: 'Colors' },
  { id: 'color-accent', name: 'Accent', type: 'color', value: '#F59E0B', group: 'Colors' },
  { id: 'color-success', name: 'Success', type: 'color', value: '#10B981', group: 'Colors' },
  { id: 'color-warning', name: 'Warning', type: 'color', value: '#F59E0B', group: 'Colors' },
  { id: 'color-error', name: 'Error', type: 'color', value: '#EF4444', group: 'Colors' },
  { id: 'color-bg', name: 'Background', type: 'color', value: '#0F0F0F', group: 'Colors' },
  { id: 'color-surface', name: 'Surface', type: 'color', value: '#1A1A1A', group: 'Colors' },
  { id: 'color-text', name: 'Text', type: 'color', value: '#FFFFFF', group: 'Colors' },
  { id: 'color-text-muted', name: 'Text Muted', type: 'color', value: '#9CA3AF', group: 'Colors' },

  // Spacing
  { id: 'spacing-xs', name: 'XS', type: 'spacing', value: '4px', group: 'Spacing' },
  { id: 'spacing-sm', name: 'SM', type: 'spacing', value: '8px', group: 'Spacing' },
  { id: 'spacing-md', name: 'MD', type: 'spacing', value: '16px', group: 'Spacing' },
  { id: 'spacing-lg', name: 'LG', type: 'spacing', value: '24px', group: 'Spacing' },
  { id: 'spacing-xl', name: 'XL', type: 'spacing', value: '32px', group: 'Spacing' },
  { id: 'spacing-2xl', name: '2XL', type: 'spacing', value: '48px', group: 'Spacing' },

  // Typography - Font Sizes
  { id: 'font-xs', name: 'XS', type: 'fontSize', value: '12px', group: 'Typography/Size' },
  { id: 'font-sm', name: 'SM', type: 'fontSize', value: '14px', group: 'Typography/Size' },
  { id: 'font-base', name: 'Base', type: 'fontSize', value: '16px', group: 'Typography/Size' },
  { id: 'font-lg', name: 'LG', type: 'fontSize', value: '18px', group: 'Typography/Size' },
  { id: 'font-xl', name: 'XL', type: 'fontSize', value: '20px', group: 'Typography/Size' },
  { id: 'font-2xl', name: '2XL', type: 'fontSize', value: '24px', group: 'Typography/Size' },
  { id: 'font-3xl', name: '3XL', type: 'fontSize', value: '30px', group: 'Typography/Size' },
  { id: 'font-4xl', name: '4XL', type: 'fontSize', value: '36px', group: 'Typography/Size' },

  // Border Radius
  { id: 'radius-sm', name: 'SM', type: 'borderRadius', value: '4px', group: 'Radius' },
  { id: 'radius-md', name: 'MD', type: 'borderRadius', value: '8px', group: 'Radius' },
  { id: 'radius-lg', name: 'LG', type: 'borderRadius', value: '12px', group: 'Radius' },
  { id: 'radius-xl', name: 'XL', type: 'borderRadius', value: '16px', group: 'Radius' },
  { id: 'radius-full', name: 'Full', type: 'borderRadius', value: '9999px', group: 'Radius' },
];

// Token type icons
const getTokenIcon = (type: TokenType) => {
  switch (type) {
    case 'color':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="7" cy="7" r="2" fill="currentColor"/>
        </svg>
      );
    case 'spacing':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="2" y1="4" x2="2" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="12" y1="4" x2="12" y2="10" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
    case 'fontSize':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="2" y="11" fontSize="10" fontWeight="bold" fill="currentColor">A</text>
        </svg>
      );
    case 'fontFamily':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <text x="1" y="11" fontSize="9" fontStyle="italic" fill="currentColor">Aa</text>
        </svg>
      );
    case 'borderRadius':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 6V4C2 2.89543 2.89543 2 4 2H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'shadow':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="2" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" opacity="0.3"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
  }
};

// Group tokens by their group path
const groupTokens = (tokens: DesignToken[]): TokenGroup[] => {
  const root: Record<string, TokenGroup> = {};

  tokens.forEach(token => {
    const groupPath = token.group || 'Other';
    const parts = groupPath.split('/');
    let current = root;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = { name: part, tokens: [], subgroups: [] };
      }
      if (index === parts.length - 1) {
        current[part].tokens.push(token);
      } else {
        const subgroupMap: Record<string, TokenGroup> = {};
        current[part].subgroups.forEach(sg => {
          subgroupMap[sg.name] = sg;
        });
        if (!subgroupMap[parts[index + 1]]) {
          const newSubgroup: TokenGroup = { name: parts[index + 1], tokens: [], subgroups: [] };
          current[part].subgroups.push(newSubgroup);
          subgroupMap[parts[index + 1]] = newSubgroup;
        }
        current = subgroupMap as unknown as Record<string, TokenGroup>;
      }
    });
  });

  return Object.values(root);
};

// Token item component
const TokenItem: React.FC<{
  token: DesignToken;
  onSelect?: (token: DesignToken) => void;
  onUpdate?: (id: string, updates: Partial<DesignToken>) => void;
  onDelete?: (id: string) => void;
}> = ({ token, onSelect, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(token.value);

  const handleSave = () => {
    if (onUpdate && editValue !== token.value) {
      onUpdate(token.id, { value: editValue });
    }
    setIsEditing(false);
  };

  return (
    <div
      className="group flex items-center h-8 px-2 hover:bg-white/5 rounded cursor-pointer transition-colors"
      onClick={() => onSelect?.(token)}
    >
      {/* Color preview for color tokens */}
      {token.type === 'color' && (
        <div
          className="w-5 h-5 rounded border border-white/20 mr-2 flex-shrink-0"
          style={{ backgroundColor: token.value }}
        />
      )}

      {/* Icon for other types */}
      {token.type !== 'color' && (
        <span className="mr-2 text-gray-500">{getTokenIcon(token.type)}</span>
      )}

      {/* Name */}
      <span className="flex-1 text-xs text-gray-300 truncate">{token.name}</span>

      {/* Value */}
      {isEditing ? (
        <input
          type={token.type === 'color' ? 'color' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-20 h-5 px-1 bg-white/10 border border-violet-500/50 rounded text-xs text-white focus:outline-none"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="text-xs text-gray-500 font-mono cursor-text hover:text-gray-300"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {token.value}
        </span>
      )}

      {/* Delete button */}
      {onDelete && (
        <button
          className="ml-2 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(token.id);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
};

// Token group component
const TokenGroupSection: React.FC<{
  group: TokenGroup;
  depth?: number;
  onSelectToken?: (token: DesignToken) => void;
  onUpdateToken?: (id: string, updates: Partial<DesignToken>) => void;
  onDeleteToken?: (id: string) => void;
}> = ({ group, depth = 0, onSelectToken, onUpdateToken, onDeleteToken }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        className="w-full flex items-center h-7 px-2 hover:bg-white/5 rounded transition-colors"
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`mr-2 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs font-medium text-gray-400">{group.name}</span>
        <span className="ml-auto text-xs text-gray-600">{group.tokens.length}</span>
      </button>

      {/* Tokens */}
      {isExpanded && (
        <div style={{ paddingLeft: `${depth * 12}px` }}>
          {group.tokens.map(token => (
            <TokenItem
              key={token.id}
              token={token}
              onSelect={onSelectToken}
              onUpdate={onUpdateToken}
              onDelete={onDeleteToken}
            />
          ))}
          {group.subgroups.map(subgroup => (
            <TokenGroupSection
              key={subgroup.name}
              group={subgroup}
              depth={depth + 1}
              onSelectToken={onSelectToken}
              onUpdateToken={onUpdateToken}
              onDeleteToken={onDeleteToken}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Add token modal
const AddTokenModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (token: Omit<DesignToken, 'id'>) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TokenType>('color');
  const [value, setValue] = useState('#8B5CF6');
  const [group, setGroup] = useState('Colors');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && value) {
      onAdd({ name, type, value, group });
      setName('');
      setValue(type === 'color' ? '#8B5CF6' : '16px');
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
          <span className="text-sm font-medium text-white">Add Token</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TokenType);
                if (e.target.value === 'color') {
                  setValue('#8B5CF6');
                  setGroup('Colors');
                } else if (e.target.value === 'spacing') {
                  setValue('16px');
                  setGroup('Spacing');
                } else if (e.target.value === 'fontSize') {
                  setValue('16px');
                  setGroup('Typography/Size');
                } else if (e.target.value === 'borderRadius') {
                  setValue('8px');
                  setGroup('Radius');
                }
              }}
              className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="color">Color</option>
              <option value="spacing">Spacing</option>
              <option value="fontSize">Font Size</option>
              <option value="fontFamily">Font Family</option>
              <option value="borderRadius">Border Radius</option>
              <option value="shadow">Shadow</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Token name"
              className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Value</label>
            <div className="flex items-center gap-2">
              {type === 'color' && (
                <input
                  type="color"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              )}
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white font-mono focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Group */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Group</label>
            <input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g., Colors/Brand"
              className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full h-9 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded transition-colors"
          >
            Add Token
          </button>
        </form>
      </div>
    </div>
  );
};

export const DesignTokensPanel: React.FC<DesignTokensPanelProps> = ({
  tokens,
  onAddToken,
  onUpdateToken,
  onDeleteToken,
  onSelectToken,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TokenType | 'all'>('all');

  // Filter tokens
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = !searchQuery ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || token.type === filterType;
    return matchesSearch && matchesType;
  });

  const groupedTokens = groupTokens(filteredTokens);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Design Tokens</span>
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

      {/* Search & Filter */}
      <div className="px-2 py-2 border-b border-white/5 space-y-2">
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
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-7 pr-2 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1">
          {(['all', 'color', 'spacing', 'fontSize', 'borderRadius'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2 h-5 text-[10px] rounded transition-colors ${
                filterType === type
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'bg-white/5 text-gray-500 hover:text-gray-300'
              }`}
            >
              {type === 'all' ? 'All' : type === 'fontSize' ? 'Font' : type === 'borderRadius' ? 'Radius' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-y-auto p-2">
        {groupedTokens.length > 0 ? (
          groupedTokens.map(group => (
            <TokenGroupSection
              key={group.name}
              group={group}
              onSelectToken={onSelectToken}
              onUpdateToken={onUpdateToken}
              onDeleteToken={onDeleteToken}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-2 opacity-50">
              <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="4" fill="currentColor"/>
            </svg>
            <span className="text-xs">No tokens found</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="px-3 py-2 border-t border-white/10 bg-white/5">
        <span className="text-xs text-gray-500">
          {tokens.length} tokens
        </span>
      </div>

      {/* Add Token Modal */}
      <AddTokenModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddToken}
      />
    </div>
  );
};

export default DesignTokensPanel;
