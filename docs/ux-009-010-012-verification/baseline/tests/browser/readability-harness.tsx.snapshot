// Development-only: CSS is measured in the real browser; no test controls ship in the app build.
import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import {createLearningSession, KINETICS_PREPARATION} from '../../src/app/learningSessionStore';
import {INITIAL_STATE} from '../../src/modules/regulation/model';
import '../../src/styles.css';

const session = createLearningSession();
const output = document.createElement('pre');
output.dataset.testid = 'readability-results';
output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;padding:12px';
const checks: string[] = [];
const geometry: unknown[] = [];
let angle = 0;
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;
function report() {output.textContent = JSON.stringify({viewport: [innerWidth, innerHeight], checks, geometry}, null, 2);}
function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
  checks.push(`PASS ${message}`);
}
async function ready(selector: string) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (document.querySelector(selector)) return;
    await frame();
  }
  throw new Error(`Missing ${selector}`);
}
async function route(name: string) {element<HTMLAnchorElement>(`nav-${name}`).click(); await frame();}
async function click(id: string) {element<HTMLButtonElement>(id).click(); await frame();}
async function button(name: string) {
  const control = [...document.querySelectorAll<HTMLButtonElement>('#root button')].find(e => e.textContent === name);
  if (!control || control.disabled) throw new Error(`Missing enabled button ${name}`);
  control.click(); await frame();
}
function overlap(a: DOMRect, b: DOMRect) {return a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;}
function checkGraph(id: string) {
  const svg = document.querySelector<SVGSVGElement>(`[data-testid="${id}"]`)!;
  assert(svg?.getAttribute('aria-label'), `${id}: accessible description retained`);
  const box = svg.getBoundingClientRect();
  const narrow = svg.dataset.narrow === 'true';
  const items = [...svg.querySelectorAll<SVGTextElement>('text')].map(text => ({text: text.textContent, box: text.getBoundingClientRect(),
    size: parseFloat(getComputedStyle(text).fontSize), fill: getComputedStyle(text).fill, classes: text.classList}));
  for (const item of items) {
    assert(item.box.left >= box.left - .5 && item.box.right <= box.right + .5 && item.box.top >= box.top - .5 && item.box.bottom <= box.bottom + .5,
      `${id}: ${item.text} inside SVG bounds`);
    const key = item.classes.contains('axis-label') || item.classes.contains('state-label') || item.classes.contains('chart-key');
    const secondary = item.classes.contains('axis-sublabel');
    if (!secondary) assert(item.size >= (key ? narrow ? 13 : 14 : narrow ? 12 : 13), `${id}: ${item.text} font minimum`);
  }
  const collisions: string[] = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (overlap(items[i].box, items[j].box)) collisions.push(`${items[i].text} / ${items[j].text}`);
  }
  geometry.push({id, narrow, bounds: box.toJSON(), collisions, items: items.map(i => ({text: i.text, size: i.size, fill: i.fill, box: i.box.toJSON()}))});
  assert(!collisions.length, `${id}: no text collisions (${collisions.join('; ')})`);
  const marker = svg.querySelector<SVGCircleElement>('[data-testid="current-marker"]');
  if (marker) for (const item of items.filter(i => i.classes.contains('chart-key'))) {
    assert(!overlap(item.box, marker.getBoundingClientRect()), `${id}: ${item.text} clear of current marker`);
  }
  if (id === 'mm-plot' && narrow) assert(svg.querySelectorAll('.plot-grid text').length <= 9, 'MM narrow tick density at most 4 x + 5 y');
  if (id === 'progress-curve' && narrow) assert(svg.querySelectorAll('.plot-grid text').length <= 6, 'Progress narrow tick density at most 3 x + 3 y');
  report();
}
function contrast(fill: string) {
  const rgb = fill.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(c => c / 255);
  const linear = rgb.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return 1.05 / (.2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2] + .05);
}
function checkEnergyContrast() {
  for (const text of document.querySelectorAll<SVGTextElement>('.energy-diagram .chart-key')) {
    const fill = getComputedStyle(text).fill;
    assert(contrast(fill) >= 4.5, `01 ${text.textContent}: ${fill}, contrast ${contrast(fill).toFixed(3)}:1`);
  }
}
function checkLabels() {
  const host = element('structure-viewer');
  const box = host.getBoundingClientRect();
  const labels = [...host.querySelectorAll<HTMLElement>('.atom-label')];
  const visible = labels.filter(e => !e.hidden);
  for (const label of labels) {
    const size = parseFloat(getComputedStyle(label).fontSize);
    const minimum = label.matches('.selected,.metal') ? innerWidth <= 620 ? 14 : 15 : label.matches('.measure') ? innerWidth <= 620 ? 13 : 14 : 12.5;
    assert(size >= minimum, `02 ${label.textContent}: font minimum`);
  }
  for (const label of visible) {
    const b = label.getBoundingClientRect();
    assert(b.left >= box.left && b.right <= box.right && b.top >= box.top && b.bottom <= box.bottom, `02 ${label.textContent}: within viewer`);
  }
  const selected = host.querySelector('.selected');
  if (selected) assert(element('selection-readout').textContent?.includes(selected.textContent!.split(' · ')[0]), '02 selected label matches selected residue readout');
  const area = visible.reduce((sum, label) => {const b = label.getBoundingClientRect(); return sum + b.width * b.height;}, 0) / (box.width * box.height);
  assert(area < .18, '02 label rectangles occupy less than 18% of viewer');
  const collisions: string[] = [];
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    if (overlap(visible[i].getBoundingClientRect(), visible[j].getBoundingClientRect())) collisions.push(`${visible[i].textContent}/${visible[j].textContent}`);
  }
  assert(!collisions.length, `02 visible labels do not overlap (${collisions.join('; ')})`);
  geometry.push({angle, cameraPosition: host.dataset.cameraPosition, cameraDistance: host.dataset.cameraDistance, area, collisions,
    labels: labels.map(e => ({text: e.textContent, classes: e.className, hidden: e.hidden, size: getComputedStyle(e).fontSize, box: e.getBoundingClientRect().toJSON()}))});
  report();
}
function checkRegulation() {
  for (const e of document.querySelectorAll<HTMLElement>('.reg-legend,.reg-steps small,.reg-domain strong,.reg-domain-caption,.reg-structure-legend,.reg-picked,.reg-structure-scope')) {
    assert(parseFloat(getComputedStyle(e).fontSize) >= 13, `05 ${e.className || e.textContent}: font minimum`);
    const b = e.getBoundingClientRect();
    assert(b.left >= 0 && b.right <= document.documentElement.clientWidth + .5, `05 ${e.className}: wraps within page`);
  }
  assert(document.documentElement.scrollWidth <= document.documentElement.clientWidth, '05 no horizontal page overflow');
}
async function scenario(name: string) {
  if (document.querySelector('.reg-structure-frame[data-expanded=true]')) await button('닫기');
  if (name.startsWith('energy')) {
    session.reset('reactionEnergy');
    session.set('reactionEnergy', 'predictions', {main: {opening: {choice: 'no', locked: true}}});
    session.set('reactionEnergy', 'enzyme', name !== 'energy-default');
    if (name === 'energy-maximum') session.set('reactionEnergy', 'productEnergy', 30);
    if (name === 'energy-equal') session.set('reactionEnergy', 'productEnergy', 0);
    if (name === 'energy-maximum') session.set('reactionEnergy', 'barrierLowering', 20);
    await route('reaction-energy');
  } else if (name.startsWith('carbonic')) {
    await route('carbonic-anhydrase');
    await ready('[data-testid="structure-viewer"] canvas');
    await click('reset-module');
    if (name !== 'carbonic-overview') await click('stage-2');
    if (name === 'carbonic-active') await click('focus-active-site');
    if (name === 'carbonic-selected') {
      document.querySelector<HTMLButtonElement>('button[aria-label="3D 구조에서 찾기: His 94"]')!.click();
      await frame();
    }
    angle = 0;
  } else if (name.startsWith('progress')) {
    await route('kinetics'); session.reset('kinetics'); await frame();
    await click('run-assay'); await click('measure-v0');
  } else if (name.startsWith('mm')) {
    session.set('kinetics', 'section', 'b');
    session.set('kinetics', 'parameters', {...KINETICS_PREPARATION, km: name === 'mm-high' ? 300 : 75, kcat: name === 'mm-expanded' ? 60 : 20});
    session.set('kinetics', 'substrate', name === 'mm-high' ? 600 : 80);
    session.set('kinetics', 'baseline', name === 'mm-expanded' ? {...KINETICS_PREPARATION} : null);
    session.set('kinetics', 'axisLock', name === 'mm-expanded' ? 115 : null);
    session.set('kinetics', 'showKmGuide', name !== 'mm-default'); session.set('kinetics', 'showVmaxGuide', name !== 'mm-default');
    session.set('kinetics', 'exploredHigh', name === 'mm-high');
    session.set('kinetics', 'predictions', {mm: {saturation: {choice: 'ceiling', locked: true}}});
    session.set('kinetics', 'reveals', {'saturation-explanation:': name === 'mm-high'});
    await route('kinetics');
  } else {
    session.set('regulation', 'predictions', {main: {f26: {choice: 'glucagon', locked: true}}});
    session.set('regulation', 'lab', {...INITIAL_STATE, scenario: 'glucagonDominant', observed: ['glucagonDominant'], view: 'pathway',
      narration: {step: 5, status: 'completed', run: 1}});
    await route('regulation'); await ready('[data-testid="reg-pathway"]');
    if (name !== 'pathway') {await button('실제 3D 구조'); await ready('[data-testid="reg-structure-viewer"] canvas');}
    if (name === 'structure-expanded') await button('크게 보기');
  }
  await frame();
  const viewer = document.querySelector<HTMLElement>('.molecule-viewer');
  // Wait for the existing preset's camera flight to settle; no camera behavior is replaced.
  if (viewer) {
    let previous = '', stable = 0;
    for (let i = 0; i < 150 && stable < 2; i++) {
      await frame(); const current = viewer.dataset.cameraPosition ?? '';
      stable = current === previous ? stable + 1 : 0; previous = current;
    }
  }
  document.querySelector('.workspace,.reg-observation')?.scrollIntoView({block: 'center'});
  output.dataset.scenario = name;
}
async function graphChecks() {
  for (const name of ['energy-default', 'energy-catalyst', 'energy-maximum', 'energy-equal', 'progress', 'mm-default', 'mm-guides', 'mm-high', 'mm-expanded']) {
    await scenario(name); checkGraph(name.startsWith('energy') ? 'energy-diagram' : name === 'progress' ? 'progress-curve' : 'mm-plot');
    if (name.startsWith('energy')) checkEnergyContrast();
    const legend = document.querySelector('.legend');
    if (legend) assert(parseFloat(getComputedStyle(legend).fontSize) >= 13, `${name}: legend minimum`);
    assert(document.documentElement.scrollWidth <= document.documentElement.clientWidth, `${name}: no horizontal overflow`);
  }
}
async function runChecks() {
  checks.length = 0; geometry.length = 0;
  await graphChecks();
  await scenario('carbonic-selected'); checkLabels();
  await scenario('pathway'); checkRegulation();
  await scenario('structure'); checkRegulation();
  await scenario('structure-expanded'); checkRegulation();
  await button('닫기');
  checks.push('ALL READABILITY CHECKS PASSED'); report();
}
const controls = document.createElement('div'); controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:12px';
function control(label: string, task: () => Promise<void>) {
  const b = document.createElement('button'); b.textContent = label;
  b.addEventListener('click', () => {b.disabled = true; void task().catch(error => {checks.push(`FAIL ${String(error)}`); report(); console.error(error);}).finally(() => {b.disabled = false;});});
  controls.append(b);
}
control('Run readability checks', runChecks);
control('Run graph checks', async () => {checks.length = 0; geometry.length = 0; await graphChecks(); checks.push('ALL GRAPH CHECKS PASSED'); report();});
for (const name of ['energy-default','energy-catalyst','energy-maximum','energy-equal','carbonic-overview','carbonic-active','carbonic-selected','progress','mm-default','mm-guides','mm-high','mm-expanded','pathway','structure','structure-expanded']) {
  control(`Capture ${name}`, () => scenario(name));
}
control('Next camera angle', async () => {
  const canvas = element('structure-viewer').querySelector('canvas')!;
  for (const key of ['ArrowRight','ArrowRight', ...(angle % 2 ? ['ArrowUp'] : ['ArrowDown']), ...(angle === 3 ? ['+'] : []), ...(angle === 7 ? ['-'] : [])]) {
    canvas.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true})); await frame();
  }
  angle++; checkLabels(); element('structure-viewer').scrollIntoView({block: 'center'});
});
const baselineStyle = document.createElement('style');
const currentStyles: HTMLStyleElement[] = [];
control('Apply baseline typography', async () => {
  const styles = await Promise.all(['styles','modules/regulation/regulation'].map(name => fetch(`../../docs/ux-006-007-verification/baseline/src/${name}.css.txt`).then(r => r.text())));
  currentStyles.push(...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id]'));
  currentStyles.forEach(style => {style.disabled = true;});
  baselineStyle.textContent = styles.join('\n'); document.head.append(baselineStyle); await frame();
});
control('Restore updated typography', async () => {baselineStyle.remove(); currentStyles.forEach(style => {style.disabled = false;}); currentStyles.length = 0; await frame();});
document.body.append(controls, output);
createRoot(document.getElementById('root')!).render(<App session={session} />);
report();
