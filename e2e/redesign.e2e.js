import { test, expect } from '@playwright/test';

const SHOTS = 'e2e/.shots';

// Land in the mandala: dismiss the welcome splash (its click is also the user
// gesture that lets audio start), then let it fade out.
async function enter(page) {
  await page.goto('/');
  const begin = page.getByRole('button', { name: /Begin the drift/i });
  if (await begin.isVisible().catch(() => false)) await begin.click();
  await page.waitForTimeout(1300);
  await page.mouse.move(20, 20); // wake the auto-hiding chrome
  await expect(page.locator('.dock')).toBeVisible();
}

test('mandala + dock', async ({ page }, testInfo) => {
  await enter(page);
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-mandala.png` });
});

test('sound console drawer', async ({ page }, testInfo) => {
  await enter(page);
  await page.getByRole('button', { name: 'Sound' }).click();
  await page.waitForTimeout(600);
  await expect(page.locator('.console.open')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-console.png` });
});

test('breathe popover', async ({ page }, testInfo) => {
  await enter(page);
  await page.getByRole('button', { name: 'Breath guide' }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('.breath-pop')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-breathe.png` });
});

// On mobile the feel-toggles + About collapse behind a "More" popover; on
// desktop the button is hidden, so only screenshot when it's actually there.
test('more popover (mobile)', async ({ page }, testInfo) => {
  await enter(page);
  const more = page.getByRole('button', { name: 'More controls' });
  if (!(await more.isVisible().catch(() => false))) {
    test.skip(true, 'More menu is desktop-hidden');
    return;
  }
  await more.click();
  await page.waitForTimeout(300);
  await expect(page.locator('.dock-more-pop')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-more.png` });
});
