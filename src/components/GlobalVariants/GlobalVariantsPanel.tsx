/**
 * GlobalVariantsPanel
 *
 * Global variants panel inspired by Plasmic.
 * Manage theme, dark mode, localization, and other global states.
 */

import React, { useState } from 'react';

export interface GlobalVariant {
  id: string;
  name: string;
  group: string;
  isActive: boolean;
  styles?: Record<string, string>;
  tokens?: Record<string, string>;
}

export interface GlobalVariantGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  icon: React.ReactNode;
  description: string;
  variants: GlobalVariant[];
}

// Default global variant groups
export const DEFAULT_GLOBAL_VARIANTS: GlobalVariantGroup[] = [
  {
    id: 'theme',
    name: 'Theme',
    type: 'single',
    icon: <ThemeIcon />,
    description: 'Color theme variants',
    variants: [
      {
        id: 'light',
        name: 'Light',
        group: 'theme',
        isActive: true,
        tokens: {
          '--bg-primary': '#ffffff',
          '--bg-secondary': '#f3f4f6',
          '--text-primary': '#111827',
          '--text-secondary': '#6b7280',
          '--border-color': '#e5e7eb',
          '--accent-color': '#3b82f6',
        },
      },
      {
        id: 'dark',
        name: 'Dark',
        group: 'theme',
        isActive: false,
        tokens: {
          '--bg-primary': '#0f172a',
          '--bg-secondary': '#1e293b',
          '--text-primary': '#f1f5f9',
          '--text-secondary': '#94a3b8',
          '--border-color': '#334155',
          '--accent-color': '#60a5fa',
        },
      },
      {
        id: 'sepia',
        name: 'Sepia',
        group: 'theme',
        isActive: false,
        tokens: {
          '--bg-primary': '#faf5e4',
          '--bg-secondary': '#f5ebe0',
          '--text-primary': '#3d3229',
          '--text-secondary': '#665c4e',
          '--border-color': '#d5c4a1',
          '--accent-color': '#b45309',
        },
      },
    ],
  },
  {
    id: 'colorScheme',
    name: 'Color Scheme',
    type: 'single',
    icon: <PaletteIcon />,
    description: 'Brand color scheme',
    variants: [
      {
        id: 'blue',
        name: 'Blue',
        group: 'colorScheme',
        isActive: true,
        tokens: {
          '--primary-50': '#eff6ff',
          '--primary-100': '#dbeafe',
          '--primary-500': '#3b82f6',
          '--primary-600': '#2563eb',
          '--primary-700': '#1d4ed8',
        },
      },
      {
        id: 'purple',
        name: 'Purple',
        group: 'colorScheme',
        isActive: false,
        tokens: {
          '--primary-50': '#faf5ff',
          '--primary-100': '#f3e8ff',
          '--primary-500': '#a855f7',
          '--primary-600': '#9333ea',
          '--primary-700': '#7e22ce',
        },
      },
      {
        id: 'green',
        name: 'Green',
        group: 'colorScheme',
        isActive: false,
        tokens: {
          '--primary-50': '#f0fdf4',
          '--primary-100': '#dcfce7',
          '--primary-500': '#22c55e',
          '--primary-600': '#16a34a',
          '--primary-700': '#15803d',
        },
      },
      {
        id: 'orange',
        name: 'Orange',
        group: 'colorScheme',
        isActive: false,
        tokens: {
          '--primary-50': '#fff7ed',
          '--primary-100': '#ffedd5',
          '--primary-500': '#f97316',
          '--primary-600': '#ea580c',
          '--primary-700': '#c2410c',
        },
      },
    ],
  },
  {
    id: 'spacing',
    name: 'Spacing',
    type: 'single',
    icon: <SpacingIcon />,
    description: 'Layout density',
    variants: [
      {
        id: 'compact',
        name: 'Compact',
        group: 'spacing',
        isActive: false,
        tokens: {
          '--spacing-xs': '0.25rem',
          '--spacing-sm': '0.5rem',
          '--spacing-md': '0.75rem',
          '--spacing-lg': '1rem',
          '--spacing-xl': '1.5rem',
        },
      },
      {
        id: 'default',
        name: 'Default',
        group: 'spacing',
        isActive: true,
        tokens: {
          '--spacing-xs': '0.5rem',
          '--spacing-sm': '0.75rem',
          '--spacing-md': '1rem',
          '--spacing-lg': '1.5rem',
          '--spacing-xl': '2rem',
        },
      },
      {
        id: 'spacious',
        name: 'Spacious',
        group: 'spacing',
        isActive: false,
        tokens: {
          '--spacing-xs': '0.75rem',
          '--spacing-sm': '1rem',
          '--spacing-md': '1.5rem',
          '--spacing-lg': '2rem',
          '--spacing-xl': '3rem',
        },
      },
    ],
  },
  {
    id: 'borderRadius',
    name: 'Border Radius',
    type: 'single',
    icon: <RadiusIcon />,
    description: 'Corner roundness',
    variants: [
      {
        id: 'none',
        name: 'None',
        group: 'borderRadius',
        isActive: false,
        tokens: {
          '--radius-sm': '0',
          '--radius-md': '0',
          '--radius-lg': '0',
          '--radius-xl': '0',
        },
      },
      {
        id: 'subtle',
        name: 'Subtle',
        group: 'borderRadius',
        isActive: false,
        tokens: {
          '--radius-sm': '0.125rem',
          '--radius-md': '0.25rem',
          '--radius-lg': '0.375rem',
          '--radius-xl': '0.5rem',
        },
      },
      {
        id: 'default',
        name: 'Default',
        group: 'borderRadius',
        isActive: true,
        tokens: {
          '--radius-sm': '0.25rem',
          '--radius-md': '0.5rem',
          '--radius-lg': '0.75rem',
          '--radius-xl': '1rem',
        },
      },
      {
        id: 'rounded',
        name: 'Rounded',
        group: 'borderRadius',
        isActive: false,
        tokens: {
          '--radius-sm': '0.5rem',
          '--radius-md': '1rem',
          '--radius-lg': '1.5rem',
          '--radius-xl': '2rem',
        },
      },
    ],
  },
  {
    id: 'locale',
    name: 'Locale',
    type: 'single',
    icon: <LocaleIcon />,
    description: 'Language and region',
    variants: [
      {
        id: 'en-US',
        name: 'English (US)',
        group: 'locale',
        isActive: true,
      },
      {
        id: 'it-IT',
        name: 'Italiano',
        group: 'locale',
        isActive: false,
      },
      {
        id: 'es-ES',
        name: 'Español',
        group: 'locale',
        isActive: false,
      },
      {
        id: 'de-DE',
        name: 'Deutsch',
        group: 'locale',
        isActive: false,
      },
      {
        id: 'fr-FR',
        name: 'Français',
        group: 'locale',
        isActive: false,
      },
    ],
  },
  {
    id: 'direction',
    name: 'Direction',
    type: 'single',
    icon: <DirectionIcon />,
    description: 'Text direction (LTR/RTL)',
    variants: [
      {
        id: 'ltr',
        name: 'Left to Right',
        group: 'direction',
        isActive: true,
      },
      {
        id: 'rtl',
        name: 'Right to Left',
        group: 'direction',
        isActive: false,
      },
    ],
  },
];

// Icon components
function ThemeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="13.5" cy="6.5" r="2" />
      <circle cx="17.5" cy="10.5" r="2" />
      <circle cx="8.5" cy="7.5" r="2" />
      <circle cx="6.5" cy="12.5" r="2" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function SpacingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 6H3M21 12H3M21 18H3" />
      <path d="M3 6v12M21 6v12" />
    </svg>
  );
}

function RadiusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3h7a2 2 0 0 1 2 2v7" />
      <path d="M3 12v7a2 2 0 0 0 2 2h7" />
    </svg>
  );
}

function LocaleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function DirectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12H3M21 12l-4 4M21 12l-4-4" />
    </svg>
  );
}

interface GlobalVariantsPanelProps {
  groups?: GlobalVariantGroup[];
  onVariantChange: (groupId: string, variantId: string) => void;
  onTokensGenerate?: (tokens: Record<string, string>) => void;
}

export const GlobalVariantsPanel: React.FC<GlobalVariantsPanelProps> = ({
  groups = DEFAULT_GLOBAL_VARIANTS,
  onVariantChange,
  onTokensGenerate,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['theme', 'colorScheme']));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleVariantSelect = (group: GlobalVariantGroup, variantId: string) => {
    onVariantChange(group.id, variantId);

    // Generate CSS tokens from active variants
    if (onTokensGenerate) {
      const allTokens: Record<string, string> = {};
      groups.forEach(g => {
        const activeVariant = g.variants.find(v =>
          g.id === group.id ? v.id === variantId : v.isActive
        );
        if (activeVariant?.tokens) {
          Object.assign(allTokens, activeVariant.tokens);
        }
      });
      onTokensGenerate(allTokens);
    }
  };

  // Generate CSS for current active variants
  const generateCSS = () => {
    const lines: string[] = [':root {'];
    groups.forEach(group => {
      const activeVariant = group.variants.find(v => v.isActive);
      if (activeVariant?.tokens) {
        Object.entries(activeVariant.tokens).forEach(([key, value]) => {
          lines.push(`  ${key}: ${value};`);
        });
      }
    });
    lines.push('}');
    return lines.join('\n');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Global Variants
          </span>
          <button
            onClick={() => {
              const css = generateCSS();
              navigator.clipboard.writeText(css);
            }}
            className="text-[10px] text-violet-400 hover:text-violet-300"
            title="Copy CSS variables"
          >
            Copy CSS
          </button>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {groups.map(group => {
          const isExpanded = expandedGroups.has(group.id);
          const activeVariant = group.variants.find(v => v.isActive);

          return (
            <div key={group.id} className="border-b border-white/5">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{group.icon}</span>
                  <span className="text-xs font-medium text-white">{group.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">{activeVariant?.name}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Variants */}
              {isExpanded && (
                <div className="px-3 pb-2 space-y-1">
                  {group.type === 'single' ? (
                    // Single choice - radio buttons
                    group.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => handleVariantSelect(group, variant.id)}
                        className={`w-full px-3 py-2 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                          variant.isActive
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                            : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <span>{variant.name}</span>
                        {variant.isActive && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))
                  ) : (
                    // Multiple choice - checkboxes
                    group.variants.map(variant => (
                      <label
                        key={variant.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          variant.isActive
                            ? 'bg-violet-500/20 border border-violet-500/50'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={variant.isActive}
                          onChange={() => handleVariantSelect(group, variant.id)}
                          className="w-4 h-4 text-violet-500 bg-white/10 border-white/20 rounded focus:ring-violet-500"
                        />
                        <span className={`text-xs ${variant.isActive ? 'text-violet-300' : 'text-gray-400'}`}>
                          {variant.name}
                        </span>
                      </label>
                    ))
                  )}

                  {/* Token Preview */}
                  {activeVariant?.tokens && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[10px] text-gray-600 mb-1">Tokens</div>
                      <div className="grid grid-cols-4 gap-1">
                        {Object.entries(activeVariant.tokens).slice(0, 8).map(([key, value]) => (
                          <div
                            key={key}
                            className="w-6 h-6 rounded border border-white/10"
                            style={{ background: value }}
                            title={`${key}: ${value}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Theme Toggle */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Quick Toggle</span>
          <div className="flex gap-1">
            {groups.find(g => g.id === 'theme')?.variants.map(variant => (
              <button
                key={variant.id}
                onClick={() => handleVariantSelect(groups.find(g => g.id === 'theme')!, variant.id)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  variant.isActive
                    ? 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500'
                    : 'bg-white/5 text-gray-500 hover:text-white'
                }`}
                title={variant.name}
              >
                {variant.id === 'light' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                )}
                {variant.id === 'dark' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
                {variant.id === 'sepia' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalVariantsPanel;
