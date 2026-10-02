/* global process, console, document, window */
// Uses an existing Playwright installation through NODE_PATH; no project dependency is added.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const {chromium} = createRequire(import.meta.url)('playwright');
const base = process.env.UX_BASE_URL ?? 'http://127.0.0.1:5174/enzyme-explorer/';
const channel = process.env.UX_BROWSER_CHANNEL ?? 'chrome';
const out = resolve(process.env.UX_PORTAL_OUT ?? 'docs/portal-navigation-verification');
const runName = process.env.UX_RUN_NAME ?? channel;
const portalURL = 'https://suimaire.github.io/';
const portalName = '메인 포털로 돌아가기';
const routes = ['start', 'reaction-energy', 'carbonic-anhydrase', 'kinetics', 'inhibition', 'regulation', 'model-notes'];
const viewports = [[1600, 900], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844]];
const checks = [], matrix = [], keyboard = [], navigation = [], messages = [];
await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel, headless: true});

function pass(value, label) {assert.ok(value, label); checks.push(label);}
async function settle(page) {
  await page.evaluate(() => new Promise(done => window.requestAnimationFrame(() => window.requestAnimationFrame(done))));
}
async function enter(page, route) {
  await page.goto(`${base}#/${route}`);
  await page.getByTestId(`nav-${route}`).and(page.locator('[aria-current="page"]')).waitFor();
  if (route === 'regulation') await page.getByTestId('module-regulation').waitFor();
  if (route === 'carbonic-anhydrase') await page.getByTestId('module-carbonic-anhydrase').waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
}
async function geometry(page) {
  return page.evaluate(() => {
    const header = document.querySelector('.site-header');
    const title = header.querySelector('h1');
    const subtitle = title.parentElement.querySelector('p');
    const portal = header.querySelector('.portal-link');
    const crumb = header.querySelector('.breadcrumb');
    const rail = document.querySelector('.module-nav');
    const active = rail.querySelector('[aria-current="page"]');
    const rect = element => element.getBoundingClientRect().toJSON();
    const style = window.getComputedStyle(portal);
    return {
      route: window.location.hash, viewport: [window.innerWidth, window.innerHeight],
      header: rect(header), title: rect(title), subtitle: rect(subtitle), crumb: rect(crumb), block: rect(title.parentElement), portal: rect(portal),
      rail: rect(rail), active: rect(active), pageWidth: document.documentElement.scrollWidth,
      portalText: portal.innerText.trim(), href: portal.getAttribute('href'), target: portal.getAttribute('target'),
      portalStyle: {borderRadius: style.borderRadius, fontWeight: style.fontWeight, color: style.color},
      titleLineHeight: parseFloat(window.getComputedStyle(title).lineHeight),
      subtitleLineHeight: parseFloat(window.getComputedStyle(subtitle).lineHeight),
      railLinks: [...rail.querySelectorAll('a')].map(a => a.getAttribute('href')),
      activeUnderline: window.getComputedStyle(active).boxShadow,
      plannedLinks: [...rail.querySelectorAll('a:has(.module-planned)')].map(a => a.getAttribute('href')),
      portalClipped: portal.scrollWidth > portal.clientWidth,
      focus: document.activeElement.className,
    };
  });
}

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', m => {if (['warning', 'error'].includes(m.type())) messages.push({type: m.type(), text: m.text()});});
  page.on('pageerror', e => messages.push({type: 'pageerror', text: e.message}));
  page.on('response', r => {if (r.status() >= 400) messages.push({type: 'response', status: r.status(), url: r.url()});});

  for (const [width, height] of viewports) {
    await page.setViewportSize({width, height});
    for (const route of routes) {
      await enter(page, route);
      const portal = page.getByRole('link', {name: portalName, exact: true});
      const g = await geometry(page); matrix.push(g);
      const label = `${route} ${width}×${height}`;
      pass(await portal.count() === 1 && await portal.isVisible(), `${label}: named semantic portal link visible`);
      pass(g.href === portalURL && g.target === null, `${label}: exact absolute URL, default same tab`);
      pass(g.portalText === (width <= 800 ? '← 포털' : '← 메인 포털'), `${label}: expected responsive wording`);
      pass(g.portal.height >= 44, `${label}: 44px touch target`);
      pass(g.portal.top >= 0 && g.portal.bottom <= height, `${label}: portal visible in viewport`);
      pass(g.portal.left >= g.header.left && g.portal.right <= g.header.right && g.portal.bottom <= g.header.bottom && !g.portalClipped, `${label}: portal fully within header`);
      pass(g.pageWidth <= width && g.header.width <= width, `${label}: no header/page horizontal overflow`);
      pass(Math.abs(g.portal.right - (width - (width === 1600 ? 100 : 20))) < 1, `${label}: portal aligned to right header inset`);
      pass(g.title.height <= g.titleLineHeight + 1, `${label}: title stays on one line`);
      pass(g.subtitle.height <= g.subtitleLineHeight * (width === 390 ? 2 : 1) + 1, `${label}: subtitle wrapping preserved`);
      pass(g.rail.top === g.header.bottom && g.rail.height === 52, `${label}: existing module rail directly below header`);
      assert.deepEqual(g.railLinks, routes.map(id => `#/${id}`));
      checks.push(`${label}: original seven rail routes preserved`);
      pass(g.active.left >= g.rail.left - 1 && g.active.right <= g.rail.right + 1 && g.activeUnderline !== 'none', `${label}: active rail link visible and underlined`);
      pass(g.plannedLinks.length === 1 && g.plannedLinks[0] === '#/inhibition', `${label}: only 04 retains planned badge`);
      pass(g.portalStyle.borderRadius === '5px' && g.portalStyle.fontWeight === '400', `${label}: existing radius and restrained weight`);
      if (width >= 768) {
        pass(Math.abs((g.portal.top + g.portal.bottom) / 2 - (g.block.top + g.block.bottom) / 2) < 1, `${label}: portal vertically aligned with breadcrumb/title/subtitle block`);
      } else {
        pass(g.portal.top >= g.subtitle.bottom && g.subtitle.width === 350, `${label}: portal below full-width mobile subtitle`);
      }
      if (route === 'start') await page.screenshot({path: resolve(out, `${runName}-start-${width}.png`)});
    }

    await page.goto('about:blank');
    await enter(page, 'start');
    await page.keyboard.press('Tab');
    pass(await page.locator('.skip-link').evaluate(e => e === document.activeElement), `${width}: first Tab reaches skip link`);
    pass(await page.locator('.skip-link').isVisible(), `${width}: focused skip link visible`);
    await page.keyboard.press('Tab');
    pass(await page.locator('.breadcrumb a').evaluate(e => e === document.activeElement), `${width}: second Tab reaches breadcrumb category link`);
    await page.keyboard.press('Tab');
    const portal = page.getByRole('link', {name: portalName, exact: true});
    pass(await portal.evaluate(e => e === document.activeElement), `${width}: third Tab reaches portal link`);
    const focus = await portal.evaluate(e => {
      const style = window.getComputedStyle(e);
      return {style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor, border: style.borderColor};
    });
    keyboard.push({viewport: [width, height], focus});
    pass(focus.style === 'solid' && focus.width === '3px' && focus.offset === '3px', `${width}: portal focus outline retained`);
    if ([1440, 390].includes(width)) await page.screenshot({path: resolve(out, `${runName}-focus-${width}.png`)});
    await page.keyboard.press('Tab');
    pass(await page.getByTestId('nav-start').evaluate(e => e === document.activeElement), `${width}: next Tab reaches module rail START`);
    await page.keyboard.press('Shift+Tab');
    pass(await portal.evaluate(e => e === document.activeElement), `${width}: Shift+Tab returns to portal`);
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter');
    pass(await page.locator('main').evaluate(e => e === document.activeElement) && await page.evaluate(() => window.location.hash === '#/start'), `${width}: skip activation still focuses main without changing route`);
  }

  // Intercept only the destination response; this still exercises real same-tab document navigation.
  await context.route(portalURL, route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Portal navigation test destination</title><p>Portal</p>'}));
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 900}); await enter(page, 'kinetics');
    const before = context.pages().length;
    await Promise.all([
      page.waitForURL(portalURL),
      page.getByRole('link', {name: portalName, exact: true}).click(),
    ]);
    const result = {width, url: page.url(), pagesBefore: before, pagesAfter: context.pages().length};
    navigation.push(result);
    pass(result.url === portalURL && result.pagesAfter === before, `${width}: clicking portal navigates current page without opening a tab`);
  }
  pass(messages.length === 0, 'no browser console warning/error, page error or failed HTTP response');
  console.log(JSON.stringify({channel, version: await browser.version(), checks: checks.length, matrix: matrix.length, keyboard: keyboard.length, navigation, messages}, null, 2));
} finally {
  await writeFile(resolve(out, `${runName}-results.json`), JSON.stringify({base, channel, version: await browser.version(), checks, matrix, keyboard, navigation, messages}, null, 2));
  await browser.close();
}
