import { chromium } from '@playwright/test';

/**
 * Helper for Muse Code to control your installed Chrome.
 * Usage:
 *   node scripts/browser.mjs https://example.com
 *   node scripts/browser.mjs --headed https://example.com
 */

const url = process.argv.find(a => a.startsWith('http')) || 'http://localhost:3000';
const headed = process.argv.includes('--headed');

const browser = await chromium.launch({
  channel: 'chrome', // uses your installed Chrome
  headless: !headed,
});

const context = await browser.newContext();
const page = await context.newPage();

console.log(`[browser] opening ${url} (headless=${!headed})`);
await page.goto(url, { waitUntil: 'domcontentloaded' });
console.log(`[browser] title: ${await page.title()}`);
await page.screenshot({ path: 'playwright-screenshot.png', fullPage: true });
console.log('[browser] screenshot -> playwright-screenshot.png');

await browser.close();
