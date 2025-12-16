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
