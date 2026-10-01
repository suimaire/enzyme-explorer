/* global process, console, document, window */
// Final checks for the original UX register. Uses the bundled Playwright installation.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const {chromium} = createRequire(import.meta.url)('playwright');
const base = process.env.UX_BASE_URL ?? 'http://127.0.0.1:5174/enzyme-explorer/';
const mode = process.env.UX_CLOSEOUT_MODE ?? 'local';
const channel = process.env.UX_BROWSER_CHANNEL ?? 'chrome';
const out = resolve(process.env.UX_CLOSEOUT_OUT ?? 'docs/ux-closeout-verification');
const browser = await chromium.launch({channel, headless: true});
const checks = [], layout = [], resize = [], harnesses = [], messages = [], lifecycle = [];
const routes = ['start', 'reaction-energy', 'carbonic-anhydrase', 'kinetics', 'inhibition', 'regulation', 'model-notes'];
const viewports = [[1440, 900], [390, 844], [1024, 768], [768, 1024]];
await mkdir(out, {recursive: true});
function pass(value, label) {assert.ok(value, label); checks.push(label);}
async function settle(page) {
  await page.evaluate(() => new Promise(done => window.requestAnimationFrame(() => window.requestAnimationFrame(done))));
}
function listen(page, name) {
  page.on('console', m => {if (['warning', 'error'].includes(m.type())) messages.push({name, type: m.type(), text: m.text()});});
  page.on('pageerror', e => messages.push({name, type: 'pageerror', text: e.message}));
  page.on('response', r => {if (r.status() >= 400) messages.push({name, type: 'response', status: r.status(), url: r.url()});});
}
async function route(page, id) {
  // DOM activation keeps offscreen rail links from scrolling the document during lifecycle checks.
  await page.getByTestId(`nav-${id}`).evaluate(a => a.click());
  await page.getByTestId(`nav-${id}`).and(page.locator('[aria-current="page"]')).waitFor();
  if (id === 'regulation') await page.getByTestId('module-regulation').waitFor();
  if (id === 'carbonic-anhydrase') await page.getByTestId('module-carbonic-anhydrase').waitFor();
  await settle(page);
}
async function geometry(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.module-nav'), active = nav.querySelector('[aria-current="page"]');
    return {route: window.location.hash, viewport: [window.innerWidth, window.innerHeight],
      rail: nav.getBoundingClientRect().toJSON(), active: active.getBoundingClientRect().toJSON(),
      scrollY: window.scrollY, scrollLeft: nav.scrollLeft, title: document.title,
      pageWidth: document.documentElement.scrollWidth, focus: document.activeElement.id || document.activeElement.tagName};
  });
}
const visible = g => g.active.left >= g.rail.left - 1 && g.active.right <= g.rail.right + 1;

async function deployedBehavior(page, width) {
  await route(page, 'kinetics'); await page.getByTestId('reset-module').click();
  await page.getByTestId('substrate-50').click(); await page.getByTestId('run-assay').click(); await page.getByTestId('measure-v0').click();
  const measurement = await page.getByTestId('assay-table').innerText();
  await page.locator('main a[href="#/model-notes?section=kinetics"]').click(); await settle(page);
  pass(await page.evaluate(() => document.activeElement.id === 'model-notes-kinetics'), `${width}: contextual Reference focuses 03 section`);
  pass(await page.locator('.notes-toc a').count() >= 4, `${width}: Reference TOC available`);
  await page.locator('.notes-toc a[href="#/model-notes?section=energy"]').click(); await settle(page);
  pass(await page.evaluate(() => document.activeElement.id === 'model-notes-energy'), `${width}: Reference TOC direct section`);
  await page.locator('.notes-toc a[href="#/model-notes?section=kinetics"]').click();
  await page.locator('section[aria-labelledby="model-notes-kinetics"] .notes-return a').click(); await settle(page);
  pass(await page.locator('main').evaluate(e => e === document.activeElement), `${width}: explicit module return focuses main`);
  pass(await page.getByTestId('assay-table').innerText() === measurement, `${width}: public 03 measurement survives Reference`);
  await page.getByTestId('reset-module').click(); await route(page, 'model-notes'); await route(page, 'kinetics');
  pass(await page.getByTestId('assay-table').count() === 0, `${width}: explicit reset does not revive measurement`);

  await route(page, 'regulation'); await page.getByTestId('reset-module').click();
  await page.getByTestId('reg-prediction').locator('input[value="insulin"]').check();
  await page.getByTestId('reg-prediction').getByRole('button').click();
  for (const scenario of ['insulinDominant', 'glucagonDominant']) {
    await page.getByTestId(`signal-${scenario}`).click(); await settle(page);
    const pause = page.getByRole('button', {name: 'Ⅱ 일시정지', exact: true});
    if (await pause.count()) await pause.click();
    for (let n = 0; n < 5; n++) {
      const next = page.getByRole('button', {name: '다음 단계', exact: true});
      if (await next.count() && await next.isEnabled()) {await next.click(); await settle(page);}
    }
  }
  const trigger = page.locator('.reg-metabolite'); await trigger.click();
  await page.locator('.reg-comparison:modal').waitFor(); await page.keyboard.press('Escape');
  await page.locator('.reg-comparison').waitFor({state: 'detached'});
  pass(await trigger.evaluate(e => e === document.activeElement), `${width}: Sugar comparison Escape returns trigger focus`);
  await page.getByRole('button', {name: '인산기 이동 확인 +', exact: true}).click();
  for (const name of ['A · PKA → 단백질', 'B · PFK-2 → 당']) {
    await page.getByRole('button', {name, exact: true}).click();
    const nucleotide = page.getByTestId('phosphate-trace').locator('.reg-transfer > div').first();
    pass(await nucleotide.innerText().then(t => t.includes('ATP') && t.includes('말단 인산기 공여체')), `${width}: ${name} ATP donor`);
    await page.getByRole('button', {name: '인산기 전달 보기', exact: true}).click();
    pass(await nucleotide.innerText().then(t => t.includes('ADP') && t.includes('인산기 전달 후 생성물') && !t.includes('공여체')), `${width}: ${name} ADP product caption`);
  }
  await page.screenshot({path: resolve(out, `${mode}-adp-${width}.png`)});
}

try {
  // A fresh context has no prior browser cache or session state.
  const context = await browser.newContext(); const page = await context.newPage(); listen(page, mode);
  for (const [width, height] of viewports) {
    await page.setViewportSize({width, height}); await page.goto(base);
    await page.getByTestId('nav-start').waitFor();
    await page.keyboard.press('Tab');
    pass(await page.locator('.skip-link').evaluate(e => e === document.activeElement), `${width}: first Tab reaches skip link`);
    await page.keyboard.press('Enter');
    pass(await page.locator('main').evaluate(e => e === document.activeElement), `${width}: skip link focuses main`);
    for (const id of routes) {
      await route(page, id); const g = await geometry(page); layout.push(g);
      pass(visible(g), `${id} ${width}: active rail visible`);
      pass(g.pageWidth <= width, `${id} ${width}: layout has no horizontal overflow`);
      pass(g.title.includes('Enzyme Explorer'), `${id} ${width}: route document title`);
      pass(await page.locator('footer > span').first().innerText() === 'Enzyme Explorer · 효소의 촉매 작용, 반응속도론과 조절', `${id} ${width}: footer scope`);
      pass(await page.locator('.module-planned').count() === 1 && await page.getByTestId('nav-inhibition').locator('.module-planned').innerText() === '예정', `${id} ${width}: only 04 has planned badge`);
      if (id === 'start') {
        pass(await page.getByTestId('card-regulation').innerText().then(t => t.includes('현재 이용 가능')), `${width}: Start 05 ready`);
        pass(await page.locator('.start-planned').innerText().then(t => t.includes('04') && !t.includes('05')), `${width}: Start 04 planned`);
      }
      if (id === 'model-notes') pass(await page.locator('.notes-toc a').count() >= 4, `${width}: Reference TOC`);
      if ([1440, 390].includes(width) && ['start', 'reaction-energy', 'model-notes'].includes(id)) {
        await page.screenshot({path: resolve(out, `${mode}-${id}-${width}.png`)});
      }
    }
    const titles = layout.filter(g => g.viewport[0] === width).map(g => g.title);
    pass(new Set(titles).size === routes.length, `${width}: titles distinguish all routes`);
    if ([1440, 390].includes(width)) await deployedBehavior(page, width);
  }
  for (const id of ['kinetics', 'regulation', 'model-notes']) {
    await page.setViewportSize({width: 1440, height: 900}); await route(page, id);
    await page.evaluate(() => {document.getElementById('main-content').focus({preventScroll: true}); window.scrollTo(0, 300);});
    for (const width of [390, 768, 390, 1440]) {
      const before = await geometry(page); await page.setViewportSize({width, height: 900}); await settle(page);
      const after = await geometry(page); resize.push({id, before, after, verticalDelta: after.scrollY - before.scrollY});
      pass(after.route === before.route && visible(after), `${id} ${before.viewport[0]}→${width}: same route active rail visible`);
      pass(after.focus === before.focus && after.scrollY > 0, `${id} ${width}: document scroll and focus preserved`);
      if (id !== 'kinetics') pass(after.scrollY === before.scrollY, `${id} ${width}: vertical scroll unchanged`);
    }
    const before = await geometry(page);
    await page.locator('.module-nav').evaluate(nav => {nav.style.width = '390px';}); await settle(page);
    const after = await geometry(page); resize.push({id, kind: 'rail-only', before, after, verticalDelta: after.scrollY - before.scrollY});
    pass(visible(after) && after.scrollY === before.scrollY && after.focus === before.focus, `${id}: rail-only resize preserves exact document scroll/focus`);
    await page.locator('.module-nav').evaluate(nav => {nav.style.width = '';}); await settle(page);
  }
  await page.setViewportSize({width: 390, height: 844}); await route(page, 'kinetics');
  await page.getByTestId('nav-kinetics').focus(); await page.keyboard.press('Tab');
  pass(await page.getByTestId('nav-inhibition').evaluate(e => e === document.activeElement), 'rail keyboard: Tab 03→04');
  await page.keyboard.press('Enter'); await settle(page);
  pass(await page.getByTestId('nav-inhibition').getAttribute('aria-current') === 'page', 'rail keyboard: 04 remains clickable and planned');
  await page.keyboard.press('Tab');
  pass(await page.getByTestId('nav-regulation').evaluate(e => e === document.activeElement), 'rail keyboard: Tab 04→05');
  await page.keyboard.press('Shift+Tab');
  pass(await page.getByTestId('nav-inhibition').evaluate(e => e === document.activeElement), 'rail keyboard: Shift+Tab 05→04');
  if (mode === 'local') {
    const specs = [
      ['navigation-context', 'run-navigation', 'navigation-results', 'ALL NAVIGATION CONTEXT CHECKS PASSED'],
      ['start', 'run-start', 'start-results', 'ALL START DISCOVERY CHECKS PASSED'],
      ['phase-a2', 'run-phase-a2', 'phase-a2-audit', 'ALL PHASE A2 CHECKS PASSED'],
      ['readability', 'Run graph checks', 'readability-results', 'ALL GRAPH CHECKS PASSED'],
      ['mobile-experiment', 'run-ux008', 'ux008-results', 'ALL UX-008 CHECKS PASSED'],
      ['session', '학습 세션 회귀 검사 실행', 'session-audit', 'ALL LEARNING CHECKS PASSED'],
    ];
    for (const [name, trigger, resultId, success] of specs) for (const width of name === 'mobile-experiment' ? [390] : [1440, 390]) {
      const testPage = await context.newPage(); listen(testPage, `${name} ${width}`);
      await testPage.setViewportSize({width, height: width === 390 ? 844 : 900});
      await testPage.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
        const icon = document.createElement('link'); icon.rel = 'icon'; icon.href = 'data:,'; document.head.append(icon);
      }, {once: true}));
      await testPage.goto(`${base}tests/browser/${name}-harness.html?motion=reduce`);
      await (trigger.startsWith('run-') ? testPage.getByTestId(trigger) : testPage.getByRole('button', {name: trigger, exact: true})).click();
      await testPage.waitForFunction(({resultId, success}) => {
        const text = document.querySelector(`[data-testid="${resultId}"]`)?.textContent ?? '';
        return text.includes(success) || text.includes('FAIL ');
      }, {resultId, success}, {timeout: 60000});
      const result = JSON.parse(await testPage.getByTestId(resultId).textContent());
      harnesses.push({name, width, result});
      pass(result.checks.includes(success) && !result.checks.some(c => c.startsWith('FAIL ')), `${name} ${width}: original issue regressions`);
      await testPage.close();
    }
    // Existing fixture instruments the real renderer cleanup without changing production code.
    const testPage = await context.newPage(); listen(testPage, 'minimal WebGL lifecycle');
    await testPage.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
      const icon = document.createElement('link'); icon.rel = 'icon'; icon.href = 'data:,'; document.head.append(icon);
    }, {once: true}));
    await testPage.goto(`${base}tests/browser/session-harness.html`);
    await testPage.getByTestId('nav-start').waitFor();
    const snapshot = async () => JSON.parse(await testPage.getByTestId('session-audit').textContent()).lifecycle;
    const baseline = await snapshot();
    for (let n = 0; n < 5; n++) {
      await route(testPage, 'carbonic-anhydrase'); await testPage.getByTestId('stage-2').click();
      await testPage.locator('canvas').waitFor();
      pass(await testPage.locator('canvas').count() === 1, `02 entry ${n + 1}: one canvas`);
      await route(testPage, 'model-notes');
      await testPage.waitForFunction(n => JSON.parse(document.querySelector('[data-testid="session-audit"]').textContent).lifecycle.contextsLost >= n, baseline.contextsLost + n + 1);
      pass(await testPage.locator('canvas').count() === 0, `02 exit ${n + 1}: no canvas accumulation`);
    }
    const after02 = await snapshot(); lifecycle.push({module: '02', baseline, after: after02});
    for (const key of ['disposals', 'rendererDisposals', 'contextReleases', 'contextsLost']) pass(after02[key] - baseline[key] === 5, `02: five ${key}`);
    await route(testPage, 'regulation'); await testPage.getByRole('button', {name: '실제 3D 구조', exact: true}).click();
    await testPage.locator('canvas').waitFor(); const originalCanvas = await testPage.locator('canvas').elementHandle();
    for (let n = 0; n < 5; n++) {
      await testPage.getByRole('button', {name: '크게 보기', exact: true}).click(); await testPage.locator('dialog:modal').waitFor();
      await testPage.keyboard.press('Escape'); await testPage.locator('dialog:modal').waitFor({state: 'hidden'});
      pass(await originalCanvas.evaluate(e => e.isConnected && e === document.querySelector('canvas')) && await testPage.locator('canvas').count() === 1, `05 large view ${n + 1}: same single canvas`);
      pass((await snapshot()).contextReleases === after02.contextReleases, `05 large view ${n + 1}: context reused`);
    }
    await route(testPage, 'model-notes');
    await testPage.waitForFunction(n => JSON.parse(document.querySelector('[data-testid="session-audit"]').textContent).lifecycle.contextsLost >= n, after02.contextsLost + 1);
    const after05 = await snapshot(); lifecycle.push({module: '05', baseline: after02, after: after05});
    pass(await testPage.locator('canvas').count() === 0 && after05.contextReleases === after02.contextReleases + 1 && after05.rendererDisposals === after02.rendererDisposals + 1, '05 module exit: renderer disposed, context released, no canvas');
    await testPage.close();
  }
  pass(messages.length === 0, 'no console warning/error, page error or HTTP failure');
  console.log(JSON.stringify({mode, channel, version: await browser.version(), checks: checks.length, layout: layout.length, resize: resize.length, harnesses: harnesses.length, messages}));
} finally {
  await writeFile(resolve(out, `${mode}-results.json`), JSON.stringify({base, mode, channel, version: await browser.version(), checks, layout, resize, harnesses, lifecycle, messages}, null, 2));
  await browser.close();
}
