import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import {createLearningSession} from '../../src/app/learningSessionStore';
import {jumpToSection} from '../../src/shared/components/SectionJumpButton';
import '../../src/styles.css';

const session = createLearningSession();
const checks: string[] = [];
const evidence: Record<string, unknown> = {};
const output = document.createElement('pre');
output.dataset.testid = 'ux008-results';
output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;padding:12px';
// Timers also settle React updates when the connected browser tab is in the background.
const frame = () => new Promise<void>(resolve => setTimeout(resolve, 120));
const testId = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;
const report = () => {output.textContent = JSON.stringify({viewport: [innerWidth, innerHeight], checks, evidence}, null, 2);};
function assert(value: unknown, description: string) {
  if (!value) throw Error(description);
  checks.push(`PASS ${description}`); report();
}
async function click(id: string) {testId<HTMLButtonElement>(id).click(); await frame();}
async function button(name: string) {
  const b = [...document.querySelectorAll<HTMLButtonElement>('button')].find(e => e.textContent === name);
  if (!b || b.disabled) throw Error(`Unavailable button: ${name}`);
  b.click(); await frame();
}
async function slider(id: string, value: number) {
  const input = testId<HTMLInputElement>(id);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
  input.dispatchEvent(new Event('input', {bubbles: true}));
  input.dispatchEvent(new Event('change', {bubbles: true})); await frame();
}
async function predict(id: string, choice: string) {
  testId(id).querySelector<HTMLInputElement>(`input[value="${choice}"]`)!.click(); await frame();
  testId(id).querySelector<HTMLButtonElement>('button')!.click(); await frame();
}
function positions() {
  const y = (s: string) => {const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null;};
  return {controls: y('main .controls'), graph: y('main .workspace'), catalyst: y('#energy-catalyst'),
    prediction: y('[data-testid="opening-question"]'), energyManipulation: y('[data-testid="barrier-lowering"]'),
    substrate: y('.choice-grid'), measure: y('[data-testid="measure-v0"]'), measurements: y('#initial-measurements'),
    initialPrediction: y('#initial-prediction'), km: y('[data-testid="km"]'), baseline: y('[data-testid="capture-baseline"]'),
    condition: y('[data-testid="mm-readout"]'), mmPrediction: y('[data-testid="q-saturation"]')};
}
function layout(name: string) {
  const mobile = innerWidth <= 760;
  const helpers = [...document.querySelectorAll<HTMLElement>('main .mobile-experiment-helper')];
  assert(helpers.every(e => (e.getClientRects().length > 0) === mobile), `${name}: helpers visible only at <=760`);
  const controls = document.querySelector('main .controls')!.getBoundingClientRect();
  const graph = document.querySelector('main .workspace')!.getBoundingClientRect();
  if (mobile) assert(controls.top < graph.top, `${name}: semantic controls then graph`);
  else if (innerWidth > 1180) assert(controls.left < graph.left && Math.abs(controls.top - graph.top) < 1, `${name}: original three-column grid`);
  else assert(graph.top < controls.top, `${name}: original tablet grid`);
  assert(document.documentElement.scrollWidth <= innerWidth, `${name}: no horizontal overflow`);
  const buttons = [...document.querySelectorAll<HTMLElement>('main .section-jump')];
  assert(buttons.every(b => Boolean(b.textContent?.trim()) && Boolean(document.getElementById(b.getAttribute('aria-controls')!))), `${name}: all jumps named with unique targets`);
  assert(helpers.filter(e => e.tagName === 'BUTTON').every(e => mobile || !e.getClientRects().length), `${name}: hidden helpers absent from layout/focus navigation`);
}
async function jump(name: string, id: string) {
  if (innerWidth > 760) return;
  await button(name);
  // Allow background-tab animation throttling; still require a visible, focused target.
  const target = document.getElementById(id)!;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (Math.abs(target.getBoundingClientRect().top - 16) < 2) break;
    await new Promise<void>(resolve => setTimeout(resolve, 50));
  }
  assert(document.activeElement === target, `${name}: focus reaches ${id}`);
  assert(target.getBoundingClientRect().top >= 0 && target.getBoundingClientRect().top < innerHeight, `${name}: target visible`);
  evidence[`${id}: ${name}`] = {focus: document.activeElement?.id, top: target.getBoundingClientRect().top, scroll: scrollY};
}
async function runChecks() {
  checks.length = 0;
  await click('nav-reaction-energy'); await click('reset-module'); layout('01 locked'); evidence.energyLocked = positions();
  assert(document.getElementById('energy-catalyst')!.querySelector('button')!.matches(':disabled'), '01 catalyst initially gated');
  await jump('예측으로 이동 ↓', 'energy-prediction');
  await predict('opening-question', 'no');
  assert(![...document.querySelectorAll('button')].some(b => b.textContent === '예측으로 이동 ↓') && testId('catalyst-prerequisite-complete'), '01 prerequisite becomes completion');
  await jump('촉매 조작으로 돌아가기 ↑', 'energy-catalyst');
  await button('있음'); await slider('product-energy', 30); await slider('barrier-top', 55); await slider('barrier-lowering', 20);
  for (const suffix of ['delta-g', 'forward', 'reverse']) {
    assert(testId(`compact-${suffix}`).textContent === testId(`readout-${suffix}`).textContent, `01 compact ${suffix} equals full observation`);
  }
  assert(document.querySelectorAll('[data-testid="product-energy"]').length === 1, '01 single product slider');
  await jump('그래프에서 확인 ↓', 'energy-graph'); await jump('조작으로 돌아가기 ↑', 'energy-controls');
  await jump('관찰과 질문으로 이동 ↓', 'energy-prediction');
  for (const [id, choice] of [['q-delta-g', 'no'], ['q-barrier', 'both'], ['q-rate', 'both'], ['q-equilibrium', 'no']]) await predict(id, choice);
  await click('energy-explanation-button'); assert(testId('energy-explanation'), '01 explanation reached');
  await click('nav-model-notes'); await click('nav-reaction-energy'); assert(testId('energy-explanation') && session.get('reactionEnergy', 'barrierLowering') === 20, 'UX-001 energy state and reveal preserved');

  await click('nav-kinetics'); await click('reset-module'); layout('03A empty');
  await click('substrate-50'); await click('run-assay'); await click('measure-v0'); layout('03A measured'); evidence.initialMeasured = positions();
  assert(testId('initial-compact-readout').textContent?.includes('50 µM') && testId('initial-compact-readout').textContent?.includes('40.0'), '03A nearby model measurement');
  await jump('진행 곡선에서 확인 ↓', 'initial-graph'); await jump('모은 측정값에서 확인 ↓', 'initial-measurements');
  assert(testId('assay-table').querySelectorAll('tbody tr').length === 1, '03A measured point in collected table');
  await jump('다른 [S]로 측정하기 ↑', 'initial-controls');
  await click('substrate-100'); assert(testId('initial-compact-readout').textContent?.includes('50 µM'), '03A changing next condition does not mislabel last run');
  await click('run-assay'); assert(!testId('initial-compact-readout'), '03A new run clears nearby measurement'); await click('measure-v0');
  await click('run-assay'); await click('measure-v0');
  assert(session.get('kinetics', 'assays').length === 2 && testId('measurement-status').textContent?.includes('독립 반복'), 'UX-005 duplicate condition not recorded twice');
  await predict('q-linear', 'slows'); await click('progress-explanation-button');
  assert(testId('progress-explanation').textContent?.includes('모델의 t=0'), 'UX-005 explanation retains virtual measurement semantics');

  await button('03B · Michaelis–Menten 탐색'); layout('03B'); evidence.mm = positions();
  await slider('km', 300); await slider('current-substrate', 600);
  assert(testId('mm-compact-readout').textContent?.includes('300 µM') && testId('mm-compact-readout').textContent?.includes('66.7'), '03B compact follows active Km and v0');
  await jump('그래프에서 확인 ↓', 'mm-graph'); await jump('예측과 해설에서 확인 ↓', 'mm-inquiry');
  await predict('q-saturation', 'ceiling'); await click('saturation-explanation-button');
  assert(testId('saturation-range-explanation') && testId('saturation-ratio').textContent?.includes('2.0'), 'UX-003 high Km range-limit explanation and ratio preserved');
  await jump('조건 조절로 돌아가기 ↑', 'mm-controls'); await click('capture-baseline'); await slider('kcat', 60);
  await jump('그래프에서 확인 ↓', 'mm-graph');
  assert(testId('axis-rescale-note').textContent?.includes('115 → 330') && testId('baseline-curve'), 'UX-004 baseline and expanded axis preserved');
  await click('nav-model-notes'); await click('nav-kinetics');
  assert(session.get('kinetics', 'assays').length === 2 && testId('baseline-curve') && testId('saturation-range-explanation'), 'UX-001 kinetics measurements, baseline, explanation preserved');
  layout('03B expanded');

  // Fixture-only branch instrumentation: the browser does not offer OS media emulation.
  const originalMedia = window.matchMedia;
  const originalScroll = HTMLElement.prototype.scrollIntoView;
  try {
    for (const reduced of [true, false]) {
      window.matchMedia = ((q: string) => q === '(prefers-reduced-motion: reduce)' ? {matches: reduced} : originalMedia.call(window, q)) as typeof window.matchMedia;
      let observed: ScrollIntoViewOptions | undefined;
      HTMLElement.prototype.scrollIntoView = function(options) {observed = options as ScrollIntoViewOptions;};
      jumpToSection(document.getElementById('mm-controls')!);
      assert(observed?.behavior === (reduced ? 'auto' : 'smooth') && document.activeElement?.id === 'mm-controls', `reduced motion ${reduced}: correct behavior and focus`);
    }
  } finally {window.matchMedia = originalMedia; HTMLElement.prototype.scrollIntoView = originalScroll;}
  checks.push('ALL UX-008 CHECKS PASSED'); report();
}
const run = document.createElement('button');
run.textContent = 'Run UX-008 checks'; run.dataset.testid = 'run-ux008';
run.addEventListener('click', () => {run.disabled = true; void runChecks().catch(error => {
  checks.push(`FAIL ${String(error)}`); report(); console.error(error);
}).finally(() => {run.disabled = false;});});
const runLayout = document.createElement('button');
runLayout.textContent = 'Run UX-008 layout checks'; runLayout.dataset.testid = 'run-ux008-layout';
runLayout.addEventListener('click', () => {runLayout.disabled = true; void (async () => {
  checks.length = 0;
  await click('nav-reaction-energy'); await click('reset-module'); layout('01'); evidence.energyLocked = positions();
  await click('nav-kinetics'); await click('reset-module'); layout('03A');
  await click('run-assay'); await click('measure-v0'); layout('03A measured'); evidence.initialMeasured = positions();
  assert(document.getElementById('initial-measurements')!.compareDocumentPosition(document.getElementById('initial-prediction')!) & Node.DOCUMENT_POSITION_FOLLOWING, '03A measurements precede interpretation in DOM');
  await button('03B · Michaelis–Menten 탐색'); layout('03B'); evidence.mm = positions();
  checks.push('ALL UX-008 LAYOUT CHECKS PASSED'); report();
})().catch(error => {checks.push(`FAIL ${String(error)}`); report(); console.error(error);}).finally(() => {runLayout.disabled = false;});});
document.body.append(run, runLayout, output);
createRoot(document.getElementById('root')!).render(<App session={session} />);
report();
