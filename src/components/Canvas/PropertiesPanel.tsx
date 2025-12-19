/**
 * Properties Panel
 *
 * Right sidebar panel for editing element properties.
 * Complete Figma/Plasmic-style inspector with all properties.
 * Now includes responsive breakpoints, variants, and interactions.
 */

import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../lib/canvas/canvasStore';
import { CanvasElement, ElementStyles } from '../../lib/canvas/types';
import { InteractionsPanel } from './InteractionsPanel';
import { BreakpointSelector } from './ResponsiveToolbar';
import { useResponsiveStore } from '../../lib/canvas/responsive';

// Global modifier key state for Cmd/Ctrl shortcuts
let isModifierKeyHeld = false;
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) isModifierKeyHeld = true;
  });
  window.addEventListener('keyup', (e) => {
    if (!e.metaKey && !e.ctrlKey) isModifierKeyHeld = false;
  });
  window.addEventListener('blur', () => {
    isModifierKeyHeld = false;
  });
}

// Section Component
function Section({ title, children, defaultOpen = true, actions }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          color: '#a1a1aa',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
        }}
      >
        <span>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {actions}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {isOpen && <div style={{ padding: '0 12px 12px' }}>{children}</div>}
    </div>
  );
}

// Input Field
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  suffix,
  min,
  max,
  step,
  width,
}: {
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'color';
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  width?: number | string;
}) {
  // Use local state for editing - allows free typing without immediate validation
  const [localValue, setLocalValue] = React.useState(String(value));
  const [isFocused, setIsFocused] = React.useState(false);

  // Sync local value with prop when not focused
  React.useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(value));
    }
  }, [value, isFocused]);

  // For number inputs, use text type to avoid browser quirks
  const inputType = type === 'number' ? 'text' : type;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    if (type === 'number') {
      // Allow only numbers, minus sign, and decimal point
      newValue = newValue.replace(/[^0-9.-]/g, '');
    }

    setLocalValue(newValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Commit value on blur
    let finalValue = localValue;
    if (type === 'number') {
      // Remove leading zeros
      if (finalValue.length > 1 && finalValue.startsWith('0') && !finalValue.startsWith('0.')) {
        finalValue = finalValue.replace(/^0+/, '') || '0';
      }
      // Ensure valid number
      if (finalValue === '' || isNaN(Number(finalValue))) {
        finalValue = String(min || 0);
      }
    }
    setLocalValue(finalValue);
    onChange(finalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width }}>
      {label && <label style={{ width: 28, fontSize: 11, color: '#71717a', flexShrink: 0 }}>{label}</label>}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={inputType}
          value={localValue}
          onChange={handleChange}
          onFocus={(e) => { setIsFocused(true); e.target.select(); }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          inputMode={type === 'number' ? 'numeric' : undefined}
          style={{
            width: '100%',
            padding: type === 'color' ? '2px' : '6px 8px',
            paddingRight: suffix ? 28 : 8,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 6,
            fontSize: 12,
            color: '#e4e4e7',
            outline: 'none',
            height: type === 'color' ? 28 : 'auto',
          }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 8, fontSize: 10, color: '#52525b', pointerEvents: 'none' }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

// Select Field
function SelectField({
  label,
  value,
  options,
  onChange,
  width,
}: {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  width?: number | string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width }}>
      {label && <label style={{ width: 28, fontSize: 11, color: '#71717a', flexShrink: 0 }}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          padding: '6px 8px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          fontSize: 12,
          color: '#e4e4e7',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Toggle Button Group
function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; icon: React.ReactNode; tooltip: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 6, padding: 2 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.tooltip}
          style={{
            flex: 1,
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: value === opt.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            color: value === opt.value ? '#fff' : '#71717a',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

// Helper to convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Helper to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Preset color swatches
const COLOR_PRESETS = [
  '#000000', '#ffffff', '#f43f5e', '#ec4899', '#a855f7', '#A83248',
  '#8B1E2B', '#8B1E2B', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#78716c', '#64748b', '#6b7280',
];

// Advanced Color Input with picker
function ColorInput({ value, onChange, showOpacity = false, opacity = 1, onOpacityChange }: {
  value: string;
  onChange: (v: string) => void;
  showOpacity?: boolean;
  opacity?: number;
  onOpacityChange?: (v: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMode, setInputMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');

  const colorValue = value || '#ffffff';
  const rgb = hexToRgb(colorValue);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Main row: Color swatch + Hex input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Color swatch with expand toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            width: 32,
            height: 32,
            padding: 0,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 6,
            cursor: 'pointer',
            background: colorValue,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Checkerboard for transparency */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.08) 75%), linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.08) 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 4px 4px',
            zIndex: 0,
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: showOpacity ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})` : colorValue,
            zIndex: 1,
          }} />
          {/* Expand icon */}
          <svg
            width="8"
            height="8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
            style={{ position: 'absolute', right: 2, bottom: 2, zIndex: 2 }}
          >
            <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
        </button>

        {/* Hex input */}
        <input
          type="text"
          value={colorValue.toUpperCase()}
          onChange={(e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              if (val.length === 7) onChange(val);
            }
          }}
          onBlur={(e) => {
            let val = e.target.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) onChange(val);
          }}
          style={{
            flex: 1,
            padding: '6px 8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 6,
            fontSize: 12,
            color: '#e4e4e7',
            outline: 'none',
            fontFamily: 'ui-monospace, monospace',
            textTransform: 'uppercase',
          }}
        />

        {/* Native color picker (hidden, triggered by swatch) */}
        <input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 0,
            height: 0,
            padding: 0,
            border: 'none',
            opacity: 0,
            position: 'absolute',
          }}
          id={`color-picker-${value}`}
        />
        <label
          htmlFor={`color-picker-${value}`}
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
          title="Color picker"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="1.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </label>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 6, padding: 2 }}>
            {(['hex', 'rgb', 'hsl'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: inputMode === mode ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  color: inputMode === mode ? '#fff' : '#52525b',
                  cursor: 'pointer',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* RGB sliders */}
          {inputMode === 'rgb' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'R', value: rgb.r, color: '#ef4444' },
                { label: 'G', value: rgb.g, color: '#22c55e' },
                { label: 'B', value: rgb.b, color: '#8B1E2B' },
              ].map(({ label, value: v, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, fontSize: 10, color: '#52525b', fontWeight: 600 }}>{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={v}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value);
                      const newRgb = { ...rgb, [label.toLowerCase()]: newVal };
                      onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                    }}
                    style={{
                      flex: 1,
                      height: 4,
                      appearance: 'none',
                      background: `linear-gradient(to right, ${label === 'R' ? '#000' : label === 'G' ? `rgb(${rgb.r},0,${rgb.b})` : `rgb(${rgb.r},${rgb.g},0)`}, ${color})`,
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={v}
                    onChange={(e) => {
                      const newVal = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                      const newRgb = { ...rgb, [label.toLowerCase()]: newVal };
                      onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                    }}
                    style={{
                      width: 40,
                      padding: '2px 4px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 4,
                      fontSize: 11,
                      color: '#a1a1aa',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* HSL display */}
          {inputMode === 'hsl' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#52525b', marginBottom: 2 }}>H</div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: 'monospace' }}>{hsl.h}°</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#52525b', marginBottom: 2 }}>S</div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: 'monospace' }}>{hsl.s}%</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#52525b', marginBottom: 2 }}>L</div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: 'monospace' }}>{hsl.l}%</div>
              </div>
            </div>
          )}

          {/* Hex display */}
          {inputMode === 'hex' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#52525b', marginBottom: 2 }}>R</div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: 'monospace' }}>{rgb.r}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#52525b', marginBottom: 2 }}>G</div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: 'monospace' }}>{rgb.g}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#52525b', marginBottom: 2 }}>B</div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: 'monospace' }}>{rgb.b}</div>
              </div>
            </div>
          )}

          {/* Opacity slider (if enabled) */}
          {showOpacity && onOpacityChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, fontSize: 10, color: '#52525b', fontWeight: 600 }}>A</span>
              <div style={{ flex: 1, position: 'relative', height: 12 }}>
                {/* Checkerboard background */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.08) 75%), linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.08) 75%)',
                  backgroundSize: '6px 6px',
                  backgroundPosition: '0 0, 3px 3px',
                  borderRadius: 2,
                }} />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 12,
                    appearance: 'none',
                    background: `linear-gradient(to right, transparent, ${colorValue})`,
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                />
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(opacity * 100)}
                onChange={(e) => onOpacityChange(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) / 100)}
                style={{
                  width: 40,
                  padding: '2px 4px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 4,
                  fontSize: 11,
                  color: '#a1a1aa',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Preset colors */}
          <div>
            <div style={{ fontSize: 10, color: '#52525b', marginBottom: 6, fontWeight: 500 }}>Presets</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4 }}>
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => onChange(preset)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: preset,
                    border: colorValue.toLowerCase() === preset.toLowerCase() ? '2px solid #A83248' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}
                  title={preset}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
const Icons = {
  alignLeft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>,
  alignCenter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>,
  alignRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>,
  flexRow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="8" width="5" height="8" rx="1"/><rect x="10" y="8" width="5" height="8" rx="1"/><rect x="17" y="8" width="4" height="8" rx="1"/></svg>,
  flexCol: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="3" width="8" height="5" rx="1"/><rect x="8" y="10" width="8" height="5" rx="1"/><rect x="8" y="17" width="8" height="4" rx="1"/></svg>,
  justifyStart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="4" height="16"/><rect x="10" y="4" width="4" height="16"/></svg>,
  justifyCenter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  justifyEnd: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="10" y="4" width="4" height="16"/><rect x="16" y="4" width="4" height="16"/></svg>,
  justifyBetween: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="4" height="16"/><rect x="16" y="4" width="4" height="16"/></svg>,
  alignStart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="4" x2="4" y2="20"/><rect x="8" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>,
  alignCenterV: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="12" x2="20" y2="12"/><rect x="6" y="4" width="4" height="6"/><rect x="14" y="4" width="4" height="6"/><rect x="6" y="14" width="4" height="6"/><rect x="14" y="14" width="4" height="6"/></svg>,
  alignEndV: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="20" y1="4" x2="20" y2="20"/><rect x="4" y="6" width="12" height="4"/><rect x="8" y="14" width="8" height="4"/></svg>,
  constraintLeft: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="4" y2="20"/><line x1="4" y1="12" x2="12" y2="12"/></svg>,
  constraintRight: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="20" y1="4" x2="20" y2="20"/><line x1="12" y1="12" x2="20" y2="12"/></svg>,
  constraintTop: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="20" y2="4"/><line x1="12" y1="4" x2="12" y2="12"/></svg>,
  constraintBottom: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="20"/><line x1="12" y1="12" x2="12" y2="20"/></svg>,
  hug: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3h6M9 21h6M3 9v6M21 9v6"/><rect x="6" y="6" width="12" height="12" rx="2"/></svg>,
  fill: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18M12 3v18"/></svg>,
  fixed: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>,
};

// Blend modes
const BLEND_MODES = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

export function PropertiesPanel() {
  const { selectedElementIds, elements, updateElementStyles, resizeElement, moveElement, renameElement } = useCanvasStore();

  // Get selected element
  const selectedElement = selectedElementIds.length === 1 ? elements[selectedElementIds[0]] : null;

  if (!selectedElement) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'transparent',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa' }}>Properties</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 44,
                height: 44,
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#71717a', marginBottom: 4 }}>No selection</div>
            <div style={{ fontSize: 12, color: '#52525b' }}>Select an element to edit</div>
          </div>
        </div>
      </div>
    );
  }

  const styles = selectedElement.styles;

  const updateStyle = (key: keyof ElementStyles, value: any) => {
    updateElementStyles(selectedElement.id, { [key]: value });
  };

  const updateSize = (key: 'width' | 'height', value: number) => {
    resizeElement(selectedElement.id, {
      ...selectedElement.size,
      [key]: value,
    });
  };

  const updatePosition = (key: 'x' | 'y', value: number) => {
    moveElement(selectedElement.id, {
      ...selectedElement.position,
      [key]: value,
    });
  };

  return (
    <div
      style={{
        width: '100%',
        background: 'transparent',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              background: '#A83248',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              {selectedElement.type === 'text' ? (
                <>
                  <polyline points="4 7 4 4 20 4 20 7" />
                  <line x1="9" y1="20" x2="15" y2="20" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </>
              ) : selectedElement.type === 'image' ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </>
              ) : (
                <rect x="3" y="3" width="18" height="18" rx="2" />
              )}
            </svg>
          </div>
          <input
            type="text"
            value={selectedElement.name}
            onChange={(e) => renameElement(selectedElement.id, e.target.value)}
            style={{
              flex: 1,
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#A83248')}
            onBlur={(e) => (e.target.style.borderColor = 'transparent')}
          />
        </div>
        <div style={{ fontSize: 11, color: '#52525b', textTransform: 'capitalize' }}>{selectedElement.type}</div>
      </div>

      {/* Position & Size */}
      <Section title="Layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Position */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InputField
              label="X"
              value={Math.round(selectedElement.position.x)}
              onChange={(v) => updatePosition('x', parseInt(v) || 0)}
              type="number"
              suffix="px"
            />
            <InputField
              label="Y"
              value={Math.round(selectedElement.position.y)}
              onChange={(v) => updatePosition('y', parseInt(v) || 0)}
              type="number"
              suffix="px"
            />
          </div>
          {/* Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InputField
              label="W"
              value={Math.round(selectedElement.size.width)}
              onChange={(v) => updateSize('width', parseInt(v) || 10)}
              type="number"
              suffix="px"
              min={10}
            />
            <InputField
              label="H"
              value={Math.round(selectedElement.size.height)}
              onChange={(v) => updateSize('height', parseInt(v) || 10)}
              type="number"
              suffix="px"
              min={10}
            />
          </div>
          {/* Rotation */}
          <InputField
            label="↻"
            value={(styles as any).rotation || 0}
            onChange={(v) => updateStyle('rotation' as any, parseInt(v) || 0)}
            type="number"
            suffix="°"
            min={-360}
            max={360}
          />
          {/* Constraints / Resizing */}
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>Resizing</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <SelectField
                label=""
                value={(styles as any).resizeX || 'fixed'}
                options={[
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'hug', label: 'Hug' },
                  { value: 'fill', label: 'Fill' },
                ]}
                onChange={(v) => updateStyle('resizeX' as any, v)}
              />
              <SelectField
                label=""
                value={(styles as any).resizeY || 'fixed'}
                options={[
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'hug', label: 'Hug' },
                  { value: 'fill', label: 'Fill' },
                ]}
                onChange={(v) => updateStyle('resizeY' as any, v)}
              />
            </div>
          </div>
          {/* Min/Max */}
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>Constraints</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <InputField
                label="Min"
                value={(styles as any).minWidth || ''}
                onChange={(v) => updateStyle('minWidth' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="W"
              />
              <InputField
                label="Max"
                value={(styles as any).maxWidth || ''}
                onChange={(v) => updateStyle('maxWidth' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="W"
              />
            </div>
          </div>
          {/* Min/Max Height */}
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>Height Constraints</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <InputField
                label="Min"
                value={(styles as any).minHeight || ''}
                onChange={(v) => updateStyle('minHeight' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="H"
              />
              <InputField
                label="Max"
                value={(styles as any).maxHeight || ''}
                onChange={(v) => updateStyle('maxHeight' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="H"
              />
            </div>
          </div>
          {/* Aspect Ratio */}
          <InputField
            label="Ratio"
            value={(styles as any).aspectRatio || ''}
            onChange={(v) => updateStyle('aspectRatio' as any, v || undefined)}
            type="text"
          />
        </div>
      </Section>

      {/* Corners - quick access to border radius */}
      {selectedElement.type !== 'text' && (
        <Section title="Corners" defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Uniform radius */}
            <InputField
              label="Radius"
              value={styles.borderRadius || 0}
              onChange={(v) => {
                const r = parseInt(v) || 0;
                updateStyle('borderRadius', r);
                updateStyle('borderTopLeftRadius' as any, r);
                updateStyle('borderTopRightRadius' as any, r);
                updateStyle('borderBottomLeftRadius' as any, r);
                updateStyle('borderBottomRightRadius' as any, r);
              }}
              type="number"
              suffix="px"
              min={0}
            />
            {/* Individual corners */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <InputField
                value={(styles as any).borderTopLeftRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderTopLeftRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↖"
              />
              <InputField
                value={(styles as any).borderTopRightRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderTopRightRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↗"
              />
              <InputField
                value={(styles as any).borderBottomLeftRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderBottomLeftRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↙"
              />
              <InputField
                value={(styles as any).borderBottomRightRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderBottomRightRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↘"
              />
            </div>
          </div>
        </Section>
      )}

      {/* Position */}
      <Section title="Position" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SelectField
            label="Type"
            value={(styles as any).position || 'relative'}
            options={[
              { value: 'relative', label: 'Relative' },
              { value: 'absolute', label: 'Absolute' },
              { value: 'fixed', label: 'Fixed' },
              { value: 'sticky', label: 'Sticky' },
            ]}
            onChange={(v) => updateStyle('position' as any, v)}
          />
          {/* Top/Right/Bottom/Left */}
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>Offset</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <InputField
                label="T"
                value={(styles as any).top || ''}
                onChange={(v) => updateStyle('top' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="px"
              />
              <InputField
                label="R"
                value={(styles as any).right || ''}
                onChange={(v) => updateStyle('right' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="px"
              />
              <InputField
                label="B"
                value={(styles as any).bottom || ''}
                onChange={(v) => updateStyle('bottom' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="px"
              />
              <InputField
                label="L"
                value={(styles as any).left || ''}
                onChange={(v) => updateStyle('left' as any, v ? parseInt(v) : undefined)}
                type="number"
                suffix="px"
              />
            </div>
          </div>
          {/* Z-Index */}
          <InputField
            label="Z"
            value={(styles as any).zIndex || 0}
            onChange={(v) => updateStyle('zIndex' as any, parseInt(v) || 0)}
            type="number"
          />
        </div>
      </Section>

      {/* Margin */}
      <Section title="Margin" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
            <InputField
              value={(styles as any).marginTop || 0}
              onChange={(v) => updateStyle('marginTop' as any, parseInt(v) || 0)}
              type="number"
              suffix="↑"
            />
            <InputField
              value={(styles as any).marginRight || 0}
              onChange={(v) => updateStyle('marginRight' as any, parseInt(v) || 0)}
              type="number"
              suffix="→"
            />
            <InputField
              value={(styles as any).marginBottom || 0}
              onChange={(v) => updateStyle('marginBottom' as any, parseInt(v) || 0)}
              type="number"
              suffix="↓"
            />
            <InputField
              value={(styles as any).marginLeft || 0}
              onChange={(v) => updateStyle('marginLeft' as any, parseInt(v) || 0)}
              type="number"
              suffix="←"
            />
          </div>
          {/* Uniform margin */}
          <InputField
            label="All"
            value={(styles as any).margin || 0}
            onChange={(v) => {
              const m = parseInt(v) || 0;
              updateStyle('margin' as any, m);
              updateStyle('marginTop' as any, m);
              updateStyle('marginRight' as any, m);
              updateStyle('marginBottom' as any, m);
              updateStyle('marginLeft' as any, m);
            }}
            type="number"
            suffix="px"
          />
          {/* Margin Auto */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                updateStyle('marginLeft' as any, 'auto');
                updateStyle('marginRight' as any, 'auto');
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                color: '#a1a1aa',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Center H
            </button>
            <button
              onClick={() => {
                updateStyle('marginTop' as any, 'auto');
                updateStyle('marginBottom' as any, 'auto');
              }}
              style={{
                flex: 1,
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                color: '#a1a1aa',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Center V
            </button>
          </div>
        </div>
      </Section>

      {/* Auto Layout (Figma-style) */}
      {(selectedElement.type === 'frame' || selectedElement.type === 'stack' || selectedElement.type === 'grid' || selectedElement.type === 'page' || selectedElement.type === 'container' || selectedElement.type === 'section' || selectedElement.type === 'row') && (() => {
        const isAutoLayoutEnabled = styles.display === 'flex' || styles.display === 'grid';
        const isVertical = styles.flexDirection === 'column' || styles.flexDirection === 'column-reverse';
        const isGrid = styles.display === 'grid';

        // Get padding values with shorthand fallback
        const basePadding = typeof styles.padding === 'number' ? styles.padding : (parseInt(String(styles.padding)) || 0);
        const paddingTop = styles.paddingTop ?? basePadding;
        const paddingRight = styles.paddingRight ?? basePadding;
        const paddingBottom = styles.paddingBottom ?? basePadding;
        const paddingLeft = styles.paddingLeft ?? basePadding;

        return (
          <Section title="Auto Layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Enable/Disable Toggle with Direction */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#71717a', width: 40 }}>Mode</div>
                <div style={{ display: 'flex', gap: 2, flex: 1, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 6, padding: 2 }}>
                  {/* Off */}
                  <button
                    onClick={() => {
                      updateStyle('display', 'block');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: !isAutoLayoutEnabled ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: !isAutoLayoutEnabled ? '#fff' : '#71717a',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                    title="No auto layout"
                  >
                    Off
                  </button>
                  {/* Vertical (Column) */}
                  <button
                    onClick={() => {
                      updateStyle('display', 'flex');
                      updateStyle('flexDirection', 'column');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isAutoLayoutEnabled && !isGrid && isVertical ? 'rgba(139, 30, 43, 0.3)' : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: isAutoLayoutEnabled && !isGrid && isVertical ? '#fff' : '#71717a',
                      cursor: 'pointer',
                    }}
                    title="Vertical layout (column)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </button>
                  {/* Horizontal (Row) */}
                  <button
                    onClick={() => {
                      updateStyle('display', 'flex');
                      updateStyle('flexDirection', 'row');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isAutoLayoutEnabled && !isGrid && !isVertical ? 'rgba(139, 30, 43, 0.3)' : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: isAutoLayoutEnabled && !isGrid && !isVertical ? '#fff' : '#71717a',
                      cursor: 'pointer',
                    }}
                    title="Horizontal layout (row)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                  {/* Grid */}
                  <button
                    onClick={() => {
                      updateStyle('display', 'grid');
                      updateStyle('gridTemplateColumns', 'repeat(2, 1fr)');
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isGrid ? 'rgba(139, 30, 43, 0.3)' : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: isGrid ? '#fff' : '#71717a',
                      cursor: 'pointer',
                    }}
                    title="Grid layout"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Show options only when Auto Layout is enabled */}
              {isAutoLayoutEnabled && !isGrid && (
                <>
                  {/* Gap with Space Between toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#71717a', width: 40 }}>Gap</div>
                    <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                      <InputField
                        value={styles.gap || 0}
                        onChange={(v) => {
                          updateStyle('gap', parseInt(v) || 0);
                          // Reset space-between when setting specific gap
                          if (styles.justifyContent === 'space-between') {
                            updateStyle('justifyContent', 'flex-start');
                          }
                        }}
                        type="number"
                        suffix="px"
                        min={0}
                        width="100%"
                      />
                      <button
                        onClick={() => {
                          const isSpaceBetween = styles.justifyContent === 'space-between';
                          updateStyle('justifyContent', isSpaceBetween ? 'flex-start' : 'space-between');
                        }}
                        style={{
                          padding: '4px 8px',
                          background: styles.justifyContent === 'space-between' ? 'rgba(139, 30, 43, 0.3)' : 'rgba(255, 255, 255, 0.04)',
                          border: 'none',
                          borderRadius: 4,
                          color: styles.justifyContent === 'space-between' ? '#fff' : '#71717a',
                          fontSize: 10,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        title="Space between items (Auto gap)"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  {/* Alignment Grid (Figma-style) */}
                  <div>
                    <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>Alignment</div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 2,
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 6,
                      padding: 4,
                    }}>
                      {/* Grid layout: rows = justify (vertical), cols = align (horizontal) */}
                      {[
                        // Top row: justify=flex-start
                        { j: 'flex-start', a: 'flex-start' }, // top-left
                        { j: 'flex-start', a: 'center' },     // top-center
                        { j: 'flex-start', a: 'flex-end' },   // top-right
                        // Middle row: justify=center
                        { j: 'center', a: 'flex-start' },     // middle-left
                        { j: 'center', a: 'center' },         // middle-center
                        { j: 'center', a: 'flex-end' },       // middle-right
                        // Bottom row: justify=flex-end
                        { j: 'flex-end', a: 'flex-start' },   // bottom-left
                        { j: 'flex-end', a: 'center' },       // bottom-center
                        { j: 'flex-end', a: 'flex-end' },     // bottom-right
                      ].map(({ j, a }, i) => {
                        const isSelected =
                          (styles.justifyContent || 'flex-start') === j &&
                          (styles.alignItems || 'flex-start') === a;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              updateStyle('justifyContent', j);
                              updateStyle('alignItems', a);
                            }}
                            style={{
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? 'rgba(139, 30, 43, 0.4)' : 'transparent',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{
                              width: 4,
                              height: 4,
                              borderRadius: 1,
                              background: isSelected ? '#fff' : '#52525b',
                            }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wrap */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#71717a', width: 40 }}>Wrap</div>
                    <SelectField
                      label=""
                      value={(styles as any).flexWrap || 'nowrap'}
                      options={[
                        { value: 'nowrap', label: 'No wrap' },
                        { value: 'wrap', label: 'Wrap' },
                      ]}
                      onChange={(v) => updateStyle('flexWrap' as any, v)}
                      width="100%"
                    />
                  </div>
                </>
              )}

              {/* Grid Options */}
              {isGrid && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#71717a', width: 40 }}>Cols</div>
                    <InputField
                      value={(styles as any).gridTemplateColumns || 'repeat(2, 1fr)'}
                      onChange={(v) => updateStyle('gridTemplateColumns' as any, v)}
                      type="text"
                      width="100%"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <InputField
                      label="Col"
                      value={(styles as any).columnGap || styles.gap || 0}
                      onChange={(v) => updateStyle('columnGap' as any, parseInt(v) || 0)}
                      type="number"
                      suffix="px"
                      min={0}
                    />
                    <InputField
                      label="Row"
                      value={(styles as any).rowGap || styles.gap || 0}
                      onChange={(v) => updateStyle('rowGap' as any, parseInt(v) || 0)}
                      type="number"
                      suffix="px"
                      min={0}
                    />
                  </div>
                </>
              )}

              {/* Padding (always show when auto layout is on) */}
              {/* Hold Cmd/Ctrl to set all sides at once */}
              {isAutoLayoutEnabled && (
                <div>
                  <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Padding</span>
                    <span style={{ fontSize: 9, opacity: 0.5 }}>⌘ = all</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
                    <InputField
                      value={paddingTop}
                      onChange={(v) => {
                        const val = parseInt(v) || 0;
                        if (isModifierKeyHeld) {
                          // Set all padding values at once, clear shorthand
                          updateStyle('padding', undefined);
                          updateStyle('paddingTop', val);
                          updateStyle('paddingRight', val);
                          updateStyle('paddingBottom', val);
                          updateStyle('paddingLeft', val);
                        } else {
                          updateStyle('padding', undefined);
                          updateStyle('paddingTop', val);
                        }
                      }}
                      type="number"
                      suffix="↑"
                    />
                    <InputField
                      value={paddingRight}
                      onChange={(v) => {
                        const val = parseInt(v) || 0;
                        if (isModifierKeyHeld) {
                          updateStyle('padding', undefined);
                          updateStyle('paddingTop', val);
                          updateStyle('paddingRight', val);
                          updateStyle('paddingBottom', val);
                          updateStyle('paddingLeft', val);
                        } else {
                          updateStyle('padding', undefined);
                          updateStyle('paddingRight', val);
                        }
                      }}
                      type="number"
                      suffix="→"
                    />
                    <InputField
                      value={paddingBottom}
                      onChange={(v) => {
                        const val = parseInt(v) || 0;
                        if (isModifierKeyHeld) {
                          updateStyle('padding', undefined);
                          updateStyle('paddingTop', val);
                          updateStyle('paddingRight', val);
                          updateStyle('paddingBottom', val);
                          updateStyle('paddingLeft', val);
                        } else {
                          updateStyle('padding', undefined);
                          updateStyle('paddingBottom', val);
                        }
                      }}
                      type="number"
                      suffix="↓"
                    />
                    <InputField
                      value={paddingLeft}
                      onChange={(v) => {
                        const val = parseInt(v) || 0;
                        if (isModifierKeyHeld) {
                          updateStyle('padding', undefined);
                          updateStyle('paddingTop', val);
                          updateStyle('paddingRight', val);
                          updateStyle('paddingBottom', val);
                          updateStyle('paddingLeft', val);
                        } else {
                          updateStyle('padding', undefined);
                          updateStyle('paddingLeft', val);
                        }
                      }}
                      type="number"
                      suffix="←"
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>
        );
      })()}

      {/* Fill */}
      <Section title="Fill">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Fill Type */}
          <SelectField
            label="Type"
            value={(styles as any).fillType || 'solid'}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'linear', label: 'Linear Gradient' },
              { value: 'radial', label: 'Radial Gradient' },
              { value: 'conic', label: 'Angular Gradient' },
              { value: 'image', label: 'Image' },
            ]}
            onChange={(v) => {
              updateStyle('fillType' as any, v);
              if (v === 'solid') {
                updateStyle('backgroundImage', 'none');
              }
            }}
          />

          {/* Solid Color */}
          {((styles as any).fillType || 'solid') === 'solid' && (
            <ColorInput
              value={styles.backgroundColor || '#ffffff'}
              onChange={(v) => updateStyle('backgroundColor', v)}
            />
          )}

          {/* Linear Gradient */}
          {(styles as any).fillType === 'linear' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InputField
                label="Angle"
                value={(styles as any).gradientAngle || 90}
                onChange={(v) => {
                  const angle = parseInt(v) || 90;
                  const color1 = (styles as any).gradientColor1 || '#A83248';
                  const color2 = (styles as any).gradientColor2 || '#8B1E2B';
                  updateStyle('backgroundImage', `linear-gradient(${angle}deg, ${color1}, ${color2})`);
                  updateStyle('gradientAngle' as any, angle);
                }}
                type="number"
                suffix="°"
                min={0}
                max={360}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#52525b', marginBottom: 4 }}>Start</div>
                  <input
                    type="color"
                    value={(styles as any).gradientColor1 || '#A83248'}
                    onChange={(e) => {
                      const color1 = e.target.value;
                      const color2 = (styles as any).gradientColor2 || '#8B1E2B';
                      const angle = (styles as any).gradientAngle || 90;
                      updateStyle('backgroundImage', `linear-gradient(${angle}deg, ${color1}, ${color2})`);
                      updateStyle('gradientColor1' as any, color1);
                    }}
                    style={{ width: '100%', height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#52525b', marginBottom: 4 }}>End</div>
                  <input
                    type="color"
                    value={(styles as any).gradientColor2 || '#8B1E2B'}
                    onChange={(e) => {
                      const color1 = (styles as any).gradientColor1 || '#A83248';
                      const color2 = e.target.value;
                      const angle = (styles as any).gradientAngle || 90;
                      updateStyle('backgroundImage', `linear-gradient(${angle}deg, ${color1}, ${color2})`);
                      updateStyle('gradientColor2' as any, color2);
                    }}
                    style={{ width: '100%', height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
                  />
                </div>
              </div>
              {/* Gradient preview */}
              <div
                style={{
                  height: 24,
                  borderRadius: 6,
                  background: `linear-gradient(${(styles as any).gradientAngle || 90}deg, ${(styles as any).gradientColor1 || '#A83248'}, ${(styles as any).gradientColor2 || '#8B1E2B'})`,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            </div>
          )}

          {/* Radial Gradient */}
          {(styles as any).fillType === 'radial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SelectField
                label="Shape"
                value={(styles as any).gradientShape || 'circle'}
                options={[
                  { value: 'circle', label: 'Circle' },
                  { value: 'ellipse', label: 'Ellipse' },
                ]}
                onChange={(v) => {
                  const shape = v;
                  const color1 = (styles as any).gradientColor1 || '#A83248';
                  const color2 = (styles as any).gradientColor2 || '#8B1E2B';
                  updateStyle('backgroundImage', `radial-gradient(${shape}, ${color1}, ${color2})`);
                  updateStyle('gradientShape' as any, shape);
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#52525b', marginBottom: 4 }}>Center</div>
                  <input
                    type="color"
                    value={(styles as any).gradientColor1 || '#A83248'}
                    onChange={(e) => {
                      const color1 = e.target.value;
                      const color2 = (styles as any).gradientColor2 || '#8B1E2B';
                      const shape = (styles as any).gradientShape || 'circle';
                      updateStyle('backgroundImage', `radial-gradient(${shape}, ${color1}, ${color2})`);
                      updateStyle('gradientColor1' as any, color1);
                    }}
                    style={{ width: '100%', height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#52525b', marginBottom: 4 }}>Edge</div>
                  <input
                    type="color"
                    value={(styles as any).gradientColor2 || '#8B1E2B'}
                    onChange={(e) => {
                      const color1 = (styles as any).gradientColor1 || '#A83248';
                      const color2 = e.target.value;
                      const shape = (styles as any).gradientShape || 'circle';
                      updateStyle('backgroundImage', `radial-gradient(${shape}, ${color1}, ${color2})`);
                      updateStyle('gradientColor2' as any, color2);
                    }}
                    style={{ width: '100%', height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
                  />
                </div>
              </div>
              {/* Gradient preview */}
              <div
                style={{
                  height: 40,
                  borderRadius: 6,
                  background: `radial-gradient(${(styles as any).gradientShape || 'circle'}, ${(styles as any).gradientColor1 || '#A83248'}, ${(styles as any).gradientColor2 || '#8B1E2B'})`,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            </div>
          )}

          {/* Angular/Conic Gradient */}
          {(styles as any).fillType === 'conic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InputField
                label="From"
                value={(styles as any).gradientAngle || 0}
                onChange={(v) => {
                  const angle = parseInt(v) || 0;
                  const color1 = (styles as any).gradientColor1 || '#A83248';
                  const color2 = (styles as any).gradientColor2 || '#8B1E2B';
                  updateStyle('backgroundImage', `conic-gradient(from ${angle}deg, ${color1}, ${color2}, ${color1})`);
                  updateStyle('gradientAngle' as any, angle);
                }}
                type="number"
                suffix="°"
                min={0}
                max={360}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#52525b', marginBottom: 4 }}>Color 1</div>
                  <input
                    type="color"
                    value={(styles as any).gradientColor1 || '#A83248'}
                    onChange={(e) => {
                      const color1 = e.target.value;
                      const color2 = (styles as any).gradientColor2 || '#8B1E2B';
                      const angle = (styles as any).gradientAngle || 0;
                      updateStyle('backgroundImage', `conic-gradient(from ${angle}deg, ${color1}, ${color2}, ${color1})`);
                      updateStyle('gradientColor1' as any, color1);
                    }}
                    style={{ width: '100%', height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#52525b', marginBottom: 4 }}>Color 2</div>
                  <input
                    type="color"
                    value={(styles as any).gradientColor2 || '#8B1E2B'}
                    onChange={(e) => {
                      const color1 = (styles as any).gradientColor1 || '#A83248';
                      const color2 = e.target.value;
                      const angle = (styles as any).gradientAngle || 0;
                      updateStyle('backgroundImage', `conic-gradient(from ${angle}deg, ${color1}, ${color2}, ${color1})`);
                      updateStyle('gradientColor2' as any, color2);
                    }}
                    style={{ width: '100%', height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
                  />
                </div>
              </div>
              {/* Gradient preview */}
              <div
                style={{
                  height: 40,
                  borderRadius: 6,
                  background: `conic-gradient(from ${(styles as any).gradientAngle || 0}deg, ${(styles as any).gradientColor1 || '#A83248'}, ${(styles as any).gradientColor2 || '#8B1E2B'}, ${(styles as any).gradientColor1 || '#A83248'})`,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            </div>
          )}

          {/* Image Fill */}
          {(styles as any).fillType === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InputField
                label="URL"
                value={(styles as any).backgroundImageUrl || ''}
                onChange={(v) => {
                  updateStyle('backgroundImage', v ? `url(${v})` : 'none');
                  updateStyle('backgroundImageUrl' as any, v);
                }}
                type="text"
              />
              <SelectField
                label="Size"
                value={(styles as any).backgroundSize || 'cover'}
                options={[
                  { value: 'cover', label: 'Cover' },
                  { value: 'contain', label: 'Contain' },
                  { value: '100% 100%', label: 'Stretch' },
                  { value: 'auto', label: 'Original' },
                ]}
                onChange={(v) => updateStyle('backgroundSize' as any, v)}
              />
              <SelectField
                label="Pos"
                value={(styles as any).backgroundPosition || 'center'}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'top', label: 'Top' },
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]}
                onChange={(v) => updateStyle('backgroundPosition' as any, v)}
              />
              <SelectField
                label="Repeat"
                value={(styles as any).backgroundRepeat || 'no-repeat'}
                options={[
                  { value: 'no-repeat', label: 'No Repeat' },
                  { value: 'repeat', label: 'Tile' },
                  { value: 'repeat-x', label: 'Tile X' },
                  { value: 'repeat-y', label: 'Tile Y' },
                ]}
                onChange={(v) => updateStyle('backgroundRepeat' as any, v)}
              />
            </div>
          )}

          {/* Opacity & Blend Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InputField
              label="Op"
              value={styles.opacity !== undefined ? Math.round(styles.opacity * 100) : 100}
              onChange={(v) => updateStyle('opacity', (parseInt(v) || 100) / 100)}
              type="number"
              suffix="%"
              min={0}
              max={100}
            />
            <SelectField
              label=""
              value={(styles as any).mixBlendMode || 'normal'}
              options={BLEND_MODES}
              onChange={(v) => updateStyle('mixBlendMode' as any, v)}
            />
          </div>
        </div>
      </Section>

      {/* Stroke */}
      <Section title="Stroke" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ColorInput
            value={styles.borderColor || '#000000'}
            onChange={(v) => updateStyle('borderColor', v)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InputField
              label="W"
              value={styles.borderWidth || 0}
              onChange={(v) => {
                updateStyle('borderWidth', parseInt(v) || 0);
                updateStyle('borderStyle', 'solid');
              }}
              type="number"
              suffix="px"
              min={0}
            />
            <SelectField
              label=""
              value={(styles as any).borderPosition || 'inside'}
              options={[
                { value: 'inside', label: 'Inside' },
                { value: 'center', label: 'Center' },
                { value: 'outside', label: 'Outside' },
              ]}
              onChange={(v) => updateStyle('borderPosition' as any, v)}
            />
          </div>
          <SelectField
            label="Style"
            value={styles.borderStyle || 'solid'}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) => updateStyle('borderStyle', v)}
          />
          {/* Corner Radius */}
          <div>
            <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>Corner Radius</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
              <InputField
                value={(styles as any).borderTopLeftRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderTopLeftRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↖"
              />
              <InputField
                value={(styles as any).borderTopRightRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderTopRightRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↗"
              />
              <InputField
                value={(styles as any).borderBottomRightRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderBottomRightRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↘"
              />
              <InputField
                value={(styles as any).borderBottomLeftRadius || styles.borderRadius || 0}
                onChange={(v) => updateStyle('borderBottomLeftRadius' as any, parseInt(v) || 0)}
                type="number"
                suffix="↙"
              />
            </div>
            {/* Uniform radius */}
            <div style={{ marginTop: 6 }}>
              <InputField
                label="All"
                value={styles.borderRadius || 0}
                onChange={(v) => {
                  const r = parseInt(v) || 0;
                  updateStyle('borderRadius', r);
                  updateStyle('borderTopLeftRadius' as any, r);
                  updateStyle('borderTopRightRadius' as any, r);
                  updateStyle('borderBottomLeftRadius' as any, r);
                  updateStyle('borderBottomRightRadius' as any, r);
                }}
                type="number"
                suffix="px"
                min={0}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Effects */}
      <Section title="Effects" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Drop Shadow */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 8, fontWeight: 600 }}>Drop Shadow</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <InputField
                label="X"
                value={(styles as any).shadowX || 0}
                onChange={(v) => {
                  const x = parseInt(v) || 0;
                  const y = (styles as any).shadowY || 4;
                  const blur = (styles as any).shadowBlur || 8;
                  const spread = (styles as any).shadowSpread || 0;
                  const color = (styles as any).shadowColor || 'rgba(0,0,0,0.25)';
                  updateStyle('boxShadow', `${x}px ${y}px ${blur}px ${spread}px ${color}`);
                  updateStyle('shadowX' as any, x);
                }}
                type="number"
                suffix="px"
              />
              <InputField
                label="Y"
                value={(styles as any).shadowY || 0}
                onChange={(v) => {
                  const x = (styles as any).shadowX || 0;
                  const y = parseInt(v) || 0;
                  const blur = (styles as any).shadowBlur || 8;
                  const spread = (styles as any).shadowSpread || 0;
                  const color = (styles as any).shadowColor || 'rgba(0,0,0,0.25)';
                  updateStyle('boxShadow', `${x}px ${y}px ${blur}px ${spread}px ${color}`);
                  updateStyle('shadowY' as any, y);
                }}
                type="number"
                suffix="px"
              />
              <InputField
                label="Blur"
                value={(styles as any).shadowBlur || 0}
                onChange={(v) => {
                  const x = (styles as any).shadowX || 0;
                  const y = (styles as any).shadowY || 4;
                  const blur = parseInt(v) || 0;
                  const spread = (styles as any).shadowSpread || 0;
                  const color = (styles as any).shadowColor || 'rgba(0,0,0,0.25)';
                  updateStyle('boxShadow', `${x}px ${y}px ${blur}px ${spread}px ${color}`);
                  updateStyle('shadowBlur' as any, blur);
                }}
                type="number"
                suffix="px"
                min={0}
              />
              <InputField
                label="Spread"
                value={(styles as any).shadowSpread || 0}
                onChange={(v) => {
                  const x = (styles as any).shadowX || 0;
                  const y = (styles as any).shadowY || 4;
                  const blur = (styles as any).shadowBlur || 8;
                  const spread = parseInt(v) || 0;
                  const color = (styles as any).shadowColor || 'rgba(0,0,0,0.25)';
                  updateStyle('boxShadow', `${x}px ${y}px ${blur}px ${spread}px ${color}`);
                  updateStyle('shadowSpread' as any, spread);
                }}
                type="number"
                suffix="px"
              />
            </div>
            {/* Shadow Color */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#71717a', width: 40 }}>Color</span>
              <input
                type="color"
                value={(styles as any).shadowColorHex || '#000000'}
                onChange={(e) => {
                  const hex = e.target.value;
                  const opacity = (styles as any).shadowOpacity ?? 0.25;
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  const color = `rgba(${r},${g},${b},${opacity})`;
                  const x = (styles as any).shadowX || 0;
                  const y = (styles as any).shadowY || 4;
                  const blur = (styles as any).shadowBlur || 8;
                  const spread = (styles as any).shadowSpread || 0;
                  updateStyle('boxShadow', `${x}px ${y}px ${blur}px ${spread}px ${color}`);
                  updateStyle('shadowColor' as any, color);
                  updateStyle('shadowColorHex' as any, hex);
                }}
                style={{ width: 28, height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
              />
              <InputField
                label=""
                value={Math.round(((styles as any).shadowOpacity ?? 0.25) * 100)}
                onChange={(v) => {
                  const opacity = (parseInt(v) || 25) / 100;
                  const hex = (styles as any).shadowColorHex || '#000000';
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  const color = `rgba(${r},${g},${b},${opacity})`;
                  const x = (styles as any).shadowX || 0;
                  const y = (styles as any).shadowY || 4;
                  const blur = (styles as any).shadowBlur || 8;
                  const spread = (styles as any).shadowSpread || 0;
                  updateStyle('boxShadow', `${x}px ${y}px ${blur}px ${spread}px ${color}`);
                  updateStyle('shadowColor' as any, color);
                  updateStyle('shadowOpacity' as any, opacity);
                }}
                type="number"
                suffix="%"
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Inner Shadow */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 8, fontWeight: 600 }}>Inner Shadow</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <InputField
                label="X"
                value={(styles as any).innerShadowX || 0}
                onChange={(v) => {
                  const x = parseInt(v) || 0;
                  const y = (styles as any).innerShadowY || 2;
                  const blur = (styles as any).innerShadowBlur || 4;
                  const color = (styles as any).innerShadowColor || 'rgba(0,0,0,0.15)';
                  const existingShadow = styles.boxShadow?.includes('inset') ? '' : (styles.boxShadow || '');
                  const innerShadow = `inset ${x}px ${y}px ${blur}px ${color}`;
                  updateStyle('boxShadow', existingShadow ? `${existingShadow}, ${innerShadow}` : innerShadow);
                  updateStyle('innerShadowX' as any, x);
                }}
                type="number"
                suffix="px"
              />
              <InputField
                label="Y"
                value={(styles as any).innerShadowY || 0}
                onChange={(v) => {
                  const x = (styles as any).innerShadowX || 0;
                  const y = parseInt(v) || 0;
                  const blur = (styles as any).innerShadowBlur || 4;
                  const color = (styles as any).innerShadowColor || 'rgba(0,0,0,0.15)';
                  const existingShadow = styles.boxShadow?.includes('inset') ? '' : (styles.boxShadow || '');
                  const innerShadow = `inset ${x}px ${y}px ${blur}px ${color}`;
                  updateStyle('boxShadow', existingShadow ? `${existingShadow}, ${innerShadow}` : innerShadow);
                  updateStyle('innerShadowY' as any, y);
                }}
                type="number"
                suffix="px"
              />
              <InputField
                label="Blur"
                value={(styles as any).innerShadowBlur || 0}
                onChange={(v) => {
                  const x = (styles as any).innerShadowX || 0;
                  const y = (styles as any).innerShadowY || 2;
                  const blur = parseInt(v) || 0;
                  const color = (styles as any).innerShadowColor || 'rgba(0,0,0,0.15)';
                  const existingShadow = styles.boxShadow?.includes('inset') ? '' : (styles.boxShadow || '');
                  const innerShadow = `inset ${x}px ${y}px ${blur}px ${color}`;
                  updateStyle('boxShadow', existingShadow ? `${existingShadow}, ${innerShadow}` : innerShadow);
                  updateStyle('innerShadowBlur' as any, blur);
                }}
                type="number"
                suffix="px"
                min={0}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="color"
                  value={(styles as any).innerShadowColorHex || '#000000'}
                  onChange={(e) => {
                    const hex = e.target.value;
                    const color = `${hex}26`; // ~15% opacity
                    const x = (styles as any).innerShadowX || 0;
                    const y = (styles as any).innerShadowY || 2;
                    const blur = (styles as any).innerShadowBlur || 4;
                    const existingShadow = styles.boxShadow?.includes('inset') ? '' : (styles.boxShadow || '');
                    const innerShadow = `inset ${x}px ${y}px ${blur}px ${color}`;
                    updateStyle('boxShadow', existingShadow ? `${existingShadow}, ${innerShadow}` : innerShadow);
                    updateStyle('innerShadowColor' as any, color);
                    updateStyle('innerShadowColorHex' as any, hex);
                  }}
                  style={{ width: 28, height: 28, border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 6, cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Blur Effects */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 8, fontWeight: 600 }}>Blur</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InputField
                label="Layer"
                value={(styles as any).filter?.match(/blur\((\d+)px\)/)?.[1] || 0}
                onChange={(v) => {
                  const blur = parseInt(v) || 0;
                  updateStyle('filter' as any, blur > 0 ? `blur(${blur}px)` : 'none');
                }}
                type="number"
                suffix="px"
                min={0}
              />
              <InputField
                label="BG"
                value={(styles as any).backdropFilter?.match(/blur\((\d+)px\)/)?.[1] || 0}
                onChange={(v) => {
                  const blur = parseInt(v) || 0;
                  updateStyle('backdropFilter' as any, blur > 0 ? `blur(${blur}px)` : 'none');
                }}
                type="number"
                suffix="px"
                min={0}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Typography (for text elements) */}
      {(selectedElement.type === 'text' || selectedElement.type === 'button' || selectedElement.type === 'link') && (
        <Section title="Typography">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SelectField
              label="Font"
              value={styles.fontFamily || 'Inter'}
              options={[
                { value: 'Inter', label: 'Inter' },
                { value: 'system-ui', label: 'System' },
                { value: 'Georgia, serif', label: 'Georgia' },
                { value: 'ui-monospace, monospace', label: 'Mono' },
                { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
                { value: 'Times New Roman, serif', label: 'Times' },
              ]}
              onChange={(v) => updateStyle('fontFamily', v)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <InputField
                label="Size"
                value={styles.fontSize || 16}
                onChange={(v) => updateStyle('fontSize', parseInt(v) || 16)}
                type="number"
                suffix="px"
                min={8}
              />
              <SelectField
                label=""
                value={String(styles.fontWeight || 400)}
                options={[
                  { value: '100', label: 'Thin' },
                  { value: '200', label: 'ExtraLight' },
                  { value: '300', label: 'Light' },
                  { value: '400', label: 'Regular' },
                  { value: '500', label: 'Medium' },
                  { value: '600', label: 'SemiBold' },
                  { value: '700', label: 'Bold' },
                  { value: '800', label: 'ExtraBold' },
                  { value: '900', label: 'Black' },
                ]}
                onChange={(v) => updateStyle('fontWeight', parseInt(v))}
              />
            </div>
            <ColorInput
              value={styles.color || '#000000'}
              onChange={(v) => updateStyle('color', v)}
            />
            {/* Text Alignment */}
            <div>
              <div style={{ fontSize: 11, color: '#71717a', marginBottom: 6 }}>Align</div>
              <ToggleGroup
                options={[
                  { value: 'left', icon: Icons.alignLeft, tooltip: 'Left' },
                  { value: 'center', icon: Icons.alignCenter, tooltip: 'Center' },
                  { value: 'right', icon: Icons.alignRight, tooltip: 'Right' },
                ]}
                value={styles.textAlign || 'left'}
                onChange={(v) => updateStyle('textAlign', v as 'left' | 'center' | 'right')}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <InputField
                label="LH"
                value={styles.lineHeight || 1.5}
                onChange={(v) => updateStyle('lineHeight', parseFloat(v) || 1.5)}
                type="number"
                step={0.1}
                min={0.5}
                max={3}
              />
              <InputField
                label="LS"
                value={(styles as any).letterSpacing || 0}
                onChange={(v) => updateStyle('letterSpacing' as any, parseFloat(v) || 0)}
                type="number"
                step={0.1}
                suffix="px"
              />
            </div>
            <SelectField
              label="Case"
              value={(styles as any).textTransform || 'none'}
              options={[
                { value: 'none', label: 'None' },
                { value: 'uppercase', label: 'UPPERCASE' },
                { value: 'lowercase', label: 'lowercase' },
                { value: 'capitalize', label: 'Capitalize' },
              ]}
              onChange={(v) => updateStyle('textTransform' as any, v)}
            />
            <SelectField
              label="Deco"
              value={(styles as any).textDecoration || 'none'}
              options={[
                { value: 'none', label: 'None' },
                { value: 'underline', label: 'Underline' },
                { value: 'line-through', label: 'Strikethrough' },
                { value: 'overline', label: 'Overline' },
              ]}
              onChange={(v) => updateStyle('textDecoration' as any, v)}
            />
            <SelectField
              label="Wrap"
              value={(styles as any).whiteSpace || 'normal'}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'nowrap', label: 'No Wrap' },
                { value: 'pre', label: 'Pre' },
                { value: 'pre-wrap', label: 'Pre Wrap' },
                { value: 'pre-line', label: 'Pre Line' },
              ]}
              onChange={(v) => updateStyle('whiteSpace' as any, v)}
            />
            <SelectField
              label="Over"
              value={(styles as any).textOverflow || 'clip'}
              options={[
                { value: 'clip', label: 'Clip' },
                { value: 'ellipsis', label: 'Ellipsis (...)' },
              ]}
              onChange={(v) => updateStyle('textOverflow' as any, v)}
            />
          </div>
        </Section>
      )}

      {/* Overflow */}
      <Section title="Clip & Overflow" defaultOpen={false}>
        <SelectField
          label=""
          value={styles.overflow || 'visible'}
          options={[
            { value: 'visible', label: 'Visible' },
            { value: 'hidden', label: 'Hidden (Clip)' },
            { value: 'scroll', label: 'Scroll' },
            { value: 'auto', label: 'Auto' },
          ]}
          onChange={(v) => updateStyle('overflow', v)}
        />
      </Section>

      {/* Cursor */}
      <Section title="Cursor" defaultOpen={false}>
        <SelectField
          label=""
          value={(styles as any).cursor || 'auto'}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'default', label: 'Default' },
            { value: 'pointer', label: 'Pointer' },
            { value: 'grab', label: 'Grab' },
            { value: 'grabbing', label: 'Grabbing' },
            { value: 'move', label: 'Move' },
            { value: 'text', label: 'Text' },
            { value: 'crosshair', label: 'Crosshair' },
            { value: 'not-allowed', label: 'Not Allowed' },
            { value: 'wait', label: 'Wait' },
            { value: 'help', label: 'Help' },
            { value: 'zoom-in', label: 'Zoom In' },
            { value: 'zoom-out', label: 'Zoom Out' },
          ]}
          onChange={(v) => updateStyle('cursor' as any, v)}
        />
      </Section>

      {/* Transitions */}
      <Section title="Transitions" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SelectField
            label="Prop"
            value={(styles as any).transitionProperty || 'all'}
            options={[
              { value: 'none', label: 'None' },
              { value: 'all', label: 'All' },
              { value: 'opacity', label: 'Opacity' },
              { value: 'transform', label: 'Transform' },
              { value: 'background', label: 'Background' },
              { value: 'color', label: 'Color' },
              { value: 'border', label: 'Border' },
              { value: 'box-shadow', label: 'Shadow' },
            ]}
            onChange={(v) => {
              updateStyle('transitionProperty' as any, v);
              const duration = (styles as any).transitionDuration || '0.2s';
              const easing = (styles as any).transitionTimingFunction || 'ease';
              const delay = (styles as any).transitionDelay || '0s';
              updateStyle('transition' as any, `${v} ${duration} ${easing} ${delay}`);
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <InputField
              label="Dur"
              value={parseFloat((styles as any).transitionDuration || '0.2') * 1000}
              onChange={(v) => {
                const duration = `${(parseInt(v) || 200) / 1000}s`;
                updateStyle('transitionDuration' as any, duration);
                const prop = (styles as any).transitionProperty || 'all';
                const easing = (styles as any).transitionTimingFunction || 'ease';
                const delay = (styles as any).transitionDelay || '0s';
                updateStyle('transition' as any, `${prop} ${duration} ${easing} ${delay}`);
              }}
              type="number"
              suffix="ms"
              min={0}
            />
            <InputField
              label="Delay"
              value={parseFloat((styles as any).transitionDelay || '0') * 1000}
              onChange={(v) => {
                const delay = `${(parseInt(v) || 0) / 1000}s`;
                updateStyle('transitionDelay' as any, delay);
                const prop = (styles as any).transitionProperty || 'all';
                const duration = (styles as any).transitionDuration || '0.2s';
                const easing = (styles as any).transitionTimingFunction || 'ease';
                updateStyle('transition' as any, `${prop} ${duration} ${easing} ${delay}`);
              }}
              type="number"
              suffix="ms"
              min={0}
            />
          </div>
          <SelectField
            label="Ease"
            value={(styles as any).transitionTimingFunction || 'ease'}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'ease', label: 'Ease' },
              { value: 'ease-in', label: 'Ease In' },
              { value: 'ease-out', label: 'Ease Out' },
              { value: 'ease-in-out', label: 'Ease In Out' },
              { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'Smooth' },
              { value: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', label: 'Bounce' },
            ]}
            onChange={(v) => {
              updateStyle('transitionTimingFunction' as any, v);
              const prop = (styles as any).transitionProperty || 'all';
              const duration = (styles as any).transitionDuration || '0.2s';
              const delay = (styles as any).transitionDelay || '0s';
              updateStyle('transition' as any, `${prop} ${duration} ${v} ${delay}`);
            }}
          />
        </div>
      </Section>

      {/* Content (for text/button/link) */}
      {(selectedElement.type === 'text' || selectedElement.type === 'button' || selectedElement.type === 'link') && (
        <Section title="Content">
          <textarea
            value={selectedElement.content || ''}
            onChange={(e) => {
              const { updateElementContent } = useCanvasStore.getState();
              updateElementContent(selectedElement.id, e.target.value);
            }}
            placeholder="Enter text..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: 8,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 6,
              fontSize: 12,
              color: '#e4e4e7',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </Section>
      )}

      {/* Image Source (for images) */}
      {selectedElement.type === 'image' && (
        <Section title="Image">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InputField
              label="URL"
              value={selectedElement.src || ''}
              onChange={(v) => {
                const { updateElementStyles } = useCanvasStore.getState();
                // Update src via styles workaround
                updateElementStyles(selectedElement.id, { src: v } as any);
              }}
              type="text"
            />

            {/* Fit & Position */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <SelectField
                label="Fit"
                value={(styles as any).objectFit || 'cover'}
                options={[
                  { value: 'cover', label: 'Cover' },
                  { value: 'contain', label: 'Contain' },
                  { value: 'fill', label: 'Fill' },
                  { value: 'none', label: 'None' },
                  { value: 'scale-down', label: 'Scale Down' },
                ]}
                onChange={(v) => updateStyle('objectFit' as any, v)}
              />
              <SelectField
                label="Position"
                value={(styles as any).objectPosition || 'center'}
                options={[
                  { value: 'center', label: 'Center' },
                  { value: 'top', label: 'Top' },
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                  { value: 'top left', label: 'Top Left' },
                  { value: 'top right', label: 'Top Right' },
                  { value: 'bottom left', label: 'Bottom Left' },
                  { value: 'bottom right', label: 'Bottom Right' },
                ]}
                onChange={(v) => updateStyle('objectPosition' as any, v)}
              />
            </div>

            {/* Transform Actions */}
            <div>
              <div style={{ fontSize: 10, color: '#52525b', marginBottom: 6, fontWeight: 600 }}>TRANSFORM</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => {
                    const current = (styles as any).transform || '';
                    const hasFlipX = current.includes('scaleX(-1)');
                    const newTransform = hasFlipX
                      ? current.replace('scaleX(-1)', '').trim()
                      : `${current} scaleX(-1)`.trim();
                    updateStyle('transform' as any, newTransform || undefined);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: (styles as any).transform?.includes('scaleX(-1)') ? '#8B1E2B' : '#27272a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    color: '#e4e4e7',
                    fontSize: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  title="Flip Horizontal"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M16 21h5v-5M8 21H3v-5M21 21l-7-7M3 21l7-7" />
                  </svg>
                  Flip H
                </button>
                <button
                  onClick={() => {
                    const current = (styles as any).transform || '';
                    const hasFlipY = current.includes('scaleY(-1)');
                    const newTransform = hasFlipY
                      ? current.replace('scaleY(-1)', '').trim()
                      : `${current} scaleY(-1)`.trim();
                    updateStyle('transform' as any, newTransform || undefined);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: (styles as any).transform?.includes('scaleY(-1)') ? '#8B1E2B' : '#27272a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    color: '#e4e4e7',
                    fontSize: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  title="Flip Vertical"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 16v5h5M21 16v5h-5M3 8V3h5M21 8V3h-5M3 21l7-7M21 21l-7-7M3 3l7 7M21 3l-7 7" />
                  </svg>
                  Flip V
                </button>
                <button
                  onClick={() => {
                    const current = (styles as any).transform || '';
                    const rotateMatch = current.match(/rotate\((\d+)deg\)/);
                    const currentRotate = rotateMatch ? parseInt(rotateMatch[1]) : 0;
                    const newRotate = (currentRotate + 90) % 360;
                    const newTransform = current.replace(/rotate\(\d+deg\)/, '').trim();
                    updateStyle('transform' as any, newRotate ? `${newTransform} rotate(${newRotate}deg)`.trim() : newTransform || undefined);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: '#27272a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    color: '#e4e4e7',
                    fontSize: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  title="Rotate 90°"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8" />
                  </svg>
                  Rotate
                </button>
              </div>
            </div>

            {/* Filters */}
            <div>
              <div style={{ fontSize: 10, color: '#52525b', marginBottom: 6, fontWeight: 600 }}>ADJUSTMENTS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#71717a', width: 60 }}>Brightness</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={parseInt(((styles as any).filter?.match(/brightness\((\d+)%\)/)?.[1]) || '100')}
                    onChange={(e) => {
                      const currentFilter = (styles as any).filter || '';
                      const newBrightness = `brightness(${e.target.value}%)`;
                      const newFilter = currentFilter.includes('brightness')
                        ? currentFilter.replace(/brightness\(\d+%\)/, newBrightness)
                        : `${currentFilter} ${newBrightness}`.trim();
                      updateStyle('filter' as any, newFilter);
                    }}
                    style={{ flex: 1, accentColor: '#8B1E2B' }}
                  />
                  <span style={{ fontSize: 10, color: '#a1a1aa', width: 30, textAlign: 'right' }}>
                    {parseInt(((styles as any).filter?.match(/brightness\((\d+)%\)/)?.[1]) || '100')}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#71717a', width: 60 }}>Contrast</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={parseInt(((styles as any).filter?.match(/contrast\((\d+)%\)/)?.[1]) || '100')}
                    onChange={(e) => {
                      const currentFilter = (styles as any).filter || '';
                      const newContrast = `contrast(${e.target.value}%)`;
                      const newFilter = currentFilter.includes('contrast')
                        ? currentFilter.replace(/contrast\(\d+%\)/, newContrast)
                        : `${currentFilter} ${newContrast}`.trim();
                      updateStyle('filter' as any, newFilter);
                    }}
                    style={{ flex: 1, accentColor: '#8B1E2B' }}
                  />
                  <span style={{ fontSize: 10, color: '#a1a1aa', width: 30, textAlign: 'right' }}>
                    {parseInt(((styles as any).filter?.match(/contrast\((\d+)%\)/)?.[1]) || '100')}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#71717a', width: 60 }}>Saturation</span>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={parseInt(((styles as any).filter?.match(/saturate\((\d+)%\)/)?.[1]) || '100')}
                    onChange={(e) => {
                      const currentFilter = (styles as any).filter || '';
                      const newSaturate = `saturate(${e.target.value}%)`;
                      const newFilter = currentFilter.includes('saturate')
                        ? currentFilter.replace(/saturate\(\d+%\)/, newSaturate)
                        : `${currentFilter} ${newSaturate}`.trim();
                      updateStyle('filter' as any, newFilter);
                    }}
                    style={{ flex: 1, accentColor: '#8B1E2B' }}
                  />
                  <span style={{ fontSize: 10, color: '#a1a1aa', width: 30, textAlign: 'right' }}>
                    {parseInt(((styles as any).filter?.match(/saturate\((\d+)%\)/)?.[1]) || '100')}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#71717a', width: 60 }}>Blur</span>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={parseInt(((styles as any).filter?.match(/blur\((\d+)px\)/)?.[1]) || '0')}
                    onChange={(e) => {
                      const currentFilter = (styles as any).filter || '';
                      const val = parseInt(e.target.value);
                      if (val === 0) {
                        const newFilter = currentFilter.replace(/blur\(\d+px\)/, '').trim();
                        updateStyle('filter' as any, newFilter || undefined);
                      } else {
                        const newBlur = `blur(${val}px)`;
                        const newFilter = currentFilter.includes('blur')
                          ? currentFilter.replace(/blur\(\d+px\)/, newBlur)
                          : `${currentFilter} ${newBlur}`.trim();
                        updateStyle('filter' as any, newFilter);
                      }
                    }}
                    style={{ flex: 1, accentColor: '#8B1E2B' }}
                  />
                  <span style={{ fontSize: 10, color: '#a1a1aa', width: 30, textAlign: 'right' }}>
                    {parseInt(((styles as any).filter?.match(/blur\((\d+)px\)/)?.[1]) || '0')}px
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#71717a', width: 60 }}>Grayscale</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={parseInt(((styles as any).filter?.match(/grayscale\((\d+)%\)/)?.[1]) || '0')}
                    onChange={(e) => {
                      const currentFilter = (styles as any).filter || '';
                      const val = parseInt(e.target.value);
                      if (val === 0) {
                        const newFilter = currentFilter.replace(/grayscale\(\d+%\)/, '').trim();
                        updateStyle('filter' as any, newFilter || undefined);
                      } else {
                        const newGray = `grayscale(${val}%)`;
                        const newFilter = currentFilter.includes('grayscale')
                          ? currentFilter.replace(/grayscale\(\d+%\)/, newGray)
                          : `${currentFilter} ${newGray}`.trim();
                        updateStyle('filter' as any, newFilter);
                      }
                    }}
                    style={{ flex: 1, accentColor: '#8B1E2B' }}
                  />
                  <span style={{ fontSize: 10, color: '#a1a1aa', width: 30, textAlign: 'right' }}>
                    {parseInt(((styles as any).filter?.match(/grayscale\((\d+)%\)/)?.[1]) || '0')}%
                  </span>
                </div>
                {/* Reset Filters Button */}
                <button
                  onClick={() => updateStyle('filter' as any, undefined)}
                  style={{
                    padding: '6px 12px',
                    background: '#27272a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    color: '#a1a1aa',
                    fontSize: 10,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Responsive Breakpoints */}
      <Section title="Responsive" defaultOpen={false}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#52525b', marginBottom: 8, fontWeight: 600 }}>BREAKPOINT</div>
          <BreakpointSelector />
        </div>
        <div style={{ fontSize: 11, color: '#71717a', textAlign: 'center', padding: '8px 0' }}>
          Styles applied here override base styles for the selected breakpoint.
        </div>
      </Section>

      {/* Interactions & Animations */}
      <InteractionsPanel
        variants={selectedElement.variants || []}
        interactions={selectedElement.interactions || []}
        animations={selectedElement.animations || []}
        onVariantsChange={(variants) => {
          const { setVariants } = useCanvasStore.getState();
          setVariants(selectedElement.id, variants);
        }}
        onInteractionsChange={(interactions) => {
          const { setInteractions } = useCanvasStore.getState();
          setInteractions(selectedElement.id, interactions);
        }}
        onAnimationsChange={(animations) => {
          const { setAnimations } = useCanvasStore.getState();
          setAnimations(selectedElement.id, animations);
        }}
      />
    </div>
  );
}
