/**
 * Canvas Store
 *
 * State management for the visual canvas.
 * Handles elements, selection, history.
 * Automatically persists to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  CanvasState,
  CanvasElement,
  CanvasPage,
  ElementType,
  Position,
  Size,
  DEFAULT_ELEMENT_CONFIGS,
  ElementStyles,
} from './types';
import { Variant, Interaction, Animation } from './interactions';
import { ResponsiveStyles } from './responsive';
import { BLOCK_TEMPLATES, BlockChild } from './blockTemplates';

// Generate unique IDs
let idCounter = 0;
export function generateId(prefix: string = 'el'): string {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

// Initial state
function createInitialState(): CanvasState {
  const pageId = generateId('page');
  const rootId = generateId('root');

  const rootElement: CanvasElement = {
    id: rootId,
    type: 'page',
    name: 'Page 1',
    position: { x: 0, y: 0 },
    size: { width: 1440, height: 900 },
    positionType: 'relative',
    styles: { backgroundColor: '#ffffff' },
    parentId: null,
    children: [],
    locked: false,
    visible: true,
  };

  const page: CanvasPage = {
    id: pageId,
    name: 'Page 1',
    rootElementId: rootId,
    backgroundColor: '#ffffff',
    width: 1440,
    height: 900,
    x: 0,
    y: 0,
  };

  return {
    projectName: 'Nuovo Progetto',
    pages: { [pageId]: page },
    elements: { [rootId]: rootElement },
    currentPageId: pageId,
    selectedElementIds: [],
    hoveredElementId: null,
    clipboard: null,
    history: [],
    historyIndex: -1,
  };
}

interface CanvasActions {
  // Element operations
  addElement: (type: ElementType, parentId?: string, position?: Position) => string;
  addBlock: (blockId: string, parentId?: string) => string;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  moveElement: (elementId: string, position: Position) => void;
  resizeElement: (elementId: string, size: Size) => void;
  updateElementStyles: (elementId: string, styles: Partial<ElementStyles>) => void;
  updateElementContent: (elementId: string, content: string) => void;
  renameElement: (elementId: string, name: string) => void;
  reparentElement: (elementId: string, newParentId: string) => void;

  // Selection
  selectElement: (elementId: string, addToSelection?: boolean) => void;
  deselectAll: () => void;
  selectAll: () => void;
  setHoveredElement: (elementId: string | null) => void;

  // Visibility & Lock
  toggleVisibility: (elementId: string) => void;
  toggleLock: (elementId: string) => void;

  // Project
  setProjectName: (name: string) => void;

  // Page operations
  addPage: () => string;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => string | null;
  renamePage: (pageId: string, name: string) => void;
  setCurrentPage: (pageId: string) => void;
  movePagePosition: (pageId: string, position: Position) => void;
  updatePageNotes: (pageId: string, notes: string) => void;

  // Clipboard
  copy: () => void;
  paste: (position?: Position) => void;
  cut: () => void;

  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: (action: string) => void;
  saveInitialState: () => void;

  // Bulk operations
  getElement: (elementId: string) => CanvasElement | undefined;
  getCurrentPage: () => CanvasPage | undefined;
  getRootElement: () => CanvasElement | undefined;
  getSelectedElements: () => CanvasElement[];
  getElementChildren: (elementId: string) => CanvasElement[];

  // Frame/Group operations (Figma-style)
  wrapInFrame: () => string | null;
  groupElements: () => string | null;
  ungroupElements: () => void;

  // Variants (hover, active, focus, disabled, custom states)
  addVariant: (elementId: string, variant: Variant) => void;
  updateVariant: (elementId: string, variantId: string, updates: Partial<Variant>) => void;
  deleteVariant: (elementId: string, variantId: string) => void;
  setVariants: (elementId: string, variants: Variant[]) => void;

  // Interactions
  addInteraction: (elementId: string, interaction: Interaction) => void;
  updateInteraction: (elementId: string, interactionId: string, updates: Partial<Interaction>) => void;
  deleteInteraction: (elementId: string, interactionId: string) => void;
  setInteractions: (elementId: string, interactions: Interaction[]) => void;

  // Animations
  addAnimation: (elementId: string, animation: Animation) => void;
  updateAnimation: (elementId: string, animationId: string, updates: Partial<Animation>) => void;
  deleteAnimation: (elementId: string, animationId: string) => void;
  setAnimations: (elementId: string, animations: Animation[]) => void;

  // Responsive styles
  setResponsiveStyles: (elementId: string, breakpointId: string, styles: Partial<ElementStyles>) => void;
  clearResponsiveStyles: (elementId: string, breakpointId: string) => void;
  getStylesForBreakpoint: (elementId: string, breakpointId: string) => ElementStyles;

  // Figma import
  importFigmaDesign: (elements: Record<string, CanvasElement>, rootId: string, rootName: string, rootSize: Size) => string;

  // Reset
  reset: () => void;
}

// Current project ID for storage scoping
let currentProjectId: string | null = null;

export function setCurrentProjectId(projectId: string | null) {
  currentProjectId = projectId;
}

export function getCurrentProjectId(): string | null {
  return currentProjectId;
}

// Generate a comprehensive thumbnail preview from canvas state
export function generateCanvasThumbnail(state: Partial<CanvasState>): string | null {
  if (!state.pages || !state.elements) return null;

  try {
    const firstPage = Object.values(state.pages)[0];
    if (!firstPage) return null;

    const rootElement = state.elements[firstPage.rootElementId];
    if (!rootElement) return null;

    // Get all visible elements with their full info
    const visibleElements: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      type: string;
      backgroundColor?: string;
      backgroundImage?: string;
      borderColor?: string;
      borderWidth?: number;
      borderRadius?: number;
      color?: string;
      fontSize?: number;
      fontWeight?: number;
      content?: string;
      src?: string;
    }> = [];

    const collectElements = (elementId: string, offsetX: number = 0, offsetY: number = 0) => {
      const el = state.elements![elementId];
      if (!el || el.visible === false) return;

      const x = offsetX + (el.position?.x || 0);
      const y = offsetY + (el.position?.y || 0);

      // Add this element
      visibleElements.push({
        x,
        y,
        width: el.size?.width || 100,
        height: el.size?.height || 100,
        type: el.type,
        backgroundColor: el.styles?.backgroundColor,
        backgroundImage: el.styles?.backgroundImage,
        borderColor: el.styles?.borderColor,
        borderWidth: el.styles?.borderWidth,
        borderRadius: el.styles?.borderRadius,
        color: el.styles?.color,
        fontSize: el.styles?.fontSize,
        fontWeight: el.styles?.fontWeight,
        content: el.content,
        src: el.src,
      });

      // Process children
      if (el.children) {
        el.children.forEach(childId => collectElements(childId, x, y));
      }
    };

    // Collect all elements starting from root's children
    rootElement.children?.forEach(childId => collectElements(childId, 0, 0));

    // Generate SVG thumbnail
    const pageWidth = firstPage.width || 1440;
    const pageHeight = firstPage.height || 900;
    const scale = 200 / Math.max(pageWidth, pageHeight);
    const bgColor = rootElement.styles?.backgroundColor || '#ffffff';

    // Escape text content for SVG
    const escapeXml = (text: string) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="${Math.round(pageHeight * scale)}" viewBox="0 0 ${pageWidth} ${pageHeight}">`;

    // Add defs for patterns
    svgContent += `<defs>`;
    svgContent += `<pattern id="imgPattern" patternUnits="userSpaceOnUse" width="20" height="20">`;
    svgContent += `<rect width="20" height="20" fill="#e8e8e8"/>`;
    svgContent += `<rect width="10" height="10" fill="#d8d8d8"/>`;
    svgContent += `<rect x="10" y="10" width="10" height="10" fill="#d8d8d8"/>`;
    svgContent += `</pattern>`;
    svgContent += `</defs>`;

    svgContent += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

    // If empty canvas, add a placeholder icon
    if (visibleElements.length === 0) {
      const iconSize = Math.min(pageWidth, pageHeight) * 0.15;
      const cx = pageWidth / 2;
      const cy = pageHeight / 2;
      svgContent += `<g opacity="0.15" transform="translate(${cx - iconSize}, ${cy - iconSize})">`;
      svgContent += `<rect width="${iconSize * 2}" height="${iconSize * 2}" rx="8" fill="none" stroke="#888" stroke-width="3"/>`;
      svgContent += `<line x1="${iconSize * 0.4}" y1="${iconSize}" x2="${iconSize * 1.6}" y2="${iconSize}" stroke="#888" stroke-width="2"/>`;
      svgContent += `<line x1="${iconSize}" y1="${iconSize * 0.4}" x2="${iconSize}" y2="${iconSize * 1.6}" stroke="#888" stroke-width="2"/>`;
      svgContent += `</g>`;
    }

    visibleElements.forEach(el => {
      const rx = el.borderRadius || 0;
      const hasBg = el.backgroundColor && el.backgroundColor !== 'transparent';
      const hasBgImage = el.backgroundImage && el.backgroundImage !== 'none';
      const hasBorder = el.borderColor && el.borderWidth && el.borderWidth > 0;

      // Draw rectangle for containers, frames, boxes
      if (el.type === 'box' || el.type === 'frame' || el.type === 'container' || el.type === 'page' || el.type === 'section') {
        if (hasBg || hasBorder || hasBgImage) {
          svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" `;
          if (hasBgImage) {
            svgContent += `fill="url(#imgPattern)" `;
          } else {
            svgContent += hasBg ? `fill="${el.backgroundColor}" ` : 'fill="none" ';
          }
          if (hasBorder) {
            svgContent += `stroke="${el.borderColor}" stroke-width="${el.borderWidth}"`;
          }
          svgContent += `/>`;
        }
      }

      // Draw text elements with actual text content
      if (el.type === 'text' || el.type === 'heading' || el.type === 'paragraph') {
        const textColor = el.color || '#333333';
        const fontSize = el.fontSize || 16;
        const fontWeight = el.fontWeight || 400;

        if (el.content) {
          // Render actual text
          const text = el.content.substring(0, 150);
          const lines = text.split('\n').slice(0, 5);

          lines.forEach((line, i) => {
            const truncatedLine = line.length > 60 ? line.substring(0, 60) + '...' : line;
            const lineY = el.y + fontSize + (i * fontSize * 1.4);
            if (lineY < el.y + el.height + fontSize) {
              svgContent += `<text x="${el.x}" y="${lineY}" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${textColor}">`;
              svgContent += escapeXml(truncatedLine);
              svgContent += `</text>`;
            }
          });
        } else {
          // Fallback: draw lines for text placeholder
          const lineHeight = Math.min(el.height, fontSize);
          const numLines = Math.min(Math.floor(el.height / (lineHeight + 4)), 3);
          for (let i = 0; i < numLines; i++) {
            const lineWidth = el.width * (i === numLines - 1 ? 0.6 : 0.85);
            svgContent += `<rect x="${el.x}" y="${el.y + i * (lineHeight + 6)}" width="${lineWidth}" height="${lineHeight * 0.5}" rx="2" fill="${textColor}" opacity="0.4"/>`;
          }
        }
      }

      // Draw images with checkered pattern placeholder (CORS prevents external images)
      if (el.type === 'image') {
        svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="url(#imgPattern)"/>`;
        // Add image icon in center
        const iconSize = Math.min(el.width, el.height) * 0.2;
        const iconX = el.x + (el.width - iconSize) / 2;
        const iconY = el.y + (el.height - iconSize) / 2;
        svgContent += `<g transform="translate(${iconX}, ${iconY})" opacity="0.35">`;
        svgContent += `<rect width="${iconSize}" height="${iconSize * 0.75}" rx="4" fill="#999"/>`;
        svgContent += `<circle cx="${iconSize * 0.3}" cy="${iconSize * 0.25}" r="${iconSize * 0.12}" fill="#ccc"/>`;
        svgContent += `<polygon points="0,${iconSize * 0.75} ${iconSize * 0.4},${iconSize * 0.35} ${iconSize * 0.7},${iconSize * 0.55} ${iconSize},${iconSize * 0.3} ${iconSize},${iconSize * 0.75}" fill="#777"/>`;
        svgContent += `</g>`;
      }

      // Draw button with background
      if (el.type === 'button') {
        const btnBgColor = el.backgroundColor || '#3b82f6';
        svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx || 6}" fill="${btnBgColor}"/>`;
        if (el.content) {
          const btnFontSize = el.fontSize || 14;
          svgContent += `<text x="${el.x + el.width / 2}" y="${el.y + el.height / 2 + btnFontSize * 0.35}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${btnFontSize}" fill="${el.color || '#ffffff'}">${escapeXml(el.content)}</text>`;
        }
      }

      // Draw input field
      if (el.type === 'input') {
        const inputBgColor = el.backgroundColor || '#ffffff';
        svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx || 4}" fill="${inputBgColor}" stroke="#ddd" stroke-width="1"/>`;
      }

      // Generic element with background (fallback)
      if (!['box', 'frame', 'container', 'page', 'section', 'text', 'heading', 'paragraph', 'image', 'button', 'input'].includes(el.type)) {
        if (hasBg) {
          svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="${el.backgroundColor}"/>`;
        }
      }
    });

    svgContent += '</svg>';

    // Convert to data URL
    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  } catch (e) {
    console.error('Error generating thumbnail:', e);
    return null;
  }
}

// Save project to the recent projects list
export function saveProjectToRecents(projectId: string, projectName: string = 'Progetto senza titolo', thumbnail?: string | null) {
  if (!projectId || projectId === 'new') return;

  try {
    const stored = localStorage.getItem('objects-saved-projects');
    const projects = stored ? JSON.parse(stored) : [];
    console.log('[CanvasStore] Saving project to recents:', { projectId, projectName, hasThumbnail: !!thumbnail });

    // Find existing project or create new one
    const existingIndex = projects.findIndex((p: any) => p.id === projectId);

    const projectData: {
      id: string;
      name: string;
      updatedAt: string;
      type: 'canvas';
      thumbnail?: string;
    } = {
      id: projectId,
      name: projectName,
      updatedAt: new Date().toISOString(),
      type: 'canvas' as const,
    };

    // Only set thumbnail if we have a valid one - preserve existing otherwise
    if (thumbnail) {
      projectData.thumbnail = thumbnail;
    } else if (existingIndex >= 0 && projects[existingIndex].thumbnail) {
      projectData.thumbnail = projects[existingIndex].thumbnail;
    }

    if (existingIndex >= 0) {
      projects[existingIndex] = projectData;
    } else {
      projects.unshift(projectData);
    }

    // Keep only last 20 projects
    const trimmed = projects.slice(0, 20);
    localStorage.setItem('objects-saved-projects', JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving project to recents:', e);
  }
}

// Load canvas state for a specific project
export function loadProjectCanvasState(projectId: string): Partial<CanvasState> | null {
  if (!projectId || projectId === 'new') return null;

  try {
    const stored = localStorage.getItem(`objects-canvas-${projectId}`);
    if (stored) {
      const data = JSON.parse(stored);
      return data.state || null;
    }
  } catch (e) {
    console.error('Error loading project canvas state:', e);
  }
  return null;
}

// Save canvas state for a specific project
export function saveProjectCanvasState(projectId: string, state: Partial<CanvasState>) {
  if (!projectId || projectId === 'new') return;

  try {
    const data = {
      state: {
        projectName: state.projectName,
        pages: state.pages,
        elements: state.elements,
        currentPageId: state.currentPageId,
      },
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`objects-canvas-${projectId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving project canvas state:', e);
  }
}

export const useCanvasStore = create<CanvasState & CanvasActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

  // Add element
  addElement: (type: ElementType, parentId?: string, position?: Position) => {
    const state = get();
    const currentPage = state.pages[state.currentPageId];
    if (!currentPage) return '';

    const targetParentId = parentId || currentPage.rootElementId;
    const parent = state.elements[targetParentId];
    if (!parent) return '';

    const id = generateId(type);
    const config = DEFAULT_ELEMENT_CONFIGS[type];
    const elementSize = config.size || { width: 100, height: 100 };

    // Check if parent has auto layout
    const parentHasAutoLayout = parent.styles.display === 'flex' || parent.styles.display === 'grid';

    // Get parent padding - respect content area
    const parsePadding = (val: string | number | undefined): number => {
      if (val === undefined) return 0;
      if (typeof val === 'number') return val;
      return parseFloat(val) || 0;
    };
    const paddingTop = parsePadding(parent.styles.paddingTop) || parsePadding(parent.styles.padding);
    const paddingRight = parsePadding(parent.styles.paddingRight) || parsePadding(parent.styles.padding);
    const paddingBottom = parsePadding(parent.styles.paddingBottom) || parsePadding(parent.styles.padding);
    const paddingLeft = parsePadding(parent.styles.paddingLeft) || parsePadding(parent.styles.padding);

    // Calculate content area (inside padding)
    const contentWidth = parent.size.width - paddingLeft - paddingRight;
    const contentHeight = parent.size.height - paddingTop - paddingBottom;

    // Calculate position - only used for non-auto-layout parents
    let elementPos = { x: 0, y: 0 };
    if (!parentHasAutoLayout) {
      const existingChildrenCount = parent.children.length;
      // Center within content area (after padding)
      const centerX = paddingLeft + (contentWidth - elementSize.width) / 2;
      const centerY = paddingTop + (contentHeight - elementSize.height) / 2;
      const offsetX = existingChildrenCount * 30;
      const offsetY = existingChildrenCount * 30;
      elementPos = position || {
        x: Math.round(Math.max(paddingLeft, centerX + offsetX)),
        y: Math.round(Math.max(paddingTop, centerY + offsetY)),
      };
    }

    // Generate name (without numbering)
    const name = type.charAt(0).toUpperCase() + type.slice(1);

    // For auto layout parents, set appropriate resize modes
    const autoLayoutStyles = parentHasAutoLayout ? {
      resizeX: 'fixed' as const,  // Start with fixed, user can change to fill/hug
      resizeY: 'fixed' as const,
    } : {};

    const newElement: CanvasElement = {
      id,
      type,
      name,
      position: elementPos,
      size: config.size || { width: 100, height: 100 },
      positionType: parentHasAutoLayout ? 'relative' : 'absolute',
      styles: { ...(config.styles || {}), ...autoLayoutStyles },
      content: config.content,
      // Generate unique random image URL for each image element
      src: type === 'image' ? `https://picsum.photos/seed/${Date.now()}/400/300` : (config as any).src,
      alt: (config as any).alt,
      placeholder: (config as any).placeholder,
      inputType: (config as any).inputType,
      parentId: targetParentId,
      children: [],
      locked: false,
      visible: true,
    };

    set((state) => ({
      elements: {
        ...state.elements,
        [id]: newElement,
        [targetParentId]: {
          ...state.elements[targetParentId],
          children: [...state.elements[targetParentId].children, id],
        },
      },
      selectedElementIds: [id],
    }));

    get().saveToHistory(`Add ${type}`);
    return id;
  },

  // Add block (creates complete structure with children)
  addBlock: (blockId: string, parentId?: string) => {
    const template = BLOCK_TEMPLATES[blockId];
    if (!template) {
      console.warn(`Block template "${blockId}" not found`);
      return '';
    }

    const state = get();
    const currentPage = state.pages[state.currentPageId];
    if (!currentPage) return '';

    const targetParentId = parentId || currentPage.rootElementId;
    const parent = state.elements[targetParentId];
    if (!parent) return '';

    // Track all new elements
    const newElements: Record<string, CanvasElement> = {};
    const rootId = generateId(template.rootType);

    // Helper to create element from block child
    const createElementFromChild = (
      child: BlockChild,
      parentId: string,
      depth: number = 0
    ): string => {
      const id = generateId(child.type);
      const config = DEFAULT_ELEMENT_CONFIGS[child.type] || {};

      const element: CanvasElement = {
        id,
        type: child.type,
        name: child.name,
        position: { x: 0, y: 0 },
        size: child.size || config.size || { width: 100, height: 40 },
        positionType: 'relative',
        styles: { ...(config.styles || {}), ...(child.styles || {}) },
        content: child.content || config.content,
        parentId,
        children: [],
        locked: false,
        visible: true,
      };

      newElements[id] = element;

      // Recursively create children
      if (child.children) {
        for (const grandChild of child.children) {
          const childId = createElementFromChild(grandChild, id, depth + 1);
          element.children.push(childId);
        }
      }

      return id;
    };

    // Create root element
    const rootElement: CanvasElement = {
      id: rootId,
      type: template.rootType,
      name: template.name,
      position: { x: 50, y: 50 },
      size: template.rootSize,
      positionType: 'absolute',
      styles: template.rootStyles,
      parentId: targetParentId,
      children: [],
      locked: false,
      visible: true,
    };

    newElements[rootId] = rootElement;

    // Create all children
    for (const child of template.children) {
      const childId = createElementFromChild(child, rootId, 1);
      rootElement.children.push(childId);
    }

    // Update state
    set((state) => ({
      elements: {
        ...state.elements,
        ...newElements,
        [targetParentId]: {
          ...state.elements[targetParentId],
          children: [...state.elements[targetParentId].children, rootId],
        },
      },
      selectedElementIds: [rootId],
    }));

    get().saveToHistory(`Add ${template.name} block`);
    return rootId;
  },

  // Delete element
  deleteElement: (elementId: string) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || element.type === 'page') return;

    // Recursively delete children
    const deleteRecursive = (id: string, elements: Record<string, CanvasElement>): Record<string, CanvasElement> => {
      const el = elements[id];
      if (!el) return elements;

      let newElements = { ...elements };
      for (const childId of el.children) {
        newElements = deleteRecursive(childId, newElements);
      }
      delete newElements[id];
      return newElements;
    };

    let newElements = deleteRecursive(elementId, state.elements);

    // Remove from parent's children
    if (element.parentId && newElements[element.parentId]) {
      newElements[element.parentId] = {
        ...newElements[element.parentId],
        children: newElements[element.parentId].children.filter((id) => id !== elementId),
      };
    }

    set({
      elements: newElements,
      selectedElementIds: state.selectedElementIds.filter((id) => id !== elementId),
    });

    get().saveToHistory('Delete element');
  },

  // Duplicate element
  duplicateElement: (elementId: string) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || element.type === 'page') return;

    // Check if parent has auto layout (flex/grid)
    const parent = element.parentId ? state.elements[element.parentId] : null;
    const parentHasAutoLayout = parent && (parent.styles.display === 'flex' || parent.styles.display === 'grid');

    const duplicateRecursive = (
      el: CanvasElement,
      newParentId: string,
      isTopLevel: boolean
    ): { newId: string; newElements: Record<string, CanvasElement> } => {
      const newId = generateId(el.type);

      // If parent has auto layout, position is handled by flexbox/grid (set to 0,0)
      // Otherwise, offset by 20px so the copy doesn't overlap exactly
      const newPosition = (isTopLevel && parentHasAutoLayout)
        ? { x: 0, y: 0 }
        : { x: el.position.x + (isTopLevel ? 20 : 0), y: el.position.y + (isTopLevel ? 20 : 0) };

      const newElement: CanvasElement = {
        ...el,
        id: newId,
        name: el.name,
        position: newPosition,
        parentId: newParentId,
        children: [],
      };

      let newElements: Record<string, CanvasElement> = { [newId]: newElement };

      for (const childId of el.children) {
        const childEl = state.elements[childId];
        if (childEl) {
          const result = duplicateRecursive(childEl, newId, false);
          newElements = { ...newElements, ...result.newElements };
          newElements[newId].children.push(result.newId);
        }
      }

      return { newId, newElements };
    };

    const { newId, newElements } = duplicateRecursive(element, element.parentId!, true);

    set((state) => ({
      elements: {
        ...state.elements,
        ...newElements,
        [element.parentId!]: {
          ...state.elements[element.parentId!],
          children: [...state.elements[element.parentId!].children, newId],
        },
      },
      selectedElementIds: [newId],
    }));

    get().saveToHistory('Duplicate element');
  },

  // Move element
  moveElement: (elementId: string, position: Position) => {
    const element = get().elements[elementId];
    if (!element || element.locked) return;

    set((state) => ({
      elements: {
        ...state.elements,
        [elementId]: { ...state.elements[elementId], position },
      },
    }));
  },

  // Resize element
  resizeElement: (elementId: string, size: Size) => {
    const element = get().elements[elementId];
    if (!element || element.locked) return;

    const newWidth = Math.max(10, size.width);
    const newHeight = Math.max(10, size.height);

    set((state) => {
      const newState: Partial<CanvasState> = {
        elements: {
          ...state.elements,
          [elementId]: {
            ...state.elements[elementId],
            size: {
              width: newWidth,
              height: newHeight,
            },
          },
        },
      };

      // If this is a page root element, also update the page dimensions
      if (element.type === 'page') {
        // Find the page that has this element as its root
        const pageEntry = Object.entries(state.pages).find(
          ([_, page]) => page.rootElementId === elementId
        );
        if (pageEntry) {
          const [pageId, page] = pageEntry;
          newState.pages = {
            ...state.pages,
            [pageId]: {
              ...page,
              width: newWidth,
              height: newHeight,
            },
          };
        }
      }

      return newState;
    });
  },

  // Update styles
  updateElementStyles: (elementId: string, styles: Partial<ElementStyles>) => {
    set((state) => ({
      elements: {
        ...state.elements,
        [elementId]: {
          ...state.elements[elementId],
          styles: { ...state.elements[elementId].styles, ...styles },
        },
      },
    }));
  },

  // Update content
  updateElementContent: (elementId: string, content: string) => {
    set((state) => ({
      elements: {
        ...state.elements,
        [elementId]: { ...state.elements[elementId], content },
      },
    }));
  },

  // Rename element
  renameElement: (elementId: string, name: string) => {
    set((state) => ({
      elements: {
        ...state.elements,
        [elementId]: { ...state.elements[elementId], name },
      },
    }));
  },

  // Reparent element
  reparentElement: (elementId: string, newParentId: string) => {
    const state = get();
    const element = state.elements[elementId];
    const oldParent = element.parentId ? state.elements[element.parentId] : null;
    const newParent = state.elements[newParentId];

    if (!element || !newParent || elementId === newParentId) return;

    set((state) => {
      const newElements = { ...state.elements };

      // Remove from old parent
      if (oldParent) {
        newElements[oldParent.id] = {
          ...oldParent,
          children: oldParent.children.filter((id) => id !== elementId),
        };
      }

      // Add to new parent
      newElements[newParentId] = {
        ...newParent,
        children: [...newParent.children, elementId],
      };

      // Update element's parentId
      newElements[elementId] = {
        ...element,
        parentId: newParentId,
      };

      return { elements: newElements };
    });

    get().saveToHistory('Reparent element');
  },

  // Selection
  selectElement: (elementId: string, addToSelection = false) => {
    const element = get().elements[elementId];
    if (!element) return;

    set((state) => ({
      selectedElementIds: addToSelection
        ? state.selectedElementIds.includes(elementId)
          ? state.selectedElementIds.filter((id) => id !== elementId)
          : [...state.selectedElementIds, elementId]
        : [elementId],
    }));
  },

  deselectAll: () => {
    set({ selectedElementIds: [] });
  },

  selectAll: () => {
    const state = get();
    const currentPage = state.pages[state.currentPageId];
    if (!currentPage) return;

    const rootElement = state.elements[currentPage.rootElementId];
    if (!rootElement) return;

    set({ selectedElementIds: [...rootElement.children] });
  },

  setHoveredElement: (elementId: string | null) => {
    set({ hoveredElementId: elementId });
  },

  // Visibility & Lock
  toggleVisibility: (elementId: string) => {
    set((state) => ({
      elements: {
        ...state.elements,
        [elementId]: {
          ...state.elements[elementId],
          visible: !state.elements[elementId].visible,
        },
      },
    }));
  },

  toggleLock: (elementId: string) => {
    set((state) => ({
      elements: {
        ...state.elements,
        [elementId]: {
          ...state.elements[elementId],
          locked: !state.elements[elementId].locked,
        },
      },
    }));
  },

  // Project
  setProjectName: (name: string) => {
    set({ projectName: name });
  },

  // Page operations
  addPage: () => {
    const pageId = generateId('page');
    const rootId = generateId('root');
    const pageCount = Object.keys(get().pages).length;

    const rootElement: CanvasElement = {
      id: rootId,
      type: 'page',
      name: `Page ${pageCount + 1}`,
      position: { x: 0, y: 0 },
      size: { width: 1440, height: 900 },
      positionType: 'relative',
      styles: { backgroundColor: '#ffffff' },
      parentId: null,
      children: [],
      locked: false,
      visible: true,
    };

    // Position new pages side by side (horizontally)
    // Calculate the rightmost position of all existing pages
    const existingPages = Object.values(get().pages);
    let rightmostX = 0;

    for (const p of existingPages) {
      const pageRight = (p.x || 0) + p.width;
      if (pageRight > rightmostX) {
        rightmostX = pageRight;
      }
    }

    // Add gap between pages (100px)
    const newPageX = existingPages.length > 0 ? rightmostX + 100 : 0;

    const page: CanvasPage = {
      id: pageId,
      name: `Page ${pageCount + 1}`,
      rootElementId: rootId,
      backgroundColor: '#ffffff',
      width: 1440,
      height: 900,
      x: newPageX,
      y: 0, // Keep all pages on the same row
    };

    set((state) => ({
      pages: { ...state.pages, [pageId]: page },
      elements: { ...state.elements, [rootId]: rootElement },
      currentPageId: pageId,
      selectedElementIds: [],
    }));

    get().saveToHistory('Add page');
    return pageId;
  },

  deletePage: (pageId: string) => {
    const state = get();
    if (Object.keys(state.pages).length <= 1) return;

    const page = state.pages[pageId];
    if (!page) return;

    // Delete all elements on this page
    const deleteElementsRecursive = (
      id: string,
      elements: Record<string, CanvasElement>
    ): Record<string, CanvasElement> => {
      const el = elements[id];
      if (!el) return elements;

      let newElements = { ...elements };
      for (const childId of el.children) {
        newElements = deleteElementsRecursive(childId, newElements);
      }
      delete newElements[id];
      return newElements;
    };

    const newElements = deleteElementsRecursive(page.rootElementId, state.elements);
    const newPages = { ...state.pages };
    delete newPages[pageId];

    const newCurrentPageId =
      state.currentPageId === pageId ? Object.keys(newPages)[0] : state.currentPageId;

    set({
      pages: newPages,
      elements: newElements,
      currentPageId: newCurrentPageId,
      selectedElementIds: [],
    });

    get().saveToHistory('Delete page');
  },

  renamePage: (pageId: string, name: string) => {
    const state = get();
    const page = state.pages[pageId];
    if (!page) return;

    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: { ...state.pages[pageId], name },
      },
      elements: {
        ...state.elements,
        [page.rootElementId]: { ...state.elements[page.rootElementId], name },
      },
    }));

    get().saveToHistory('Rename page');
  },

  updatePageNotes: (pageId: string, notes: string) => {
    const state = get();
    const page = state.pages[pageId];
    if (!page) return;

    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: { ...state.pages[pageId], notes },
      },
    }));
  },

  duplicatePage: (pageId: string) => {
    const state = get();
    const page = state.pages[pageId];
    if (!page) return null;

    const rootElement = state.elements[page.rootElementId];
    if (!rootElement) return null;

    // Generate new IDs
    const newPageId = `page-${Date.now()}`;
    const newRootId = `root-${newPageId}`;

    // Map old element IDs to new IDs
    const idMap: Record<string, string> = {
      [page.rootElementId]: newRootId,
    };

    // Collect all elements in this page (recursive)
    const collectElements = (elementId: string): string[] => {
      const element = state.elements[elementId];
      if (!element) return [];
      const childIds = element.children.flatMap(collectElements);
      return [elementId, ...childIds];
    };

    const allElementIds = collectElements(page.rootElementId);

    // Generate new IDs for all elements
    for (const id of allElementIds) {
      if (!idMap[id]) {
        const el = state.elements[id];
        idMap[id] = generateId(el?.type || 'element');
      }
    }

    // Clone all elements with new IDs
    const newElements: Record<string, CanvasElement> = {};
    for (const oldId of allElementIds) {
      const oldElement = state.elements[oldId];
      if (!oldElement) continue;

      const newId = idMap[oldId];
      newElements[newId] = {
        ...JSON.parse(JSON.stringify(oldElement)),
        id: newId,
        parentId: oldElement.parentId ? idMap[oldElement.parentId] : undefined,
        children: oldElement.children.map(childId => idMap[childId]).filter(Boolean),
        name: oldElement.name,
      };
    }

    // Calculate position for new page - find free spot to the right
    const pageWidth = page.width;
    const pageHeight = page.height;
    const pageY = page.y || 0;
    const gap = 100;

    // Helper to check if a position overlaps with any existing page
    const checkOverlap = (x: number, y: number): boolean => {
      for (const p of Object.values(state.pages)) {
        if (p.id === pageId) continue; // Skip the page being duplicated
        const px = p.x || 0;
        const py = p.y || 0;
        // Check if rectangles overlap
        if (x < px + p.width + gap && x + pageWidth + gap > px &&
            y < py + p.height && y + pageHeight > py) {
          return true;
        }
      }
      return false;
    };

    // Start position: to the right of the original page
    let newPageX = (page.x || 0) + pageWidth + gap;

    // Keep moving right until we find a free spot
    while (checkOverlap(newPageX, pageY)) {
      newPageX += pageWidth + gap;
    }

    // Create new page
    const newPage: CanvasPage = {
      ...page,
      id: newPageId,
      name: page.name,
      rootElementId: newRootId,
      x: newPageX,
      y: pageY,
    };

    set((state) => ({
      pages: {
        ...state.pages,
        [newPageId]: newPage,
      },
      elements: {
        ...state.elements,
        ...newElements,
      },
      currentPageId: newPageId,
    }));

    get().saveToHistory('Duplicate page');
    return newPageId;
  },

  setCurrentPage: (pageId: string) => {
    set({ currentPageId: pageId, selectedElementIds: [] });
  },

  movePagePosition: (pageId: string, position: Position) => {
    const page = get().pages[pageId];
    if (!page) return;

    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: { ...page, x: position.x, y: position.y },
      },
    }));
  },

  // Clipboard
  copy: () => {
    const state = get();
    const selectedElements = state.selectedElementIds
      .map((id) => state.elements[id])
      .filter(Boolean);

    if (selectedElements.length === 0) return;

    // Deep copy with children
    const copyWithChildren = (el: CanvasElement): CanvasElement[] => {
      const result = [{ ...el }];
      for (const childId of el.children) {
        const child = state.elements[childId];
        if (child) {
          result.push(...copyWithChildren(child));
        }
      }
      return result;
    };

    const clipboard: CanvasElement[] = [];
    for (const el of selectedElements) {
      clipboard.push(...copyWithChildren(el));
    }

    set({ clipboard });
  },

  paste: (position?: Position) => {
    const state = get();
    if (!state.clipboard || state.clipboard.length === 0) return;

    const currentPage = state.pages[state.currentPageId];
    if (!currentPage) return;

    // Map old IDs to new IDs
    const idMap: Record<string, string> = {};
    for (const el of state.clipboard) {
      idMap[el.id] = generateId(el.type);
    }

    // Create new elements with new IDs
    const newElements: Record<string, CanvasElement> = {};
    const rootIds: string[] = [];

    for (const el of state.clipboard) {
      const newId = idMap[el.id];
      const newParentId = el.parentId ? idMap[el.parentId] : currentPage.rootElementId;

      // If parent wasn't copied, this is a root element
      if (!el.parentId || !idMap[el.parentId]) {
        rootIds.push(newId);
      }

      newElements[newId] = {
        ...el,
        id: newId,
        parentId: newParentId || currentPage.rootElementId,
        children: el.children.map((childId) => idMap[childId]).filter(Boolean),
        position: position && rootIds.includes(newId) ? position : { ...el.position, x: el.position.x + 20, y: el.position.y + 20 },
      };
    }

    // Add root elements to page root's children
    const pageRoot = state.elements[currentPage.rootElementId];

    set((state) => ({
      elements: {
        ...state.elements,
        ...newElements,
        [currentPage.rootElementId]: {
          ...pageRoot,
          children: [...pageRoot.children, ...rootIds],
        },
      },
      selectedElementIds: rootIds,
    }));

    get().saveToHistory('Paste');
  },

  cut: () => {
    get().copy();
    const selectedIds = [...get().selectedElementIds];
    for (const id of selectedIds) {
      get().deleteElement(id);
    }
  },

  // History - proper undo/redo implementation
  undo: () => {
    const state = get();
    if (state.history.length < 2) return; // Need at least 2 entries (before + after)
    if (state.historyIndex < 1) return;

    // Restore to previous state
    const previousEntry = state.history[state.historyIndex - 1];
    set({
      elements: JSON.parse(JSON.stringify(previousEntry.elements)),
      pages: JSON.parse(JSON.stringify(previousEntry.pages)),
      historyIndex: state.historyIndex - 1,
      selectedElementIds: [],
    });
    console.log('[Undo] Restored to index', state.historyIndex - 1);
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    // Restore to next state
    const nextEntry = state.history[state.historyIndex + 1];
    set({
      elements: JSON.parse(JSON.stringify(nextEntry.elements)),
      pages: JSON.parse(JSON.stringify(nextEntry.pages)),
      historyIndex: state.historyIndex + 1,
      selectedElementIds: [],
    });
    console.log('[Redo] Restored to index', state.historyIndex + 1);
  },

  saveToHistory: (action: string) => {
    const state = get();

    // Deep copy current state (state AFTER the action)
    const entry = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      pages: JSON.parse(JSON.stringify(state.pages)),
      timestamp: Date.now(),
      action,
    };

    let newHistory = [...state.history];

    // If history is empty, we need to save initial state first
    // But since we're called AFTER actions, we should already have been initialized
    // Just remove any future entries (if we undid and then made a new action)
    newHistory = newHistory.slice(0, state.historyIndex + 1);

    // Add new entry
    newHistory.push(entry);

    // Keep max 50 entries
    while (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
    console.log('[History] Saved:', action, 'Index:', newHistory.length - 1);
  },

  // Save initial state (call this once at startup or first interaction)
  saveInitialState: () => {
    const state = get();
    if (state.history.length > 0) return; // Already initialized

    const entry = {
      elements: JSON.parse(JSON.stringify(state.elements)),
      pages: JSON.parse(JSON.stringify(state.pages)),
      timestamp: Date.now(),
      action: 'Initial state',
    };

    set({
      history: [entry],
      historyIndex: 0,
    });
    console.log('[History] Initial state saved');
  },

  // Getters
  getElement: (elementId: string) => get().elements[elementId],

  getCurrentPage: () => {
    const state = get();
    return state.pages[state.currentPageId];
  },

  getRootElement: () => {
    const state = get();
    const page = state.pages[state.currentPageId];
    return page ? state.elements[page.rootElementId] : undefined;
  },

  getSelectedElements: () => {
    const state = get();
    return state.selectedElementIds.map((id) => state.elements[id]).filter(Boolean);
  },

  getElementChildren: (elementId: string) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return [];
    return element.children.map((id) => state.elements[id]).filter(Boolean);
  },

  // Wrap selected elements in a frame (Figma: Cmd+Option+G)
  wrapInFrame: () => {
    const state = get();
    const selectedIds = state.selectedElementIds;
    if (selectedIds.length === 0) return null;

    // Get selected elements
    const selectedElements = selectedIds
      .map((id) => state.elements[id])
      .filter((el) => el && el.type !== 'page');

    if (selectedElements.length === 0) return null;

    // Find common parent (all selected elements must have same parent)
    const parentId = selectedElements[0].parentId;
    if (!parentId) return null;

    // All selected elements must be siblings
    const allSiblings = selectedElements.every((el) => el.parentId === parentId);
    if (!allSiblings) {
      console.warn('Cannot wrap: selected elements must be siblings');
      return null;
    }

    // Calculate bounding box of all selected elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of selectedElements) {
      minX = Math.min(minX, el.position.x);
      minY = Math.min(minY, el.position.y);
      maxX = Math.max(maxX, el.position.x + el.size.width);
      maxY = Math.max(maxY, el.position.y + el.size.height);
    }

    // Add padding to the frame
    const padding = 0;
    const frameX = minX - padding;
    const frameY = minY - padding;
    const frameWidth = maxX - minX + padding * 2;
    const frameHeight = maxY - minY + padding * 2;

    // Create new frame element
    const frameId = generateId('frame');

    const newFrame: CanvasElement = {
      id: frameId,
      type: 'frame',
      name: 'Frame',
      position: { x: frameX, y: frameY },
      size: { width: frameWidth, height: frameHeight },
      positionType: 'absolute',
      styles: { backgroundColor: 'transparent' },
      parentId: parentId,
      children: selectedIds,
      locked: false,
      visible: true,
    };

    // Update elements: add frame, update children positions and parent
    const newElements: Record<string, CanvasElement> = { ...state.elements };

    // Add frame
    newElements[frameId] = newFrame;

    // Update each selected element - make it child of frame with adjusted position
    for (const el of selectedElements) {
      newElements[el.id] = {
        ...el,
        parentId: frameId,
        position: {
          x: el.position.x - frameX,
          y: el.position.y - frameY,
        },
      };
    }

    // Update parent - remove selected elements, add frame
    const parent = state.elements[parentId];
    const newParentChildren = parent.children.filter((id) => !selectedIds.includes(id));
    // Insert frame at position of first selected element
    const firstSelectedIndex = parent.children.findIndex((id) => selectedIds.includes(id));
    newParentChildren.splice(firstSelectedIndex, 0, frameId);
    newElements[parentId] = {
      ...parent,
      children: newParentChildren,
    };

    set({
      elements: newElements,
      selectedElementIds: [frameId],
    });

    get().saveToHistory('Wrap in Frame');
    return frameId;
  },

  // Group selected elements (Figma: Cmd+G) - similar but creates a group that hugs content
  groupElements: () => {
    // For now, groupElements works the same as wrapInFrame
    // In the future, groups would auto-resize to fit their children
    return get().wrapInFrame();
  },

  // Ungroup/Unwrap selected frame or group (Figma: Shift+Cmd+G)
  ungroupElements: () => {
    const state = get();
    const selectedIds = state.selectedElementIds;
    if (selectedIds.length !== 1) return;

    const element = state.elements[selectedIds[0]];
    if (!element || element.type === 'page') return;
    if (element.children.length === 0) return; // Nothing to ungroup
    if (!element.parentId) return;

    const parentId = element.parentId;
    const parent = state.elements[parentId];
    if (!parent) return;

    const framePos = element.position;
    const childIds = element.children;

    const newElements: Record<string, CanvasElement> = { ...state.elements };

    // Update each child - move to parent with adjusted position
    for (const childId of childIds) {
      const child = state.elements[childId];
      if (!child) continue;
      newElements[childId] = {
        ...child,
        parentId: parentId,
        position: {
          x: child.position.x + framePos.x,
          y: child.position.y + framePos.y,
        },
      };
    }

    // Update parent - replace frame with its children
    const frameIndex = parent.children.indexOf(element.id);
    const newParentChildren = [...parent.children];
    newParentChildren.splice(frameIndex, 1, ...childIds);
    newElements[parentId] = {
      ...parent,
      children: newParentChildren,
    };

    // Remove the frame/group
    delete newElements[element.id];

    set({
      elements: newElements,
      selectedElementIds: childIds,
    });

    get().saveToHistory('Ungroup');
  },

  // ==========================================
  // VARIANTS
  // ==========================================

  addVariant: (elementId: string, variant: Variant) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          variants: [...(element.variants || []), variant],
        },
      },
    });
    get().saveToHistory('Add variant');
  },

  updateVariant: (elementId: string, variantId: string, updates: Partial<Variant>) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || !element.variants) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          variants: element.variants.map((v) =>
            v.id === variantId ? { ...v, ...updates } : v
          ),
        },
      },
    });
  },

  deleteVariant: (elementId: string, variantId: string) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || !element.variants) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          variants: element.variants.filter((v) => v.id !== variantId),
        },
      },
    });
    get().saveToHistory('Delete variant');
  },

  setVariants: (elementId: string, variants: Variant[]) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          variants,
        },
      },
    });
  },

  // ==========================================
  // INTERACTIONS
  // ==========================================

  addInteraction: (elementId: string, interaction: Interaction) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          interactions: [...(element.interactions || []), interaction],
        },
      },
    });
    get().saveToHistory('Add interaction');
  },

  updateInteraction: (elementId: string, interactionId: string, updates: Partial<Interaction>) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || !element.interactions) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          interactions: element.interactions.map((i) =>
            i.id === interactionId ? { ...i, ...updates } : i
          ),
        },
      },
    });
  },

  deleteInteraction: (elementId: string, interactionId: string) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || !element.interactions) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          interactions: element.interactions.filter((i) => i.id !== interactionId),
        },
      },
    });
    get().saveToHistory('Delete interaction');
  },

  setInteractions: (elementId: string, interactions: Interaction[]) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          interactions,
        },
      },
    });
  },

  // ==========================================
  // ANIMATIONS
  // ==========================================

  addAnimation: (elementId: string, animation: Animation) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          animations: [...(element.animations || []), animation],
        },
      },
    });
    get().saveToHistory('Add animation');
  },

  updateAnimation: (elementId: string, animationId: string, updates: Partial<Animation>) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || !element.animations) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          animations: element.animations.map((a) =>
            a.id === animationId ? { ...a, ...updates } : a
          ),
        },
      },
    });
  },

  deleteAnimation: (elementId: string, animationId: string) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || !element.animations) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          animations: element.animations.filter((a) => a.id !== animationId),
        },
      },
    });
    get().saveToHistory('Delete animation');
  },

  setAnimations: (elementId: string, animations: Animation[]) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return;

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          animations,
        },
      },
    });
  },

  // ==========================================
  // RESPONSIVE STYLES
  // ==========================================

  setResponsiveStyles: (elementId: string, breakpointId: string, styles: Partial<ElementStyles>) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return;

    const currentResponsive = element.responsiveStyles || {};

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          responsiveStyles: {
            ...currentResponsive,
            [breakpointId]: {
              ...(currentResponsive[breakpointId] || {}),
              ...styles,
            },
          },
        },
      },
    });
  },

  clearResponsiveStyles: (elementId: string, breakpointId: string) => {
    const state = get();
    const element = state.elements[elementId];
    if (!element || !element.responsiveStyles) return;

    const newResponsive = { ...element.responsiveStyles };
    delete newResponsive[breakpointId];

    set({
      elements: {
        ...state.elements,
        [elementId]: {
          ...element,
          responsiveStyles: newResponsive,
        },
      },
    });
  },

  getStylesForBreakpoint: (elementId: string, breakpointId: string): ElementStyles => {
    const state = get();
    const element = state.elements[elementId];
    if (!element) return {};

    const baseStyles = element.styles || {};
    const responsiveOverrides = element.responsiveStyles?.[breakpointId] || {};

    return {
      ...baseStyles,
      ...responsiveOverrides,
    };
  },

  // Figma import - creates a new page with all imported elements
  importFigmaDesign: (importedElements: Record<string, CanvasElement>, importedRootId: string, rootName: string, rootSize: Size): string => {
    const state = get();
    const pageId = generateId('page');
    const rootId = generateId('root');

    // Map old IDs to new IDs
    const idMap: Record<string, string> = {};
    idMap[importedRootId] = rootId;

    // Generate new IDs for all elements
    for (const oldId of Object.keys(importedElements)) {
      if (oldId !== importedRootId) {
        idMap[oldId] = generateId('figma');
      }
    }

    // Create new elements with remapped IDs
    const newElements: Record<string, CanvasElement> = {};

    for (const [oldId, element] of Object.entries(importedElements)) {
      const newId = idMap[oldId];
      const newParentId = element.parentId ? idMap[element.parentId] : null;
      const newChildren = element.children.map(childId => idMap[childId]).filter(Boolean);

      newElements[newId] = {
        ...element,
        id: newId,
        parentId: newParentId,
        children: newChildren,
      };
    }

    // Update root element to be a page type
    const rootElement = newElements[rootId];
    if (rootElement) {
      rootElement.type = 'page';
      rootElement.name = rootName;
      rootElement.size = rootSize;
      rootElement.position = { x: 0, y: 0 };
      rootElement.positionType = 'relative';
    }

    // Position new page to the right of existing pages
    const existingPages = Object.values(state.pages);
    let rightmostX = 0;
    for (const p of existingPages) {
      const pageRight = (p.x || 0) + p.width;
      if (pageRight > rightmostX) {
        rightmostX = pageRight;
      }
    }
    const newPageX = existingPages.length > 0 ? rightmostX + 100 : 0;

    const page: CanvasPage = {
      id: pageId,
      name: rootName,
      rootElementId: rootId,
      backgroundColor: rootElement?.styles?.backgroundColor || '#ffffff',
      width: rootSize.width,
      height: rootSize.height,
      x: newPageX,
      y: 0,
    };

    set((state) => ({
      pages: { ...state.pages, [pageId]: page },
      elements: { ...state.elements, ...newElements },
      currentPageId: pageId,
      selectedElementIds: [],
    }));

    get().saveToHistory('Import from Figma');
    return pageId;
  },

  // Reset
  reset: () => {
    set(createInitialState());
  },
    }),
    {
      name: 'objects-canvas-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields (not transient state like selection, hover)
        projectName: state.projectName,
        pages: state.pages,
        elements: state.elements,
        currentPageId: state.currentPageId,
      }),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Add x, y to pages that don't have them
          const pages = persistedState.pages || {};
          for (const pageId of Object.keys(pages)) {
            if (pages[pageId].x === undefined) pages[pageId].x = 0;
            if (pages[pageId].y === undefined) pages[pageId].y = 0;
          }
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        console.log('Canvas state rehydrated from localStorage');
        // Ensure all pages have x, y (fallback for any edge cases)
        if (state?.pages) {
          for (const pageId of Object.keys(state.pages)) {
            if (state.pages[pageId].x === undefined) state.pages[pageId].x = 0;
            if (state.pages[pageId].y === undefined) state.pages[pageId].y = 0;
          }
        }
      },
    }
  )
);
