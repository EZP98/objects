/**
 * Framer Import Service
 *
 * Fetches published Framer sites and converts them to canvas elements.
 * Parses HTML/CSS to extract layout, styles, typography, and images.
 * Works with any Framer published URL.
 */

import { CanvasElement, ElementType, ElementStyles, Size, Position } from '../canvas/types';

// ============================================================================
// Types
// ============================================================================

interface FramerImportResult {
  success: boolean;
  elements: Record<string, CanvasElement>;
  rootId: string;
  rootName?: string;
  rootSize?: Size;
  error?: string;
  elementCount?: number;
}

interface ParsedElement {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  children: ParsedElement[];
  styles: Record<string, string>;
  attributes: Record<string, string>;
  rect: { x: number; y: number; width: number; height: number };
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate and normalize Framer URL
 */
export function parseFramerUrl(url: string): { url: string; isValid: boolean } {
  try {
    const urlObj = new URL(url);

    // Check if it's a Framer URL
    const isFramer =
      urlObj.hostname.endsWith('.framer.app') ||
      urlObj.hostname.endsWith('.framer.website') ||
      urlObj.hostname.endsWith('.framer.photos') ||
      urlObj.hostname.includes('framer');

    // Also accept any URL for general website import
    return { url: urlObj.href, isValid: true };
  } catch {
    return { url: '', isValid: false };
  }
}

// ============================================================================
// Style Parsing Utilities
// ============================================================================

/**
 * Parse color value to standard format
 */
function parseColor(color: string): string | undefined {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
    return undefined;
  }
  return color;
}

/**
 * Parse pixel value to number
 */
function parsePx(value: string): number | undefined {
  if (!value || value === 'auto' || value === 'none') return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse font weight string to number
 */
function parseFontWeight(weight: string): number | undefined {
  const weightMap: Record<string, number> = {
    'normal': 400,
    'bold': 700,
    'lighter': 300,
    'bolder': 700,
    '100': 100, '200': 200, '300': 300, '400': 400,
    '500': 500, '600': 600, '700': 700, '800': 800, '900': 900,
  };
  return weightMap[weight] || parsePx(weight);
}

/**
 * Parse text alignment
 */
function parseTextAlign(align: string): 'left' | 'center' | 'right' | 'justify' | undefined {
  const validAligns = ['left', 'center', 'right', 'justify'];
  return validAligns.includes(align) ? align as any : undefined;
}

/**
 * Extract border properties from computed styles
 */
function parseBorder(styles: Record<string, string>): Partial<ElementStyles> {
  const result: Partial<ElementStyles> = {};

  const borderWidth = parsePx(styles.borderWidth || styles.borderTopWidth);
  const borderColor = parseColor(styles.borderColor || styles.borderTopColor);
  const borderStyle = styles.borderStyle || styles.borderTopStyle;

  if (borderWidth && borderWidth > 0 && borderStyle !== 'none') {
    result.borderWidth = borderWidth;
    result.borderColor = borderColor;
    result.borderStyle = borderStyle as any || 'solid';
  }

  // Border radius
  const borderRadius = parsePx(styles.borderRadius);
  if (borderRadius) {
    result.borderRadius = borderRadius;
  }

  // Individual corner radii
  const tlr = parsePx(styles.borderTopLeftRadius);
  const trr = parsePx(styles.borderTopRightRadius);
  const brr = parsePx(styles.borderBottomRightRadius);
  const blr = parsePx(styles.borderBottomLeftRadius);

  if (tlr !== brr || trr !== blr || tlr !== trr) {
    result.borderTopLeftRadius = tlr;
    result.borderTopRightRadius = trr;
    result.borderBottomRightRadius = brr;
    result.borderBottomLeftRadius = blr;
  }

  return result;
}

/**
 * Extract shadow from box-shadow property
 */
function parseBoxShadow(boxShadow: string): string | undefined {
  if (!boxShadow || boxShadow === 'none') return undefined;
  return boxShadow;
}

/**
 * Extract background properties
 */
function parseBackground(styles: Record<string, string>): Partial<ElementStyles> {
  const result: Partial<ElementStyles> = {};

  const bgColor = parseColor(styles.backgroundColor);
  if (bgColor) {
    result.backgroundColor = bgColor;
  }

  const bgImage = styles.backgroundImage;
  if (bgImage && bgImage !== 'none') {
    result.backgroundImage = bgImage;
    result.backgroundSize = styles.backgroundSize || 'cover';
    result.backgroundPosition = styles.backgroundPosition || 'center';
    result.backgroundRepeat = styles.backgroundRepeat as any;
  }

  return result;
}

/**
 * Extract flexbox/grid layout properties
 */
function parseLayout(styles: Record<string, string>): Partial<ElementStyles> {
  const result: Partial<ElementStyles> = {};

  const display = styles.display;
  if (display === 'flex' || display === 'inline-flex') {
    result.display = 'flex';
    result.flexDirection = styles.flexDirection as any || 'row';
    result.justifyContent = styles.justifyContent as any;
    result.alignItems = styles.alignItems as any;
    result.flexWrap = styles.flexWrap as any;

    const gap = parsePx(styles.gap);
    if (gap) result.gap = gap;

    const rowGap = parsePx(styles.rowGap);
    const columnGap = parsePx(styles.columnGap);
    if (rowGap) result.rowGap = rowGap;
    if (columnGap) result.columnGap = columnGap;
  } else if (display === 'grid' || display === 'inline-grid') {
    result.display = 'grid';
    result.gridTemplateColumns = styles.gridTemplateColumns;
    result.gridTemplateRows = styles.gridTemplateRows;

    const gap = parsePx(styles.gap);
    if (gap) result.gap = gap;
  }

  return result;
}

/**
 * Extract padding and margin
 */
function parseSpacing(styles: Record<string, string>): Partial<ElementStyles> {
  const result: Partial<ElementStyles> = {};

  // Padding
  const pt = parsePx(styles.paddingTop);
  const pr = parsePx(styles.paddingRight);
  const pb = parsePx(styles.paddingBottom);
  const pl = parsePx(styles.paddingLeft);

  if (pt) result.paddingTop = pt;
  if (pr) result.paddingRight = pr;
  if (pb) result.paddingBottom = pb;
  if (pl) result.paddingLeft = pl;

  // Margin (less common in design tools but useful)
  const mt = parsePx(styles.marginTop);
  const mr = parsePx(styles.marginRight);
  const mb = parsePx(styles.marginBottom);
  const ml = parsePx(styles.marginLeft);

  if (mt) result.marginTop = mt;
  if (mr) result.marginRight = mr;
  if (mb) result.marginBottom = mb;
  if (ml) result.marginLeft = ml;

  return result;
}

/**
 * Extract typography properties
 */
function parseTypography(styles: Record<string, string>): Partial<ElementStyles> {
  const result: Partial<ElementStyles> = {};

  // Font family - clean up quotes
  const fontFamily = styles.fontFamily;
  if (fontFamily) {
    result.fontFamily = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
  }

  const fontSize = parsePx(styles.fontSize);
  if (fontSize) result.fontSize = fontSize;

  const fontWeight = parseFontWeight(styles.fontWeight);
  if (fontWeight) result.fontWeight = fontWeight;

  const lineHeight = parsePx(styles.lineHeight);
  const fontSizeNum = fontSize || 16;
  if (lineHeight) {
    // Store as ratio
    result.lineHeight = lineHeight / fontSizeNum;
  }

  const letterSpacing = parsePx(styles.letterSpacing);
  if (letterSpacing) result.letterSpacing = letterSpacing;

  const textAlign = parseTextAlign(styles.textAlign);
  if (textAlign) result.textAlign = textAlign;

  const textDecoration = styles.textDecorationLine || styles.textDecoration;
  if (textDecoration && textDecoration !== 'none') {
    result.textDecoration = textDecoration.includes('underline') ? 'underline' :
                           textDecoration.includes('line-through') ? 'line-through' : undefined;
  }

  const textTransform = styles.textTransform;
  if (textTransform && textTransform !== 'none') {
    result.textTransform = textTransform as any;
  }

  const color = parseColor(styles.color);
  if (color) result.color = color;

  return result;
}

/**
 * Convert computed styles to ElementStyles
 */
function convertStylesToElementStyles(styles: Record<string, string>, isText: boolean = false): ElementStyles {
  const result: ElementStyles = {
    ...parseBackground(styles),
    ...parseBorder(styles),
    ...parseLayout(styles),
    ...parseSpacing(styles),
    ...parseTypography(styles),
  };

  // Box shadow
  const boxShadow = parseBoxShadow(styles.boxShadow);
  if (boxShadow) result.boxShadow = boxShadow;

  // Opacity
  const opacity = parseFloat(styles.opacity);
  if (!isNaN(opacity) && opacity < 1) {
    result.opacity = opacity;
  }

  // Overflow
  if (styles.overflow === 'hidden' || styles.overflowX === 'hidden' || styles.overflowY === 'hidden') {
    result.overflow = 'hidden';
  }

  // For text elements, remove background (text doesn't have background in design tools)
  if (isText) {
    delete result.backgroundColor;
    delete result.backgroundImage;
  }

  // Clean up undefined values
  Object.keys(result).forEach(key => {
    if (result[key as keyof ElementStyles] === undefined) {
      delete result[key as keyof ElementStyles];
    }
  });

  return result;
}

// ============================================================================
// Element Type Detection
// ============================================================================

/**
 * Determine element type from HTML element
 */
function detectElementType(el: ParsedElement): ElementType {
  const tag = el.tagName.toLowerCase();
  const className = el.className.toLowerCase();

  // Images
  if (tag === 'img' || tag === 'picture' || tag === 'svg') {
    return 'image';
  }

  // Check for background image
  if (el.styles.backgroundImage && el.styles.backgroundImage !== 'none') {
    const hasOnlyBgImage = !el.textContent.trim() && el.children.length === 0;
    if (hasOnlyBgImage) return 'image';
  }

  // Text elements
  if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'a'].includes(tag)) {
    if (el.textContent.trim() && el.children.length === 0) {
      return 'text';
    }
  }

  // Buttons
  if (tag === 'button' || (tag === 'a' && className.includes('button'))) {
    return 'button';
  }

  // Inputs
  if (tag === 'input' || tag === 'textarea') {
    return 'input';
  }

  // Links
  if (tag === 'a') {
    return 'link';
  }

  // Videos
  if (tag === 'video' || tag === 'iframe') {
    return 'video';
  }

  // Default to frame (container)
  return 'frame';
}

/**
 * Generate element name based on type and content
 */
function generateElementName(type: ElementType, el: ParsedElement): string {
  const tag = el.tagName.toLowerCase();

  // Use meaningful names based on content
  if (type === 'text' && el.textContent.trim()) {
    const text = el.textContent.trim().slice(0, 20);
    return text + (el.textContent.trim().length > 20 ? '...' : '');
  }

  // Use class name if meaningful
  if (el.className) {
    const classes = el.className.split(' ').filter(c =>
      !c.startsWith('framer-') &&
      !c.startsWith('css-') &&
      c.length < 30
    );
    if (classes.length > 0) {
      return classes[0];
    }
  }

  // Use tag-based name
  const nameMap: Record<string, string> = {
    'header': 'Header',
    'nav': 'Navigation',
    'main': 'Main',
    'section': 'Section',
    'article': 'Article',
    'aside': 'Sidebar',
    'footer': 'Footer',
    'div': 'Frame',
    'h1': 'Heading',
    'h2': 'Heading',
    'h3': 'Heading',
    'p': 'Paragraph',
    'img': 'Image',
    'button': 'Button',
    'a': 'Link',
    'input': 'Input',
  };

  return nameMap[tag] || type.charAt(0).toUpperCase() + type.slice(1);
}

// ============================================================================
// HTML Parsing (via proxy/API)
// ============================================================================

/**
 * Fetch and parse HTML from URL using a CORS proxy
 */
async function fetchAndParseHTML(url: string): Promise<{ html: string; baseUrl: string }> {
  // Try multiple CORS proxies
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  let lastError: Error | null = null;

  for (const proxyFn of proxies) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      if (!html || html.length < 100) {
        throw new Error('Empty or invalid response');
      }

      return { html, baseUrl: url };
    } catch (error) {
      lastError = error as Error;
      console.warn(`Proxy failed:`, error);
      continue;
    }
  }

  throw new Error(`Failed to fetch URL: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Parse HTML string and extract element tree with computed styles
 * This runs in an iframe to isolate styles
 */
async function parseHTMLToElements(html: string, baseUrl: string): Promise<ParsedElement[]> {
  return new Promise((resolve, reject) => {
    // Create hidden iframe for parsing
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1440px; height: 900px; visibility: hidden;';
    document.body.appendChild(iframe);

    const cleanup = () => {
      document.body.removeChild(iframe);
    };

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) throw new Error('Could not access iframe document');

        // Wait for styles to load
        setTimeout(() => {
          try {
            const body = doc.body;
            if (!body) throw new Error('No body element found');

            // Find the main content container
            let rootElement = body.querySelector('main') ||
                             body.querySelector('[class*="framer"]') ||
                             body.querySelector('div') ||
                             body;

            // Parse elements recursively
            const elements = parseElementRecursive(rootElement as HTMLElement, doc.defaultView!);

            cleanup();
            resolve(elements);
          } catch (error) {
            cleanup();
            reject(error);
          }
        }, 1000); // Wait for CSS to load

      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error('Failed to load iframe'));
    };

    // Write HTML to iframe
    iframe.srcdoc = html;
  });
}

/**
 * Recursively parse DOM element to ParsedElement
 */
function parseElementRecursive(el: HTMLElement, window: Window, depth: number = 0): ParsedElement[] {
  if (depth > 20) return []; // Prevent infinite recursion

  const results: ParsedElement[] = [];

  // Skip hidden elements, scripts, styles, etc.
  const tag = el.tagName?.toLowerCase();
  if (!tag || ['script', 'style', 'noscript', 'meta', 'link', 'head'].includes(tag)) {
    return results;
  }

  const computedStyle = window.getComputedStyle(el);

  // Skip invisible elements
  if (computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden' ||
      (computedStyle.opacity === '0' && !el.children.length)) {
    return results;
  }

  const rect = el.getBoundingClientRect();

  // Skip elements with no size (but allow text elements)
  if (rect.width < 1 && rect.height < 1 && tag !== 'span') {
    return results;
  }

  // Extract relevant styles
  const styles: Record<string, string> = {};
  const styleProps = [
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'gap', 'rowGap', 'columnGap',
    'gridTemplateColumns', 'gridTemplateRows',
    'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign',
    'textDecoration', 'textDecorationLine', 'textTransform',
    'borderWidth', 'borderTopWidth', 'borderColor', 'borderTopColor', 'borderStyle', 'borderTopStyle',
    'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'boxShadow', 'opacity', 'overflow', 'overflowX', 'overflowY',
  ];

  for (const prop of styleProps) {
    const value = computedStyle.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
    if (value) styles[prop] = value;
  }

  // Get direct text content (not from children)
  let textContent = '';
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += node.textContent || '';
    }
  }
  textContent = textContent.trim();

  // Get attributes
  const attributes: Record<string, string> = {};
  if (tag === 'img') {
    attributes.src = el.getAttribute('src') || '';
    attributes.alt = el.getAttribute('alt') || '';
  }
  if (tag === 'a') {
    attributes.href = el.getAttribute('href') || '';
  }

  // Parse children
  const children: ParsedElement[] = [];
  for (const child of el.children) {
    if (child instanceof HTMLElement) {
      const childElements = parseElementRecursive(child, window, depth + 1);
      children.push(...childElements);
    }
  }

  const parsed: ParsedElement = {
    tagName: tag,
    id: el.id || '',
    className: el.className || '',
    textContent,
    children,
    styles,
    attributes,
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };

  results.push(parsed);

  return results;
}

// ============================================================================
// Conversion to Canvas Elements
// ============================================================================

/**
 * Convert parsed elements to canvas elements
 */
function convertToCanvasElements(
  parsedElements: ParsedElement[],
  parentId: string | null,
  parentRect: { x: number; y: number } | null,
  idCounter: { value: number },
  elements: Record<string, CanvasElement>
): string | null {
  if (parsedElements.length === 0) return null;

  let rootId: string | null = null;

  for (const parsed of parsedElements) {
    const id = `framer-${idCounter.value++}`;
    if (!rootId) rootId = id;

    const type = detectElementType(parsed);
    const name = generateElementName(type, parsed);

    // Calculate position relative to parent
    const position: Position = {
      x: parentRect ? parsed.rect.x - parentRect.x : parsed.rect.x,
      y: parentRect ? parsed.rect.y - parentRect.y : parsed.rect.y,
    };

    const size: Size = {
      width: Math.max(1, parsed.rect.width),
      height: Math.max(1, parsed.rect.height),
    };

    // Convert styles
    const isText = type === 'text';
    const styles = convertStylesToElementStyles(parsed.styles, isText);

    // Create element
    const element: CanvasElement = {
      id,
      type,
      name,
      position,
      size,
      positionType: parentId ? 'relative' : 'absolute',
      styles,
      content: isText ? parsed.textContent : undefined,
      src: type === 'image' ? (parsed.attributes.src || extractBackgroundImageUrl(parsed.styles.backgroundImage)) : undefined,
      parentId,
      children: [],
      locked: false,
      visible: true,
    };

    elements[id] = element;

    // Process children
    if (parsed.children.length > 0) {
      for (const child of parsed.children) {
        const childId = convertToCanvasElements(
          [child],
          id,
          parsed.rect,
          idCounter,
          elements
        );
        if (childId) {
          element.children.push(childId);
        }
      }
    }
  }

  return rootId;
}

/**
 * Extract URL from background-image CSS value
 */
function extractBackgroundImageUrl(bgImage?: string): string | undefined {
  if (!bgImage || bgImage === 'none') return undefined;

  const match = bgImage.match(/url\(['"]?([^'")\s]+)['"]?\)/);
  return match ? match[1] : undefined;
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Import a Framer (or any website) design into canvas elements
 */
export async function importFromFramer(url: string): Promise<FramerImportResult> {
  try {
    // Validate URL
    const parsed = parseFramerUrl(url);
    if (!parsed.isValid) {
      return {
        success: false,
        elements: {},
        rootId: '',
        error: 'Invalid URL. Please enter a valid website URL.',
      };
    }

    console.log('[FramerImport] Fetching URL:', parsed.url);

    // Fetch HTML
    const { html, baseUrl } = await fetchAndParseHTML(parsed.url);
    console.log('[FramerImport] Fetched HTML, length:', html.length);

    // Parse HTML to element tree
    const parsedElements = await parseHTMLToElements(html, baseUrl);
    console.log('[FramerImport] Parsed elements:', parsedElements.length);

    if (parsedElements.length === 0) {
      return {
        success: false,
        elements: {},
        rootId: '',
        error: 'No elements found on the page. The page might be using client-side rendering.',
      };
    }

    // Convert to canvas elements
    const elements: Record<string, CanvasElement> = {};
    const idCounter = { value: 1 };
    const rootId = convertToCanvasElements(parsedElements, null, null, idCounter, elements);

    if (!rootId) {
      return {
        success: false,
        elements: {},
        rootId: '',
        error: 'Failed to convert elements.',
      };
    }

    // Get root element info
    const rootElement = elements[rootId];
    const rootName = new URL(parsed.url).hostname.replace('www.', '').split('.')[0] || 'Import';
    const rootSize = rootElement?.size || { width: 1440, height: 900 };

    console.log('[FramerImport] Converted elements:', Object.keys(elements).length);

    return {
      success: true,
      elements,
      rootId,
      rootName: rootName.charAt(0).toUpperCase() + rootName.slice(1),
      rootSize,
      elementCount: Object.keys(elements).length,
    };
  } catch (error) {
    console.error('[FramerImport] Error:', error);
    return {
      success: false,
      elements: {},
      rootId: '',
      error: error instanceof Error ? error.message : 'Failed to import from URL',
    };
  }
}

/**
 * Save preferred proxy to localStorage
 */
export function savePreferredProxy(proxy: string): void {
  localStorage.setItem('framer-import-proxy', proxy);
}

/**
 * Get preferred proxy from localStorage
 */
export function getPreferredProxy(): string | null {
  return localStorage.getItem('framer-import-proxy');
}
