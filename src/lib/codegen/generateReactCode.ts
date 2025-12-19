/**
 * React Code Generator
 *
 * Converts Canvas elements to React + Tailwind code.
 * Canvas is the source of truth - no AI needed for simple edits.
 *
 * Output structure:
 * - src/App.tsx (imports all pages)
 * - src/pages/*.tsx (one per canvas page)
 * - src/components/*.tsx (reusable frames)
 */

import { CanvasElement, CanvasPage, ElementStyles } from '../canvas/types';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedFiles {
  [path: string]: string;
}

export interface GenerateOptions {
  /** Include Framer Motion animations */
  includeAnimations?: boolean;
  /** Generate TypeScript (true) or JavaScript (false) */
  typescript?: boolean;
  /** Format output with Prettier */
  format?: boolean;
}

// ============================================================================
// TAILWIND CONVERSION (Hybrid: standard classes + arbitrary values)
// ============================================================================

// Standard Tailwind spacing scale (in pixels)
const SPACING_SCALE: Record<number, string> = {
  0: '0', 1: '0.5', 2: '1', 4: '1', 6: '1.5', 8: '2', 10: '2.5', 12: '3',
  14: '3.5', 16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10',
  44: '11', 48: '12', 56: '14', 64: '16', 80: '20', 96: '24', 112: '28',
  128: '32', 144: '36', 160: '40', 176: '44', 192: '48', 208: '52', 224: '56',
  240: '60', 256: '64', 288: '72', 320: '80', 384: '96',
};

// Standard Tailwind font sizes
const FONT_SIZE_SCALE: Record<number, string> = {
  12: 'xs', 14: 'sm', 16: 'base', 18: 'lg', 20: 'xl', 24: '2xl',
  30: '3xl', 36: '4xl', 48: '5xl', 60: '6xl', 72: '7xl', 96: '8xl', 128: '9xl',
};

// Standard Tailwind border radius
const RADIUS_SCALE: Record<number, string> = {
  0: 'none', 2: 'sm', 4: 'DEFAULT', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl', 24: '3xl',
};

// Font weight mapping
const FONT_WEIGHT_MAP: Record<string | number, string> = {
  100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal',
  500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black',
};

// Common Tailwind colors (for exact matches)
const TAILWIND_COLORS: Record<string, string> = {
  '#ffffff': 'white', '#000000': 'black', 'transparent': 'transparent',
  '#f9fafb': 'gray-50', '#f3f4f6': 'gray-100', '#e5e7eb': 'gray-200',
  '#d1d5db': 'gray-300', '#9ca3af': 'gray-400', '#6b7280': 'gray-500',
  '#4b5563': 'gray-600', '#374151': 'gray-700', '#1f2937': 'gray-800',
  '#111827': 'gray-900', '#ef4444': 'red-500', '#f97316': 'orange-500',
  '#eab308': 'yellow-500', '#22c55e': 'green-500', '#3b82f6': 'blue-500',
  '#8b5cf6': 'violet-500', '#ec4899': 'pink-500',
};

/**
 * Convert a pixel value to Tailwind spacing class or arbitrary value
 */
function toSpacing(px: number | undefined, prefix: string): string {
  if (px === undefined || px === 0) return '';
  const twValue = SPACING_SCALE[px];
  if (twValue) return `${prefix}-${twValue}`;
  return `${prefix}-[${px}px]`;
}

/**
 * Convert color to Tailwind class or arbitrary value
 */
function toColor(color: string | undefined, prefix: string): string {
  if (!color) return '';
  if (color === 'transparent') return `${prefix}-transparent`;

  const twColor = TAILWIND_COLORS[color.toLowerCase()];
  if (twColor) return `${prefix}-${twColor}`;

  // Use arbitrary value for custom colors
  return `${prefix}-[${color}]`;
}

/**
 * Convert font size to Tailwind class
 */
function toFontSize(px: number | undefined): string {
  if (!px) return '';
  const twSize = FONT_SIZE_SCALE[px];
  if (twSize) return `text-${twSize}`;
  return `text-[${px}px]`;
}

/**
 * Convert font weight to Tailwind class
 */
function toFontWeight(weight: number | string | undefined): string {
  if (!weight) return '';
  const twWeight = FONT_WEIGHT_MAP[weight];
  if (twWeight) return `font-${twWeight}`;
  return `font-[${weight}]`;
}

/**
 * Convert border radius to Tailwind class
 */
function toBorderRadius(px: number | undefined): string {
  if (px === undefined) return '';
  if (px === 0) return 'rounded-none';
  const twRadius = RADIUS_SCALE[px];
  if (twRadius === 'DEFAULT') return 'rounded';
  if (twRadius) return `rounded-${twRadius}`;
  return `rounded-[${px}px]`;
}

/**
 * Convert ElementStyles to Tailwind className string
 */
export function stylesToTailwind(styles: ElementStyles, elementType: string): string {
  const classes: string[] = [];

  // Layout
  if (styles.display === 'flex') classes.push('flex');
  if (styles.display === 'grid') classes.push('grid');
  if (styles.display === 'none') classes.push('hidden');
  if (styles.display === 'inline') classes.push('inline');
  if (styles.display === 'inline-block') classes.push('inline-block');

  // Flex direction
  if (styles.flexDirection === 'row') classes.push('flex-row');
  if (styles.flexDirection === 'column') classes.push('flex-col');
  if (styles.flexDirection === 'row-reverse') classes.push('flex-row-reverse');
  if (styles.flexDirection === 'column-reverse') classes.push('flex-col-reverse');

  // Flex wrap
  if (styles.flexWrap === 'wrap') classes.push('flex-wrap');
  if (styles.flexWrap === 'wrap-reverse') classes.push('flex-wrap-reverse');

  // Justify content
  const justifyMap: Record<string, string> = {
    'flex-start': 'justify-start', 'flex-end': 'justify-end', 'center': 'justify-center',
    'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly',
  };
  if (styles.justifyContent && justifyMap[styles.justifyContent]) {
    classes.push(justifyMap[styles.justifyContent]);
  }

  // Align items
  const alignMap: Record<string, string> = {
    'flex-start': 'items-start', 'flex-end': 'items-end', 'center': 'items-center',
    'stretch': 'items-stretch', 'baseline': 'items-baseline',
  };
  if (styles.alignItems && alignMap[styles.alignItems]) {
    classes.push(alignMap[styles.alignItems]);
  }

  // Gap
  if (styles.gap) classes.push(toSpacing(styles.gap, 'gap'));
  if (styles.rowGap) classes.push(toSpacing(styles.rowGap, 'gap-y'));
  if (styles.columnGap) classes.push(toSpacing(styles.columnGap, 'gap-x'));

  // Grid
  if (styles.gridTemplateColumns) {
    const colMatch = styles.gridTemplateColumns.match(/repeat\((\d+)/);
    if (colMatch) {
      classes.push(`grid-cols-${colMatch[1]}`);
    } else {
      classes.push(`grid-cols-[${styles.gridTemplateColumns}]`);
    }
  }

  // Padding
  if (styles.padding && !styles.paddingTop && !styles.paddingRight && !styles.paddingBottom && !styles.paddingLeft) {
    classes.push(toSpacing(styles.padding, 'p'));
  } else {
    if (styles.paddingTop) classes.push(toSpacing(styles.paddingTop, 'pt'));
    if (styles.paddingRight) classes.push(toSpacing(styles.paddingRight, 'pr'));
    if (styles.paddingBottom) classes.push(toSpacing(styles.paddingBottom, 'pb'));
    if (styles.paddingLeft) classes.push(toSpacing(styles.paddingLeft, 'pl'));
  }

  // Margin
  if (styles.margin && !styles.marginTop && !styles.marginRight && !styles.marginBottom && !styles.marginLeft) {
    classes.push(toSpacing(styles.margin, 'm'));
  } else {
    if (styles.marginTop) classes.push(toSpacing(styles.marginTop, 'mt'));
    if (styles.marginRight) classes.push(toSpacing(styles.marginRight, 'mr'));
    if (styles.marginBottom) classes.push(toSpacing(styles.marginBottom, 'mb'));
    if (styles.marginLeft) classes.push(toSpacing(styles.marginLeft, 'ml'));
  }

  // Background
  if (styles.backgroundColor) classes.push(toColor(styles.backgroundColor, 'bg'));
  if (styles.backgroundImage) {
    if (styles.backgroundImage.includes('gradient')) {
      // Try to parse gradient
      classes.push(`bg-[${styles.backgroundImage.replace(/\s+/g, '_')}]`);
    }
  }

  // Border radius
  if (styles.borderRadius !== undefined) {
    classes.push(toBorderRadius(styles.borderRadius));
  }
  // Individual corners
  if (styles.borderTopLeftRadius) classes.push(`rounded-tl-[${styles.borderTopLeftRadius}px]`);
  if (styles.borderTopRightRadius) classes.push(`rounded-tr-[${styles.borderTopRightRadius}px]`);
  if (styles.borderBottomLeftRadius) classes.push(`rounded-bl-[${styles.borderBottomLeftRadius}px]`);
  if (styles.borderBottomRightRadius) classes.push(`rounded-br-[${styles.borderBottomRightRadius}px]`);

  // Border
  if (styles.borderWidth) {
    if (styles.borderWidth === 1) classes.push('border');
    else classes.push(`border-[${styles.borderWidth}px]`);
  }
  if (styles.borderColor) classes.push(toColor(styles.borderColor, 'border'));
  if (styles.borderStyle === 'dashed') classes.push('border-dashed');
  if (styles.borderStyle === 'dotted') classes.push('border-dotted');

  // Typography
  if (styles.fontSize) classes.push(toFontSize(styles.fontSize));
  if (styles.fontWeight) classes.push(toFontWeight(styles.fontWeight));
  if (styles.color) classes.push(toColor(styles.color, 'text'));
  if (styles.textAlign === 'center') classes.push('text-center');
  if (styles.textAlign === 'right') classes.push('text-right');
  if (styles.textAlign === 'justify') classes.push('text-justify');
  if (styles.lineHeight) {
    if (styles.lineHeight === 1) classes.push('leading-none');
    else if (styles.lineHeight === 1.25) classes.push('leading-tight');
    else if (styles.lineHeight === 1.5) classes.push('leading-normal');
    else if (styles.lineHeight === 2) classes.push('leading-loose');
    else classes.push(`leading-[${styles.lineHeight}]`);
  }
  if (styles.letterSpacing) classes.push(`tracking-[${styles.letterSpacing}px]`);
  if (styles.textDecoration === 'underline') classes.push('underline');
  if (styles.textDecoration === 'line-through') classes.push('line-through');
  if (styles.textTransform === 'uppercase') classes.push('uppercase');
  if (styles.textTransform === 'lowercase') classes.push('lowercase');
  if (styles.textTransform === 'capitalize') classes.push('capitalize');
  if (styles.fontFamily) classes.push(`font-[${styles.fontFamily.replace(/\s+/g, '_')}]`);

  // Effects
  if (styles.opacity !== undefined && styles.opacity !== 1) {
    const opacityPercent = Math.round(styles.opacity * 100);
    classes.push(`opacity-${opacityPercent}`);
  }
  if (styles.boxShadow) {
    if (styles.boxShadow.includes('0 1px 2px')) classes.push('shadow-sm');
    else if (styles.boxShadow.includes('0 4px 6px')) classes.push('shadow');
    else if (styles.boxShadow.includes('0 10px 15px')) classes.push('shadow-lg');
    else if (styles.boxShadow.includes('0 25px 50px')) classes.push('shadow-2xl');
    else classes.push(`shadow-[${styles.boxShadow.replace(/\s+/g, '_')}]`);
  }

  // Overflow
  if (styles.overflow === 'hidden') classes.push('overflow-hidden');
  if (styles.overflow === 'scroll') classes.push('overflow-scroll');
  if (styles.overflow === 'auto') classes.push('overflow-auto');

  // Cursor
  if (styles.cursor === 'pointer') classes.push('cursor-pointer');
  if (styles.cursor === 'not-allowed') classes.push('cursor-not-allowed');

  // Filter out empty strings and return
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// ELEMENT TO JSX CONVERSION
// ============================================================================

/**
 * Convert element name to valid React component name
 */
function toComponentName(name: string): string {
  // Remove special characters, capitalize words
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Escape text content for JSX
 */
function escapeJsx(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;');
}

/**
 * Generate JSX for a single element
 */
function elementToJsx(
  element: CanvasElement,
  elements: Record<string, CanvasElement>,
  indent: number = 2
): string {
  const pad = ' '.repeat(indent);
  const className = stylesToTailwind(element.styles, element.type);
  const classAttr = className ? ` className="${className}"` : '';

  // Get children JSX
  const childrenJsx = element.children
    .map(childId => {
      const child = elements[childId];
      if (!child || !child.visible) return null;
      return elementToJsx(child, elements, indent + 2);
    })
    .filter(Boolean)
    .join('\n');

  switch (element.type) {
    case 'text':
      // Text elements render as paragraphs
      return `${pad}<p${classAttr}>${escapeJsx(element.content || '')}</p>`;

    case 'button':
      return `${pad}<button${classAttr}>${escapeJsx(element.content || 'Button')}</button>`;

    case 'link':
      const href = element.href || '#';
      const target = element.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `${pad}<a href="${href}"${target}${classAttr}>${escapeJsx(element.content || 'Link')}</a>`;

    case 'image':
      const src = element.src || 'https://via.placeholder.com/400x300';
      const alt = element.alt || 'Image';
      return `${pad}<img src="${src}" alt="${alt}"${classAttr} />`;

    case 'icon':
      if (element.iconName) {
        // Use Lucide icon
        const iconComponent = element.iconName.charAt(0).toUpperCase() + element.iconName.slice(1);
        const size = element.iconSize || 24;
        return `${pad}<${iconComponent} size={${size}}${classAttr} />`;
      }
      return `${pad}<span${classAttr}>*</span>`;

    case 'input':
      const inputType = element.inputType || 'text';
      const placeholder = element.placeholder ? ` placeholder="${element.placeholder}"` : '';
      const inputName = element.inputName ? ` name="${element.inputName}"` : '';
      return `${pad}<input type="${inputType}"${placeholder}${inputName}${classAttr} />`;

    case 'video':
      const videoAttrs: string[] = [];
      if (element.autoplay) videoAttrs.push('autoPlay');
      if (element.loop) videoAttrs.push('loop');
      if (element.muted) videoAttrs.push('muted');
      if (element.controls) videoAttrs.push('controls');
      const videoAttrStr = videoAttrs.length > 0 ? ' ' + videoAttrs.join(' ') : '';
      return `${pad}<video src="${element.videoSrc || ''}"${videoAttrStr}${classAttr} />`;

    case 'frame':
    case 'stack':
    case 'grid':
    case 'section':
    case 'container':
    case 'row':
    case 'page':
      // Container elements
      if (childrenJsx) {
        return `${pad}<div${classAttr}>\n${childrenJsx}\n${pad}</div>`;
      }
      return `${pad}<div${classAttr} />`;

    default:
      if (childrenJsx) {
        return `${pad}<div${classAttr}>\n${childrenJsx}\n${pad}</div>`;
      }
      return `${pad}<div${classAttr} />`;
  }
}

// ============================================================================
// FILE GENERATION
// ============================================================================

/**
 * Generate a page component file
 */
function generatePageFile(
  page: CanvasPage,
  rootElement: CanvasElement,
  elements: Record<string, CanvasElement>
): string {
  const componentName = toComponentName(page.name);
  const className = stylesToTailwind(rootElement.styles, 'page');

  // Generate children JSX
  const childrenJsx = rootElement.children
    .map(childId => {
      const child = elements[childId];
      if (!child || !child.visible) return null;
      return elementToJsx(child, elements, 6);
    })
    .filter(Boolean)
    .join('\n');

  // Collect icon imports
  const iconImports = collectIconImports(rootElement, elements);
  const iconImportLine = iconImports.length > 0
    ? `import { ${iconImports.join(', ')} } from 'lucide-react';\n`
    : '';

  return `import React from 'react';
${iconImportLine}
export default function ${componentName}() {
  return (
    <div className="${className} min-h-screen">
${childrenJsx}
    </div>
  );
}
`;
}

/**
 * Collect all Lucide icon imports needed
 */
function collectIconImports(
  element: CanvasElement,
  elements: Record<string, CanvasElement>
): string[] {
  const icons: Set<string> = new Set();

  function traverse(el: CanvasElement) {
    if (el.type === 'icon' && el.iconName) {
      const iconComponent = el.iconName.charAt(0).toUpperCase() + el.iconName.slice(1);
      icons.add(iconComponent);
    }
    el.children.forEach(childId => {
      const child = elements[childId];
      if (child) traverse(child);
    });
  }

  traverse(element);
  return Array.from(icons);
}

/**
 * Generate App.tsx with page imports and routing
 */
function generateAppFile(pages: Record<string, CanvasPage>): string {
  const pageEntries = Object.values(pages);

  if (pageEntries.length === 1) {
    // Single page - no routing needed
    const page = pageEntries[0];
    const componentName = toComponentName(page.name);
    return `import React from 'react';
import ${componentName} from './pages/${componentName}';

export default function App() {
  return <${componentName} />;
}
`;
  }

  // Multiple pages - use simple state-based navigation
  const imports = pageEntries
    .map(page => {
      const name = toComponentName(page.name);
      return `import ${name} from './pages/${name}';`;
    })
    .join('\n');

  const pageComponents = pageEntries.map(page => toComponentName(page.name));
  const firstPage = pageComponents[0];

  return `import React, { useState } from 'react';
${imports}

const pages = {
${pageComponents.map(name => `  '${name}': ${name},`).join('\n')}
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<keyof typeof pages>('${firstPage}');
  const PageComponent = pages[currentPage];

  return (
    <div>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b z-50">
        <div className="flex gap-4 p-4">
${pageComponents.map(name => `          <button
            onClick={() => setCurrentPage('${name}')}
            className={\`px-4 py-2 rounded-lg transition-colors \${currentPage === '${name}' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}\`}
          >
            ${name}
          </button>`).join('\n')}
        </div>
      </nav>

      {/* Page Content */}
      <main className="pt-16">
        <PageComponent />
      </main>
    </div>
  );
}
`;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Generate all React code files from canvas state
 */
export function generateReactCode(
  elements: Record<string, CanvasElement>,
  pages: Record<string, CanvasPage>,
  options: GenerateOptions = {}
): GeneratedFiles {
  const files: GeneratedFiles = {};

  // Generate page files
  for (const page of Object.values(pages)) {
    const rootElement = elements[page.rootElementId];
    if (!rootElement) continue;

    const componentName = toComponentName(page.name);
    const filePath = `src/pages/${componentName}.tsx`;
    files[filePath] = generatePageFile(page, rootElement, elements);
  }

  // Generate App.tsx
  files['src/App.tsx'] = generateAppFile(pages);

  // Generate index.css with Tailwind
  files['src/index.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  // Generate main.tsx
  files['src/main.tsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  return files;
}

/**
 * Generate code for a single element (useful for preview)
 */
export function generateElementCode(
  element: CanvasElement,
  elements: Record<string, CanvasElement>
): string {
  return elementToJsx(element, elements, 0);
}
