/* Optional browser regression checks. See README.md for setup. */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  let file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data);
  });
});

const mobile = { isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36' };
const pages = ['', 'games/', 'projects/', 'updates/', 'studio/', 'contact/', '404.html'];
let browser;

function countDraws() {
  window.__draws = 0;
  [WebGLRenderingContext, WebGL2RenderingContext].forEach(type => ['drawArrays', 'drawElements'].forEach(method => {
    const original = type.prototype[method];
    type.prototype[method] = function(...args) { window.__draws++; return original.apply(this, args); };
  }));
}

async function open(context, route = '') {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error' && /THREE|WebGL|shader/i.test(message.text())) errors.push(message.text().split('\n').slice(0, 8).join('\n')); });
  await page.goto(base + route);
  await page.waitForFunction(() => document.documentElement.classList.contains('ready'));
  return { page, errors };
}

async function checkLayout(page) {
  const info = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth,
    canvas: [document.querySelector('.stage').width, document.querySelector('.stage').height],
    pixels: DJ.performance.pixels, webgl: DJ.world.ok,
    hiddenHeroCopy: [...document.querySelectorAll('[data-hero] [data-reveal]')].filter(el => !el.classList.contains('is-in')).length,
    random: document.querySelectorAll('[data-scramble],.scr').length,
    oversizedWords: [...document.querySelectorAll('.text-word')].filter(el => {
      const style = getComputedStyle(el), padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return el.getBoundingClientRect().width - padding > el.parentElement.getBoundingClientRect().width + 1;
    }).map(el => el.textContent),
    title: document.querySelector('h1').getAttribute('aria-label') || document.querySelector('h1').textContent,
    clipped: [...document.querySelectorAll('h1,h2,h3,.btn')].filter(el => {
      // Horizontal card rails intentionally contain off-screen items.
      if (el.closest('.games-grid,.flow__stage')) return false;
      const r = el.getBoundingClientRect();
      return r.width > document.documentElement.clientWidth + 1;
    }).map(el => el.textContent)
  }));
  assert.ok(info.width <= info.viewport + 1, JSON.stringify(info));
  assert.ok(info.canvas[0] * info.canvas[1] <= info.pixels + 1, JSON.stringify(info));
  assert.equal(info.random, 0);
  assert.equal(info.hiddenHeroCopy, 0);
  assert.deepEqual(info.oversizedWords, []);
  assert.deepEqual(info.clipped, []);
  return info;
}

let base;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/`;
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--enable-unsafe-swiftshader'] });

  // Every animated page at both narrow and normal phone widths.
  for (const width of [320, 390]) {
    const context = await browser.newContext({ ...mobile, viewport: { width, height: width === 320 ? 640 : 844 } });
    await context.addInitScript(() => { Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 }); Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 }); });
    for (const route of pages) {
      const { page, errors } = await open(context, route);
      assert.equal(await page.evaluate(() => DJ.performance.tier), 'low');
      const info = await checkLayout(page);
      assert.equal(info.webgl, true);
      await page.locator('.menu-btn').click();
      await page.waitForFunction(() => document.querySelector('.menu-btn').getAttribute('aria-expanded') === 'true');
      await page.waitForTimeout(350);
      assert.equal(await page.locator('.nav__links').evaluate(el => el.inert), false);
      assert.equal(await page.locator('.nav__links a').first().isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.nav__links').evaluate(el => el.inert), true);
      // Scroll through all sections so text and image observers run.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight * .7) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 35)); }
        scrollTo(0, 0);
      });
      await page.waitForTimeout(900);
      await checkLayout(page);
      if (!route) { await page.evaluate(() => document.activeElement.blur()); await page.screenshot({ path: path.join(output, `home-${width}.png`), scale: 'css' }); }
      assert.deepEqual(errors, [], route);
      await page.close();
      console.log(`PASS low-end Android ${width}px /${route}`);
    }
    await context.close();
  }

  // Touch carousel, playable demo, landscape, and context recovery.
  const phone = await browser.newContext({ ...mobile, viewport: { width: 390, height: 844 } });
  await phone.addInitScript(() => { Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 }); Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
  await phone.addInitScript(countDraws);
  const { page, errors } = await open(phone, 'games/');
  assert.equal(await page.evaluate(() => DJ.performance.tier), 'mobile');
  await page.locator('.menu-btn').click();
  await page.waitForTimeout(100);
  const coveredDraws = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__draws), coveredDraws);
  await page.keyboard.press('Escape');
  await page.waitForFunction(before => window.__draws > before, coveredDraws);
  // Exercise hidden-tab pause and resume without relying on a headless window.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenDraws = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__draws), hiddenDraws);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction(before => window.__draws > before, hiddenDraws);
  await page.locator('.flow').scrollIntoViewIfNeeded();
  const title = await page.locator('[data-f="title"]').textContent();
  await page.getByRole('button', { name: 'Next game' }).click();
  assert.notEqual(await page.locator('[data-f="title"]').textContent(), title);
  await page.locator('.flow__stage').evaluate(el => { el.dispatchEvent(new PointerEvent('pointerdown', {clientX:200,clientY:100,pointerId:1,isPrimary:true,button:0})); el.dispatchEvent(new PointerEvent('pointercancel', {pointerId:1})); });
  await page.locator('.arena').scrollIntoViewIfNeeded();
  await page.locator('[data-h="btn"]').click();
  await page.locator('.arena-canvas').tap({ position: { x: 140, y: 150 } });
  await page.waitForFunction(() => !document.querySelector('.arena__panel').classList.contains('is-hidden'), { timeout: 15000 });
  assert.match(await page.locator('[data-h="title"]').textContent(), /Level|Close|Nice|Again|cleared|caught/i);
  await page.setViewportSize({ width: 844, height: 390 });
  await checkLayout(page);
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector('.stage');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const extension = gl.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    window.__restoreContext = () => extension.restoreContext();
    extension.loseContext(); return true;
  });
  if (lost) {
    await page.waitForFunction(() => document.documentElement.classList.contains('no-webgl'));
    await page.evaluate(() => window.__restoreContext());
    await page.waitForFunction(() => !document.documentElement.classList.contains('no-webgl'));
  }
  assert.deepEqual(errors, []);
  await phone.close();
  console.log('PASS carousel, demo, landscape, WebGL recovery');

  // Reduced motion should not keep rendering an otherwise idle scene.
  const reduced = await browser.newContext({ ...mobile, viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  await reduced.addInitScript(countDraws);
  const reducedPage = (await open(reduced)).page;
  assert.equal(await reducedPage.locator('h1 .text-word').count(), 0);
  assert.equal(await reducedPage.locator('.boot').count(), 0);
  await checkLayout(reducedPage);
  await reducedPage.waitForTimeout(800);
  const idleDraws = await reducedPage.evaluate(() => window.__draws);
  assert.ok(idleDraws > 0);
  await reducedPage.waitForTimeout(250);
  assert.equal(await reducedPage.evaluate(() => window.__draws), idleDraws);
  await reducedPage.evaluate(() => scrollTo(0, 250));
  await reducedPage.waitForFunction(before => window.__draws > before, idleDraws);
  await reduced.close();
  console.log('PASS reduced motion');

  const fallback = await browser.newContext({ ...mobile, viewport: { width: 360, height: 740 } });
  await fallback.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /webgl/i.test(type) ? null : original.call(this, type, ...args); }; });
  const fallbackPage = (await open(fallback)).page;
  assert.equal(await fallbackPage.locator('html').evaluate(el => el.classList.contains('no-webgl')), true);
  assert.equal(await fallbackPage.locator('.stage-fallback').isVisible(), true);
  await fallback.close();
  console.log('PASS no-WebGL fallback');

  const legacyGL = await browser.newContext({ ...mobile, viewport: { width: 360, height: 740 } });
  await legacyGL.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => undefined });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => undefined });
    const context = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' ? null : context.call(this, type, ...args); };
    const extension = WebGLRenderingContext.prototype.getExtension;
    WebGLRenderingContext.prototype.getExtension = function(name) { return name === 'OES_standard_derivatives' ? null : extension.call(this, name); };
  });
  const legacyPage = await open(legacyGL);
  assert.equal(await legacyPage.page.evaluate(() => DJ.world.ok), true);
  assert.equal(await legacyPage.page.evaluate(() => DJ.performance.tier), 'mobile');
  await legacyPage.page.waitForTimeout(500);
  assert.deepEqual(legacyPage.errors, []);
  await legacyGL.close();
  console.log('PASS WebGL 1 without derivatives or hardware hints');

  // Simulate sustained slow display callbacks to exercise quality adaptation.
  const adaptive = await browser.newContext({ ...mobile, viewport: { width: 390, height: 844 } });
  await adaptive.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    const original = requestAnimationFrame;
    window.requestAnimationFrame = callback => original(time => callback(time * 2.5));
  });
  const adaptivePage = (await open(adaptive)).page;
  const before = await adaptivePage.locator('.stage').evaluate(el => el.width);
  await adaptivePage.waitForFunction(() => document.documentElement.dataset.quality === 'low', null, { timeout: 20000 });
  assert.ok(await adaptivePage.locator('.stage').evaluate(el => el.width) < before);
  assert.equal(await adaptivePage.evaluate(() => DJ.world.ok), true);
  await adaptive.close();
  console.log('PASS sustained slow-frame adaptation');

  for (const viewport of [{ width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => { sessionStorage.setItem('dj-booted', '1'); Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 }); Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
    const { page, errors } = await open(context);
    await page.waitForTimeout(4000);
    await checkLayout(page);
    await page.screenshot({ path: path.join(output, `home-${viewport.width}.png`), scale: 'css' });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS tablet/desktop ${viewport.width}px`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
