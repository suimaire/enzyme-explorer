/* global process, console, document, window */
// Run with NODE_PATH pointing to an existing Playwright installation; no project dependency is added.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const {chromium} = createRequire(import.meta.url)('playwright');
const base = process.env.UX_BASE_URL ?? 'http://127.0.0.1:5174/enzyme-explorer/';
const out = resolve('docs/ux-014-016-verification');
const channel = process.env.UX_BROWSER_CHANNEL ?? 'chrome';
const runName = process.env.UX_RUN_NAME ?? channel;
const browser = await chromium.launch({channel, headless: true});
const checks = [], matrix = [], resize = [], regressions = [], messages = [];
const footerText = 'Enzyme Explorer · 효소의 촉매 작용, 반응속도론과 조절';
const routes = ['start', 'reaction-energy', 'carbonic-anhydrase', 'kinetics', 'inhibition', 'regulation', 'model-notes'];
const viewports = [[1600, 900], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844]];
await mkdir(out, {recursive: true});

function pass(value, label) {assert.ok(value, label); checks.push(label);}
function listen(page, label) {
  page.on('response', response => {
    if (response.status() >= 400) messages.push({label, type: 'response', status: response.status(), url: response.url()});
  });
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) messages.push({label, type: message.type(), text: message.text(), location: message.location()});
  });
  page.on('pageerror', error => messages.push({label, type: 'pageerror', text: error.message}));
}
async function settle(page) {await page.evaluate(() => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))));}
async function enter(page, route) {
  await page.goto(`${base}#/${route}`);
  await page.locator(`[data-testid="nav-${route}"][aria-current="page"]`).waitFor();
  if (route === 'regulation') await page.locator('[data-testid="reg-prediction"]').waitFor();
  if (route === 'carbonic-anhydrase') await page.locator('[data-testid="module-carbonic-anhydrase"]').waitFor();
  await settle(page);
}
async function geometry(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.module-nav');
    const active = nav.querySelector('[aria-current="page"]');
    const badge = nav.querySelector('.module-planned');
    const bounds = element => {
      const {left, right, top, bottom, width, height} = element.getBoundingClientRect();
      return {left, right, top, bottom, width, height};
    };
    return {
      route: window.location.hash, viewport: [window.innerWidth, window.innerHeight], rail: bounds(nav), active: bounds(active),
      scrollLeft: nav.scrollLeft, scrollWidth: nav.scrollWidth, scrollY: window.scrollY,
      pageWidth: document.documentElement.scrollWidth, focus: document.activeElement.id || document.activeElement.getAttribute('data-testid') || document.activeElement.tagName,
      footer: document.querySelector('footer > span').textContent,
      badge: {text: badge.textContent, ...bounds(badge), fontSize: window.getComputedStyle(badge).fontSize},
      linkHeight: Math.min(...[...nav.querySelectorAll('a')].map(a => a.getBoundingClientRect().height)),
      underline: window.getComputedStyle(active).boxShadow,
    };
  });
}
function visible(g) {return g.active.left >= g.rail.left - 1 && g.active.right <= g.rail.right + 1;}

try {
  const page = await browser.newPage(); listen(page, 'chrome polish');
  for (const [width, height] of viewports) {
    await page.setViewportSize({width, height});
    for (const route of routes) {
      await enter(page, route);
      const g = await geometry(page); matrix.push(g);
      pass(visible(g), `${route} ${width}: active DOMRect within rail (1px tolerance)`);
      pass(g.pageWidth <= width, `${route} ${width}: no page horizontal overflow`);
      pass(g.linkHeight >= 44, `${route} ${width}: touch targets at least 44px`);
      pass(g.footer === footerText, `${route} ${width}: shared global footer`);
      pass(g.badge.text === '예정' && g.badge.height < g.linkHeight && g.badge.fontSize === '12px', `${route} ${width}: compact readable planned indicator`);
      if ([1440, 390].includes(width) && ['inhibition', 'regulation', 'model-notes'].includes(route)) {
        await page.screenshot({path: resolve(out, `${runName}-${route}-${width}.png`)});
      }
    }
  }

  for (const route of ['reaction-energy', 'kinetics', 'inhibition', 'regulation', 'model-notes']) {
    await page.setViewportSize({width: 1440, height: 900}); await enter(page, route);
    await page.evaluate(() => {document.getElementById('main-content').focus({preventScroll: true}); window.scrollTo(0, 600);});
    for (const width of [390, 768, 390, 1440]) {
      const before = await geometry(page);
      await page.setViewportSize({width, height: 900}); await settle(page);
      const after = await geometry(page); resize.push({route, before, after, verticalDelta: after.scrollY - before.scrollY});
      pass(after.route === before.route && visible(after), `${route} ${before.viewport[0]}→${width}: same route, active visible`);
      pass(after.focus === before.focus, `${route} ${before.viewport[0]}→${width}: focus retained`);
      // Browser reflow/scroll anchoring can move the page. A control below isolates rail-induced movement.
    }
  }

  // Change only the rail width at a fixed viewport: no responsive document reflow or window resize event.
  await page.setViewportSize({width: 1440, height: 900}); await enter(page, 'regulation');
  await page.evaluate(() => {document.getElementById('main-content').focus({preventScroll: true}); window.scrollTo(0, 600);});
  const containerBefore = await geometry(page);
  await page.locator('.module-nav').evaluate(nav => {nav.style.width = '390px';}); await settle(page);
  const containerAfter = await geometry(page);
  pass(visible(containerAfter), 'rail-only width change triggers ResizeObserver');
  pass(containerBefore.scrollY === containerAfter.scrollY && containerBefore.focus === containerAfter.focus, 'rail-only adjustment changes neither document scrollY nor focus');
  resize.push({kind: 'container-only', before: containerBefore, after: containerAfter});
  await page.locator('.module-nav').evaluate(nav => {nav.style.removeProperty('width');}); await settle(page);

  // Compare normal browser reflow with the same page while only its rail observer is disabled.
  const verticalControl = [];
  for (const disableRailObserver of [false, true]) {
    const controlled = await browser.newPage({viewport: {width: 1440, height: 900}}); listen(controlled, 'vertical control');
    if (disableRailObserver) await controlled.addInitScript(() => {
      const Original = window.ResizeObserver;
      window.ResizeObserver = class extends Original {
        observe(target, options) {if (!target.classList.contains('module-nav')) super.observe(target, options);}
      };
    });
    await enter(controlled, 'regulation');
    await controlled.evaluate(() => {document.getElementById('main-content').focus({preventScroll: true}); window.scrollTo(0, 600);});
    const before = await geometry(controlled);
    await controlled.setViewportSize({width: 390, height: 900}); await settle(controlled);
    const after = await geometry(controlled);
    verticalControl.push({disableRailObserver, before, after, delta: after.scrollY - before.scrollY});
    await controlled.close();
  }
  pass(verticalControl[0].delta === verticalControl[1].delta, '1440→390 document vertical change equals native reflow control');
  resize.push({kind: 'vertical-control', samples: verticalControl});

  await page.setViewportSize({width: 390, height: 844}); await enter(page, 'regulation');
  await page.locator('.module-nav').evaluate(nav => {nav.scrollLeft = 0;});
  await page.waitForTimeout(150);
  const manual = await geometry(page);
  pass(manual.scrollLeft === 0 && !visible(manual), 'manual horizontal scrolling is not forced back to active item');
  await page.setViewportSize({width: 390, height: 900}); await settle(page);
  pass((await geometry(page)).scrollLeft === 0, 'height-only resize does not override manual horizontal scroll');
  await page.locator('[data-testid="nav-model-notes"]').evaluate(a => a.click()); await settle(page);
  pass(visible(await geometry(page)), 'route change still reveals the new active item');

  await enter(page, 'reaction-energy');
  const alreadyVisible = await geometry(page);
  await page.setViewportSize({width: 400, height: 900}); await settle(page);
  const stillVisible = await geometry(page);
  pass(alreadyVisible.scrollLeft === stillVisible.scrollLeft && visible(stillVisible), 'visible active item keeps its scrollLeft after resize');
  resize.push({kind: 'already-visible', before: alreadyVisible, after: stillVisible});

  // Use actual keyboard events for the clickable planned link and focus order.
  await page.setViewportSize({width: 390, height: 844}); await enter(page, 'kinetics');
  const planned = page.getByRole('link', {name: '04 효소 저해 · Enzyme II에서 다룰 예정', exact: true});
  const plannedName = await planned.getAttribute('aria-label');
  pass((plannedName.match(/예정/g) ?? []).length === 1, 'planned accessible name contains status exactly once');
  pass(await page.locator('.module-planned').getAttribute('aria-hidden') === 'true', 'visual planned indicator is hidden from duplicate narration');
  await page.locator('[data-testid="nav-kinetics"]').focus(); await page.keyboard.press('Tab');
  pass(await planned.evaluate(a => a === document.activeElement), 'Tab from 03 reaches clickable 04');
  await page.keyboard.press('Enter'); await settle(page);
  pass((await geometry(page)).route === '#/inhibition' && await planned.getAttribute('aria-current') === 'page', 'Enter on 04 opens planned route and retains aria-current');
  pass((await geometry(page)).underline !== 'none' && await page.locator('.module-planned').isVisible(), 'active 04 retains underline and planned badge');
  pass(await page.locator('main').innerText().then(text => text.includes('준비 중') || text.includes('예정')), '04 still shows the planned announcement');
  await page.keyboard.press('Tab');
  pass(await page.locator('[data-testid="nav-regulation"]').evaluate(a => a === document.activeElement), 'Tab from 04 reaches ready 05');
  await page.keyboard.press('Shift+Tab');
  pass(await planned.evaluate(a => a === document.activeElement), 'Shift+Tab returns to 04');
  await page.setViewportSize({width: 1440, height: 900}); await settle(page);
  pass(await planned.evaluate(a => a === document.activeElement), 'resize does not force focus to a different element');

  // Existing integration harnesses exercise the prior resolved UX issues without modifying them.
  if (process.env.UX_SKIP_REGRESSIONS !== '1') {
    const harnesses = [
      ['navigation-context', 'run-navigation', 'navigation-results', 'ALL NAVIGATION CONTEXT CHECKS PASSED', [1440, 390]],
      ['start', 'run-start', 'start-results', 'ALL START DISCOVERY CHECKS PASSED', [1440, 390]],
      ['phase-a2', 'run-phase-a2', 'phase-a2-audit', 'ALL PHASE A2 CHECKS PASSED', [1440, 390]],
      ['mobile-experiment', 'run-ux008', 'ux008-results', 'ALL UX-008 CHECKS PASSED', [390]],
      ['readability', 'Run graph checks', 'readability-results', 'ALL GRAPH CHECKS PASSED', [1440, 390]],
      ['session', '학습 세션 회귀 검사 실행', 'session-audit', 'ALL LEARNING CHECKS PASSED', [1440, 390]],
    ];
    for (const [harness, trigger, resultId, success, widths] of harnesses) {
      for (const width of widths) {
        const testPage = await browser.newPage({viewport: {width, height: 900}}); listen(testPage, `${harness} ${width}`);
        // Existing development harnesses omit the production page's empty favicon.
        await testPage.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
          if (document.querySelector('link[rel="icon"]')) return;
          const icon = document.createElement('link'); icon.rel = 'icon'; icon.href = 'data:,'; document.head.append(icon);
        }, {once: true}));
        await testPage.goto(`${base}tests/browser/${harness}-harness.html?motion=reduce`);
        const control = trigger.startsWith('run-') ? testPage.getByTestId(trigger) : testPage.getByRole('button', {name: trigger, exact: true});
        await control.click();
        await testPage.waitForFunction(({id, success}) => {
          const text = document.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';
          return text.includes(success) || text.includes('FAIL ');
        }, {id: resultId, success}, {timeout: 60000});
        const result = JSON.parse(await testPage.getByTestId(resultId).textContent());
        regressions.push({harness, width, result});
        await writeFile(resolve(out, `${runName}-${harness}-${width}.json`), JSON.stringify(result, null, 2));
        pass(result.checks.includes(success) && !result.checks.some(c => c.startsWith('FAIL ')), `${harness} ${width}: existing regression checks passed`);
        if (harness === 'navigation-context') {
          await testPage.getByTestId('nav-regulation').click();
          const trigger = testPage.locator('.reg-metabolite');
          await trigger.click(); await testPage.locator('dialog:modal').waitFor();
          await testPage.keyboard.press('Escape'); await testPage.locator('dialog:modal').waitFor({state: 'detached'});
          pass(await trigger.evaluate(button => button === document.activeElement), `05 ${width}: actual Escape returns dialog focus to trigger`);
        }
        await testPage.close();
      }
    }
  }
  pass(messages.length === 0, 'no browser console warnings, errors or page errors');
  console.log(JSON.stringify({channel, version: await browser.version(), checks: checks.length, matrix: matrix.length, resize: resize.length, regressions: regressions.length, messages}, null, 2));
} finally {
  await writeFile(resolve(out, `${runName}-results.json`), JSON.stringify({base, channel, version: await browser.version(), checks, matrix, resize, regressions, messages}, null, 2));
  await browser.close();
}
