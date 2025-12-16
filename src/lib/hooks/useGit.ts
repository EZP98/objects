import { useState, useCallback, useRef, useEffect } from 'react';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { Buffer } from 'buffer';
import { WebContainer } from '@webcontainer/api';
import { getWebContainer } from '../webcontainer';

// Polyfill Buffer for browser
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

const API_URL = 'https://design-editor-api.eziopappalardo98.workers.dev';

interface FileData {
  [path: string]: {
    data: string | Uint8Array;
    encoding?: string;
  };
}

export function useGit() {
  const [ready, setReady] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const containerRef = useRef<WebContainer | null>(null);
  const fileData = useRef<FileData>({});

  // Initialize WebContainer
  useEffect(() => {
    const init = async () => {
      try {
        containerRef.current = await getWebContainer();
        setReady(true);
      } catch (e) {
        console.error('Failed to get WebContainer:', e);
      }
    };
    init();
  }, []);

  const gitClone = useCallback(
    async (url: string): Promise<{ workdir: string; files: Record<string, string> }> => {
      if (!containerRef.current || !ready) {
        throw new Error('WebContainer not ready');
      }

      setCloning(true);
      setProgress('Initializing...');
      fileData.current = {};

      const webcontainer = containerRef.current;

      // Extract branch if specified (url#branch)
      let branch: string | undefined;
      let baseUrl = url;
      if (url.includes('#')) {
        [baseUrl, branch] = url.split('#');
      }

      try {
        setProgress('Cloning repository...');

        // Create a custom fs that works with WebContainer
        const fs = {
          promises: {
            readFile: async (path: string, options?: { encoding?: string }) => {
              const absolutePath = path.startsWith('/') ? path : '/' + path;
              try {
                const content = await webcontainer.fs.readFile(absolutePath, options?.encoding as 'utf-8' | undefined);
                return content;
              } catch (e) {
                throw Object.assign(new Error(`ENOENT: ${absolutePath}`), { code: 'ENOENT' });
              }
            },
            writeFile: async (path: string, data: string | Uint8Array) => {
              // Ensure absolute path for WebContainer
              const absolutePath = path.startsWith('/') ? path : '/' + path;

              // Store file data for later use (relative path for the files object)
              const pathStr = absolutePath.startsWith('/') ? absolutePath.slice(1) : absolutePath;
              fileData.current[pathStr] = {
                data,
                encoding: typeof data === 'string' ? 'utf-8' : undefined,
              };

              // Create directories if needed
              const parts = absolutePath.split('/').filter(Boolean);
              if (parts.length > 1) {
                const dir = '/' + parts.slice(0, -1).join('/');
                try {
                  await webcontainer.fs.mkdir(dir, { recursive: true });
                } catch (e) {
                  // Directory might already exist
                }
              }

              await webcontainer.fs.writeFile(absolutePath, data);
            },
            mkdir: async (path: string, options?: { recursive?: boolean }) => {
              const absolutePath = path.startsWith('/') ? path : '/' + path;
              await webcontainer.fs.mkdir(absolutePath, options);
            },
            rmdir: async (path: string, options?: { recursive?: boolean }) => {
              const absolutePath = path.startsWith('/') ? path : '/' + path;
              await webcontainer.fs.rm(absolutePath, { recursive: options?.recursive });
            },
            unlink: async (path: string) => {
              const absolutePath = path.startsWith('/') ? path : '/' + path;
              await webcontainer.fs.rm(absolutePath);
            },
            stat: async (path: string) => {
              const absolutePath = path.startsWith('/') ? path : '/' + path;
              try {
                const parentDir = absolutePath.split('/').slice(0, -1).join('/') || '/';
                const entries = await webcontainer.fs.readdir(parentDir);
                const name = absolutePath.split('/').pop();
                const entry = entries.find((e: string) => e === name);
                if (entry) {
                  return {
                    isFile: () => true,
                    isDirectory: () => false,
                    isSymbolicLink: () => false,
                  };
                }
                throw new Error('Not found');
              } catch (e) {
                throw Object.assign(new Error(`ENOENT: ${absolutePath}`), { code: 'ENOENT' });
              }
            },
            lstat: async (path: string) => {
              const absolutePath = path.startsWith('/') ? path : '/' + path;
              return fs.promises.stat(absolutePath);
            },
            readdir: async (path: string) => {
              const absolutePath = path.startsWith('/') ? path : '/' + path;
              const entries = await webcontainer.fs.readdir(absolutePath, { withFileTypes: true });
              return entries.map((e: { name: string }) => e.name);
            },
            readlink: async () => {
              throw new Error('Not supported');
            },
            symlink: async () => {
              throw new Error('Not supported');
            },
            chmod: async () => { /* no-op */ },
          },
        };

        // Get OAuth token from localStorage if available
        const repoData = localStorage.getItem('current-github-repo');
        let authToken: string | null = null;
        if (repoData) {
          try {
            const repo = JSON.parse(repoData);
            // Fetch token from our API
            if (repo.userId) {
              const tokenRes = await fetch(`${API_URL}/api/github/token?userId=${repo.userId}`);
              if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                authToken = tokenData.token;
              }
            }
          } catch (e) {
            console.warn('Could not get auth token:', e);
          }
        }

        await git.clone({
          fs,
          http,
          dir: '/home/project',
          url: baseUrl,
          depth: 1,
          singleBranch: true,
          ref: branch,
          corsProxy: `${API_URL}/api/git-proxy`,
          headers: authToken ? {
            'Authorization': `Bearer ${authToken}`,
          } : {},
          onProgress: (event) => {
            if (event.phase) {
              setProgress(`${event.phase}: ${event.loaded || 0}/${event.total || '?'}`);
            }
          },
          onAuth: () => {
            // If we have a token, use it
            if (authToken) {
              return { username: authToken, password: 'x-oauth-basic' };
            }
            return { cancel: true };
          },
        });

        setProgress('Processing files...');

        // Auto-detect and setup .env file
        // Priority: .env.production > .env.local > .env.example
        const envFallbacks = ['.env.production', '.env.local', '.env.example'];
        let hasEnv = false;

        // Check if .env exists
        for (const [path] of Object.entries(fileData.current)) {
          const relativePath = path.replace(/^(\/)?home\/project\//, '');
          if (relativePath === '.env') {
            hasEnv = true;
            break;
          }
        }

        // If no .env, try to copy from fallbacks
        if (!hasEnv) {
          for (const fallback of envFallbacks) {
            let envContent: string | null = null;

            for (const [path, value] of Object.entries(fileData.current)) {
              const relativePath = path.replace(/^(\/)?home\/project\//, '');
              if (relativePath === fallback) {
                if (typeof value.data === 'string') {
                  envContent = value.data;
                } else {
                  try {
                    envContent = new TextDecoder('utf-8').decode(value.data);
                  } catch (e) {
                    // Not a text file
                  }
                }
                break;
              }
            }

            if (envContent) {
              console.log(`[useGit] Creating .env from ${fallback}`);
              // Write .env to WebContainer
              await webcontainer.fs.writeFile('/home/project/.env', envContent);
              // Also add to fileData
              fileData.current['home/project/.env'] = { data: envContent, encoding: 'utf-8' };
              break;
            }
          }
        }

        // Binary file extensions that should not be converted to text
        const binaryExtensions = new Set([
          '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
          '.woff', '.woff2', '.ttf', '.eot', '.otf',
          '.mp3', '.mp4', '.wav', '.ogg', '.webm',
          '.pdf', '.zip', '.tar', '.gz',
          '.exe', '.dll', '.so', '.dylib',
        ]);

        // Check if file is binary based on extension
        const isBinaryFile = (filename: string) => {
          const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
          return binaryExtensions.has(ext);
        };

        // Convert stored file data to string format
        // Strip 'home/project/' prefix from paths so they're relative to the project root
        const files: Record<string, string> = {};
        for (const [path, value] of Object.entries(fileData.current)) {
          // Remove the home/project/ prefix to get relative paths
          let relativePath = path;
          if (path.startsWith('home/project/')) {
            relativePath = path.slice('home/project/'.length);
          } else if (path.startsWith('/home/project/')) {
            relativePath = path.slice('/home/project/'.length);
          }

          // Skip .git directory files
          if (relativePath.startsWith('.git/') || relativePath === '.git') {
            continue;
          }

          // Skip binary files for the files object (they're already written to WebContainer)
          if (isBinaryFile(relativePath)) {
            // Mark as binary placeholder for file tree display
            files[relativePath] = '[binary file]';
            continue;
          }

          if (typeof value.data === 'string') {
            files[relativePath] = value.data;
          } else {
            // Try to decode as UTF-8, but check if it's valid text
            try {
              const text = new TextDecoder('utf-8', { fatal: true }).decode(value.data);
              files[relativePath] = text;
            } catch (e) {
              // If decoding fails, it's likely a binary file
              files[relativePath] = '[binary file]';
            }
          }
        }

        setCloning(false);
        setProgress('');

        return { workdir: '/home/project', files };
      } catch (error) {
        setCloning(false);
        setProgress('');
        console.error('Git clone error:', error);
        throw error;
      }
    },
    [ready]
  );

  return {
    ready,
    cloning,
    progress,
    gitClone,
  };
}
