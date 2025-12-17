/**
 * VisualPropsPanel - Enhanced properties panel for visual editing
 * Shows computed styles with editable controls
 * Displays source location and React component info
 * Sends changes to AI for code updates
 */

import React, { useState, useEffect, useCallback } from 'react';

// Types (previously from SelectionOverlay, now local)
export interface SourceLocation {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
  source: 'attribute' | 'parent' | 'fiber';
}

export interface SelectedElement {
  tagName: string;
  className: string;
  id: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
  };
  styles: Record<string, string>;
  xpath: string;
  textContent?: string | null;
  componentName?: string | null;
  componentStack?: string[];
  componentProps?: Record<string, unknown>;
  sourceLocation?: SourceLocation | null;
  attributes?: Record<string, string>;
}

interface StyleChange {
  property: string;
  oldValue: string;
  newValue: string;
}

interface VisualPropsPanelProps {
  element: SelectedElement;
  onStyleChange?: (changes: StyleChange[]) => void;
  onApplyWithAI?: (element: SelectedElement, changes: StyleChange[]) => void;
  onOpenFile?: (sourceLocation: SourceLocation) => void;
  zoom: number;
}

// Helper to parse CSS color to hex
const rgbToHex = (rgb: string): string => {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

// Helper to parse px value
const parsePx = (value: string): number => {
  return parseInt(value) || 0;
};

const VisualPropsPanel: React.FC<VisualPropsPanelProps> = ({
  element,
  onStyleChange,
  onApplyWithAI,
  onOpenFile,
  zoom,
}) => {
  const [pendingChanges, setPendingChanges] = useState<StyleChange[]>([]);
  const [localStyles, setLocalStyles] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<string>('styles');

  // Extract key styles from element.styles
  useEffect(() => {
    if (element?.styles) {
      const cs = element.styles;
      setLocalStyles({
        backgroundColor: rgbToHex(cs.backgroundColor || 'transparent'),
        color: rgbToHex(cs.color || '#000'),
        fontSize: cs.fontSize || '16px',
        fontWeight: cs.fontWeight || '400',
        paddingTop: cs.paddingTop || '0px',
        paddingRight: cs.paddingRight || '0px',
        paddingBottom: cs.paddingBottom || '0px',
        paddingLeft: cs.paddingLeft || '0px',
        marginTop: cs.marginTop || '0px',
        marginRight: cs.marginRight || '0px',
        marginBottom: cs.marginBottom || '0px',
        marginLeft: cs.marginLeft || '0px',
        borderRadius: cs.borderRadius || '0px',
        display: cs.display || 'block',
        flexDirection: cs.flexDirection || 'row',
        justifyContent: cs.justifyContent || 'flex-start',
        alignItems: cs.alignItems || 'stretch',
        gap: cs.gap || '0px',
        opacity: cs.opacity || '1',
        boxShadow: cs.boxShadow || 'none',
      });
      setPendingChanges([]);
    }
  }, [element]);

  const handleStyleChange = useCallback((property: string, newValue: string) => {
    const oldValue = localStyles[property];
    if (oldValue === newValue) return;

    setLocalStyles(prev => ({ ...prev, [property]: newValue }));
    setPendingChanges(prev => {
      const existing = prev.findIndex(c => c.property === property);
      const change = { property, oldValue, newValue };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = change;
        return updated;
      }
      return [...prev, change];
    });
  }, [localStyles]);

  const handleApplyWithAI = () => {
    if (pendingChanges.length > 0 && onApplyWithAI) {
      onApplyWithAI(element, pendingChanges);
      setPendingChanges([]);
    }
  };

  // UI Components
  const SectionHeader: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      color: '#5a5a5a',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      {icon}
      {title}
    </div>
  );

  const ColorInput: React.FC<{ label: string; property: string }> = ({ label, property }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: '#71717a', width: 70 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <input
          type="color"
          value={localStyles[property] || '#000000'}
          onChange={(e) => handleStyleChange(property, e.target.value)}
          style={{
            width: 28,
            height: 28,
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            background: 'transparent',
          }}
        />
        <input
          type="text"
          value={localStyles[property] || ''}
          onChange={(e) => handleStyleChange(property, e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '6px 10px',
            color: '#e5e5e5',
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        />
      </div>
    </div>
  );

  const SliderInput: React.FC<{
    label: string;
    property: string;
    min?: number;
    max?: number;
    unit?: string;
  }> = ({ label, property, min = 0, max = 100, unit = 'px' }) => {
    const value = parsePx(localStyles[property] || '0');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#71717a', width: 20 }}>{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => handleStyleChange(property, `${e.target.value}${unit}`)}
          style={{ flex: 1, accentColor: '#8b5cf6' }}
        />
        <input
          type="number"
          value={value}
          onChange={(e) => handleStyleChange(property, `${e.target.value}${unit}`)}
          style={{
            width: 50,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            padding: '4px 6px',
            color: '#e5e5e5',
            fontSize: 11,
            textAlign: 'center',
          }}
        />
      </div>
    );
  };

  const SelectInput: React.FC<{
    label: string;
    property: string;
    options: { value: string; label: string }[];
  }> = ({ label, property, options }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: '#71717a', width: 70 }}>{label}</span>
      <select
        value={localStyles[property] || ''}
        onChange={(e) => handleStyleChange(property, e.target.value)}
        style={{
          flex: 1,
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '6px 10px',
          color: '#e5e5e5',
          fontSize: 12,
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Element Info Header */}
      <div style={{
        padding: '12px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Component/Tag Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            color: '#a78bfa',
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {element.componentName ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                {element.componentName}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                {`<${element.tagName}>`}
              </>
            )}
          </span>
          {element.className && (
            <span style={{ color: '#71717a', fontSize: 11 }}>
              .{element.className.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Source Location */}
        {element.sourceLocation && (
          <button
            onClick={() => onOpenFile?.(element.sourceLocation!)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#4ade80',
              fontSize: 11,
              fontFamily: 'monospace',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>
              {element.sourceLocation.fileName}
            </span>
            <span style={{
              background: 'rgba(74, 222, 128, 0.2)',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
            }}>
              :{element.sourceLocation.lineNumber}
            </span>
          </button>
        )}

        {/* Component Stack */}
        {element.componentStack && element.componentStack.length > 1 && (
          <div style={{
            marginTop: 8,
            padding: '6px 10px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 6,
            fontSize: 10,
            color: '#71717a',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'wrap',
          }}>
            {element.componentStack.slice(0, 4).map((name, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {i > 0 && <span style={{ opacity: 0.5 }}>›</span>}
                <span style={{ color: i === 0 ? '#a78bfa' : '#71717a' }}>{name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['styles', 'props', 'attributes'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab)}
            style={{
              flex: 1,
              padding: '10px',
              background: activeSection === tab ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeSection === tab ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeSection === tab ? '#a78bfa' : '#71717a',
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'capitalize',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {activeSection === 'styles' && (
          <>
            {/* Dimensions */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Dimensions"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6,
                  padding: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#5a5a5a', marginBottom: 2 }}>Width</div>
                  <div style={{ fontSize: 14, color: '#e5e5e5', fontWeight: 500 }}>
                    {Math.round(element.rect.width / zoom)}px
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 6,
                  padding: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: '#5a5a5a', marginBottom: 2 }}>Height</div>
                  <div style={{ fontSize: 14, color: '#e5e5e5', fontWeight: 500 }}>
                    {Math.round(element.rect.height / zoom)}px
                  </div>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Colors"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /></svg>}
              />
              <ColorInput label="Background" property="backgroundColor" />
              <ColorInput label="Text" property="color" />
            </div>

            {/* Typography */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Typography"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>}
              />
              <SliderInput label="Size" property="fontSize" min={8} max={72} />
              <SelectInput
                label="Weight"
                property="fontWeight"
                options={[
                  { value: '100', label: 'Thin' },
                  { value: '300', label: 'Light' },
                  { value: '400', label: 'Regular' },
                  { value: '500', label: 'Medium' },
                  { value: '600', label: 'Semibold' },
                  { value: '700', label: 'Bold' },
                  { value: '800', label: 'Extrabold' },
                ]}
              />
            </div>

            {/* Spacing */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Padding"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>}
              />
              <SliderInput label="T" property="paddingTop" max={64} />
              <SliderInput label="R" property="paddingRight" max={64} />
              <SliderInput label="B" property="paddingBottom" max={64} />
              <SliderInput label="L" property="paddingLeft" max={64} />
            </div>

            {/* Border */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Border"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>}
              />
              <SliderInput label="Radius" property="borderRadius" max={50} />
            </div>

            {/* Layout */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Layout"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>}
              />
              <SelectInput
                label="Display"
                property="display"
                options={[
                  { value: 'block', label: 'Block' },
                  { value: 'flex', label: 'Flex' },
                  { value: 'grid', label: 'Grid' },
                  { value: 'inline', label: 'Inline' },
                  { value: 'inline-block', label: 'Inline Block' },
                  { value: 'none', label: 'None' },
                ]}
              />
              {localStyles.display === 'flex' && (
                <>
                  <SelectInput
                    label="Direction"
                    property="flexDirection"
                    options={[
                      { value: 'row', label: 'Row' },
                      { value: 'column', label: 'Column' },
                      { value: 'row-reverse', label: 'Row Reverse' },
                      { value: 'column-reverse', label: 'Column Reverse' },
                    ]}
                  />
                  <SelectInput
                    label="Justify"
                    property="justifyContent"
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'space-between', label: 'Space Between' },
                      { value: 'space-around', label: 'Space Around' },
                    ]}
                  />
                  <SelectInput
                    label="Align"
                    property="alignItems"
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'stretch', label: 'Stretch' },
                    ]}
                  />
                  <SliderInput label="Gap" property="gap" max={64} />
                </>
              )}
            </div>

            {/* Effects */}
            <div style={{ marginBottom: 16 }}>
              <SectionHeader
                title="Effects"
                icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>}
              />
              <SliderInput label="Opacity" property="opacity" min={0} max={100} unit="%" />
            </div>
          </>
        )}

        {activeSection === 'props' && (
          <div>
            {element.componentProps && Object.keys(element.componentProps).length > 0 ? (
              Object.entries(element.componentProps).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: '#a78bfa', fontSize: 12, fontFamily: 'monospace' }}>
                    {key}
                  </span>
                  <span style={{ color: '#5a5a5a', margin: '0 8px' }}>=</span>
                  <span style={{
                    color: typeof value === 'string' ? '#4ade80' : '#f472b6',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {typeof value === 'string' ? `"${value}"` : String(value)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: '#5a5a5a', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No props available
              </div>
            )}
          </div>
        )}

        {activeSection === 'attributes' && (
          <div>
            {element.attributes && Object.keys(element.attributes).length > 0 ? (
              Object.entries(element.attributes).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 6,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: '#60a5fa', fontSize: 12, fontFamily: 'monospace', minWidth: 60 }}>
                    {key}
                  </span>
                  <span style={{
                    color: '#e5e5e5',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    flex: 1,
                    wordBreak: 'break-all',
                  }}>
                    {value || '(empty)'}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: '#5a5a5a', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No attributes
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Button */}
      {pendingChanges.length > 0 && (
        <div style={{
          padding: '12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(139, 92, 246, 0.05)',
        }}>
          <button
            onClick={handleApplyWithAI}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Apply {pendingChanges.length} change{pendingChanges.length > 1 ? 's' : ''} with AI
          </button>
          <div style={{
            marginTop: 8,
            fontSize: 10,
            color: '#71717a',
            textAlign: 'center',
          }}>
            AI will update {element.sourceLocation?.fileName || 'the source code'}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualPropsPanel;
