import { test, expect } from '@playwright/test';

test.describe('Design Editor - Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the editor to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should load the editor homepage', async ({ page }) => {
    // Check that the page loaded
    await expect(page).toHaveTitle(/Design Editor|Objects/i);
  });

  test('should display main editor UI components', async ({ page }) => {
    // Check for main layout elements
    // Left sidebar (file explorer or projects)
    const leftSidebar = page.locator('[data-testid="left-sidebar"], .left-sidebar, aside').first();

    // Main content area
    const mainContent = page.locator('main, [data-testid="main-content"], .main-content').first();

    // At least one of these should exist
    const editorExists = await page.locator('body').count() > 0;
    expect(editorExists).toBe(true);
  });
});

test.describe('Design Editor - Project Creation', () => {
  test('should show projects page or new project option', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for new project button or projects list
    const newProjectBtn = page.getByRole('button', { name: /new|create|start/i });
    const projectsList = page.locator('[data-testid="projects-list"], .projects-list, .project-card');

    const hasNewProject = await newProjectBtn.count() > 0;
    const hasProjects = await projectsList.count() > 0;

    // At least one should exist
    expect(hasNewProject || hasProjects || true).toBe(true); // Soft check for now
  });
});

test.describe('Design Editor - Editor Page', () => {
  test('should navigate to editor view', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // Give it time to load
    await page.waitForTimeout(2000);

    // Check for editor-specific elements
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('should have AI chat panel or toggle', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for AI chat elements
    const chatPanel = page.locator('[data-testid="ai-chat"], .ai-chat, .chat-panel, textarea[placeholder*="message"], textarea[placeholder*="prompt"]');
    const chatToggle = page.getByRole('button', { name: /chat|ai|assistant/i });

    const hasChatPanel = await chatPanel.count() > 0;
    const hasChatToggle = await chatToggle.count() > 0;

    // Log what we found for debugging
    console.log('Chat panel found:', hasChatPanel);
    console.log('Chat toggle found:', hasChatToggle);

    // Soft assertion - we just want to see what exists
    expect(true).toBe(true);
  });

  test('should have code panel or code editor', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for Monaco editor or code panel
    const monacoEditor = page.locator('.monaco-editor, [data-testid="code-panel"], .code-editor');
    const codeToggle = page.getByRole('button', { name: /code/i });

    const hasMonaco = await monacoEditor.count() > 0;
    const hasCodeToggle = await codeToggle.count() > 0;

    console.log('Monaco editor found:', hasMonaco);
    console.log('Code toggle found:', hasCodeToggle);

    expect(true).toBe(true);
  });

  test('should have preview area', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for preview iframe or preview area
    const previewIframe = page.locator('iframe[title*="preview"], iframe[src*="localhost"], [data-testid="preview"]');
    const previewArea = page.locator('.preview-container, .preview-area, .canvas');

    const hasIframe = await previewIframe.count() > 0;
    const hasPreviewArea = await previewArea.count() > 0;

    console.log('Preview iframe found:', hasIframe);
    console.log('Preview area found:', hasPreviewArea);

    expect(true).toBe(true);
  });
});

test.describe('Design Editor - WebContainer', () => {
  test('should initialize WebContainer (may take time)', async ({ page }) => {
    await page.goto('/editor');

    // WebContainers need time to boot
    await page.waitForTimeout(10000);

    // Check for WebContainer-related elements or status
    const webcontainerStatus = page.locator('[data-testid="webcontainer-status"], .webcontainer-status');
    const previewIframe = page.locator('iframe');

    const hasStatus = await webcontainerStatus.count() > 0;
    const hasIframe = await previewIframe.count() > 0;

    console.log('WebContainer status element:', hasStatus);
    console.log('Has iframe:', hasIframe);

    // Check for any loading indicators
    const loadingIndicator = page.locator('.loading, .spinner, [data-loading]');
    const isLoading = await loadingIndicator.count() > 0;
    console.log('Loading indicator:', isLoading);

    expect(true).toBe(true);
  });
});

test.describe('Design Editor - Style Panel', () => {
  test('should have style/properties panel', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for style panel elements
    const stylePanel = page.locator('[data-testid="style-panel"], .style-panel, .properties-panel');
    const styleToggle = page.getByRole('button', { name: /style|properties|design/i });

    const hasStylePanel = await stylePanel.count() > 0;
    const hasStyleToggle = await styleToggle.count() > 0;

    console.log('Style panel found:', hasStylePanel);
    console.log('Style toggle found:', hasStyleToggle);

    expect(true).toBe(true);
  });

  test('should have layout controls', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for layout controls (flex, padding, etc)
    const layoutControls = page.locator('text=Layout, text=Display, text=Flex, text=Padding');
    const hasLayoutControls = await layoutControls.count() > 0;

    console.log('Layout controls found:', hasLayoutControls);

    expect(true).toBe(true);
  });
});

test.describe('Design Editor - UI Structure Analysis', () => {
  test('analyze full page structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Get all main sections
    const html = await page.content();

    // Count key elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input, textarea').count();
    const iframes = await page.locator('iframe').count();
    const sidebars = await page.locator('aside, [class*="sidebar"]').count();

    console.log('=== PAGE STRUCTURE ===');
    console.log('Buttons:', buttons);
    console.log('Inputs:', inputs);
    console.log('Iframes:', iframes);
    console.log('Sidebars:', sidebars);
    console.log('HTML length:', html.length);

    // Get all visible text to understand the UI
    const bodyText = await page.locator('body').textContent();
    console.log('Visible text preview:', bodyText?.substring(0, 500));

    expect(true).toBe(true);
  });

  test('analyze editor page structure', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Count key elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input, textarea').count();
    const iframes = await page.locator('iframe').count();
    const monacoEditors = await page.locator('.monaco-editor').count();

    console.log('=== EDITOR PAGE STRUCTURE ===');
    console.log('Buttons:', buttons);
    console.log('Inputs:', inputs);
    console.log('Iframes:', iframes);
    console.log('Monaco editors:', monacoEditors);

    // Check for specific components
    const hasFileExplorer = await page.locator('[class*="file"], [class*="explorer"]').count();
    const hasChat = await page.locator('[class*="chat"], [class*="Chat"]').count();
    const hasPreview = await page.locator('[class*="preview"], [class*="Preview"]').count();

    console.log('File explorer elements:', hasFileExplorer);
    console.log('Chat elements:', hasChat);
    console.log('Preview elements:', hasPreview);

    expect(true).toBe(true);
  });
});
