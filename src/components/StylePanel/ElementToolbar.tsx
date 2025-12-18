/**
 * ElementToolbar - Framer-style element insertion toolbar
 *
 * Allows users to add:
 * - Frame (div container)
 * - Text
 * - Image
 * - Button
 * - Input
 * - Link
 */

import React, { useState } from 'react';

export interface NewElement {
  type: 'frame' | 'text' | 'image' | 'button' | 'input' | 'link' | 'stack' | 'grid';
  defaultStyles: Record<string, string>;
  defaultContent?: string;
  tag: string;
}

interface ElementToolbarProps {
  onAddElement: (element: NewElement) => void;
  disabled?: boolean;
}

const ELEMENTS: Array<{
  type: NewElement['type'];
  label: string;
  icon: React.ReactNode;
  tag: string;
  defaultStyles: Record<string, string>;
  defaultContent?: string;
}> = [
  {
    type: 'frame',
    label: 'Frame',
    tag: 'div',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
    defaultStyles: {
      width: '200px',
      height: '200px',
      backgroundColor: '#f3f4f6',
      borderRadius: '8px',
    },
  },
  {
    type: 'stack',
    label: 'Stack',
    tag: 'div',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="6" rx="1" />
        <rect x="3" y="11" width="18" height="6" rx="1" />
        <rect x="3" y="19" width="18" height="2" rx="1" />
      </svg>
    ),
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
    },
  },
  {
    type: 'grid',
    label: 'Grid',
    tag: 'div',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    defaultStyles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      padding: '16px',
    },
  },
  {
    type: 'text',
    label: 'Text',
    tag: 'p',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
      </svg>
    ),
    defaultStyles: {
      fontSize: '16px',
      color: '#1f2937',
      lineHeight: '1.5',
    },
    defaultContent: 'Add your text here',
  },
  {
    type: 'button',
    label: 'Button',
    tag: 'button',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="6" width="18" height="12" rx="4" />
        <path d="M8 12h8" />
      </svg>
    ),
    defaultStyles: {
      padding: '12px 24px',
      backgroundColor: '#6366f1',
      color: '#ffffff',
      borderRadius: '8px',
      fontWeight: '500',
      fontSize: '14px',
      border: 'none',
      cursor: 'pointer',
    },
    defaultContent: 'Button',
  },
  {
    type: 'image',
    label: 'Image',
    tag: 'img',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
    defaultStyles: {
      width: '200px',
      height: '150px',
      objectFit: 'cover',
      borderRadius: '8px',
      backgroundColor: '#e5e7eb',
    },
  },
  {
    type: 'input',
    label: 'Input',
    tag: 'input',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 12h.01" />
      </svg>
    ),
    defaultStyles: {
      padding: '12px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      width: '250px',
    },
  },
  {
    type: 'link',
    label: 'Link',
    tag: 'a',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    defaultStyles: {
      color: '#6366f1',
      textDecoration: 'underline',
      fontSize: '16px',
      cursor: 'pointer',
    },
    defaultContent: 'Link text',
  },
];

export function ElementToolbar({ onAddElement, disabled }: ElementToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddElement = (element: typeof ELEMENTS[number]) => {
    onAddElement({
      type: element.type,
      tag: element.tag,
      defaultStyles: element.defaultStyles,
      defaultContent: element.defaultContent,
    });
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          background: isOpen ? '#333' : 'transparent',
          border: '1px solid #333',
          borderRadius: 6,
          color: disabled ? '#666' : '#fff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 13,
          fontWeight: 500,
          transition: 'all 0.15s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: 280,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid #333',
                fontSize: 11,
                fontWeight: 600,
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Insert Element
            </div>

            {/* Elements Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
                padding: 8,
              }}
            >
              {ELEMENTS.map((element) => (
                <button
                  key={element.type}
                  onClick={() => handleAddElement(element)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '12px 8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: '#ccc',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#2a2a2a';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#ccc';
                  }}
                >
                  {element.icon}
                  <span style={{ fontSize: 10 }}>{element.label}</span>
                </button>
              ))}
            </div>

            {/* AI Section */}
            <div
              style={{
                padding: '8px 12px 12px',
                borderTop: '1px solid #333',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#666',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Or describe with AI
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="A card with image and title..."
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    background: '#0f0f0f',
                    border: '1px solid #333',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 12,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // TODO: Send to AI
                      console.log('AI prompt:', e.currentTarget.value);
                      setIsOpen(false);
                    }
                  }}
                />
                <button
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ElementToolbar;
