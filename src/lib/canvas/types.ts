/**
 * Canvas Element Types
 *
 * Defines the structure for visual elements on the canvas.
 * Similar to Plasmic's element model with responsive, variants, and interactions support.
 */

import { Variant, Interaction, Animation, TransitionConfig } from './interactions';
import { ResponsiveStyles } from './responsive';

export type ElementType =
  | 'frame'
  | 'text'
  | 'button'
  | 'image'
  | 'input'
  | 'link'
  | 'icon'
  | 'video'
  | 'stack'
  | 'grid'
  | 'page'
  // Layout elements
  | 'section'
  | 'container'
  | 'row';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElementStyles {
  // Layout
  display?: 'block' | 'flex' | 'grid' | 'inline' | 'inline-block' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGrow?: number;
  flexShrink?: number;
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;

  // Spacing
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;

  // Border
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderWidth?: number;
  borderTopWidth?: number;
  borderRightWidth?: number;
  borderBottomWidth?: number;
  borderLeftWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';

  // Typography
  fontSize?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textAlignVertical?: 'top' | 'center' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap';

  // Effects
  opacity?: number;
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  mixBlendMode?: string;

  // Transform
  transform?: string;
  transformOrigin?: string;

  // Transition (for smooth state changes)
  transition?: string;

  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';

  // Cursor
  cursor?: string;

  // Z-index
  zIndex?: number;

  // Aspect ratio
  aspectRatio?: string;

  // Object fit (for images/videos)
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  name: string;

  // Position & Size (relative to parent or canvas)
  position: Position;
  size: Size;

  // For absolute positioning within parent
  positionType: 'relative' | 'absolute';

  // Base styles (default/desktop)
  styles: ElementStyles;

  // Responsive style overrides per breakpoint
  responsiveStyles?: ResponsiveStyles;

  // Variants (hover, active, focus, disabled, custom)
  variants?: Variant[];

  // Interactions (click, hover, scroll triggers with actions)
  interactions?: Interaction[];

  // Animations
  animations?: Animation[];

  // Default transition for all state changes
  defaultTransition?: TransitionConfig;

  // Content (for text, button, link)
  content?: string;

  // For images
  src?: string;
  alt?: string;

  // For videos
  videoSrc?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;

  // For icons
  iconName?: string;
  iconSize?: number;

  // For inputs
  placeholder?: string;
  inputType?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  inputName?: string;
  required?: boolean;
  disabled?: boolean;

  // For links
  href?: string;
  target?: '_self' | '_blank';

  // Hierarchy
  parentId: string | null;
  children: string[];

  // State
  locked: boolean;
  visible: boolean;

  // For code generation
  componentName?: string;

  // Data binding (for dynamic content)
  dataBinding?: {
    source: 'state' | 'props' | 'api';
    path: string;
    fallback?: string;
  };

  // Accessibility
  ariaLabel?: string;
  ariaRole?: string;
  tabIndex?: number;
}

export interface CanvasPage {
  id: string;
  name: string;
  rootElementId: string;
  backgroundColor?: string;
  width: number;
  height: number;
  // Position on canvas (for dragging artboards like Figma)
  x: number;
  y: number;
  // Page notes/annotations
  notes?: string;
}

// Canvas settings for customization
export interface CanvasSettings {
  canvasBackground: string;
  selectionColor: string;
  showGrid: boolean;
  gridSize: number;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  canvasBackground: '#0a0808',
  selectionColor: '#8B1E2B',
  showGrid: true,
  gridSize: 20,
};

export interface CanvasState {
  projectName: string;
  pages: Record<string, CanvasPage>;
  elements: Record<string, CanvasElement>;
  currentPageId: string;
  selectedElementIds: string[];
  hoveredElementId: string | null;

  // Canvas settings
  canvasSettings: CanvasSettings;

  // Clipboard
  clipboard: CanvasElement[] | null;

  // History for undo/redo
  history: CanvasHistoryEntry[];
  historyIndex: number;
}

export interface CanvasHistoryEntry {
  elements: Record<string, CanvasElement>;
  pages: Record<string, CanvasPage>;
  timestamp: number;
  action: string;
}

// Default element configurations
export const DEFAULT_ELEMENT_CONFIGS: Record<ElementType, Partial<CanvasElement>> = {
  page: {
    size: { width: 1440, height: 900 },
    styles: { backgroundColor: '#ffffff' },
  },
  frame: {
    size: { width: 200, height: 200 },
    styles: {
      backgroundColor: '#f3f4f6',
      borderRadius: 0,
      padding: 0,
    },
  },
  stack: {
    size: { width: 200, height: 150 },
    styles: {
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      padding: 0,
      backgroundColor: '#f9fafb',
      borderRadius: 0,
    },
  },
  grid: {
    size: { width: 300, height: 200 },
    styles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 0,
      padding: 0,
    },
  },
  text: {
    size: { width: 200, height: 40 },
    content: 'Add your text here',
    styles: {
      fontSize: 16,
      color: '#1f2937',
      lineHeight: 1.5,
      resizeX: 'hug',  // Auto-size width like Figma
      resizeY: 'hug',  // Auto-size height like Figma
    },
  },
  button: {
    size: { width: 120, height: 44 },
    content: 'Button',
    styles: {
      backgroundColor: '#8B1E2B',
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 500,
      borderRadius: 8,
      padding: 12,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
  },
  image: {
    size: { width: 200, height: 150 },
    src: 'https://picsum.photos/400/300',
    alt: 'Random image',
    styles: {
      borderRadius: 8,
      overflow: 'hidden',
    },
  },
  input: {
    size: { width: 250, height: 44 },
    placeholder: 'Enter text...',
    inputType: 'text',
    styles: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderStyle: 'solid',
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
    },
  },
  link: {
    size: { width: 100, height: 24 },
    content: 'Link text',
    href: '#',
    target: '_self',
    styles: {
      color: '#8B1E2B',
      fontSize: 14,
      textDecoration: 'underline',
      cursor: 'pointer',
      resizeX: 'hug',  // Auto-size like Figma text
      resizeY: 'hug',
    },
  },
  icon: {
    size: { width: 24, height: 24 },
    iconName: 'star',
    iconSize: 24,
    styles: {
      color: '#8B1E2B',
    },
  },
  video: {
    size: { width: 400, height: 225 },
    videoSrc: '',
    autoplay: false,
    loop: false,
    muted: true,
    controls: true,
    styles: {
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: '#18181b',
    },
  },
  // Layout elements
  section: {
    size: { width: 1200, height: 400 },
    styles: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 64,
      backgroundColor: '#ffffff',
    },
  },
  container: {
    size: { width: 1140, height: 200 },
    styles: {
      display: 'flex',
      flexDirection: 'column',
      padding: 24,
      backgroundColor: 'transparent',
    },
  },
  row: {
    size: { width: 1000, height: 100 },
    styles: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 16,
    },
  },
};
