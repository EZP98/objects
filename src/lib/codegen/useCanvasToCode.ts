/**
 * useCanvasToCode Hook
 *
 * Connects Canvas state to React code generation.
 * When canvas elements change, regenerates code and writes to WebContainer.
 *
 * Flow:
 * Canvas (Zustand) → debounce → generateReactCode() → WebContainer → HMR
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useCanvasStore } from '../canvas/canvasStore';
import { generateReactCode, GeneratedFiles } from './generateReactCode';
import { getWebContainer, writeFiles } from '../webcontainer';
import { WebContainer } from '@webcontainer/api';

interface UseCanvasToCodeOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Enable/disable auto-sync (default: true) */
  enabled?: boolean;
  /** Callback when code is generated */
  onCodeGenerated?: (files: GeneratedFiles) => void;
  /** Callback when files are written to WebContainer */
  onFilesWritten?: (paths: string[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseCanvasToCodeReturn {
  /** Manually trigger code generation */
  generateNow: () => Promise<void>;
  /** Last generated files */
  generatedFiles: GeneratedFiles | null;
  /** Is currently generating/writing */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSyncAt: number | null;
  /** Any error that occurred */
  error: Error | null;
}

/**
 * Hook that syncs Canvas state to WebContainer as React code
 */
export function useCanvasToCode(
  options: UseCanvasToCodeOptions = {}
): UseCanvasToCodeReturn {
  const {
    debounceMs = 300,
    enabled = true,
    onCodeGenerated,
    onFilesWritten,
    onError,
  } = options;

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFiles | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webcontainerRef = useRef<WebContainer | null>(null);
  const isInitializedRef = useRef(false);

  // Get canvas state
  const elements = useCanvasStore((state) => state.elements);
  const pages = useCanvasStore((state) => state.pages);

  /**
   * Generate code and write to WebContainer
   */
  const syncToWebContainer = useCallback(async () => {
    if (!enabled) return;

    setIsSyncing(true);
    setError(null);

    try {
      // Generate React code from canvas state
      const files = generateReactCode(elements, pages);
      setGeneratedFiles(files);
      onCodeGenerated?.(files);

      console.log('[CanvasToCode] Generated files:', Object.keys(files));

      // Get or boot WebContainer
      if (!webcontainerRef.current) {
        webcontainerRef.current = await getWebContainer();
      }

      // Write files to WebContainer
      await writeFiles(webcontainerRef.current, files, '');

      const paths = Object.keys(files);
      onFilesWritten?.(paths);
      setLastSyncAt(Date.now());

      console.log('[CanvasToCode] Files written to WebContainer');

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[CanvasToCode] Error:', error);
      setError(error);
      onError?.(error);
    } finally {
      setIsSyncing(false);
    }
  }, [elements, pages, enabled, onCodeGenerated, onFilesWritten, onError]);

  /**
   * Debounced sync - called when canvas changes
   */
  const debouncedSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      syncToWebContainer();
    }, debounceMs);
  }, [syncToWebContainer, debounceMs]);

  /**
   * Manual trigger (bypasses debounce)
   */
  const generateNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await syncToWebContainer();
  }, [syncToWebContainer]);

  /**
   * Watch for canvas changes and trigger debounced sync
   */
  useEffect(() => {
    if (!enabled) return;

    // Skip initial render to avoid double-sync
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      // Do initial sync
      syncToWebContainer();
      return;
    }

    // Debounced sync on changes
    debouncedSync();

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [elements, pages, enabled, debouncedSync, syncToWebContainer]);

  return {
    generateNow,
    generatedFiles,
    isSyncing,
    lastSyncAt,
    error,
  };
}

/**
 * Standalone function to sync canvas to WebContainer (non-hook version)
 * Useful for one-off syncs or from outside React components
 */
export async function syncCanvasToWebContainer(): Promise<GeneratedFiles> {
  const { elements, pages } = useCanvasStore.getState();

  // Generate code
  const files = generateReactCode(elements, pages);

  // Write to WebContainer
  const container = await getWebContainer();
  await writeFiles(container, files, '');

  console.log('[CanvasToCode] Manual sync complete:', Object.keys(files));

  return files;
}
