/**
 * Component Library for Visual Canvas
 *
 * Beautiful Framer-style component picker that adds elements to the canvas.
 */

import React, { useState } from 'react';
import { useCanvasStore } from '../../lib/canvas/canvasStore';
import { ElementType } from '../../lib/canvas/types';
import { IconPicker } from './IconPicker';

// ============================================================================
// Component Definitions
// ============================================================================

interface ComponentDef {
  id: string;
  type: ElementType;
  name: string;
  description: string;
  preview: React.ReactNode;
  defaultStyles?: Record<string, unknown>;
}

const COMPONENT_CATEGORIES = [
  {
    id: 'layout',
    name: 'Layout',
    icon: <LayoutIcon />,
    components: [
      {
        id: 'frame',
        type: 'frame' as ElementType,
        name: 'Frame',
        description: 'Container for other elements',
        preview: <FramePreview />,
      },
      {
        id: 'stack-v',
        type: 'stack' as ElementType,
        name: 'Stack (Vertical)',
        description: 'Vertical flex container',
        preview: <StackVPreview />,
      },
      {
        id: 'stack-h',
        type: 'stack' as ElementType,
        name: 'Stack (Horizontal)',
        description: 'Horizontal flex container',
        preview: <StackHPreview />,
        defaultStyles: { flexDirection: 'row' },
      },
      {
        id: 'grid',
        type: 'grid' as ElementType,
        name: 'Grid',
        description: '2-column responsive grid',
        preview: <GridPreview />,
      },
    ],
  },
  {
    id: 'elements',
    name: 'Elements',
    icon: <ElementsIcon />,
    components: [
      {
        id: 'text',
        type: 'text' as ElementType,
        name: 'Text',
        description: 'Paragraph or heading',
        preview: <TextPreview />,
      },
      {
        id: 'button',
        type: 'button' as ElementType,
        name: 'Button',
        description: 'Interactive button',
        preview: <ButtonPreview />,
      },
      {
        id: 'image',
        type: 'image' as ElementType,
        name: 'Image',
        description: 'Image placeholder',
        preview: <ImagePreview />,
      },
      {
        id: 'input',
        type: 'input' as ElementType,
        name: 'Input',
        description: 'Text input field',
        preview: <InputPreview />,
      },
      {
        id: 'link',
        type: 'link' as ElementType,
        name: 'Link',
        description: 'Text link',
        preview: <LinkPreview />,
      },
      {
        id: 'icon',
        type: 'icon' as ElementType,
        name: 'Icon',
        description: 'Lucide icon library',
        preview: <IconPreview />,
      },
    ],
  },
  {
    id: 'sections',
    name: 'Sections',
    icon: <SectionsIcon />,
    components: [
      {
        id: 'hero',
        type: 'frame' as ElementType,
        name: 'Hero Section',
        description: 'Full-width hero with CTA',
        preview: <HeroPreview />,
        defaultStyles: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 64,
          backgroundColor: '#f9fafb',
          gap: 24,
        },
      },
      {
        id: 'features',
        type: 'grid' as ElementType,
        name: 'Features Grid',
        description: '3-column feature cards',
        preview: <FeaturesPreview />,
        defaultStyles: {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          padding: 32,
        },
      },
      {
        id: 'cta',
        type: 'frame' as ElementType,
        name: 'CTA Section',
        description: 'Call-to-action banner',
        preview: <CTAPreview />,
        defaultStyles: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 48,
          backgroundColor: '#8B1E2B',
          borderRadius: 16,
          gap: 16,
        },
      },
    ],
  },
];

// ============================================================================
// Main Component
// ============================================================================

interface ComponentLibraryProps {
  onClose?: () => void;
}

export function ComponentLibrary({ onClose }: ComponentLibraryProps) {
  const [activeCategory, setActiveCategory] = useState('elements');
  const [search, setSearch] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const addElement = useCanvasStore((state) => state.addElement);

  const handleAddComponent = (comp: ComponentDef) => {
    // Special handling for icons - open picker
    if (comp.type === 'icon') {
      setShowIconPicker(true);
      return;
    }
    addElement(comp.type);
    // TODO: Apply defaultStyles if provided
  };

  const handleIconSelect = (iconName: string) => {
    // Add icon element and update with selected icon name
    const elementId = addElement('icon');
    if (elementId) {
      // Update the element with the selected icon name directly in store
      useCanvasStore.setState((state) => ({
        elements: {
          ...state.elements,
          [elementId]: {
            ...state.elements[elementId],
            iconName,
          },
        },
      }));
    }
    setShowIconPicker(false);
  };

  const activeComponents = COMPONENT_CATEGORIES.find((c) => c.id === activeCategory)?.components || [];

  const filteredComponents = search
    ? COMPONENT_CATEGORIES.flatMap((c) => c.components).filter(
        (comp) =>
          comp.name.toLowerCase().includes(search.toLowerCase()) ||
          comp.description.toLowerCase().includes(search.toLowerCase())
      )
    : activeComponents;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Components</span>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            <CloseIcon />
          </button>
        )}
      </div>

      {/* Search */}
      <div style={styles.searchWrapper}>
        <SearchIcon />
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Category Tabs */}
      {!search && (
        <div style={styles.tabs}>
          {COMPONENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                ...styles.tab,
                background: activeCategory === cat.id ? 'rgba(139, 30, 43, 0.15)' : 'transparent',
                color: activeCategory === cat.id ? '#a5b4fc' : '#888',
              }}
            >
              {cat.icon}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Components Grid */}
      <div style={styles.grid}>
        {filteredComponents.map((comp) => (
          <button
            key={comp.id}
            onClick={() => handleAddComponent(comp)}
            style={styles.componentCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 30, 43, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={styles.previewWrapper}>{comp.preview}</div>
            <div style={styles.componentInfo}>
              <span style={styles.componentName}>{comp.name}</span>
              <span style={styles.componentDesc}>{comp.description}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Keyboard hint */}
      <div style={styles.hint}>
        <span>Press</span>
        <kbd style={styles.kbd}>F</kbd>
        <span>Frame</span>
        <kbd style={styles.kbd}>T</kbd>
        <span>Text</span>
        <kbd style={styles.kbd}>B</kbd>
        <span>Button</span>
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <IconPicker
          onSelect={handleIconSelect}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Preview Components
// ============================================================================

function FramePreview() {
  return (
    <div style={{ width: 48, height: 48, border: '2px dashed #444', borderRadius: 6 }} />
  );
}

function StackVPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ width: 48, height: 12, background: '#444', borderRadius: 2 }} />
      <div style={{ width: 48, height: 12, background: '#444', borderRadius: 2 }} />
      <div style={{ width: 48, height: 12, background: '#444', borderRadius: 2 }} />
    </div>
  );
}

function StackHPreview() {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <div style={{ width: 14, height: 32, background: '#444', borderRadius: 2 }} />
      <div style={{ width: 14, height: 32, background: '#444', borderRadius: 2 }} />
      <div style={{ width: 14, height: 32, background: '#444', borderRadius: 2 }} />
    </div>
  );
}

function GridPreview() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      <div style={{ width: 22, height: 18, background: '#444', borderRadius: 2 }} />
      <div style={{ width: 22, height: 18, background: '#444', borderRadius: 2 }} />
      <div style={{ width: 22, height: 18, background: '#444', borderRadius: 2 }} />
      <div style={{ width: 22, height: 18, background: '#444', borderRadius: 2 }} />
    </div>
  );
}

function TextPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 6, background: '#888', borderRadius: 2 }} />
      <div style={{ width: 48, height: 4, background: '#555', borderRadius: 1 }} />
      <div style={{ width: 36, height: 4, background: '#555', borderRadius: 1 }} />
    </div>
  );
}

function ButtonPreview() {
  return (
    <div
      style={{
        padding: '8px 16px',
        background: '#8B1E2B',
        borderRadius: 6,
        fontSize: 10,
        color: '#fff',
        fontWeight: 600,
      }}
    >
      Button
    </div>
  );
}

function ImagePreview() {
  return (
    <div
      style={{
        width: 48,
        height: 36,
        background: '#333',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
}

function InputPreview() {
  return (
    <div
      style={{
        width: 48,
        height: 24,
        background: '#222',
        border: '1px solid #444',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 6,
      }}
    >
      <div style={{ width: 4, height: 12, background: '#666' }} />
    </div>
  );
}

function LinkPreview() {
  return (
    <span style={{ color: '#8B1E2B', fontSize: 11, textDecoration: 'underline' }}>Link text</span>
  );
}

function IconPreview() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        background: 'rgba(139, 30, 43, 0.1)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B1E2B" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </div>
  );
}

function HeroPreview() {
  return (
    <div
      style={{
        width: 52,
        height: 40,
        background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <div style={{ width: 24, height: 4, background: '#fff', borderRadius: 1 }} />
      <div style={{ width: 16, height: 2, background: '#888', borderRadius: 1 }} />
      <div style={{ width: 14, height: 6, background: '#8B1E2B', borderRadius: 2, marginTop: 2 }} />
    </div>
  );
}

function FeaturesPreview() {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 20,
            background: '#333',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 4,
            gap: 2,
          }}
        >
          <div style={{ width: 6, height: 6, background: '#8B1E2B', borderRadius: '50%' }} />
          <div style={{ width: 8, height: 2, background: '#555', borderRadius: 1 }} />
        </div>
      ))}
    </div>
  );
}

function CTAPreview() {
  return (
    <div
      style={{
        width: 52,
        height: 32,
        background: 'linear-gradient(135deg, #8B1E2B 0%, #A83248 100%)',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      <div style={{ width: 20, height: 3, background: '#fff', borderRadius: 1 }} />
      <div style={{ width: 16, height: 6, background: '#fff', borderRadius: 2 }} />
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function LayoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function ElementsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function SectionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <rect x="3" y="12" width="18" height="9" rx="1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 280,
    height: '100%',
    background: '#141414',
    borderRight: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '-0.01em',
  },
  closeButton: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    color: '#666',
    cursor: 'pointer',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '12px 16px',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ccc',
    fontSize: 13,
    outline: 'none',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: '0 12px 12px',
    flexWrap: 'wrap',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: '#888',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  grid: {
    flex: 1,
    overflow: 'auto',
    padding: '0 12px 12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    alignContent: 'start',
  },
  componentCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: 12,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  previewWrapper: {
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  componentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  componentName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e5e5e5',
  },
  componentDesc: {
    fontSize: 10,
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: 10,
    color: '#555',
  },
  kbd: {
    padding: '2px 5px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 600,
    color: '#888',
  },
};
