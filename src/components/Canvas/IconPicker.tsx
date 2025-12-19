/**
 * Icon Picker Component
 *
 * Allows users to search and select icons from Lucide library
 */

import React, { useState, useMemo, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Get all icon names from lucide-react
const allIconNames = Object.keys(LucideIcons).filter(
  (key) => key !== 'default' && key !== 'createLucideIcon' && key !== 'icons' && typeof (LucideIcons as Record<string, unknown>)[key] === 'function'
);

// Popular/common icons to show first
const popularIcons = [
  'Home', 'Search', 'Menu', 'X', 'Check', 'Plus', 'Minus', 'ChevronRight', 'ChevronDown',
  'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'User', 'Users', 'Settings', 'Mail',
  'Phone', 'MapPin', 'Calendar', 'Clock', 'Star', 'Heart', 'ThumbsUp', 'MessageCircle',
  'Share', 'Download', 'Upload', 'Image', 'Camera', 'Video', 'Music', 'File', 'Folder',
  'Edit', 'Trash', 'Copy', 'ExternalLink', 'Link', 'Eye', 'EyeOff', 'Lock', 'Unlock',
  'Bell', 'Sun', 'Moon', 'Cloud', 'Zap', 'Award', 'Gift', 'ShoppingCart', 'CreditCard',
  'Globe', 'Wifi', 'Bluetooth', 'Battery', 'Code', 'Terminal', 'Database', 'Server',
  'Github', 'Twitter', 'Instagram', 'Linkedin', 'Youtube', 'Facebook', 'Slack', 'Figma',
];

// Categories
const iconCategories: Record<string, string[]> = {
  'Arrows': ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowUpRight', 'ArrowDownLeft', 'ChevronRight', 'ChevronLeft', 'ChevronUp', 'ChevronDown', 'ChevronsRight', 'ChevronsLeft', 'CornerDownRight', 'CornerUpLeft', 'MoveRight', 'MoveLeft', 'Undo', 'Redo', 'RefreshCw', 'RotateCw'],
  'Media': ['Play', 'Pause', 'PlayCircle', 'PauseCircle', 'SkipBack', 'SkipForward', 'Rewind', 'FastForward', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Music', 'Mic', 'MicOff', 'Video', 'VideoOff', 'Camera', 'Image', 'Film'],
  'Communication': ['Mail', 'MessageCircle', 'MessageSquare', 'Phone', 'PhoneCall', 'PhoneOff', 'Send', 'Share', 'Share2', 'AtSign', 'Hash', 'Bell', 'BellOff', 'Inbox', 'Paperclip'],
  'Social': ['Github', 'Twitter', 'Instagram', 'Linkedin', 'Youtube', 'Facebook', 'Slack', 'Figma', 'Dribbble', 'Twitch', 'Chrome', 'Globe'],
  'Interface': ['Menu', 'X', 'Check', 'Plus', 'Minus', 'Search', 'Settings', 'Sliders', 'Filter', 'Grid', 'List', 'LayoutGrid', 'Sidebar', 'PanelLeft', 'MoreHorizontal', 'MoreVertical', 'Grip', 'Move'],
  'Files': ['File', 'FileText', 'FilePlus', 'FileMinus', 'Folder', 'FolderPlus', 'FolderOpen', 'Archive', 'Download', 'Upload', 'Save', 'Copy', 'Clipboard', 'Trash', 'Trash2'],
  'Users': ['User', 'Users', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Contact', 'CircleUser', 'BadgeCheck'],
  'Shapes': ['Circle', 'Square', 'Triangle', 'Pentagon', 'Hexagon', 'Octagon', 'Star', 'Heart', 'Diamond', 'Sparkles'],
  'Weather': ['Sun', 'Moon', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudLightning', 'Wind', 'Thermometer', 'Umbrella', 'Sunrise', 'Sunset'],
  'Development': ['Code', 'Code2', 'Terminal', 'Bug', 'Database', 'Server', 'HardDrive', 'Cpu', 'Layers', 'GitBranch', 'GitCommit', 'GitMerge', 'GitPullRequest'],
};

interface IconPickerProps {
  onSelect: (iconName: string) => void;
  onClose: () => void;
  selectedIcon?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({ onSelect, onClose, selectedIcon }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredIcons = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (activeCategory && !query) {
      return iconCategories[activeCategory] || [];
    }

    if (!query) {
      return popularIcons;
    }

    return allIconNames.filter((name) =>
      name.toLowerCase().includes(query)
    ).slice(0, 100); // Limit results for performance
  }, [search, activeCategory]);

  const handleSelect = useCallback((iconName: string) => {
    onSelect(iconName);
  }, [onSelect]);

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as Record<string, LucideIcon>)[iconName];
    if (!IconComponent) return null;

    return (
      <button
        key={iconName}
        onClick={() => handleSelect(iconName)}
        title={iconName}
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          border: selectedIcon === iconName ? '2px solid #8B1E2B' : '1px solid rgba(255, 255, 255, 0.06)',
          background: selectedIcon === iconName ? 'rgba(139, 30, 43, 0.15)' : 'rgba(255, 255, 255, 0.02)',
          color: selectedIcon === iconName ? '#fff' : '#a1a1aa',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (selectedIcon !== iconName) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'rgba(139, 30, 43, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedIcon !== iconName) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.color = '#a1a1aa';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
          }
        }}
      >
        <IconComponent size={20} />
      </button>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: '80vh',
          background: '#141414',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(139, 30, 43, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LucideIcons.Sparkles size={16} color="#8B1E2B" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Seleziona Icona</div>
              <div style={{ fontSize: 11, color: '#52525b' }}>Lucide Icons • {allIconNames.length} icone</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#71717a'; }}
          >
            <LucideIcons.X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <LucideIcons.Search size={16} color="#52525b" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveCategory(null);
              }}
              placeholder="Cerca icona..."
              autoFocus
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e4e4e7',
                fontSize: 13,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#52525b',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
              >
                <LucideIcons.X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div style={{
          padding: '8px 20px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => { setActiveCategory(null); setSearch(''); }}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: 'none',
              background: !activeCategory && !search ? 'rgba(139, 30, 43, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: !activeCategory && !search ? '#fff' : '#71717a',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Popolari
          </button>
          {Object.keys(iconCategories).map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSearch(''); }}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: 'none',
                background: activeCategory === cat ? 'rgba(139, 30, 43, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: activeCategory === cat ? '#fff' : '#71717a',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Icons Grid - Scroll by category blocks */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          scrollBehavior: 'smooth',
        }}>
          {search ? (
            // Search results - flat list
            <>
              <div style={{ fontSize: 10, color: '#52525b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Risultati per "{search}" ({filteredIcons.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                gap: 6,
              }}>
                {filteredIcons.map((iconName) => renderIcon(iconName))}
              </div>
              {filteredIcons.length === 0 && (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#52525b',
                  fontSize: 13,
                }}>
                  Nessuna icona trovata
                </div>
              )}
            </>
          ) : activeCategory ? (
            // Single category view
            <>
              <div style={{ fontSize: 10, color: '#52525b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeCategory} ({filteredIcons.length})
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                gap: 6,
              }}>
                {filteredIcons.map((iconName) => renderIcon(iconName))}
              </div>
            </>
          ) : (
            // All categories - scroll by blocks
            <>
              {/* Popular icons first */}
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 10,
                  color: '#8B1E2B',
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  position: 'sticky',
                  top: -16,
                  background: '#141414',
                  padding: '8px 0',
                  marginTop: -8,
                  zIndex: 10,
                }}>
                  ★ Popolari ({popularIcons.length})
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                  gap: 6,
                }}>
                  {popularIcons.map((iconName) => renderIcon(iconName))}
                </div>
              </div>

              {/* All categories in blocks */}
              {Object.entries(iconCategories).map(([category, icons]) => (
                <div key={category} style={{ marginBottom: 20 }}>
                  <div style={{
                    fontSize: 10,
                    color: '#71717a',
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                    position: 'sticky',
                    top: -16,
                    background: '#141414',
                    padding: '8px 0',
                    marginTop: -8,
                    zIndex: 10,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  }}>
                    {category} ({icons.length})
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                    gap: 6,
                  }}>
                    {icons.map((iconName) => renderIcon(iconName))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#52525b' }}>
            Powered by Lucide Icons
          </span>
          <a
            href="https://lucide.dev/icons"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: '#8B1E2B',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Sfoglia tutte <LucideIcons.ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

// Helper to render a Lucide icon by name
export const renderLucideIcon = (iconName: string, size: number = 24, color?: string): React.ReactNode => {
  const IconComponent = (LucideIcons as Record<string, LucideIcon>)[iconName];
  if (!IconComponent) {
    // Fallback to a default icon
    return <LucideIcons.HelpCircle size={size} color={color} />;
  }
  return <IconComponent size={size} color={color} />;
};

export default IconPicker;
