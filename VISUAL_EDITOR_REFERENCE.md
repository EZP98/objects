# Visual Editor Implementation Reference

Basato su Plasmic (plasmicapp/plasmic) e pattern comuni per editor visuali tipo Figma.

## Architettura Generale

```
┌─────────────────────────────────────────────────────────────┐
│                      EDITOR CANVAS                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   IFRAME PREVIEW                     │   │
│  │   [Elementi con data-source-file, data-source-line]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                    Mouse Events                             │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              EVENT INTERCEPTOR                       │   │
│  │   - Click → Select Element                           │   │
│  │   - Drag → Move/Reorder                              │   │
│  │   - Resize handles → Dimension change                │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SOURCE CODE UPDATER                     │   │
│  │   - Parse AST                                        │   │
│  │   - Find node at line/column                         │   │
│  │   - Update properties                                │   │
│  │   - Regenerate code                                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Source Mapping (DOM → Codice)

### Babel Plugin per iniettare source locations

```typescript
// babel-plugin-inject-source.ts
import { PluginObj } from '@babel/core';
import * as t from '@babel/types';

export default function injectSourcePlugin(): PluginObj {
  return {
    name: 'inject-source-location',
    visitor: {
      JSXOpeningElement(path, state) {
        const { line, column } = path.node.loc?.start || {};
        const filename = state.filename;

        // Aggiungi data-source-file e data-source-line
        path.node.attributes.push(
          t.jsxAttribute(
            t.jsxIdentifier('data-source-file'),
            t.stringLiteral(filename || '')
          ),
          t.jsxAttribute(
            t.jsxIdentifier('data-source-line'),
            t.stringLiteral(String(line || 0))
          ),
          t.jsxAttribute(
            t.jsxIdentifier('data-source-col'),
            t.stringLiteral(String(column || 0))
          )
        );
      }
    }
  };
}
```

### Vite Plugin alternativo

```typescript
// vite-plugin-source-inject.ts
import { Plugin } from 'vite';
import * as babel from '@babel/core';

export function sourceInjectPlugin(): Plugin {
  return {
    name: 'source-inject',
    transform(code, id) {
      if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) return;

      const result = babel.transformSync(code, {
        filename: id,
        plugins: ['./babel-plugin-inject-source'],
        parserOpts: { plugins: ['jsx', 'typescript'] }
      });

      return { code: result?.code || code };
    }
  };
}
```

---

## 2. Element Selection (da Plasmic)

### Focus Heuristics - Determinare cosa selezionare al click

```typescript
// focus-heuristics.ts
interface SelectionResult {
  element: HTMLElement;
  sourceFile: string;
  sourceLine: number;
  sourceCol: number;
}

class FocusHeuristics {
  // Trova il miglior elemento da selezionare
  bestFocusTarget(clickedElement: HTMLElement): SelectionResult | null {
    let current: HTMLElement | null = clickedElement;

    while (current) {
      // Controlla se ha source info
      const sourceFile = current.dataset.sourceFile;
      const sourceLine = current.dataset.sourceLine;

      if (sourceFile && sourceLine) {
        // Salta elementi locked o non selezionabili
        if (current.dataset.locked === 'true') {
          current = current.parentElement;
          continue;
        }

        return {
          element: current,
          sourceFile,
          sourceLine: parseInt(sourceLine),
          sourceCol: parseInt(current.dataset.sourceCol || '0')
        };
      }

      current = current.parentElement;
    }

    return null;
  }

  // Gestione doppio click per entrare nei componenti
  handleDoubleClick(element: HTMLElement): void {
    // Entra nel contesto del componente figlio
    const componentRoot = element.querySelector('[data-component-root]');
    if (componentRoot) {
      this.setActiveContext(componentRoot);
    }
  }
}
```

---

## 3. Freestyle Manipulator (Resize/Move da Plasmic)

```typescript
// FreestyleManipulator.ts
interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type ResizeHandle =
  | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

class FreestyleManipulator {
  private element: HTMLElement;
  private initialRect: Rect;
  private initialStyles: CSSStyleDeclaration;

  constructor(element: HTMLElement) {
    this.element = element;
    this.initialRect = element.getBoundingClientRect();
    this.initialStyles = getComputedStyle(element);
  }

  // Avvia manipolazione
  start(): void {
    this.initialRect = this.element.getBoundingClientRect();
  }

  // Resize da un handle
  resize(handle: ResizeHandle, deltaX: number, deltaY: number, modifiers: ModifierKeys): Rect {
    const rect = { ...this.initialRect };

    // Alt key = resize simmetrico dal centro
    const multiplier = modifiers.altKey ? 2 : 1;

    // Calcola nuove dimensioni in base all'handle
    switch (handle) {
      case 'right':
        rect.width += deltaX * multiplier;
        if (modifiers.altKey) rect.left -= deltaX;
        break;
      case 'bottom':
        rect.height += deltaY * multiplier;
        if (modifiers.altKey) rect.top -= deltaY;
        break;
      case 'bottom-right':
        rect.width += deltaX * multiplier;
        rect.height += deltaY * multiplier;
        if (modifiers.altKey) {
          rect.left -= deltaX;
          rect.top -= deltaY;
        }
        break;
      // ... altri casi
    }

    // Shift key = mantieni aspect ratio
    if (modifiers.shiftKey) {
      const aspectRatio = this.initialRect.width / this.initialRect.height;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        rect.height = rect.width / aspectRatio;
      } else {
        rect.width = rect.height * aspectRatio;
      }
    }

    return rect;
  }

  // Move element (solo per position absolute/fixed)
  move(deltaX: number, deltaY: number, modifiers: ModifierKeys): void {
    const position = this.initialStyles.position;
    if (position !== 'absolute' && position !== 'fixed') return;

    let newLeft = this.initialRect.left + deltaX;
    let newTop = this.initialRect.top + deltaY;

    // Shift key = blocca asse
    if (modifiers.shiftKey) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newTop = this.initialRect.top;
      } else {
        newLeft = this.initialRect.left;
      }
    }

    this.applyStyles({ left: newLeft, top: newTop });
  }

  private applyStyles(styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(this.element.style, styles);
  }
}
```

---

## 4. Drag and Drop System (da Plasmic)

```typescript
// Dnd.tsx
interface DragState {
  isDragging: boolean;
  draggedElements: HTMLElement[];
  tentativeInsertion: InsertionPoint | null;
  cursorOffset: { x: number; y: number };
}

interface InsertionPoint {
  type: 'before' | 'after' | 'inside' | 'error';
  targetElement: HTMLElement;
  index?: number;
}

class DragMoveManager {
  private state: DragState;
  private targeter: NodeTargeter;

  constructor(elements: HTMLElement[], startPoint: { x: number; y: number }) {
    this.state = {
      isDragging: true,
      draggedElements: elements,
      tentativeInsertion: null,
      cursorOffset: this.calculateCursorOffset(elements[0], startPoint)
    };

    // Pre-calcola tutti i target validi
    this.targeter = new NodeTargeter(elements);
  }

  // Durante il drag
  drag(clientX: number, clientY: number, modifiers: ModifierKeys): void {
    // Aggiorna posizione visuale degli elementi trascinati
    this.updateDragHandlesPosition(clientX, clientY);

    // Determina punto di inserimento
    const isFreeMove = modifiers.metaKey || modifiers.ctrlKey;

    if (isFreeMove) {
      // Posizionamento assoluto
      this.state.tentativeInsertion = this.targeter.getAbsoluteInsertion(clientX, clientY);
    } else {
      // Inserimento relativo (come sibling)
      this.state.tentativeInsertion = this.targeter.getRelativeInsertion(clientX, clientY);
    }

    // Mostra indicatore drop
    this.showDropIndicator(this.state.tentativeInsertion);
  }

  // Fine del drag
  endDrag(): void {
    if (!this.state.tentativeInsertion || this.state.tentativeInsertion.type === 'error') {
      this.cancelDrag();
      return;
    }

    // Esegui inserimento
    for (const element of this.state.draggedElements) {
      this.insertElement(element, this.state.tentativeInsertion);
    }

    this.cleanup();
  }

  private insertElement(element: HTMLElement, insertion: InsertionPoint): void {
    const { targetElement, type, index } = insertion;

    switch (type) {
      case 'before':
        targetElement.parentElement?.insertBefore(element, targetElement);
        break;
      case 'after':
        targetElement.parentElement?.insertBefore(element, targetElement.nextSibling);
        break;
      case 'inside':
        if (index !== undefined) {
          targetElement.insertBefore(element, targetElement.children[index]);
        } else {
          targetElement.appendChild(element);
        }
        break;
    }
  }
}

// Calcola drop zones
class NodeTargeter {
  private dropZones: DropZone[];

  constructor(excludeElements: HTMLElement[]) {
    this.dropZones = this.calculateDropZones(excludeElements);
  }

  private calculateDropZones(exclude: HTMLElement[]): DropZone[] {
    const zones: DropZone[] = [];

    // Trova tutti i container validi
    document.querySelectorAll('[data-droppable]').forEach(container => {
      if (exclude.includes(container as HTMLElement)) return;

      const rect = container.getBoundingClientRect();
      zones.push({
        element: container as HTMLElement,
        rect,
        type: 'container'
      });

      // Aggiungi zone tra i figli per inserimento sibling
      const children = Array.from(container.children);
      children.forEach((child, index) => {
        const childRect = child.getBoundingClientRect();
        zones.push({
          element: child as HTMLElement,
          rect: {
            left: childRect.left,
            top: childRect.top - 5,
            width: childRect.width,
            height: 10
          },
          type: 'insertion-line',
          index
        });
      });
    });

    return zones;
  }

  getRelativeInsertion(x: number, y: number): InsertionPoint | null {
    for (const zone of this.dropZones) {
      if (this.pointInRect(x, y, zone.rect)) {
        return {
          type: zone.type === 'insertion-line' ? 'before' : 'inside',
          targetElement: zone.element,
          index: zone.index
        };
      }
    }
    return null;
  }
}
```

---

## 5. AST Code Updater

```typescript
// code-updater.ts
import * as babel from '@babel/core';
import * as t from '@babel/types';
import generate from '@babel/generator';
import traverse from '@babel/traverse';

interface StyleUpdate {
  property: string;
  value: string | number;
}

class CodeUpdater {
  // Aggiorna stile inline di un elemento JSX
  updateInlineStyle(
    code: string,
    line: number,
    col: number,
    updates: StyleUpdate[]
  ): string {
    const ast = babel.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    traverse(ast, {
      JSXOpeningElement(path) {
        const loc = path.node.loc;
        if (!loc || loc.start.line !== line) return;

        // Trova o crea attributo style
        let styleAttr = path.node.attributes.find(
          attr => t.isJSXAttribute(attr) && attr.name.name === 'style'
        ) as t.JSXAttribute | undefined;

        if (!styleAttr) {
          // Crea nuovo attributo style
          styleAttr = t.jsxAttribute(
            t.jsxIdentifier('style'),
            t.jsxExpressionContainer(t.objectExpression([]))
          );
          path.node.attributes.push(styleAttr);
        }

        // Aggiorna proprietà
        const styleExpr = (styleAttr.value as t.JSXExpressionContainer).expression;
        if (t.isObjectExpression(styleExpr)) {
          for (const update of updates) {
            this.updateObjectProperty(styleExpr, update.property, update.value);
          }
        }
      }
    });

    return generate(ast).code;
  }

  // Aggiorna className
  updateClassName(code: string, line: number, newClass: string): string {
    const ast = babel.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    traverse(ast, {
      JSXOpeningElement(path) {
        if (path.node.loc?.start.line !== line) return;

        const classAttr = path.node.attributes.find(
          attr => t.isJSXAttribute(attr) &&
            (attr.name.name === 'className' || attr.name.name === 'class')
        ) as t.JSXAttribute | undefined;

        if (classAttr && t.isStringLiteral(classAttr.value)) {
          classAttr.value = t.stringLiteral(newClass);
        }
      }
    });

    return generate(ast).code;
  }

  // Aggiorna testo contenuto
  updateTextContent(code: string, line: number, newText: string): string {
    const ast = babel.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    traverse(ast, {
      JSXElement(path) {
        if (path.node.loc?.start.line !== line) return;

        // Trova il primo figlio di testo
        const textChild = path.node.children.find(
          child => t.isJSXText(child)
        ) as t.JSXText | undefined;

        if (textChild) {
          textChild.value = newText;
        }
      }
    });

    return generate(ast).code;
  }

  private updateObjectProperty(
    obj: t.ObjectExpression,
    key: string,
    value: string | number
  ): void {
    const existing = obj.properties.find(
      prop => t.isObjectProperty(prop) &&
        ((t.isIdentifier(prop.key) && prop.key.name === key) ||
         (t.isStringLiteral(prop.key) && prop.key.value === key))
    ) as t.ObjectProperty | undefined;

    const valueNode = typeof value === 'number'
      ? t.numericLiteral(value)
      : t.stringLiteral(value);

    if (existing) {
      existing.value = valueNode;
    } else {
      obj.properties.push(
        t.objectProperty(t.identifier(key), valueNode)
      );
    }
  }
}
```

---

## 6. Selection Overlay & Handles

```typescript
// SelectionOverlay.tsx
interface SelectionOverlayProps {
  selectedElement: HTMLElement | null;
  onResize: (handle: ResizeHandle, deltaX: number, deltaY: number) => void;
  onMove: (deltaX: number, deltaY: number) => void;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selectedElement,
  onResize,
  onMove
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selectedElement) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      setRect(selectedElement.getBoundingClientRect());
    };

    updateRect();
    const observer = new ResizeObserver(updateRect);
    observer.observe(selectedElement);

    return () => observer.disconnect();
  }, [selectedElement]);

  if (!rect) return null;

  const handles: ResizeHandle[] = [
    'top', 'bottom', 'left', 'right',
    'top-left', 'top-right', 'bottom-left', 'bottom-right'
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {/* Selection border */}
      <div style={{
        position: 'absolute',
        inset: 0,
        border: '2px solid #8b5cf6',
        borderRadius: 2,
      }} />

      {/* Resize handles */}
      {handles.map(handle => (
        <ResizeHandle
          key={handle}
          position={handle}
          onDrag={(dx, dy) => onResize(handle, dx, dy)}
        />
      ))}

      {/* Move handle (top center) */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 16,
          background: '#8b5cf6',
          borderRadius: 4,
          cursor: 'move',
          pointerEvents: 'auto',
        }}
        onMouseDown={startMove}
      />
    </div>
  );
};

// Singolo resize handle
const ResizeHandle: React.FC<{
  position: ResizeHandle;
  onDrag: (dx: number, dy: number) => void;
}> = ({ position, onDrag }) => {
  const style = getHandleStyle(position);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (e: MouseEvent) => {
      onDrag(e.clientX - startX, e.clientY - startY);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      style={{
        ...style,
        width: 8,
        height: 8,
        background: '#fff',
        border: '2px solid #8b5cf6',
        borderRadius: 2,
        pointerEvents: 'auto',
        cursor: getCursor(position),
      }}
      onMouseDown={handleMouseDown}
    />
  );
};

function getHandleStyle(position: ResizeHandle): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute' };

  switch (position) {
    case 'top-left': return { ...base, top: -4, left: -4 };
    case 'top-right': return { ...base, top: -4, right: -4 };
    case 'bottom-left': return { ...base, bottom: -4, left: -4 };
    case 'bottom-right': return { ...base, bottom: -4, right: -4 };
    case 'top': return { ...base, top: -4, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom': return { ...base, bottom: -4, left: '50%', transform: 'translateX(-50%)' };
    case 'left': return { ...base, left: -4, top: '50%', transform: 'translateY(-50%)' };
    case 'right': return { ...base, right: -4, top: '50%', transform: 'translateY(-50%)' };
  }
}
```

---

## 7. Integration Flow

```typescript
// VisualEditor.tsx - Componente principale
const VisualEditor: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [sourceLocation, setSourceLocation] = useState<SourceLocation | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const focusHeuristics = useMemo(() => new FocusHeuristics(), []);
  const manipulator = useMemo(
    () => selectedElement ? new FreestyleManipulator(selectedElement) : null,
    [selectedElement]
  );
  const codeUpdater = useMemo(() => new CodeUpdater(), []);

  // Intercetta click nell'iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      const result = focusHeuristics.bestFocusTarget(e.target as HTMLElement);

      if (result) {
        setSelectedElement(result.element);
        setSourceLocation({
          file: result.sourceFile,
          line: result.sourceLine,
          col: result.sourceCol
        });
      }
    };

    iframe.contentDocument.addEventListener('click', handleClick);
    return () => iframe.contentDocument?.removeEventListener('click', handleClick);
  }, []);

  // Gestione resize
  const handleResize = async (handle: ResizeHandle, dx: number, dy: number) => {
    if (!manipulator || !sourceLocation) return;

    const newRect = manipulator.resize(handle, dx, dy, getModifiers());

    // Aggiorna codice sorgente
    const code = await readFile(sourceLocation.file);
    const newCode = codeUpdater.updateInlineStyle(code, sourceLocation.line, 0, [
      { property: 'width', value: `${newRect.width}px` },
      { property: 'height', value: `${newRect.height}px` },
    ]);

    await writeFile(sourceLocation.file, newCode);
    // Hot reload aggiornerà il preview
  };

  return (
    <div className="visual-editor">
      <iframe ref={iframeRef} src={previewUrl} />
      <SelectionOverlay
        selectedElement={selectedElement}
        onResize={handleResize}
        onMove={handleMove}
      />
      <PropertyPanel
        element={selectedElement}
        sourceLocation={sourceLocation}
        onPropertyChange={handlePropertyChange}
      />
    </div>
  );
};
```

---

## Risorse

- **Plasmic GitHub**: https://github.com/plasmicapp/plasmic
- **Click-to-Component**: https://github.com/ericclemmons/click-to-component
- **React Dev Inspector**: https://github.com/nicolo-ribaudo/nicolo-ribaudo/nicolo-ribaudo
- **Cursor Visual Editor Blog**: https://cursor.com/blog/browser-visual-editor

## Prossimi Passi per Design Editor

1. [ ] Implementare Babel plugin per source injection
2. [ ] Creare SelectionOverlay con resize handles
3. [ ] Implementare FreestyleManipulator
4. [ ] Creare AST CodeUpdater
5. [ ] Integrare drag-and-drop per riordinamento
6. [ ] Aggiungere PropertyPanel per editing diretto
7. [ ] Animation Discovery System

---

## 7. Animation Discovery System

### Struttura dati per animazioni rilevate

```typescript
// src/lib/animationDiscovery.ts

export interface DiscoveredAnimation {
  id: string;
  name: string;
  type: 'framer-motion' | 'css-keyframes' | 'css-transition' | 'gsap' | 'react-spring';
  filePath: string;
  line: number;
  column: number;

  // Dettagli specifici per tipo
  properties?: {
    duration?: number;
    delay?: number;
    easing?: string;
    repeat?: number | 'infinite';
  };

  // Per Framer Motion
  variants?: Record<string, object>;
  trigger?: 'whileHover' | 'whileTap' | 'whileInView' | 'animate' | 'exit';

  // Per CSS
  keyframes?: Array<{ offset: number; styles: Record<string, string> }>;

  // Elemento target
  targetSelector?: string;
  targetComponent?: string;
}

export interface AnimationGroup {
  component: string;
  filePath: string;
  animations: DiscoveredAnimation[];
}
```

### Detection Patterns

```typescript
// Regex patterns per rilevare animazioni

const ANIMATION_PATTERNS = {
  // Framer Motion
  framerMotion: {
    motionComponent: /motion\.(\w+)|<motion\.(\w+)/g,
    animate: /animate\s*=\s*\{([^}]+)\}/g,
    variants: /variants\s*=\s*\{([^}]+)\}/g,
    whileHover: /whileHover\s*=\s*\{([^}]+)\}/g,
    whileTap: /whileTap\s*=\s*\{([^}]+)\}/g,
    whileInView: /whileInView\s*=\s*\{([^}]+)\}/g,
    transition: /transition\s*=\s*\{([^}]+)\}/g,
    variantsDef: /const\s+(\w+)\s*=\s*\{[^}]*initial\s*:/g,
  },

  // CSS Animations
  css: {
    keyframes: /@keyframes\s+(\w+)\s*\{([^}]+)\}/g,
    animation: /animation\s*:\s*([^;]+);/g,
    animationName: /animation-name\s*:\s*(\w+)/g,
    transition: /transition\s*:\s*([^;]+);/g,
  },

  // GSAP
  gsap: {
    to: /gsap\.to\s*\(([^)]+)\)/g,
    from: /gsap\.from\s*\(([^)]+)\)/g,
    fromTo: /gsap\.fromTo\s*\(([^)]+)\)/g,
    timeline: /gsap\.timeline\s*\(/g,
    scrollTrigger: /ScrollTrigger\.create\s*\(/g,
  },

  // React Spring
  reactSpring: {
    useSpring: /useSpring\s*\(\s*\{([^}]+)\}/g,
    useSprings: /useSprings\s*\(/g,
    useTrail: /useTrail\s*\(/g,
    animated: /animated\.(\w+)|<animated\.(\w+)/g,
  },
};
```

### Funzione principale di discovery

```typescript
export function discoverAnimations(files: Record<string, string>): AnimationGroup[] {
  const groups: AnimationGroup[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    // Skip non-relevant files
    if (!filePath.match(/\.(tsx?|jsx?|css|scss)$/)) continue;

    const animations: DiscoveredAnimation[] = [];

    // Detect Framer Motion
    if (content.includes('motion.') || content.includes('from "framer-motion"')) {
      animations.push(...detectFramerMotion(content, filePath));
    }

    // Detect CSS animations
    if (filePath.match(/\.(css|scss)$/) || content.includes('@keyframes')) {
      animations.push(...detectCSSAnimations(content, filePath));
    }

    // Detect GSAP
    if (content.includes('gsap') || content.includes('ScrollTrigger')) {
      animations.push(...detectGSAP(content, filePath));
    }

    // Detect React Spring
    if (content.includes('react-spring') || content.includes('useSpring')) {
      animations.push(...detectReactSpring(content, filePath));
    }

    if (animations.length > 0) {
      groups.push({
        component: extractComponentName(filePath, content),
        filePath,
        animations,
      });
    }
  }

  return groups;
}
```

### UI Panel per Animations

```typescript
// Animations Panel component

interface AnimationsPanelProps {
  animations: AnimationGroup[];
  onSelectAnimation: (anim: DiscoveredAnimation) => void;
  onPreviewAnimation: (anim: DiscoveredAnimation) => void;
}

const AnimationsPanel: React.FC<AnimationsPanelProps> = ({
  animations,
  onSelectAnimation,
  onPreviewAnimation,
}) => {
  return (
    <div className="de-animations-panel">
      <div className="de-panel-header">
        <span className="de-panel-title">Animations</span>
        <span className="de-count">{animations.reduce((acc, g) => acc + g.animations.length, 0)}</span>
      </div>

      <div className="de-animations-list">
        {animations.map(group => (
          <div key={group.filePath} className="de-animation-group">
            <div className="de-group-header">
              <span className="de-component-name">{group.component}</span>
              <span className="de-file-path">{group.filePath}</span>
            </div>

            {group.animations.map(anim => (
              <div
                key={anim.id}
                className="de-animation-item"
                onClick={() => onSelectAnimation(anim)}
              >
                <span className="de-anim-icon">
                  {getAnimationIcon(anim.type)}
                </span>
                <span className="de-anim-name">{anim.name}</span>
                <span className="de-anim-type">{anim.type}</span>
                <button
                  className="de-preview-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewAnimation(anim);
                  }}
                >
                  ▶
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Preview Animation nel Canvas

```typescript
// Inject animation preview into iframe

function previewAnimation(
  iframe: HTMLIFrameElement,
  animation: DiscoveredAnimation
): void {
  if (!iframe.contentWindow) return;

  // Send message to iframe to trigger animation
  iframe.contentWindow.postMessage({
    type: 'preview-animation',
    animationId: animation.id,
    targetSelector: animation.targetSelector,
    // For CSS, inject temporary animation
    cssAnimation: animation.type === 'css-keyframes' ? {
      keyframes: animation.keyframes,
      properties: animation.properties,
    } : null,
  }, '*');
}
```

### Timeline Editor (Future)

```typescript
// Visual timeline for editing keyframes

interface TimelineEditorProps {
  animation: DiscoveredAnimation;
  onUpdate: (keyframes: Keyframe[]) => void;
}

const TimelineEditor: React.FC<TimelineEditorProps> = ({
  animation,
  onUpdate,
}) => {
  // Render draggable keyframe points on timeline
  // Allow editing easing curves
  // Preview changes in real-time

  return (
    <div className="de-timeline-editor">
      <div className="de-timeline-track">
        {/* Timeline with keyframes */}
      </div>
      <div className="de-easing-editor">
        {/* Bezier curve editor */}
      </div>
    </div>
  );
};
```

### Integrazione con Code Editor

Quando si clicca su un'animazione:
1. Apri il file nel Code Panel
2. Scroll alla linea dell'animazione
3. Evidenzia il blocco di codice
4. Mostra tooltip con proprietà editabili
