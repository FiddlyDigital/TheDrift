import { chromium, devices } from 'playwright';
const EXE = process.env.PW_CHROMIUM || ''; // set to a chromium binary, else use Playwright's bundled one
const BASE = 'http://localhost:4173';
const DIR = 'manual/shots';
const pixel5 = devices['Pixel 5'];

const browser = await chromium.launch(EXE ? { executablePath: EXE } : {});
const ctx = await browser.newContext({ ...pixel5 });
const page = await ctx.newPage();
const done = [];

async function shot(name) { await page.screenshot({ path: `${DIR}/${name}.png` }); done.push(name); }
async function wake() { try { await page.mouse.move(180, 60); await page.mouse.move(180, 400); } catch {} }
async function enter() {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(800);
}

async function try_(label, fn) {
  try { await fn(); } catch (e) { console.log('SKIP', label, '-', String(e).split('\n')[0].slice(0, 90)); }
}

// 1. Welcome splash (fresh load)
await try_('welcome', async () => { await enter(); await page.waitForTimeout(500); await shot('01-welcome'); });

// Begin -> mandala
await page.getByRole('button', { name: /Begin the drift/i }).click().catch(() => {});
await page.waitForTimeout(1600);
await wake();
await try_('mandala', async () => { await page.waitForTimeout(400); await wake(); await shot('02-mandala'); });

// Sound console + tabs
async function openConsole() {
  await wake();
  await page.getByRole('button', { name: 'Sound' }).click();
  await page.locator('.console.open').waitFor({ timeout: 4000 });
  await page.waitForTimeout(500);
}
async function closeConsole() { await page.locator('.console-close').click().catch(() => {}); await page.waitForTimeout(400); }

await try_('console-scenes', async () => { await openConsole(); await shot('03-console-scenes'); });
for (const [tab, file] of [['Voice','04-console-voice'],['Space','05-console-space'],['Atmosphere','06-console-atmosphere'],['Mixer','07-console-mixer']]) {
  await try_(file, async () => { await page.getByRole('tab', { name: tab }).click(); await page.waitForTimeout(450); await shot(file); });
}

// Atelier: triple-tap title to unlock, open tab, reveal scopes
await try_('atelier', async () => {
  await page.locator('.console-title').click({ clickCount: 3 });
  await page.waitForTimeout(400);
  await page.getByRole('tab', { name: 'Atelier' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Show' }).click().catch(() => {});
  await page.waitForTimeout(700);
  await shot('08-atelier');
});
await closeConsole();

// Breath popover
await try_('breathe', async () => {
  await wake();
  await page.getByRole('button', { name: 'Breath guide' }).click();
  await page.locator('.breath-pop').first().waitFor({ timeout: 3000 });
  await page.waitForTimeout(400);
  await shot('09-breathe');
  await page.keyboard.press('Escape').catch(() => {});
});

// Session sheet
await try_('session', async () => {
  await wake();
  await page.getByRole('button', { name: 'Session' }).click();
  await page.waitForTimeout(500);
  await shot('10-session');
  await page.keyboard.press('Escape').catch(() => {});
});
// Journey sheet
await try_('journey', async () => {
  await wake();
  await page.getByRole('button', { name: 'Journey' }).click();
  await page.waitForTimeout(500);
  await shot('11-journey');
  await page.keyboard.press('Escape').catch(() => {});
});

// More menu (mobile) + About
await try_('more', async () => {
  await wake();
  await page.getByRole('button', { name: 'More controls' }).click();
  await page.locator('.dock-more-pop').waitFor({ timeout: 3000 });
  await page.waitForTimeout(400);
  await shot('12-more');
});
await try_('about', async () => {
  await page.getByRole('button', { name: 'About The Drift' }).click();
  await page.waitForTimeout(500);
  await shot('13-about');
});
// Export sheet from About
await try_('export', async () => {
  await page.getByRole('button', { name: /Export this drift/i }).click();
  await page.waitForTimeout(500);
  await shot('14-export');
  await page.keyboard.press('Escape').catch(() => {});
});

// Midnight palette: reopen About, toggle, capture mandala dark
await try_('midnight', async () => {
  await wake();
  await page.getByRole('button', { name: 'More controls' }).click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'About The Drift' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Midnight palette/i }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  await wake();
  await shot('15-midnight');
  // revert
  await page.getByRole('button', { name: 'More controls' }).click().catch(() => {});
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'About The Drift' }).click().catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Daylight palette/i }).click().catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
});

// 3D space view
await try_('space3d', async () => {
  await wake();
  await page.getByRole('button', { name: 'Switch to 3D space' }).click();
  await page.waitForTimeout(1500);
  await wake();
  await shot('16-space3d');
  await page.getByRole('button', { name: 'Switch to mandala' }).click().catch(() => {});
});

console.log('CAPTURED:', done.join(', '));
await browser.close();
