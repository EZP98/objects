import { WebContainer } from '@webcontainer/api';

// Singleton WebContainer instance
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export interface WebContainerContext {
  loaded: boolean;
  error: string | null;
}

export const webcontainerContext: WebContainerContext = {
  loaded: false,
  error: null,
};

/**
 * Boot or get the WebContainer instance
 * Returns a singleton instance that persists across hot reloads
 */
export async function getWebContainer(): Promise<WebContainer> {
  // Return existing instance if available
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  // Return existing boot promise if already booting
  if (bootPromise) {
    return bootPromise;
  }

  // Start booting
  bootPromise = bootWebContainer();
  return bootPromise;
}

async function bootWebContainer(): Promise<WebContainer> {
  try {
    console.log('[WebContainer] Booting...');

    const instance = await WebContainer.boot({
      coep: 'credentialless',
      workdirName: 'project',
    });

    webcontainerInstance = instance;
    webcontainerContext.loaded = true;
    webcontainerContext.error = null;

    console.log('[WebContainer] Ready!');

    // Listen for server-ready events
    instance.on('server-ready', (port, url) => {
      console.log(`[WebContainer] Server ready on port ${port}: ${url}`);
      window.dispatchEvent(new CustomEvent('webcontainer:server-ready', {
        detail: { port, url }
      }));
    });

    // Listen for errors
    instance.on('error', (error) => {
      console.error('[WebContainer] Error:', error);
      webcontainerContext.error = error.message;
      window.dispatchEvent(new CustomEvent('webcontainer:error', {
        detail: { error: error.message }
      }));
    });

    return instance;
  } catch (error) {
    console.error('[WebContainer] Boot failed:', error);
    webcontainerContext.error = error instanceof Error ? error.message : 'Unknown error';
    bootPromise = null;
    throw error;
  }
}

/**
 * Write files to the WebContainer file system
 */
export async function writeFiles(
  container: WebContainer,
  files: Record<string, string>,
  baseDir: string = '/home/project'
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    // Skip binary file placeholders - they're already written by git clone
    if (content === '[binary file]') {
      console.log(`[WebContainer] Skipping binary file: ${path}`);
      continue;
    }

    // Ensure absolute path within project directory
    const absolutePath = path.startsWith('/') ? path : `${baseDir}/${path}`;
    const parts = absolutePath.split('/').filter(Boolean);
    const dirPath = '/' + parts.slice(0, -1).join('/');

    // Create directories if needed
    if (dirPath && dirPath !== '/') {
      try {
        await container.fs.mkdir(dirPath, { recursive: true });
      } catch (e) {
        // Directory might already exist
      }
    }

    // Write the file
    await container.fs.writeFile(absolutePath, content);
    console.log(`[WebContainer] Wrote file: ${absolutePath}`);
  }
}

/**
 * Run npm install in the WebContainer
 */
export async function installDependencies(
  container: WebContainer,
  onLog?: (log: string) => void,
  cwd?: string
): Promise<boolean> {
  console.log('[WebContainer] Installing dependencies...');
  onLog?.('Installing dependencies...');

  // Use jsh (WebContainer's shell) to run npm install
  const installProcess = await container.spawn('npm', ['install'], {
    cwd: cwd || '/home/project',
  });

  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log('[npm]', data);
        onLog?.(data);
      },
    })
  );

  const exitCode = await installProcess.exit;

  if (exitCode !== 0) {
    console.error('[WebContainer] npm install failed with code:', exitCode);
    onLog?.(`npm install failed with code: ${exitCode}`);
    return false;
  }

  console.log('[WebContainer] Dependencies installed!');
  onLog?.('Dependencies installed!');
  return true;
}

/**
 * Start the dev server in the WebContainer
 */
export async function startDevServer(
  container: WebContainer,
  command: string = 'npm run dev',
  onLog?: (log: string) => void,
  cwd?: string
): Promise<void> {
  const [cmd, ...args] = command.split(' ');

  console.log(`[WebContainer] Starting: ${command}`);
  onLog?.(`Starting: ${command}`);

  const serverProcess = await container.spawn(cmd, args, {
    cwd: cwd || '/home/project',
  });

  serverProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        console.log('[dev]', data);
        onLog?.(data);
      },
    })
  );
}

/**
 * Create a basic Vite + React project structure
 */
export function createViteReactProject(componentCode?: string): Record<string, string> {
  const appCode = componentCode || `
function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Hello World!</h1>
        <p style={{ opacity: 0.8 }}>Edit the code to see changes</p>
      </div>
    </div>
  );
}

export default App;
`.trim();

  return {
    'package.json': JSON.stringify({
      name: 'vite-react-project',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.2.0',
        'vite': '^5.0.0'
      }
    }, null, 2),

    'vite.config.js': `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  }
});
`.trim(),

    'index.html': `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`.trim(),

    'src/main.jsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`.trim(),

    'src/App.jsx': appCode,
  };
}

// NOTE: Old bridge injection removed - now using @objects/editable-runtime
// The runtime is included in generated code, not injected after the fact

/**
 * Create a Vite + React project with editable-runtime for visual editing
 */
export function createEditableViteProject(components?: {
  id: string;
  component: string;
  props: Record<string, unknown>;
}[]): Record<string, string> {
  // Inline editable-runtime code (since it's not published to npm)
  const editableRuntimeCode = `
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// Context for edit mode
const EditableContext = createContext({
  isEditMode: false,
  selectedId: null,
  hoveredId: null,
  selectElement: () => {},
  hoverElement: () => {},
  registerElement: () => {},
  unregisterElement: () => {},
});

export const useEditable = () => useContext(EditableContext);

// Provider component
export function EditableProvider({ children, defaultEditMode = false }) {
  const [isEditMode, setIsEditMode] = useState(defaultEditMode);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const elementsRef = useRef(new Map());

  // Handle messages from parent
  useEffect(() => {
    const handleMessage = (event) => {
      const { type, ...data } = event.data || {};

      switch (type) {
        case 'objects:enable-edit-mode':
          setIsEditMode(true);
          break;
        case 'objects:disable-edit-mode':
          setIsEditMode(false);
          setSelectedId(null);
          setHoveredId(null);
          break;
        case 'objects:select':
          setSelectedId(data.id);
          break;
        case 'objects:update-props':
          const el = elementsRef.current.get(data.id);
          if (el?.setProps) {
            el.setProps(data.props);
            window.parent.postMessage({
              type: 'objects:props-changed',
              id: data.id,
              props: data.props,
            }, '*');
          }
          break;
        case 'objects:update-style':
          const styleEl = document.querySelector(\`[data-objects-id="\${data.id}"]\`);
          if (styleEl) {
            Object.assign(styleEl.style, data.style);
          }
          break;
        case 'objects:ping':
          window.parent.postMessage({ type: 'objects:pong' }, '*');
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Send ready signal
    window.parent.postMessage({ type: 'objects:ready', version: '1.0.0' }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const selectElement = useCallback((id, info) => {
    setSelectedId(id);
    // Get element styles
    const element = document.querySelector(\`[data-objects-id="\${id}"]\`);
    let styles = {};
    let computedStyles = {};
    let tagName = 'div';
    let className = '';
    let textContent = undefined;

    if (element) {
      tagName = element.tagName;
      className = element.className;
      // Get text content if single text node
      if (element.childNodes.length === 1 && element.firstChild?.nodeType === 3) {
        textContent = element.textContent;
      }
      // Get inline styles
      for (let i = 0; i < element.style.length; i++) {
        const prop = element.style[i];
        styles[prop] = element.style.getPropertyValue(prop);
      }
      // Get computed styles
      const computed = window.getComputedStyle(element);
      const props = ['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
        'padding', 'width', 'height', 'backgroundColor', 'color', 'opacity',
        'borderWidth', 'borderColor', 'borderRadius', 'fontFamily', 'fontSize',
        'fontWeight', 'lineHeight', 'textAlign', 'boxShadow'];
      props.forEach(p => {
        computedStyles[p] = computed.getPropertyValue(p.replace(/([A-Z])/g, '-$1').toLowerCase());
      });
    }

    window.parent.postMessage({
      type: 'objects:selected',
      id,
      componentName: info.componentName,
      props: info.props,
      rect: info.rect,
      styles,
      computedStyles,
      tagName,
      className,
      textContent,
    }, '*');
  }, []);

  const hoverElement = useCallback((id, rect) => {
    setHoveredId(id);
    window.parent.postMessage({
      type: 'objects:hover',
      id,
      rect,
    }, '*');
  }, []);

  const registerElement = useCallback((id, info) => {
    elementsRef.current.set(id, info);
  }, []);

  const unregisterElement = useCallback((id) => {
    elementsRef.current.delete(id);
  }, []);

  return React.createElement(EditableContext.Provider, {
    value: {
      isEditMode,
      selectedId,
      hoveredId,
      selectElement,
      hoverElement,
      registerElement,
      unregisterElement,
    }
  }, children);
}

// Editable wrapper component
export function Editable({ id, component: Component, props, displayName, children }) {
  const { isEditMode, selectedId, hoveredId, selectElement, hoverElement, registerElement, unregisterElement } = useEditable();
  const wrapperRef = useRef(null);
  const [localProps, setLocalProps] = useState(props);
  const isSelected = selectedId === id;
  const isHovered = hoveredId === id;

  // Register element
  useEffect(() => {
    registerElement(id, {
      componentName: displayName || Component.displayName || Component.name,
      props: localProps,
      setProps: setLocalProps,
    });
    return () => unregisterElement(id);
  }, [id, displayName, localProps, registerElement, unregisterElement]);

  // Get bounding rect
  const getRect = useCallback(() => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    };
  }, []);

  const handleClick = useCallback((e) => {
    if (!isEditMode) return;
    e.stopPropagation();
    selectElement(id, {
      componentName: displayName || Component.displayName || Component.name,
      props: localProps,
      rect: getRect(),
    });
  }, [isEditMode, id, displayName, localProps, getRect, selectElement]);

  const handleMouseEnter = useCallback(() => {
    if (!isEditMode || isSelected) return;
    hoverElement(id, getRect());
  }, [isEditMode, isSelected, id, getRect, hoverElement]);

  const handleMouseLeave = useCallback(() => {
    if (!isEditMode) return;
    hoverElement(null, null);
  }, [isEditMode, hoverElement]);

  if (!isEditMode) {
    return React.createElement(Component, localProps, children);
  }

  return React.createElement('div', {
    ref: wrapperRef,
    'data-objects-id': id,
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    style: {
      position: 'relative',
      cursor: 'pointer',
      outline: isSelected ? '2px solid #3b82f6' : isHovered ? '2px solid #93c5fd' : 'none',
      outlineOffset: '2px',
    },
  }, [
    React.createElement(Component, { key: 'component', ...localProps }, children),
    isSelected && React.createElement('div', {
      key: 'label',
      style: {
        position: 'absolute',
        top: -24,
        left: 0,
        background: '#3b82f6',
        color: 'white',
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 4,
        whiteSpace: 'nowrap',
      },
    }, displayName || Component.displayName || Component.name || id),
  ]);
}
`.trim();

  // Default components if none provided
  const defaultComponents = components || [
    {
      id: 'hero-section',
      component: 'Hero',
      props: {
        title: 'Welcome to Your App',
        subtitle: 'Click on elements to edit them',
        buttonText: 'Get Started',
      },
    },
  ];

  // Generate component imports and renders
  const componentRenders = defaultComponents.map(c =>
    `      <Editable
        id="${c.id}"
        component={${c.component}}
        props={${JSON.stringify(c.props, null, 8).replace(/\n/g, '\n        ')}}
        displayName="${c.component}"
      />`
  ).join('\n');

  // Generate component definitions (simple example components)
  const componentDefinitions = `
// Example components - replace with your own
function Hero({ title, subtitle, buttonText }) {
  return (
    <div style={{
      padding: '80px 20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{title}</h1>
      <p style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '2rem' }}>{subtitle}</p>
      <button style={{
        padding: '12px 32px',
        fontSize: '1rem',
        fontWeight: 600,
        color: '#667eea',
        background: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
      }}>{buttonText}</button>
    </div>
  );
}
`;

  const appCode = `
import React from 'react';
import { EditableProvider, Editable } from './editable-runtime';

${componentDefinitions}

function App() {
  return (
    <EditableProvider>
      <div style={{ minHeight: '100vh' }}>
${componentRenders}
      </div>
    </EditableProvider>
  );
}

export default App;
`.trim();

  return {
    'package.json': JSON.stringify({
      name: 'editable-vite-project',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.2.0',
        'vite': '^5.0.0'
      }
    }, null, 2),

    'vite.config.js': `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  }
});
`.trim(),

    'index.html': `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Editable Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`.trim(),

    'src/main.jsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`.trim(),

    'src/App.jsx': appCode,

    'src/editable-runtime.js': editableRuntimeCode,
  };
}
