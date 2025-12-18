/**
 * StylePanel - Framer/Figma-style properties panel
 *
 * Organized sections:
 * - Layout (display, flex, gap)
 * - Size (width, height)
 * - Fill (background)
 * - Stroke (border)
 * - Typography (font, size, weight)
 * - Effects (shadow, opacity)
 */

import React, { useState, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface ElementStyles {
  // Layout
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  padding?: string;

  // Size
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;

  // Position
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;

  // Fill
  backgroundColor?: string;
  backgroundImage?: string;

  // Stroke
  borderWidth?: string;
  borderColor?: string;
  borderRadius?: string;
  borderStyle?: string;

  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;

  // Effects
  opacity?: string;
  boxShadow?: string;

  // Any other CSS
  [key: string]: string | undefined;
}

export interface SelectedElementInfo {
  id: string;
  tagName: string;
  className: string;
  styles: ElementStyles;
  computedStyles: ElementStyles;
  textContent?: string;
}

interface StylePanelProps {
  element: SelectedElementInfo | null;
  onStyleChange: (styles: Partial<ElementStyles>) => void;
  onTextChange?: (text: string) => void;
  /** Called to sync visual changes to code via AI */
  onApplyToCode?: (element: SelectedElementInfo, changedStyles: Partial<ElementStyles>) => void;
  /** Whether AI is processing */
  isApplying?: boolean;
}

// ============================================
// SECTION COMPONENT
// ============================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid #2a2a2a' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span style={{ opacity: 0.6 }}>{icon}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{title}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '0 12px 12px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// INPUT COMPONENTS
// ============================================

interface InputRowProps {
  label: string;
  children: React.ReactNode;
}

function InputRow({ label, children }: InputRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
      <span style={{
        width: 70,
        fontSize: 11,
        color: '#666',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
}

function TextInput({ value, onChange, placeholder, suffix }: TextInputProps) {
  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '6px 8px',
          paddingRight: suffix ? 28 : 8,
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 4,
          color: '#fff',
          fontSize: 12,
        }}
      />
      {suffix && (
        <span style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#666',
          fontSize: 10,
        }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ value, onChange }: ColorInputProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 28,
          height: 28,
          padding: 0,
          border: '1px solid #333',
          borderRadius: 4,
          cursor: 'pointer',
          background: value || '#000',
        }}
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        style={{
          flex: 1,
          padding: '6px 8px',
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 4,
          color: '#fff',
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      />
    </div>
  );
}

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

function SelectInput({ value, onChange, options }: SelectInputProps) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '6px 8px',
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 4,
        color: '#fff',
        fontSize: 12,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; icon: React.ReactNode; title?: string }>;
}

function SegmentedControl({ value, onChange, options }: SegmentedControlProps) {
  return (
    <div style={{
      display: 'flex',
      background: '#1a1a1a',
      borderRadius: 4,
      padding: 2,
      gap: 2,
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.title}
          style={{
            flex: 1,
            padding: '5px 8px',
            background: value === opt.value ? '#333' : 'transparent',
            border: 'none',
            borderRadius: 3,
            color: value === opt.value ? '#fff' : '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

// ============================================
// ICONS
// ============================================

const Icons = {
  layout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  size: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 3H3v18h18V3z" />
      <path d="M9 3v18M3 15h18" />
    </svg>
  ),
  fill: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  stroke: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  typography: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),
  effects: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  row: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="6" height="12" rx="1" />
      <rect x="10" y="6" width="6" height="12" rx="1" />
      <rect x="18" y="6" width="4" height="12" rx="1" />
    </svg>
  ),
  column: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="2" width="12" height="6" rx="1" />
      <rect x="6" y="10" width="12" height="6" rx="1" />
      <rect x="6" y="18" width="12" height="4" rx="1" />
    </svg>
  ),
  alignStart: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4v16M8 8h12M8 16h8" />
    </svg>
  ),
  alignCenter: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v16M6 8h12M8 16h8" />
    </svg>
  ),
  alignEnd: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 4v16M4 8h12M8 16h8" />
    </svg>
  ),
  justifyStart: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16M4 8h4M4 12h4M4 16h4" />
    </svg>
  ),
  justifyCenter: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16M10 8h4M10 12h4M10 16h4" />
    </svg>
  ),
  justifyEnd: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16M16 8h4M16 12h4M16 16h4" />
    </svg>
  ),
  justifyBetween: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16M4 8h4M16 8h4M4 16h4M16 16h4" />
    </svg>
  ),
  textLeft: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h10M4 18h14" />
    </svg>
  ),
  textCenter: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M7 12h10M5 18h14" />
    </svg>
  ),
  textRight: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M10 12h10M6 18h14" />
    </svg>
  ),
};

// ============================================
// MAIN COMPONENT
// ============================================

export function StylePanel({ element, onStyleChange, onTextChange, onApplyToCode, isApplying }: StylePanelProps) {
  const styles = element?.styles || {};
  const computed = element?.computedStyles || {};
  const [changedStyles, setChangedStyles] = useState<Partial<ElementStyles>>({});
  const hasChanges = Object.keys(changedStyles).length > 0;

  // Reset changed styles when element changes
  React.useEffect(() => {
    setChangedStyles({});
  }, [element?.id]);

  const handleChange = useCallback((property: string, value: string) => {
    onStyleChange({ [property]: value });
    setChangedStyles(prev => ({ ...prev, [property]: value }));
  }, [onStyleChange]);

  const handleApplyToCode = useCallback(() => {
    if (element && onApplyToCode && hasChanges) {
      onApplyToCode(element, changedStyles);
      setChangedStyles({}); // Reset after applying
    }
  }, [element, onApplyToCode, changedStyles, hasChanges]);

  // Get effective value (explicit or computed)
  const getValue = (prop: keyof ElementStyles): string => {
    return styles[prop] || computed[prop] || '';
  };

  if (!element) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: '#666',
      }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          style={{ margin: '0 auto 16px', opacity: 0.3 }}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p style={{ fontSize: 13 }}>Seleziona un elemento</p>
        <p style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>
          Clicca su un elemento nel preview per modificarlo
        </p>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: '#0f0f0f',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #2a2a2a',
        background: '#141414',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
          }}>
            {element.tagName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {element.tagName.toLowerCase()}
            </div>
            {element.className && (
              <div style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
                .{element.className.split(' ')[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text Content (if applicable) */}
      {element.textContent && onTextChange && (
        <Section title="Content" icon={Icons.typography} defaultOpen={true}>
          <textarea
            value={element.textContent}
            onChange={(e) => onTextChange(e.target.value)}
            style={{
              width: '100%',
              padding: 8,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 4,
              color: '#fff',
              fontSize: 12,
              resize: 'vertical',
              minHeight: 60,
            }}
          />
        </Section>
      )}

      {/* Layout Section */}
      <Section title="Layout" icon={Icons.layout}>
        <InputRow label="Display">
          <SelectInput
            value={getValue('display')}
            onChange={(v) => handleChange('display', v)}
            options={[
              { value: 'block', label: 'Block' },
              { value: 'flex', label: 'Flex' },
              { value: 'grid', label: 'Grid' },
              { value: 'inline', label: 'Inline' },
              { value: 'inline-flex', label: 'Inline Flex' },
              { value: 'none', label: 'None' },
            ]}
          />
        </InputRow>

        {(getValue('display') === 'flex' || getValue('display') === 'inline-flex') && (
          <>
            <InputRow label="Direction">
              <SegmentedControl
                value={getValue('flexDirection') || 'row'}
                onChange={(v) => handleChange('flexDirection', v)}
                options={[
                  { value: 'row', icon: Icons.row, title: 'Row' },
                  { value: 'column', icon: Icons.column, title: 'Column' },
                ]}
              />
            </InputRow>

            <InputRow label="Align">
              <SegmentedControl
                value={getValue('alignItems') || 'stretch'}
                onChange={(v) => handleChange('alignItems', v)}
                options={[
                  { value: 'flex-start', icon: Icons.alignStart, title: 'Start' },
                  { value: 'center', icon: Icons.alignCenter, title: 'Center' },
                  { value: 'flex-end', icon: Icons.alignEnd, title: 'End' },
                ]}
              />
            </InputRow>

            <InputRow label="Justify">
              <SegmentedControl
                value={getValue('justifyContent') || 'flex-start'}
                onChange={(v) => handleChange('justifyContent', v)}
                options={[
                  { value: 'flex-start', icon: Icons.justifyStart, title: 'Start' },
                  { value: 'center', icon: Icons.justifyCenter, title: 'Center' },
                  { value: 'flex-end', icon: Icons.justifyEnd, title: 'End' },
                  { value: 'space-between', icon: Icons.justifyBetween, title: 'Between' },
                ]}
              />
            </InputRow>

            <InputRow label="Gap">
              <TextInput
                value={getValue('gap')}
                onChange={(v) => handleChange('gap', v)}
                placeholder="0"
                suffix="px"
              />
            </InputRow>
          </>
        )}

        <InputRow label="Padding">
          <TextInput
            value={getValue('padding')}
            onChange={(v) => handleChange('padding', v)}
            placeholder="0"
            suffix="px"
          />
        </InputRow>
      </Section>

      {/* Size Section */}
      <Section title="Size" icon={Icons.size}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Width</div>
            <TextInput
              value={getValue('width')}
              onChange={(v) => handleChange('width', v)}
              placeholder="auto"
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Height</div>
            <TextInput
              value={getValue('height')}
              onChange={(v) => handleChange('height', v)}
              placeholder="auto"
            />
          </div>
        </div>

        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Min W</div>
            <TextInput
              value={getValue('minWidth')}
              onChange={(v) => handleChange('minWidth', v)}
              placeholder="0"
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Max W</div>
            <TextInput
              value={getValue('maxWidth')}
              onChange={(v) => handleChange('maxWidth', v)}
              placeholder="none"
            />
          </div>
        </div>
      </Section>

      {/* Fill Section */}
      <Section title="Fill" icon={Icons.fill}>
        <InputRow label="Color">
          <ColorInput
            value={getValue('backgroundColor')}
            onChange={(v) => handleChange('backgroundColor', v)}
          />
        </InputRow>
      </Section>

      {/* Stroke Section */}
      <Section title="Stroke" icon={Icons.stroke}>
        <InputRow label="Color">
          <ColorInput
            value={getValue('borderColor')}
            onChange={(v) => handleChange('borderColor', v)}
          />
        </InputRow>

        <InputRow label="Width">
          <TextInput
            value={getValue('borderWidth')}
            onChange={(v) => handleChange('borderWidth', v)}
            placeholder="0"
            suffix="px"
          />
        </InputRow>

        <InputRow label="Radius">
          <TextInput
            value={getValue('borderRadius')}
            onChange={(v) => handleChange('borderRadius', v)}
            placeholder="0"
            suffix="px"
          />
        </InputRow>

        <InputRow label="Style">
          <SelectInput
            value={getValue('borderStyle')}
            onChange={(v) => handleChange('borderStyle', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
          />
        </InputRow>
      </Section>

      {/* Typography Section */}
      <Section title="Typography" icon={Icons.typography}>
        <InputRow label="Font">
          <SelectInput
            value={getValue('fontFamily')}
            onChange={(v) => handleChange('fontFamily', v)}
            options={[
              { value: 'inherit', label: 'Inherit' },
              { value: 'Inter, sans-serif', label: 'Inter' },
              { value: 'system-ui, sans-serif', label: 'System' },
              { value: 'Arial, sans-serif', label: 'Arial' },
              { value: 'Georgia, serif', label: 'Georgia' },
              { value: 'monospace', label: 'Monospace' },
            ]}
          />
        </InputRow>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Size</div>
            <TextInput
              value={getValue('fontSize')}
              onChange={(v) => handleChange('fontSize', v)}
              placeholder="16"
              suffix="px"
            />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Weight</div>
            <SelectInput
              value={getValue('fontWeight')}
              onChange={(v) => handleChange('fontWeight', v)}
              options={[
                { value: '300', label: 'Light' },
                { value: '400', label: 'Regular' },
                { value: '500', label: 'Medium' },
                { value: '600', label: 'Semibold' },
                { value: '700', label: 'Bold' },
              ]}
            />
          </div>
        </div>

        <InputRow label="Color">
          <ColorInput
            value={getValue('color')}
            onChange={(v) => handleChange('color', v)}
          />
        </InputRow>

        <InputRow label="Align">
          <SegmentedControl
            value={getValue('textAlign') || 'left'}
            onChange={(v) => handleChange('textAlign', v)}
            options={[
              { value: 'left', icon: Icons.textLeft, title: 'Left' },
              { value: 'center', icon: Icons.textCenter, title: 'Center' },
              { value: 'right', icon: Icons.textRight, title: 'Right' },
            ]}
          />
        </InputRow>

        <InputRow label="Line H">
          <TextInput
            value={getValue('lineHeight')}
            onChange={(v) => handleChange('lineHeight', v)}
            placeholder="1.5"
          />
        </InputRow>
      </Section>

      {/* Effects Section */}
      <Section title="Effects" icon={Icons.effects}>
        <InputRow label="Opacity">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={parseFloat(getValue('opacity')) || 1}
              onChange={(e) => handleChange('opacity', e.target.value)}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 11, color: '#666', width: 32, textAlign: 'right' }}>
              {Math.round((parseFloat(getValue('opacity')) || 1) * 100)}%
            </span>
          </div>
        </InputRow>

        <InputRow label="Shadow">
          <TextInput
            value={getValue('boxShadow')}
            onChange={(v) => handleChange('boxShadow', v)}
            placeholder="none"
          />
        </InputRow>
      </Section>

      {/* Apply to Code Button */}
      {onApplyToCode && (
        <div style={{
          padding: 12,
          borderTop: '1px solid #2a2a2a',
          background: '#141414',
          position: 'sticky',
          bottom: 0,
        }}>
          <button
            onClick={handleApplyToCode}
            disabled={!hasChanges || isApplying}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: hasChanges
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                : '#333',
              border: 'none',
              borderRadius: 6,
              color: hasChanges ? '#fff' : '#666',
              fontSize: 13,
              fontWeight: 500,
              cursor: hasChanges && !isApplying ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
              opacity: isApplying ? 0.7 : 1,
            }}
          >
            {isApplying ? (
              <>
                <div style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                Applying...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                Apply to Code (Tailwind)
              </>
            )}
          </button>
          {hasChanges && (
            <p style={{
              fontSize: 10,
              color: '#666',
              textAlign: 'center',
              marginTop: 6,
            }}>
              {Object.keys(changedStyles).length} style{Object.keys(changedStyles).length > 1 ? 's' : ''} changed
            </p>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}

export default StylePanel;
