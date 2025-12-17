import React, { useEffect, useRef, useMemo } from 'react';
import { useEditable } from './EditableProvider';
import type { EditableProps } from './types';

// ============================================
// EDITABLE COMPONENT
// ============================================

export function Editable<P extends Record<string, unknown>>({
  id,
  component: Component,
  props: initialProps,
  children,
  displayName,
}: EditableProps<P>) {
  const {
    isEditMode,
    selectedId,
    hoveredId,
    selectElement,
    hoverElement,
    registerElement,
    unregisterElement,
  } = useEditable();

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Get component name
  const componentName = useMemo(() => {
    return (
      displayName ||
      (Component as any).displayName ||
      (Component as any).name ||
      'Component'
    );
  }, [Component, displayName]);

  // Get current props (may be updated by parent)
  const currentProps = useMemo(() => {
    const getProps = (window as any).__OBJECTS_GET_PROPS__;
    if (getProps) {
      return getProps(id, initialProps) as P;
    }
    return initialProps;
  }, [id, initialProps]);

  // Register element on mount
  useEffect(() => {
    registerElement(id, {
      componentName,
      props: initialProps,
      rect: null,
    });

    return () => {
      unregisterElement(id);
    };
  }, [id, componentName, initialProps, registerElement, unregisterElement]);

  // Selection state
  const isSelected = selectedId === id;
  const isHovered = hoveredId === id;

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;

    e.stopPropagation();
    e.preventDefault();
    selectElement(id);
  };

  // Handle hover
  const handleMouseEnter = () => {
    if (!isEditMode) return;
    hoverElement(id);
  };

  const handleMouseLeave = () => {
    if (!isEditMode) return;
    hoverElement(null);
  };

  // ==========================================
  // Non-edit mode: render component directly
  // ==========================================

  if (!isEditMode) {
    return (
      <Component {...currentProps}>
        {children}
      </Component>
    );
  }

  // ==========================================
  // Edit mode: render with wrapper
  // ==========================================

  return (
    <div
      ref={wrapperRef}
      data-objects-id={id}
      data-objects-component={componentName}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        cursor: 'pointer',
        // Selection outline
        outline: isSelected
          ? '2px solid #3b82f6'
          : isHovered
          ? '2px solid #93c5fd'
          : '1px dashed transparent',
        outlineOffset: '2px',
        transition: 'outline 0.1s ease',
      }}
    >
      {/* Component label */}
      {(isSelected || isHovered) && (
        <div
          style={{
            position: 'absolute',
            top: -24,
            left: 0,
            background: isSelected ? '#3b82f6' : '#93c5fd',
            color: 'white',
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            zIndex: 99999,
            pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {componentName}
        </div>
      )}

      {/* Resize handles (when selected) */}
      {isSelected && (
        <>
          <ResizeHandle position="nw" />
          <ResizeHandle position="ne" />
          <ResizeHandle position="sw" />
          <ResizeHandle position="se" />
        </>
      )}

      {/* The actual component */}
      <Component {...currentProps}>
        {children}
      </Component>
    </div>
  );
}

// ============================================
// RESIZE HANDLE
// ============================================

interface ResizeHandleProps {
  position: 'nw' | 'ne' | 'sw' | 'se';
}

function ResizeHandle({ position }: ResizeHandleProps) {
  const positionStyles: Record<string, React.CSSProperties> = {
    nw: { top: -4, left: -4, cursor: 'nw-resize' },
    ne: { top: -4, right: -4, cursor: 'ne-resize' },
    sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
    se: { bottom: -4, right: -4, cursor: 'se-resize' },
  };

  return (
    <div
      data-resize-handle={position}
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        background: '#3b82f6',
        border: '2px solid white',
        borderRadius: 2,
        zIndex: 99999,
        ...positionStyles[position],
      }}
    />
  );
}

// ============================================
// HOC VERSION (alternative API)
// ============================================

export function withEditable<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  displayName?: string
) {
  const EditableComponent = ({
    __editableId,
    ...props
  }: P & { __editableId: string }) => {
    return (
      <Editable
        id={__editableId}
        component={Component}
        props={props as unknown as P}
        displayName={displayName}
      />
    );
  };

  EditableComponent.displayName = `Editable(${
    displayName || Component.displayName || Component.name || 'Component'
  })`;

  return EditableComponent;
}

// ============================================
// EDITABLE TEXT (inline editing)
// ============================================

interface EditableTextProps {
  id: string;
  value: string;
  as?: keyof JSX.IntrinsicElements;
  onChange?: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function EditableText({
  id,
  value: initialValue,
  as: Tag = 'span',
  onChange,
  className,
  style,
}: EditableTextProps) {
  const { isEditMode, selectedId, selectElement, hoverElement, registerElement, unregisterElement } =
    useEditable();

  const isSelected = selectedId === id;

  // Get current value
  const currentValue = useMemo(() => {
    const getProps = (window as any).__OBJECTS_GET_PROPS__;
    if (getProps) {
      const props = getProps(id, { value: initialValue });
      return props.value as string;
    }
    return initialValue;
  }, [id, initialValue]);

  // Register
  useEffect(() => {
    registerElement(id, {
      componentName: 'Text',
      props: { value: initialValue },
      rect: null,
    });
    return () => unregisterElement(id);
  }, [id, initialValue, registerElement, unregisterElement]);

  if (!isEditMode) {
    return (
      <Tag className={className} style={style}>
        {currentValue}
      </Tag>
    );
  }

  return (
    <Tag
      data-objects-id={id}
      data-objects-component="Text"
      onClick={(e) => {
        e.stopPropagation();
        selectElement(id);
      }}
      onMouseEnter={() => hoverElement(id)}
      onMouseLeave={() => hoverElement(null)}
      className={className}
      style={{
        ...style,
        outline: isSelected ? '2px solid #3b82f6' : undefined,
        outlineOffset: 2,
        cursor: 'pointer',
      }}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={(e) => {
        const newValue = (e.target as HTMLElement).textContent || '';
        if (newValue !== currentValue && onChange) {
          onChange(newValue);
        }
      }}
    >
      {currentValue}
    </Tag>
  );
}
