/**
 * Page/Route Discovery
 * Automatically detects pages and routes from project files
 */

export interface DiscoveredPage {
  name: string;
  path: string;  // Route path like "/about", "/store"
  filePath: string;  // Source file path
  type: 'page' | 'layout' | 'component';
  children?: DiscoveredPage[];
}

interface ProjectFiles {
  [path: string]: string;
}

/**
 * Discover all pages/routes in a project
 */
export function discoverPages(files: ProjectFiles): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];

  // Try different detection strategies
  const nextPagesRoutes = detectNextJsPagesRouter(files);
  const nextAppRoutes = detectNextJsAppRouter(files);
  const reactRouterRoutes = detectReactRouter(files);
  const astroRoutes = detectAstroPages(files);
  const viteRoutes = detectVitePages(files);

  // Merge and deduplicate
  const allRoutes = [
    ...nextPagesRoutes,
    ...nextAppRoutes,
    ...reactRouterRoutes,
    ...astroRoutes,
    ...viteRoutes,
  ];

  // If no routes detected, try to infer from index.html or common patterns
  if (allRoutes.length === 0) {
    const inferredRoutes = inferRoutesFromStructure(files);
    allRoutes.push(...inferredRoutes);
  }

  // Deduplicate by path
  const seen = new Set<string>();
  for (const route of allRoutes) {
    if (!seen.has(route.path)) {
      seen.add(route.path);
      pages.push(route);
    }
  }

  // Sort: Home first, then alphabetically
  pages.sort((a, b) => {
    if (a.path === '/') return -1;
    if (b.path === '/') return 1;
    return a.name.localeCompare(b.name);
  });

  return pages;
}

/**
 * Next.js Pages Router: /pages/*.tsx -> routes
 */
function detectNextJsPagesRouter(files: ProjectFiles): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];
  const pagePatterns = [
    /^pages\/(.+)\.(tsx?|jsx?|mdx?)$/,
    /^src\/pages\/(.+)\.(tsx?|jsx?|mdx?)$/,
  ];

  for (const filePath of Object.keys(files)) {
    for (const pattern of pagePatterns) {
      const match = filePath.match(pattern);
      if (match) {
        let routePath = match[1];

        // Skip special Next.js files
        if (routePath.startsWith('_') || routePath.startsWith('api/')) continue;

        // Convert file path to route
        routePath = routePath
          .replace(/\/index$/, '')  // /pages/about/index.tsx -> /about
          .replace(/\[([^\]]+)\]/g, ':$1');  // [id] -> :id

        const name = routePath === '' ? 'Home' : formatRouteName(routePath);

        pages.push({
          name,
          path: '/' + routePath,
          filePath,
          type: 'page',
        });
      }
    }
  }

  return pages;
}

/**
 * Next.js App Router: /app/[path]/page.tsx -> routes
 */
function detectNextJsAppRouter(files: ProjectFiles): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];
  const pagePatterns = [
    /^app\/(.*)\/page\.(tsx?|jsx?)$/,
    /^src\/app\/(.*)\/page\.(tsx?|jsx?)$/,
    /^app\/page\.(tsx?|jsx?)$/,
    /^src\/app\/page\.(tsx?|jsx?)$/,
  ];

  for (const filePath of Object.keys(files)) {
    for (const pattern of pagePatterns) {
      const match = filePath.match(pattern);
      if (match) {
        let routePath = match[1] || '';

        // Skip route groups (parentheses)
        routePath = routePath.replace(/\([^)]+\)\/?/g, '');

        // Convert dynamic segments
        routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');

        const name = routePath === '' ? 'Home' : formatRouteName(routePath);

        pages.push({
          name,
          path: '/' + routePath,
          filePath,
          type: 'page',
        });
      }
    }
  }

  return pages;
}

/**
 * React Router: Parse Route definitions from code
 */
function detectReactRouter(files: ProjectFiles): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];

  // Look for router config files
  const routerFiles = [
    'src/App.tsx', 'src/App.jsx',
    'src/routes.tsx', 'src/routes.jsx',
    'src/router.tsx', 'src/router.jsx',
    'src/Router.tsx', 'src/Router.jsx',
    'app/routes.tsx', 'app/router.tsx',
  ];

  for (const routerFile of routerFiles) {
    const content = files[routerFile];
    if (!content) continue;

    // Match <Route path="..." element={...} /> patterns
    const routeRegex = /<Route[^>]*path=["']([^"']+)["'][^>]*>/g;
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      const routePath = match[1];
      const name = routePath === '/' ? 'Home' : formatRouteName(routePath);

      pages.push({
        name,
        path: routePath,
        filePath: routerFile,
        type: 'page',
      });
    }

    // Match createBrowserRouter routes array
    const routesArrayRegex = /path:\s*["']([^"']+)["']/g;
    while ((match = routesArrayRegex.exec(content)) !== null) {
      const routePath = match[1];
      if (routePath === '*') continue; // Skip catch-all

      const name = routePath === '/' ? 'Home' : formatRouteName(routePath);

      // Check if already added
      if (!pages.some(p => p.path === routePath)) {
        pages.push({
          name,
          path: routePath,
          filePath: routerFile,
          type: 'page',
        });
      }
    }
  }

  return pages;
}

/**
 * Astro: /src/pages/*.astro -> routes
 */
function detectAstroPages(files: ProjectFiles): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];
  const pattern = /^src\/pages\/(.+)\.(astro|md|mdx)$/;

  for (const filePath of Object.keys(files)) {
    const match = filePath.match(pattern);
    if (match) {
      let routePath = match[1];

      // Convert file path to route
      routePath = routePath
        .replace(/\/index$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1');

      const name = routePath === '' ? 'Home' : formatRouteName(routePath);

      pages.push({
        name,
        path: '/' + routePath,
        filePath,
        type: 'page',
      });
    }
  }

  return pages;
}

/**
 * Vite/Generic: Look for common page patterns
 */
function detectVitePages(files: ProjectFiles): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];
  const patterns = [
    /^src\/views\/(.+)\.(tsx?|jsx?|vue)$/,
    /^src\/screens\/(.+)\.(tsx?|jsx?|vue)$/,
    /^views\/(.+)\.(tsx?|jsx?|vue)$/,
  ];

  for (const filePath of Object.keys(files)) {
    for (const pattern of patterns) {
      const match = filePath.match(pattern);
      if (match) {
        let routePath = match[1].toLowerCase();
        routePath = routePath.replace(/\/index$/, '');

        const name = formatRouteName(routePath);

        pages.push({
          name,
          path: '/' + routePath,
          filePath,
          type: 'page',
        });
      }
    }
  }

  return pages;
}

/**
 * Infer routes from project structure when no router is detected
 */
function inferRoutesFromStructure(files: ProjectFiles): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];

  // Check if it's a single page app with index.html
  if (files['index.html'] || files['public/index.html']) {
    pages.push({
      name: 'Home',
      path: '/',
      filePath: files['index.html'] ? 'index.html' : 'public/index.html',
      type: 'page',
    });
  }

  // Look for common component patterns that might be pages
  const pageIndicators = ['Page', 'Screen', 'View'];
  for (const filePath of Object.keys(files)) {
    const fileName = filePath.split('/').pop() || '';
    const baseName = fileName.replace(/\.(tsx?|jsx?|vue)$/, '');

    for (const indicator of pageIndicators) {
      if (baseName.endsWith(indicator) && baseName !== indicator) {
        const routeName = baseName.replace(indicator, '');
        const routePath = routeName.toLowerCase();

        if (!pages.some(p => p.path === '/' + routePath)) {
          pages.push({
            name: routeName,
            path: '/' + routePath,
            filePath,
            type: 'page',
          });
        }
      }
    }
  }

  return pages;
}

/**
 * Format a route path into a readable name
 */
function formatRouteName(routePath: string): string {
  return routePath
    .split('/')
    .filter(Boolean)
    .map(segment => {
      // Handle dynamic segments
      if (segment.startsWith(':')) {
        return `[${segment.slice(1)}]`;
      }
      // Capitalize first letter
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(' / ') || 'Home';
}

/**
 * Navigate iframe to a specific route
 */
export function navigateToPage(
  iframe: HTMLIFrameElement,
  basePath: string,
  routePath: string
): void {
  if (!iframe.contentWindow) return;

  try {
    // Try using history API
    iframe.contentWindow.history.pushState({}, '', routePath);
    iframe.contentWindow.dispatchEvent(new PopStateEvent('popstate'));
  } catch (e) {
    // Fallback: reload iframe with new path
    const url = new URL(iframe.src);
    url.pathname = routePath;
    iframe.src = url.toString();
  }
}

/**
 * Get current route from iframe
 */
export function getCurrentRoute(iframe: HTMLIFrameElement): string {
  try {
    return iframe.contentWindow?.location.pathname || '/';
  } catch (e) {
    return '/';
  }
}
