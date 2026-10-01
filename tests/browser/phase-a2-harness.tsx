// Development-only checks exercise real App controls and inspect the existing session store.
import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import {createLearningSession} from '../../src/app/learningSessionStore';
import '../../src/styles.css';

const session = createLearningSession();
const checks: string[] = [];
const results: Record<string, unknown> = {};
const output = document.createElement('pre');
output.dataset.testid = 'phase-a2-audit';
output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;padding:12px';
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const testId = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;
function report() {output.textContent = JSON.stringify({checks, results, viewport: {width: innerWidth, height: innerHeight}, snapshot: session.snapshot()}, null, 2);}
function assert(condition: unknown, name: string) {
  if (!condition) throw new Error(name);
  checks.push(`PASS ${name}`); report();
}
async function click(id: string) {
  const control = testId<HTMLButtonElement>(id);
  if (!control || control.disabled) throw new Error(`Missing/enabled control: ${id}`);
  control.click(); await frame();
}
async function button(text: string) {
  const control = [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent === text);
  if (!control || control.disabled) throw new Error(`Missing/enabled button: ${text}`);
  control.click(); await frame();
}
async function slider(id: string, value: number) {
  const control = testId<HTMLInputElement>(id);
  if (!control || control.disabled) throw new Error(`Missing/enabled slider: ${id}`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(control, String(value));
  control.dispatchEvent(new Event('input', {bubbles: true}));
  control.dispatchEvent(new Event('change', {bubbles: true})); await frame();
}
async function predict(id: string, choice: string) {
  testId(id).querySelector<HTMLInputElement>(`input[value="${choice}"]`)!.click(); await frame();
  testId(id).querySelector<HTMLButtonElement>('button')!.click(); await frame();
}
async function route(id: string) {await click(`nav-${id}`);}
async function roundTrip(via: string, back: string) {await route(via); await route(back);}
async function measure50() {await click('substrate-50'); await click('run-assay'); await click('measure-v0');}

async function runChecks() {
  checks.length = 0;
  await route('reaction-energy'); await click('reset-module'); await predict('opening-question', 'no'); await button('있음');
  await slider('barrier-lowering', 35); await slider('product-energy', 30);
  const reduction = testId<HTMLInputElement>('barrier-lowering');
  assert(reduction.max === '20' && reduction.value === '20' && session.get('reactionEnergy', 'barrierLowering') === 20,
    'UX-002 product +30 clamps slider and stored reduction from 35 to 20');
  assert(testId('readout-forward').textContent?.includes('55 → 35') && testId('readout-reverse').textContent?.includes('25 → 5'),
    'UX-002 applied reduction is 20 in both directions, with minimum reverse barrier 5');
  assert(testId('readout-delta-g').textContent?.includes('+30'), 'UX-002 ΔG stays +30 with catalyst');
  results.energy = {maximum: reduction.max, value: reduction.value, forward: testId('readout-forward').textContent, reverse: testId('readout-reverse').textContent};
  await button('없음'); await button('있음');
  assert(reduction.value === '20' && testId('readout-reverse').textContent?.includes('25 → 5'), 'UX-002 off/on keeps guarded reduction');
  await slider('barrier-top', 40);
  assert(reduction.max === '5' && session.get('reactionEnergy', 'barrierLowering') === 5, 'UX-002 lowering transition state also clamps stored input');
  await slider('barrier-top', 20);
  assert(reduction.max === '0' && reduction.value === '0' && reduction.disabled && session.get('reactionEnergy', 'barrierLowering') === 0,
    'UX-002 zero available reduction is representable and disabled');
  assert(testId('readout-reverse').textContent?.includes('5 → 5'), 'UX-002 endpoint guard remains active at zero reduction');
  await roundTrip('model-notes', 'reaction-energy');
  assert(session.get('reactionEnergy', 'barrierLowering') === 0 && testId<HTMLInputElement>('barrier-lowering').value === '0', 'UX-001 clamped energy state survives Reference');

  await route('kinetics');
  for (const [km, threshold, path] of [[100, 400, 'near'], [150, 600, 'near'], [155, 600, 'range'], [300, 600, 'range']] as const) {
    await click('reset-module'); await button('03B · Michaelis–Menten 탐색');
    await slider('km', km); await predict('q-saturation', 'ceiling'); await slider('current-substrate', threshold - 5);
    assert(testId('saturation-explanation-gate') && !session.get('kinetics', 'exploredHigh'), `UX-003 Km ${km} stays gated below observation boundary`);
    await slider('current-substrate', threshold);
    assert(testId('saturation-explanation-button') && session.get('kinetics', 'exploredHigh'), `UX-003 Km ${km} has a reachable completion path`);
    await click('saturation-explanation-button');
    assert(testId(`saturation-${path}-explanation`) && !testId(`saturation-${path === 'near' ? 'range' : 'near'}-explanation`),
      `UX-003 Km ${km} opens the correct ${path} explanation`);
    assert(testId<HTMLInputElement>('current-substrate').max === '600', `UX-003 Km ${km} keeps substrate maximum 600`);
    results[`km${km}`] = {path, ratio: testId('saturation-ratio').textContent, fraction: testId('readout-fraction').textContent};
    if (km === 300) {
      assert(testId('saturation-ratio').textContent?.includes('2.0') && testId('saturation-ratio').textContent?.includes('0.67'), 'UX-003 Km 300 gives ratio 2.0 and speed 0.67 Vmax');
      await slider('current-substrate', 100);
      assert(testId('saturation-range-explanation'), 'UX-003 completed range observation remains available while comparing lower [S]');
      await roundTrip('model-notes', 'kinetics');
      assert(testId('saturation-range-explanation'), 'UX-001 completed range explanation survives Reference');
      await slider('km', 100);
      assert(testId('saturation-explanation-gate') && !session.get('kinetics', 'exploredHigh'), 'UX-003 changing Km rechecks observation for the new condition');
    }
  }

  await click('reset-module'); await button('03B · Michaelis–Menten 탐색'); await click('capture-baseline');
  assert(testId('mm-plot').dataset.axisMax === '115.000' && !testId('axis-rescale-note'), 'UX-004 baseline reserves 115 without a rescale message');
  const referencePath = testId('baseline-curve').getAttribute('d');
  await slider('kcat', 60);
  assert(testId('mm-plot').dataset.axisMax === '330.000' && testId('mm-plot').dataset.baselineVmax === '100.000', 'UX-004 axis expands 115 to 330, retaining baseline Vmax 100');
  assert(testId('axis-rescale-note').textContent?.includes('115 → 330') && !testId('axis-note').textContent?.includes('속도 축도 고정'), 'UX-004 feedback and caption describe actual expansion');
  assert(testId('baseline-curve').getAttribute('d') !== referencePath && testId('mm-curve').parentElement === testId('baseline-curve').parentElement,
    'UX-004 both curves are reprojected inside the same SVG coordinate system');
  assert(testId('readout-vmax').textContent?.includes('300.0'), 'UX-004 current Vmax remains explicit');
  results.axis = {maximum: testId('mm-plot').dataset.axisMax, feedback: testId('axis-rescale-note').textContent};
  await roundTrip('reaction-energy', 'kinetics');
  assert(testId('mm-plot').dataset.baselineVmax === '100.000' && Math.abs(session.get('kinetics', 'axisLock')! - 115) < 1e-9,
    'UX-001 baseline and axis reserve survive module round trip');
  await slider('kcat', 20);
  assert(testId('mm-plot').dataset.axisMax === '115.000' && !testId('axis-rescale-note'), 'UX-004 no expansion message when the curve fits the reserved range');

  await click('reset-module');
  assert(testId('virtual-measurement-note').textContent?.includes('모델 계산 기반 가상 측정')
    && testId('virtual-measurement-note').textContent?.includes('무작위 측정 오차 없이')
    && testId('virtual-measurement-note').textContent?.includes('동일 조건은 1개 측정점'), 'UX-005 origin/no-noise/one-condition note is always near controls');
  await predict('q-linear', 'slows'); await measure50();
  assert(session.get('kinetics', 'assays').length === 1 && testId('measured-v0').textContent?.includes('40.0'), 'UX-005 first 50 µM records the unchanged analytical model value 40.0');
  assert(!testId('measurement-status').textContent, 'UX-005 first measurement has no duplicate message');
  await measure50();
  assert(session.get('kinetics', 'assays').length === 1 && testId('assay-table').querySelectorAll('tbody tr').length === 1, 'UX-005 repeated condition does not add an independent row');
  assert(testId('measurement-status').textContent?.includes('이미 기록') && testId('measurement-status').getAttribute('aria-live') === 'polite', 'UX-005 duplicate measurement reports inline feedback');
  await click('progress-explanation-button');
  assert(testId('progress-explanation').textContent?.includes('모델의 t=0') && testId('progress-explanation').textContent?.includes('너무 긴 시간 구간'), 'UX-005 model recording and experimental slope/window error are distinguished');
  results.measurement = {value: testId('measured-v0').textContent, rows: session.get('kinetics', 'assays').length, duplicateFeedback: testId('measurement-status').textContent};
  await roundTrip('model-notes', 'kinetics');
  assert(session.get('kinetics', 'assays').length === 1 && testId('assay-table').querySelectorAll('tbody tr').length === 1, 'UX-001 03A measurement survives Reference');
  await click('clear-assays'); await measure50();
  assert(session.get('kinetics', 'assays').length === 1 && !testId('measurement-status').textContent, 'UX-005 cleared condition can be recorded again without stale duplicate feedback');
  await click('reset-module'); await roundTrip('model-notes', 'kinetics');
  assert(session.get('kinetics', 'assays').length === 0 && session.get('kinetics', 'baseline') === null && !testId('assay-table') && !testId('measurement-status').textContent,
    'UX-001 explicit reset survives Reference with no revived measurements/baseline/status');
  checks.push('ALL PHASE A2 CHECKS PASSED'); report();
}

const run = document.createElement('button');
run.textContent = 'Run Phase A2 checks'; run.dataset.testid = 'run-phase-a2';
run.addEventListener('click', () => {run.disabled = true; void runChecks().catch(error => {
  checks.push(`FAIL ${String(error)}`); report(); console.error(error);
}).finally(() => {run.disabled = false;});});
document.body.append(run, output);
createRoot(document.getElementById('root')!).render(<App session={session} />);
report();
