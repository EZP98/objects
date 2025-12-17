import { useState, useEffect, useCallback, useRef } from 'react';
import { WebContainer } from '@webcontainer/api';
import {
  getWebContainer,
  writeFiles,
  installDependencies,
  startDevServer,
  createViteReactProject,
} from '../webcontainer';

export type WebContainerStatus =
  | 'idle'
  | 'booting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error';

export interface UseWebContainerReturn {
  status: WebContainerStatus;
  previewUrl: string | null;
  logs: string[];
  error: string | null;
  container: WebContainer | null;
  boot: () => Promise<void>;
  runProject: (files?: Record<string, string>) => Promise<void>;
  updateFile: (path: string, content: string) => Promise<void>;
}

export function useWebContainer(): UseWebContainerReturn {
  const [status, setStatus] = useState<WebContainerStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<WebContainer | null>(null);

  const addLog = useCallback((log: string) => {
    setLogs(prev => [...prev.slice(-100), log]); // Keep last 100 logs
  }, []);

  // Listen for server-ready events
  useEffect(() => {
    const handleServerReady = (e: CustomEvent<{ port: number; url: string }>) => {
      console.log('[useWebContainer] Server ready:', e.detail.url);
      setPreviewUrl(e.detail.url);
      setStatus('ready');
      addLog(`Server ready at ${e.detail.url}`);
    };

    const handleError = (e: CustomEvent<{ error: string }>) => {
      setError(e.detail.error);
      setStatus('error');
      addLog(`Error: ${e.detail.error}`);
    };

    window.addEventListener('webcontainer:server-ready', handleServerReady as EventListener);
    window.addEventListener('webcontainer:error', handleError as EventListener);

    return () => {
      window.removeEventListener('webcontainer:server-ready', handleServerReady as EventListener);
      window.removeEventListener('webcontainer:error', handleError as EventListener);
    };
  }, [addLog]);

  const boot = useCallback(async () => {
    if (containerRef.current) return;

    try {
      setStatus('booting');
      setError(null);
      addLog('Booting WebContainer...');

      const container = await getWebContainer();
      containerRef.current = container;

      addLog('WebContainer ready!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to boot WebContainer';
      setError(errorMessage);
      setStatus('error');
      addLog(`Boot failed: ${errorMessage}`);
    }
  }, [addLog]);

  const runProject = useCallback(async (files?: Record<string, string>) => {
    try {
      // Boot if not already booted
      if (!containerRef.current) {
        setStatus('booting');
        addLog('Booting WebContainer...');
        containerRef.current = await getWebContainer();
        addLog('WebContainer ready!');
      }

      const container = containerRef.current;
      const projectFiles = files || createViteReactProject();

      console.log('[WebContainer] Writing', Object.keys(projectFiles).length, 'files');

      // Write files
      setStatus('installing');
      addLog('Writing project files...');
      await writeFiles(container, projectFiles);

      // Install dependencies
      addLog('Installing dependencies (this may take a moment)...');
      const success = await installDependencies(container, addLog);

      if (!success) {
        setStatus('error');
        setError('Failed to install dependencies');
        return;
      }

      // Start dev server
      setStatus('starting');
      addLog('Starting development server...');
      await startDevServer(container, 'npm run dev', addLog);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run project';
      setError(errorMessage);
      setStatus('error');
      addLog(`Error: ${errorMessage}`);
    }
  }, [addLog]);

  const updateFile = useCallback(async (path: string, content: string) => {
    if (!containerRef.current) {
      console.warn('[useWebContainer] Container not ready');
      return;
    }

    try {
      await containerRef.current.fs.writeFile(path, content);
      addLog(`Updated: ${path}`);
    } catch (err) {
      console.error('[useWebContainer] Failed to update file:', err);
      addLog(`Failed to update: ${path}`);
    }
  }, [addLog]);

  return {
    status,
    previewUrl,
    logs,
    error,
    container: containerRef.current,
    boot,
    runProject,
    updateFile,
  };
}
