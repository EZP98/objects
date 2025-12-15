/**
 * Design Editor API - Cloudflare Worker
 * Handles GitHub OAuth and user data storage
 */

const FRONTEND_URL = 'https://design-editor-7f9.pages.dev';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS for CORS
function handleOptions() {
  return new Response(null, { headers: corsHeaders });
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
        }));

        return jsonResponse(simplified);
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

      // 404 for unknown routes
      return jsonResponse({ error: 'Not found' }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  },
};
