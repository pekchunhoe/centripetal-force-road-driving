import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const sizes = [[320,568],[360,800],[375,812],[390,844],[412,915],[430,932],[844,390],[768,1024],[1024,768],[1366,768],[1920,1080]];
let pageErrors = [];
test.beforeEach(async ({page}) => { pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message)); });
test.afterEach(() => expect(pageErrors, 'No browser runtime errors').toEqual([]));
async function slider(page, id, value) {
  await page.locator(`#${id}`).fill(String(value));
  await page.locator(`#${id}`).dispatchEvent('input');
}
test('all requested viewport sizes fit, keep controls usable, and render Canvas and FBD', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await mkdir('artifacts', { recursive: true });
  await page.goto('/');
  await expect(page.locator('#speed-kmh')).toHaveText('54.0 km/h');
  await expect(page.locator('#road-canvas')).toHaveAttribute('aria-label', /Test track/);
  const rows = [];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'), map = canvas.getBoundingClientRect();
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let roadPixels = 0, carPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 89 && pixels[i+1] === 97 && pixels[i+2] === 88) roadPixels++;
        if (pixels[i] === 222 && pixels[i+1] === 235 && pixels[i+2] === 155) carPixels++;
      }
      const rects = [...document.querySelectorAll('button,select')].map(e => ({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
      return { overflow: document.documentElement.scrollWidth > innerWidth, mapWidth: map.width, mapHeight: map.height,
        fbdFits: document.querySelector('#fbd').getBoundingClientRect().right <= innerWidth, roadPixels, carPixels, buttons:rects };
    });
    expect(metrics.overflow, `${width}x${height}: horizontal overflow`).toBe(false);
    expect(metrics.mapWidth).toBeGreaterThan(250); expect(metrics.mapHeight).toBeGreaterThan(200);
    expect(metrics.fbdFits).toBe(true); expect(metrics.roadPixels).toBeGreaterThan(1000); expect(metrics.carPixels).toBeGreaterThan(10);
    for (const b of metrics.buttons) { expect(b.height, `${width}: ${b.id} height`).toBeGreaterThanOrEqual(width <= 760 ? 40 : 40); }
    rows.push({ width, height, ...metrics });
    await page.screenshot({ path: `artifacts/layout-${width}x${height}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
  await test.info().attach('viewport-results', { body: JSON.stringify(rows,null,2), contentType: 'application/json' });
});
test('sliders, weather presets, custom μ, keyboard, toggles and reset', async ({ page }) => {
  await page.goto('/');
  await slider(page, 'speed', 20);
  await expect(page.locator('#speed-kmh')).toHaveText('72.0 km/h');
  await slider(page, 'mass', 2000);
  await expect(page.locator('#mass-value')).toContainText('2,000');
  await expect(page.locator('#normal-value')).toHaveText('19,620');
  await expect(page.locator('#control-insight')).toContainText('same proportion');
  await page.getByRole('button', { name: /Rainy/ }).click();
  await expect(page.locator('#mu')).toHaveValue('0.4');
  await expect(page.locator('#rainy')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#available-result')).toContainText('7,848');
  await slider(page, 'mu', .52);
  await expect(page.locator('#preset-caption')).toHaveText('Custom μ');
  await expect(page.locator('#rainy')).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button', { name: /Sunny/ }).click();
  await expect(page.locator('#mu')).toHaveValue('0.75');
  await page.locator('#speed').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#speed')).toHaveValue('20.1');
  await page.locator('#vectors').uncheck(); await expect(page.locator('#vectors')).not.toBeChecked();
  await page.locator('#trail').uncheck(); await expect(page.locator('#trail')).not.toBeChecked();
  await page.locator('#playback').selectOption('0.5');
  await page.getByRole('button', { name: 'Reset simulation' }).click();
  await expect(page.locator('#speed')).toHaveValue('20.1'); await expect(page.locator('#elapsed')).toHaveText('0.0');
  await expect(page.locator('#fbd-friction')).toBeHidden();
});
test('Start/Pause/Resume freeze and restore motion; reset does not multiply loops', async ({ page }) => {
  await page.clock.install(); await page.goto('/');
  await page.locator('#start').click(); await page.clock.runFor(4200);
  await expect(page.locator('#section-title')).toHaveText('Gentle right');
  await page.setViewportSize({width:390,height:844});
  await page.setViewportSize({width:844,height:390});
  await page.setViewportSize({width:1366,height:768});
  await page.locator('#pause').click();
  const elapsed = await page.locator('#elapsed').textContent();
  const before = await page.locator('#road-canvas').screenshot();
  await page.clock.runFor(1000);
  expect(await page.locator('#road-canvas').screenshot()).toEqual(before);
  await expect(page.locator('#elapsed')).toHaveText(elapsed);
  await slider(page,'mass',2000);
  await expect(page.locator('#required-result')).toContainText('7,500');
  await expect(page.locator('#critical-value')).toContainText('21.0');
  await page.locator('#playback').selectOption('0.5');
  await expect(page.locator('#required-result')).toContainText('7,500');
  await expect(page.locator('#speed')).toHaveValue('15');
  await page.locator('#start').click(); await page.clock.runFor(1000); await page.locator('#pause').click();
  expect(Number(await page.locator('#elapsed').textContent())).toBeGreaterThan(Number(elapsed));
  await page.locator('#playback').selectOption('1');
  for(let i=0;i<6;i++) { await page.locator('#reset').click(); await page.locator('#start').click(); }
  await page.clock.runFor(1000); await page.locator('#pause').click();
  expect(Number(await page.locator('#elapsed').textContent())).toBeLessThan(1.2);
  await page.locator('#reset').click(); await expect(page.locator('#section-title')).toHaveText('Start straight');
  await expect(page.locator('#fbd-friction')).toBeHidden();
});
test('right/left force directions, weather-induced skid, persistent tyre marks and reset', async ({ page }) => {
  await page.clock.install(); await page.goto('/');
  await expect(page.locator('#normal-arrow')).toHaveAttribute('d','M150 77 V24');
  await expect(page.locator('#normal-arrow')).toHaveAttribute('marker-end','url(#arrow-vertical)');
  await expect(page.locator('#weight-arrow')).toHaveAttribute('d','M150 105 V157');
  await expect(page.locator('#weight-arrow')).toHaveAttribute('marker-end','url(#arrow-vertical)');
  await page.locator('#start').click(); await page.clock.runFor(4200); await page.locator('#pause').click();
  await expect(page.locator('#fbd-friction')).toBeVisible();
  await expect(page.locator('#fbd-arrow')).toHaveAttribute('d','M168 91 H240');
  await page.screenshot({path:'artifacts/right-turn.png',fullPage:true});
  await page.locator('#start').click(); await page.clock.runFor(7400); await page.locator('#pause').click();
  await expect(page.locator('#section-title')).toHaveText('Sharp left');
  await expect(page.locator('#fbd-arrow')).toHaveAttribute('d','M132 91 H60');
  await expect(page.locator('#grip-status')).toContainText('CAUTION');
  await page.screenshot({path:'artifacts/left-turn.png',fullPage:true});
  await page.setViewportSize({width:320,height:568});
  await page.screenshot({path:'artifacts/left-turn-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:720});
  await page.locator('#start').click(); await page.locator('#rainy').click(); await page.clock.runFor(2400);
  await expect(page.locator('#outcome')).toContainText('Tyre grip lost');
  await expect(page.locator('#run-state')).toContainText('Route ended');
  await expect(page.locator('#fbd-friction')).toBeHidden();
  await expect(page.locator('#outcome')).toContainText('7,714 N > available 4,709 N');
  await page.screenshot({path:'artifacts/skid.png',fullPage:true});
  await page.setViewportSize({width:320,height:568});
  await page.screenshot({path:'artifacts/skid-mobile.png',fullPage:true});
  await expect(page.locator('#start')).toBeDisabled();
  await page.locator('#reset').click(); await expect(page.locator('#outcome')).toBeHidden();
  await expect(page.locator('#start')).toBeEnabled();
});
test('safe route traverses both U-turns and S-bend, then shows completion summary', async ({ page }) => {
  await page.clock.install(); await page.goto('/'); await slider(page,'speed',5);
  await page.locator('#start').click();
  await page.clock.runFor(66000); await page.locator('#pause').click();
  await expect(page.locator('#section-title')).toHaveText('Wide U-turn');
  await page.screenshot({path:'artifacts/u-turn.png',fullPage:true});
  await page.locator('#start').click(); await page.clock.runFor(65000);
  await expect(page.locator('#outcome')).toContainText('Route completed');
  await expect(page.locator('#outcome')).toContainText('Tight U-turn');
  await expect(page.locator('#outcome')).toContainText('28%');
  await expect(page.locator('#progress')).toHaveText('100');
});
test('reduced motion defaults to quarter-speed playback without autoplay', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'}); await page.goto('/');
  await expect(page.locator('#playback')).toHaveValue('0.25');
  await expect(page.locator('#speed')).toHaveValue('15');
  await expect(page.locator('#elapsed')).toHaveText('0.0');
});
