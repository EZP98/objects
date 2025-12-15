/**
 * Design Editor - Project Manager Server
 * Gestisce l'avvio automatico dei progetti importati
 * + Integrazione GitHub OAuth
 */

const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ============================================
// GITHUB OAUTH CONFIG
// ============================================
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';

console.log('GitHub OAuth:', GITHUB_CLIENT_ID ? '✅ Configurato' : '❌ Non configurato');
const GITHUB_REDIRECT_URI = 'http://localhost:3333/api/github/callback';
const FRONTEND_URL = 'http://localhost:5174';

// Progetti clonati vengono salvati qui
const PROJECTS_DIR = path.join(process.env.HOME || '', '.design-editor', 'projects');

// Assicurati che la cartella esista
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Store GitHub tokens (in production usa un database)
const userTokens = new Map();

// Helper per fetch HTTPS
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Design-Editor',
        'Accept': 'application/json',
        ...options.headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ============================================
// GITHUB ENDPOINTS
// ============================================

// Check se GitHub è configurato
app.get('/api/github/status', (req, res) => {
  const configured = !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);
  const userId = req.query.userId || 'default';
  const hasToken = userTokens.has(userId);

  res.json({
    configured,
    authenticated: hasToken,
    clientId: GITHUB_CLIENT_ID ? '***configured***' : null,
  });
});

// Inizia OAuth flow
app.get('/api/github/auth', (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({
      error: 'GitHub non configurato',
      help: 'Imposta GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET come variabili d\'ambiente'
    });
  }

  const state = Math.random().toString(36).substring(7);
  const scope = 'repo read:user';

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  res.json({ authUrl, state });
});

// OAuth callback
app.get('/api/github/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}?github_error=no_code`);
  }

  try {
    // Exchange code for token
    const tokenResponse = await httpsRequest('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });

    if (tokenResponse.error) {
      return res.redirect(`${FRONTEND_URL}?github_error=${tokenResponse.error}`);
    }

    const accessToken = tokenResponse.access_token;

    // Get user info
    const userInfo = await httpsRequest('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Store token
    userTokens.set(userInfo.login, {
      token: accessToken,
      user: userInfo,
    });

    // Redirect back to frontend with success
    res.redirect(`${FRONTEND_URL}?github_connected=true&github_user=${userInfo.login}`);

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${FRONTEND_URL}?github_error=auth_failed`);
  }
});

// Logout
app.post('/api/github/logout', (req, res) => {
  const userId = req.body.userId || 'default';
  userTokens.delete(userId);
  res.json({ success: true });
});

// Lista repository dell'utente
app.get('/api/github/repos', async (req, res) => {
  const userId = req.query.userId;

  if (!userId || !userTokens.has(userId)) {
    return res.status(401).json({ error: 'Non autenticato con GitHub' });
  }

  const { token } = userTokens.get(userId);

  try {
    const repos = await httpsRequest('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Filtra solo le info necessarie
    const simplified = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      htmlUrl: repo.html_url,
      updatedAt: repo.updated_at,
      language: repo.language,
      defaultBranch: repo.default_branch,
    }));

    res.json(simplified);

  } catch (error) {
    console.error('Error fetching repos:', error);
    res.status(500).json({ error: 'Errore nel recupero dei repository' });
  }
});

// Clone un repository
app.post('/api/github/clone', async (req, res) => {
  const { repoUrl, repoName, userId } = req.body;

  if (!repoUrl || !repoName) {
    return res.status(400).json({ error: 'repoUrl e repoName sono richiesti' });
  }

  const projectPath = path.join(PROJECTS_DIR, repoName);

  // Se esiste già, restituisci il path
  if (fs.existsSync(projectPath)) {
    return res.json({
      status: 'exists',
      path: projectPath,
      message: 'Progetto già clonato'
    });
  }

  // Setup SSE per progress
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('status', { message: `Cloning ${repoName}...`, phase: 'clone' });

    // Clone con git
    await new Promise((resolve, reject) => {
      const clone = spawn('git', ['clone', '--depth', '1', repoUrl, projectPath], {
        shell: true
      });

      clone.stdout.on('data', (data) => {
        sendEvent('log', { message: data.toString() });
      });

      clone.stderr.on('data', (data) => {
        sendEvent('log', { message: data.toString() });
      });

      clone.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`git clone failed with code ${code}`));
      });
    });

    sendEvent('ready', {
      status: 'cloned',
      path: projectPath,
      message: 'Repository clonato con successo'
    });

    res.end();

  } catch (error) {
    sendEvent('error', { message: error.message });
    res.end();
  }
});

// Lista progetti clonati
app.get('/api/projects/local', (req, res) => {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return res.json([]);
  }

  const projects = fs.readdirSync(PROJECTS_DIR)
    .filter(name => {
      const projectPath = path.join(PROJECTS_DIR, name);
      return fs.statSync(projectPath).isDirectory() &&
             fs.existsSync(path.join(projectPath, 'package.json'));
    })
    .map(name => {
      const projectPath = path.join(PROJECTS_DIR, name);
      let packageJson = {};
      try {
        packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      } catch {}

      return {
        name: packageJson.name || name,
        path: projectPath,
        description: packageJson.description || '',
      };
    });

  res.json(projects);
});

// Store running projects
const runningProjects = new Map();

// Detect project type and get the right dev command
function getDevCommand(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};

  // Check for common dev scripts
  if (scripts.dev) return 'npm run dev';
  if (scripts.start) return 'npm start';
  if (scripts.serve) return 'npm run serve';

  throw new Error('No dev/start script found in package.json');
}

// Check if node_modules exists
function hasNodeModules(projectPath) {
  return fs.existsSync(path.join(projectPath, 'node_modules'));
}

// Find available port from output
function extractPort(output) {
  // Common patterns:
  // "localhost:3000"
  // "http://localhost:3000"
  // "Local: http://localhost:5173"
  // "ready on port 3000"
  const patterns = [
    /localhost:(\d+)/i,
    /127\.0\.0\.1:(\d+)/i,
    /port\s*:?\s*(\d+)/i,
    /:\s*(\d{4,5})/,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

// Start a project
app.post('/api/projects/start', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: 'Project path does not exist' });
  }

  // Check if already running
  if (runningProjects.has(projectPath)) {
    const project = runningProjects.get(projectPath);
    return res.json({
      status: 'already_running',
      port: project.port,
      url: `http://localhost:${project.port}`
    });
  }

  try {
    const devCommand = getDevCommand(projectPath);
    const needsInstall = !hasNodeModules(projectPath);

    // Send initial response
    res.json({
      status: 'starting',
      needsInstall,
      devCommand,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start project with SSE for progress updates
app.get('/api/projects/start-stream', (req, res) => {
  const projectPath = req.query.path;

  if (!projectPath || !fs.existsSync(projectPath)) {
    return res.status(400).json({ error: 'Invalid project path' });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const runProject = async () => {
    try {
      const devCommand = getDevCommand(projectPath);
      const needsInstall = !hasNodeModules(projectPath);

      // Install if needed
      if (needsInstall) {
        sendEvent('status', { message: 'Installing dependencies...', phase: 'install' });

        await new Promise((resolve, reject) => {
          const install = spawn('npm', ['install'], {
            cwd: projectPath,
            shell: true
          });

          install.stdout.on('data', (data) => {
            sendEvent('log', { message: data.toString(), type: 'stdout' });
          });

          install.stderr.on('data', (data) => {
            sendEvent('log', { message: data.toString(), type: 'stderr' });
          });

          install.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`npm install failed with code ${code}`));
          });
        });
      }

      // Start dev server
      sendEvent('status', { message: 'Starting dev server...', phase: 'start' });

      const [cmd, ...args] = devCommand.split(' ');
      const devProcess = spawn(cmd, args, {
        cwd: projectPath,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0' }
      });

      let port = null;
      let outputBuffer = '';

      devProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        sendEvent('log', { message: output, type: 'stdout' });

        // Try to find port
        if (!port) {
          port = extractPort(outputBuffer);
          if (port) {
            runningProjects.set(projectPath, { process: devProcess, port });
            sendEvent('ready', { port, url: `http://localhost:${port}` });
          }
        }
      });

      devProcess.stderr.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        sendEvent('log', { message: output, type: 'stderr' });

        // Some tools output to stderr
        if (!port) {
          port = extractPort(outputBuffer);
          if (port) {
            runningProjects.set(projectPath, { process: devProcess, port });
            sendEvent('ready', { port, url: `http://localhost:${port}` });
          }
        }
      });

      devProcess.on('close', (code) => {
        runningProjects.delete(projectPath);
        sendEvent('stopped', { code });
        res.end();
      });

      devProcess.on('error', (err) => {
        sendEvent('error', { message: err.message });
        res.end();
      });

    } catch (error) {
      sendEvent('error', { message: error.message });
      res.end();
    }
  };

  runProject();

  // Cleanup on client disconnect
  req.on('close', () => {
    // Don't kill the process, keep it running
  });
});

// Stop a project
app.post('/api/projects/stop', (req, res) => {
  const { projectPath } = req.body;

  if (runningProjects.has(projectPath)) {
    const project = runningProjects.get(projectPath);
    project.process.kill();
    runningProjects.delete(projectPath);
    res.json({ status: 'stopped' });
  } else {
    res.json({ status: 'not_running' });
  }
});

// Get project status
app.get('/api/projects/status', (req, res) => {
  const projectPath = req.query.path;

  if (runningProjects.has(projectPath)) {
    const project = runningProjects.get(projectPath);
    res.json({
      running: true,
      port: project.port,
      url: `http://localhost:${project.port}`
    });
  } else {
    res.json({ running: false });
  }
});

// List all running projects
app.get('/api/projects/running', (req, res) => {
  const projects = [];
  for (const [path, project] of runningProjects) {
    projects.push({ path, port: project.port });
  }
  res.json(projects);
});

// Scan for common ports
app.get('/api/projects/scan-ports', async (req, res) => {
  const commonPorts = [3000, 3001, 3002, 5173, 5174, 5175, 8080, 8081, 4200];
  const activePorts = [];

  for (const port of commonPorts) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(500)
      });
      if (response.ok || response.status < 500) {
        activePorts.push(port);
      }
    } catch {
      // Port not active
    }
  }

  res.json(activePorts);
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Design Editor Server running on http://localhost:${PORT}`);
});
