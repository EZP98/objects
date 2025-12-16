/**
 * Design Editor API - Cloudflare Worker
 * Handles GitHub OAuth and user data storage
 */

const FRONTEND_URL = 'https://design-editor-7f9.pages.dev';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Git-Protocol, Accept',
};

// Handle OPTIONS for CORS
function handleOptions(request) {
  // Handle preflight for git-proxy with Authorization header
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Git-Protocol, Accept',
    'Access-Control-Max-Age': '86400',
  };

  return new Response(null, { headers });
}

// JSON response helper
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Main request handler
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      // ============================================
      // GITHUB OAUTH ENDPOINTS
      // ============================================

      // Check GitHub status
      if (path === '/api/github/status') {
        const configured = !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
        const userId = url.searchParams.get('userId') || 'default';
        const token = await env.TOKENS.get(`token:${userId}`);

        return jsonResponse({
          configured,
          authenticated: !!token,
        });
      }

      // Start OAuth flow
      if (path === '/api/github/auth') {
        if (!env.GITHUB_CLIENT_ID) {
          return jsonResponse({ error: 'GitHub not configured' }, 500);
        }

        const state = crypto.randomUUID();
        const scope = 'repo read:user';
        const redirectUri = `${url.origin}/api/github/callback`;

        const authUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

        return jsonResponse({ authUrl, state });
      }

      // OAuth callback
      if (path === '/api/github/callback') {
        const code = url.searchParams.get('code');

        if (!code) {
          return Response.redirect(`${FRONTEND_URL}?github_error=no_code`);
        }

        // Exchange code for token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          return Response.redirect(`${FRONTEND_URL}?github_error=${tokenData.error}`);
        }

        const accessToken = tokenData.access_token;

        // Get user info
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Design-Editor',
          },
        });

        const userInfo = await userResponse.json();

        // Store token in KV
        await env.TOKENS.put(`token:${userInfo.login}`, accessToken, {
          expirationTtl: 60 * 60 * 24 * 30, // 30 days
        });

        // Store user info
        await env.TOKENS.put(`user:${userInfo.login}`, JSON.stringify(userInfo), {
          expirationTtl: 60 * 60 * 24 * 30,
        });

        return Response.redirect(`${FRONTEND_URL}?github_connected=true&github_user=${userInfo.login}`);
      }

      // Logout
      if (path === '/api/github/logout' && request.method === 'POST') {
        const body = await request.json();
        const userId = body.userId || 'default';

        await env.TOKENS.delete(`token:${userId}`);
        await env.TOKENS.delete(`user:${userId}`);

        return jsonResponse({ success: true });
      }

      // Get user repos
      if (path === '/api/github/repos') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
          return jsonResponse({ error: 'userId required' }, 400);
        }

        const token = await env.TOKENS.get(`token:${userId}`);

        if (!token) {
          return jsonResponse({ error: 'Not authenticated' }, 401);
        }

        const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Design-Editor',
          },
        });

        const repos = await reposResponse.json();

        // Simplify response
        const simplified = repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          cloneUrl: repo.clone_url,
          htmlUrl: repo.html_url,
          updatedAt: repo.updated_at,
          language: repo.language,
          homepage: repo.homepage,
        }));

        return jsonResponse(simplified);
      }

      // Get repository file tree
      if (path.startsWith('/api/github/tree/')) {
        const parts = path.replace('/api/github/tree/', '').split('/');
        const owner = parts[0];
        const repo = parts[1];
        const userId = url.searchParams.get('userId');

        if (!userId || !owner || !repo) {
          return jsonResponse({ error: 'Missing parameters' }, 400);
        }

        const token = await env.TOKENS.get(`token:${userId}`);
        if (!token) {
          return jsonResponse({ error: 'Not authenticated' }, 401);
        }

        // Get default branch first
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Design-Editor',
          },
        });
        const repoData = await repoRes.json();
        const branch = repoData.default_branch || 'main';

        // Get tree recursively
        const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Design-Editor',
          },
        });
        const treeData = await treeRes.json();

        return jsonResponse({
          branch,
          tree: treeData.tree || [],
        });
      }

      // Get file content
      if (path.startsWith('/api/github/file/')) {
        const parts = path.replace('/api/github/file/', '').split('/');
        const owner = parts[0];
        const repo = parts[1];
        const filePath = parts.slice(2).join('/');
        const userId = url.searchParams.get('userId');

        if (!userId || !owner || !repo || !filePath) {
          return jsonResponse({ error: 'Missing parameters' }, 400);
        }

        const token = await env.TOKENS.get(`token:${userId}`);
        if (!token) {
          return jsonResponse({ error: 'Not authenticated' }, 401);
        }

        const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'Design-Editor',
          },
        });
        const fileData = await fileRes.json();

        if (fileData.content) {
          // Decode base64 content
          const content = atob(fileData.content.replace(/\n/g, ''));
          return jsonResponse({
            path: fileData.path,
            content,
            sha: fileData.sha,
          });
        }

        return jsonResponse({ error: 'File not found' }, 404);
      }

      // ============================================
      // USER DATA ENDPOINTS
      // ============================================

      // Get user projects
      if (path === '/api/projects' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
          return jsonResponse({ error: 'userId required' }, 400);
        }

        const projects = await env.TOKENS.get(`projects:${userId}`);
        return jsonResponse(projects ? JSON.parse(projects) : []);
      }

      // Save user projects
      if (path === '/api/projects' && request.method === 'POST') {
        const body = await request.json();
        const { userId, projects } = body;

        if (!userId || !projects) {
          return jsonResponse({ error: 'userId and projects required' }, 400);
        }

        await env.TOKENS.put(`projects:${userId}`, JSON.stringify(projects), {
          expirationTtl: 60 * 60 * 24 * 365, // 1 year
        });

        return jsonResponse({ success: true });
      }

      // Health check
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // Local projects (placeholder - returns empty for now)
      if (path === '/api/projects/local') {
        return jsonResponse([]);
      }

      // Get GitHub token for authenticated git operations
      if (path === '/api/github/token') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return jsonResponse({ error: 'userId required' }, 400);
        }

        const token = await env.TOKENS.get(`token:${userId}`);
        if (!token) {
          return jsonResponse({ error: 'No token found' }, 404);
        }

        return jsonResponse({ token });
      }

      // AI Chat endpoint with streaming
      if (path === '/api/ai/chat/stream' && request.method === 'POST') {
        const body = await request.json();
        const { message, currentFile, currentCode, projectName, history } = body;

        if (!env.ANTHROPIC_API_KEY) {
          return new Response('AI non configurata', { status: 500, headers: corsHeaders });
        }

        // Build system prompt for code generation
        const systemPrompt = `Sei un assistente AI per un editor di design visuale simile a Bolt.new.
Generi codice React/TypeScript per creare applicazioni web.

Contesto:
- Progetto: ${projectName || 'Nuovo Progetto'}
- File corrente: ${currentFile || 'src/App.tsx'}
${currentCode ? `- Codice corrente:\n\`\`\`\n${currentCode.slice(0, 3000)}\n\`\`\`` : ''}

REGOLE IMPORTANTI:
1. Quando l'utente chiede di creare qualcosa, genera SEMPRE codice completo e funzionante
2. Usa React con TypeScript/JSX
3. Usa Tailwind CSS per lo styling (classi utility)
4. Il codice deve essere pronto per essere eseguito in un ambiente Vite + React
5. Includi sempre gli import necessari
6. Rispondi in italiano ma il codice in inglese
7. Quando generi codice, racchiudilo in \`\`\`jsx o \`\`\`tsx

Esempio di risposta per "crea una landing page":
\`\`\`tsx
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold text-white">Welcome</h1>
      </header>
    </div>
  );
}
\`\`\``;

        const messages = [
          ...(history || []).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ];

        try {
          const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              stream: true,
              system: systemPrompt,
              messages,
            }),
          });

          // Create a TransformStream to process the SSE data
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          const encoder = new TextEncoder();

          // Process the stream in the background
          (async () => {
            const reader = aiResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                        await writer.write(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`));
                      }
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
              await writer.write(encoder.encode('data: [DONE]\n\n'));
            } catch (e) {
              console.error('Stream error:', e);
            } finally {
              await writer.close();
            }
          })();

          return new Response(readable, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders,
            },
          });

        } catch (aiError) {
          console.error('AI API error:', aiError);
          return new Response('Errore AI', { status: 500, headers: corsHeaders });
        }
      }

      // AI Chat endpoint (non-streaming)
      if (path === '/api/ai/chat' && request.method === 'POST') {
        const body = await request.json();
        const { message, currentFile, currentCode, projectName, history } = body;

        if (!env.ANTHROPIC_API_KEY) {
          return jsonResponse({
            response: 'AI non configurata. Aggiungi ANTHROPIC_API_KEY al Worker.',
            code: null,
            filePath: null
          });
        }

        // Build system prompt
        const systemPrompt = `Sei un assistente AI per un editor di design visuale. Aiuti gli utenti a modificare il codice React/CSS dei loro progetti.

Contesto:
- Progetto: ${projectName || 'Sconosciuto'}
- File corrente: ${currentFile || 'Nessuno'}
${currentCode ? `- Codice corrente:\n\`\`\`\n${currentCode.slice(0, 2000)}\n\`\`\`` : ''}

Regole:
1. Rispondi in italiano
2. Se l'utente chiede modifiche al codice, fornisci il codice modificato
3. Sii conciso e pratico
4. Per modifiche CSS, suggerisci codice inline o classi appropriate`;

        // Build messages
        const messages = [
          ...(history || []).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ];

        try {
          const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1024,
              system: systemPrompt,
              messages,
            }),
          });

          const aiData = await aiResponse.json();

          if (aiData.error) {
            return jsonResponse({
              response: `Errore AI: ${aiData.error.message}`,
              code: null,
              filePath: null
            });
          }

          const responseText = aiData.content?.[0]?.text || 'Nessuna risposta';

          // Extract code if present
          let code = null;
          let filePath = currentFile;
          const codeMatch = responseText.match(/```(?:jsx?|tsx?|css)?\n([\s\S]*?)```/);
          if (codeMatch) {
            code = codeMatch[1].trim();
          }

          return jsonResponse({
            response: responseText,
            code,
            filePath
          });

        } catch (aiError) {
          console.error('AI API error:', aiError);
          return jsonResponse({
            response: 'Errore nella chiamata AI. Riprova.',
            code: null,
            filePath: null
          });
        }
      }

      // Git CORS Proxy for isomorphic-git
      if (path.startsWith('/api/git-proxy/')) {
        // Extract target URL and add https:// prefix
        let targetPath = path.replace('/api/git-proxy/', '');

        // Add query string if present
        const queryString = url.search;
        let targetUrl = 'https://' + decodeURIComponent(targetPath) + queryString;

        console.log('Git proxy request:', request.method, targetUrl);

        // Forward the request to the target URL
        const proxyHeaders = new Headers();

        // Copy relevant headers
        for (const [key, value] of request.headers.entries()) {
          const lowerKey = key.toLowerCase();
          if (['accept', 'content-type', 'authorization', 'user-agent', 'git-protocol'].includes(lowerKey)) {
            proxyHeaders.set(key, value);
          }
        }

        // Add Git-specific headers
        if (!proxyHeaders.has('User-Agent')) {
          proxyHeaders.set('User-Agent', 'git/isomorphic-git');
        }

        try {
          const proxyResponse = await fetch(targetUrl, {
            method: request.method,
            headers: proxyHeaders,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
          });

          console.log('Git proxy response:', proxyResponse.status, proxyResponse.statusText);

          // Create response with CORS headers
          const responseHeaders = new Headers();

          // Copy response headers
          for (const [key, value] of proxyResponse.headers.entries()) {
            responseHeaders.set(key, value);
          }

          // Add CORS headers
          responseHeaders.set('Access-Control-Allow-Origin', '*');
          responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          responseHeaders.set('Access-Control-Allow-Headers', '*');
          responseHeaders.set('Access-Control-Expose-Headers', '*');

          return new Response(proxyResponse.body, {
            status: proxyResponse.status,
            statusText: proxyResponse.statusText,
            headers: responseHeaders,
          });
        } catch (proxyError) {
          console.error('Git proxy error:', proxyError);
          return new Response(JSON.stringify({ error: 'Proxy error: ' + proxyError.message }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }

      // 404 for unknown routes
      return jsonResponse({ error: 'Not found' }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  },
};
