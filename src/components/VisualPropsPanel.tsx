/**
 * VisualPropsPanel - Enhanced properties panel for visual editing
 * Shows computed styles with editable controls
 * Sends changes to AI for code updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SelectedElement } from './SelectionOverlay';

interface StyleChange {
  property: string;
  oldValue: string;
  newValue: string;
}

interface VisualPropsPanelProps {
  element: SelectedElement;
  onStyleChange?: (changes: StyleChange[]) => void;
  onApplyWithAI?: (element: SelectedElement, changes: StyleChange[]) => void;
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
  zoom,
}) => {
  const [pendingChanges, setPendingChanges] = useState<StyleChange[]>([]);
  const [localStyles, setLocalStyles] = useState<Record<string, string>>({});

  // Extract key styles from computed styles
  useEffect(() => {
    if (element?.computedStyles) {
      const cs = element.computedStyles;
      setLocalStyles({
        backgroundColor: rgbToHex(cs.backgroundColor),
        color: rgbToHex(cs.color),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        paddingTop: cs.paddingTop,
        paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        borderRadius: cs.borderRadius,
        display: cs.display,
        flexDirection: cs.flexDirection,
        justifyContent: cs.justifyContent,
        alignItems: cs.alignItems,
        gap: cs.gap,
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
        background: 'rgba(139, 92, 246, 0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: 13 }}>
            {`<${element.tagName}>`}
          </span>
          {element.className && (
            <span style={{ color: '#71717a', fontSize: 11 }}>
              .{element.className.split(' ')[0]}
            </span>
          )}
        </div>
        {element.id && (
          <div style={{ color: '#4ade80', fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>
            #{element.id}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Dimensions */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#5a5a5a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Dimensions
          </div>
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
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#5a5a5a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Colors
          </div>
          <ColorInput label="Background" property="backgroundColor" />
          <ColorInput label="Text" property="color" />
        </div>

        {/* Typography */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#5a5a5a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Typography
          </div>
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

        {/* Spacing - Padding */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#5a5a5a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Padding
          </div>
          <SliderInput label="T" property="paddingTop" max={64} />
          <SliderInput label="R" property="paddingRight" max={64} />
          <SliderInput label="B" property="paddingBottom" max={64} />
          <SliderInput label="L" property="paddingLeft" max={64} />
        </div>

        {/* Spacing - Margin */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#5a5a5a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Margin
          </div>
          <SliderInput label="T" property="marginTop" max={64} />
          <SliderInput label="R" property="marginRight" max={64} />
          <SliderInput label="B" property="marginBottom" max={64} />
          <SliderInput label="L" property="marginLeft" max={64} />
        </div>

        {/* Border Radius */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#5a5a5a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Border
          </div>
          <SliderInput label="Radius" property="borderRadius" max={50} />
        </div>

        {/* Layout */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#5a5a5a',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            Layout
          </div>
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
            AI will update the source code
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualPropsPanel;
