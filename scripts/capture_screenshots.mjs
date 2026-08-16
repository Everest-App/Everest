import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');

async function captureAll() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to Everest App...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Dark Mode - HTTP Request (Default)
  console.log('Capturing: 01_http_request_params_dark.png');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_http_request_params_dark.png') });

  // 2. Request Config Tabs (Headers, Body, Auth, Pre-request, Tests)
  const configTabs = ['Headers', 'Body', 'Auth', 'Pre-request', 'Tests'];
  for (const tab of configTabs) {
    const btn = page.locator(`.config-tab:has-text("${tab}")`).first();
    if (await btn.count() > 0) {
      await btn.click();
      await page.waitForTimeout(300);
      const filename = `02_request_${tab.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      console.log('Capturing:', filename);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
    }
  }

  // 3. Modals: Import cURL & Code Generation
  const importCurlBtn = page.locator('button:has-text("cURL"), .toolbar-btn:has-text("cURL")').first();
  if (await importCurlBtn.count() > 0 && await importCurlBtn.isVisible()) {
    await importCurlBtn.click();
    await page.waitForTimeout(400);
    console.log('Capturing: 03_modal_import_curl.png');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_modal_import_curl.png') });
    // Close modal
    const closeBtn = page.locator('.modal-close, button:has-text("Cancel"), button:has-text("Close")').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  const codeGenBtn = page.locator('button:has-text("Code"), .toolbar-btn:has-text("Code")').first();
  if (await codeGenBtn.count() > 0 && await codeGenBtn.isVisible()) {
    await codeGenBtn.click();
    await page.waitForTimeout(400);
    console.log('Capturing: 04_modal_codegen.png');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_modal_codegen.png') });
    // Close modal
    const closeBtn = page.locator('.modal-close, button:has-text("Close")').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 4. Sidebar Sections: Environments & History
  const envSidebarTab = page.locator('.sidebar-tab:has-text("Envs")').first();
  if (await envSidebarTab.count() > 0) {
    await envSidebarTab.click();
    await page.waitForTimeout(400);
    console.log('Capturing: 05_sidebar_environments.png');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_sidebar_environments.png') });
  }

  const historySidebarTab = page.locator('.sidebar-tab:has-text("History")').first();
  if (await historySidebarTab.count() > 0) {
    await historySidebarTab.click();
    await page.waitForTimeout(400);
    console.log('Capturing: 06_sidebar_history.png');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_sidebar_history.png') });
  }

  // Back to Collections tab in Sidebar
  const colSidebarTab = page.locator('.sidebar-tab:has-text("Collections")').first();
  if (await colSidebarTab.count() > 0) {
    await colSidebarTab.click();
    await page.waitForTimeout(300);
  }

  // 5. Runner Panel
  const runnerBtn = page.locator('button:has-text("Runner")').first();
  if (await runnerBtn.count() > 0 && await runnerBtn.isVisible()) {
    await runnerBtn.click();
    await page.waitForTimeout(600);
    console.log('Capturing: 07_runner_panel.png');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_runner_panel.png') });
    // Close Runner
    const closeRunnerBtn = page.locator('button:has-text("Close"), button:has-text("Close Runner")').first();
    if (await closeRunnerBtn.count() > 0) {
      await closeRunnerBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // 6. Protocols: GraphQL, WebSocket, SSE, Mock Server
  const protocols = ['GraphQL', 'WebSocket', 'SSE', 'Mock Server'];
  for (const proto of protocols) {
    const protoBtn = page.locator(`.protocol-btn:has-text("${proto}")`).first();
    if (await protoBtn.count() > 0) {
      await protoBtn.click();
      await page.waitForTimeout(600);
      const filename = `08_protocol_${proto.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png`;
      console.log('Capturing:', filename);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
    }
  }

  // Reset to HTTP
  const httpBtn = page.locator('.protocol-btn:has-text("HTTP")').first();
  if (await httpBtn.count() > 0) {
    await httpBtn.click();
    await page.waitForTimeout(400);
  }

  // 7. Light Theme Screenshots
  const themeToggle = page.locator('.theme-toggle').first();
  if (await themeToggle.count() > 0) {
    await themeToggle.click();
    await page.waitForTimeout(500);
    console.log('Capturing: 09_light_theme_http.png');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_light_theme_http.png') });

    const graphqlBtn = page.locator('.protocol-btn:has-text("GraphQL")').first();
    if (await graphqlBtn.count() > 0) {
      await graphqlBtn.click();
      await page.waitForTimeout(400);
      console.log('Capturing: 10_light_theme_graphql.png');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_light_theme_graphql.png') });
    }
  }

  console.log('All comprehensive screenshots finished.');
  await browser.close();
}

captureAll().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
