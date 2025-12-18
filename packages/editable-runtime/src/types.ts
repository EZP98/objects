/**
 * Types for the Editable Runtime
 * Message protocol between parent editor and iframe preview
 */

// ============================================
// ELEMENT TYPES
// ============================================

export interface EditableElementInfo {
  id: string;
  componentName: string;
  props: Record<string, unknown>;
  rect: DOMRect | null;
  children?: string[]; // IDs of child editables
}

export interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

// ============================================
// MESSAGE PROTOCOL: Parent → Iframe
// ============================================

export type ParentToIframeMessage =
  | { type: 'objects:enable-edit-mode' }
  | { type: 'objects:disable-edit-mode' }
  | { type: 'objects:select'; id: string | null }
  | { type: 'objects:update-props'; id: string; props: Record<string, unknown> }
  | { type: 'objects:update-style'; id: string; style: React.CSSProperties }
  | { type: 'objects:highlight'; id: string | null }
  | { type: 'objects:ping' };

// ============================================
// MESSAGE PROTOCOL: Iframe → Parent
// ============================================

export type IframeToParentMessage =
  | { type: 'objects:ready'; version: string }
  | { type: 'objects:pong' }
  | {
      type: 'objects:selected';
      id: string;
      componentName: string;
      props: Record<string, unknown>;
      rect: ElementRect | null;
      // Style information
      styles?: Record<string, string>;
      computedStyles?: Record<string, string>;
      // Element information
      tagName?: string;
      className?: string;
      textContent?: string;
    }
  | { type: 'objects:deselected' }
  | {
      type: 'objects:hover';
      id: string | null;
      rect: ElementRect | null;
    }
  | {
      type: 'objects:props-changed';
      id: string;
      props: Record<string, unknown>;
    }
  | {
      type: 'objects:element-tree';
      tree: EditableElementInfo[];
    }
  | {
      type: 'objects:error';
      message: string;
    };

// ============================================
// EDITABLE COMPONENT PROPS
// ============================================

export interface EditableProps<P = Record<string, unknown>> {
  /** Unique identifier for this editable element */
  id: string;
  /** The component to render */
  component: React.ComponentType<P>;
  /** Props to pass to the component */
  props: P;
  /** Optional children */
  children?: React.ReactNode;
  /** Optional display name override */
  displayName?: string;
}

// ============================================
// CONTEXT TYPES
// ============================================

export interface EditableContextValue {
  isEditMode: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  selectElement: (id: string) => void;
  hoverElement: (id: string | null) => void;
  updateProps: (id: string, props: Record<string, unknown>) => void;
  registerElement: (id: string, info: Omit<EditableElementInfo, 'id'>) => void;
  unregisterElement: (id: string) => void;
}

// ============================================
// GLOBAL AUGMENTATION
// ============================================

declare global {
  interface Window {
    __OBJECTS_RUNTIME__?: {
      version: string;
      isEditMode: boolean;
      elements: Map<string, EditableElementInfo>;
      props: Record<string, Record<string, unknown>>;
    };
  }
}
