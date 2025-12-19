/**
 * Icon Picker Component
 *
 * Allows users to search and select icons from Lucide library
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCanvasStore } from '../../lib/canvas/canvasStore';
import { THEME_COLORS } from '../../lib/canvas/types';

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

  // Theme
  const canvasSettings = useCanvasStore((state) => state.canvasSettings);
  const theme = canvasSettings?.editorTheme || 'dark';
  const colors = THEME_COLORS[theme];
  const isDark = theme === 'dark';

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

    const defaultBg = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)';
    const hoverBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const defaultBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';

    return (
      <button
        key={iconName}
        onClick={() => handleSelect(iconName)}
        title={iconName}
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          border: selectedIcon === iconName ? `2px solid ${colors.accent}` : `1px solid ${defaultBorder}`,
          background: selectedIcon === iconName ? colors.accentLight : defaultBg,
          color: selectedIcon === iconName ? colors.textPrimary : colors.textSecondary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (selectedIcon !== iconName) {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.color = colors.textPrimary;
            e.currentTarget.style.borderColor = colors.accentMedium;
          }
        }}
        onMouseLeave={(e) => {
          if (selectedIcon !== iconName) {
            e.currentTarget.style.background = defaultBg;
            e.currentTarget.style.color = colors.textSecondary;
            e.currentTarget.style.borderColor = defaultBorder;
          }
        }}
      >
        <IconComponent size={20} />
      </button>
    );
  };

  // Theme-aware colors
  const panelBg = isDark ? '#141414' : '#ffffff';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)';
  const borderSubtle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const inputBg = isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.04)';
  const footerBg = isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.02)';

  // Use portal to render at document.body level to avoid transform/positioning issues
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)',
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
          maxWidth: 'calc(100vw - 48px)',
          height: 'min(600px, calc(100vh - 48px))',
          background: panelBg,
          borderRadius: 16,
          border: `1px solid ${borderColor}`,
          boxShadow: isDark ? '0 24px 80px rgba(0, 0, 0, 0.5)' : '0 24px 80px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: colors.accentLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LucideIcons.Sparkles size={16} color={colors.accent} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>Seleziona Icona</div>
              <div style={{ fontSize: 11, color: colors.textDimmed }}>Lucide Icons • {allIconNames.length} icone</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              color: colors.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = colors.textPrimary; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = colors.textMuted; }}
          >
            <LucideIcons.X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${borderSubtle}` }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: inputBg,
            borderRadius: 8,
            border: `1px solid ${borderSubtle}`,
          }}>
            <LucideIcons.Search size={16} color={colors.textDimmed} />
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
                color: colors.textPrimary,
                fontSize: 13,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textDimmed,
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
          borderBottom: `1px solid ${borderSubtle}`,
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
              background: !activeCategory && !search ? colors.accentMedium : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
              color: !activeCategory && !search ? colors.textPrimary : colors.textMuted,
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
                background: activeCategory === cat ? colors.accentMedium : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)'),
                color: activeCategory === cat ? colors.textPrimary : colors.textMuted,
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
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px 20px',
          scrollBehavior: 'smooth',
        }}>
          {search ? (
            // Search results - flat list
            <>
              <div style={{ fontSize: 10, color: colors.textDimmed, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  color: colors.textDimmed,
                  fontSize: 13,
                }}>
                  Nessuna icona trovata
                </div>
              )}
            </>
          ) : activeCategory ? (
            // Single category view
            <>
              <div style={{ fontSize: 10, color: colors.textDimmed, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  color: colors.accent,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  position: 'sticky',
                  top: -16,
                  background: panelBg,
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
                    color: colors.textMuted,
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                    position: 'sticky',
                    top: -16,
                    background: panelBg,
                    padding: '8px 0',
                    marginTop: -8,
                    zIndex: 10,
                    borderBottom: `1px solid ${borderSubtle}`,
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
          borderTop: `1px solid ${borderSubtle}`,
          background: footerBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: colors.textDimmed }}>
            Powered by Lucide Icons
          </span>
          <a
            href="https://lucide.dev/icons"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: colors.accent,
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
    </div>,
    document.body
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
