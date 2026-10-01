// Development-only App/navigation tests, including real WebGL teardown. No production instrumentation.
import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import {createLearningSession} from '../../src/app/learningSessionStore';
import {StructureScene} from '../../src/viewer/rendering/StructureScene';
import '../../src/styles.css';

const session = createLearningSession();
const checks: string[] = [];
const lifecycle = {disposals: 0, rendererDisposals: 0, contextReleases: 0, contextsLost: 0,
  listenerCleanups: 0, controlsDisposals: 0, resizeDisconnects: 0, pendingFlights: 0, canceledFlights: 0};
const canvases = new Set<HTMLCanvasElement>();
const activeScenes = new Set<StructureScene>();
const originalCameraView = StructureScene.prototype.cameraView;
StructureScene.prototype.cameraView = function (...args) {
  activeScenes.add(this);
  originalCameraView.apply(this, args);
};
const output = document.createElement('pre');
output.dataset.testid = 'session-audit';
output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;padding:12px';
document.body.append(output);
function report() {
  output.textContent = JSON.stringify({checks, lifecycle, connectedCanvases: document.querySelectorAll('canvas').length,
    viewport: {width: innerWidth, height: innerHeight}, snapshot: session.snapshot()}, null, 2);
}
function assert(condition: unknown, name: string) {
  if (!condition) throw new Error(name);
  checks.push(`PASS ${name}`); report();
}
// Inspect the real cleanup calls, rather than treating a disconnected DOM node as proof of disposal.
const originalDispose = StructureScene.prototype.dispose;
StructureScene.prototype.dispose = function () {
  const internals = this as unknown as {disposed: boolean; flight: number | null;
    renderer: {domElement: HTMLCanvasElement; dispose: () => void; forceContextLoss: () => void};
    controls: {dispose: () => void}; resize: {disconnect: () => void}};
  if (internals.disposed) {originalDispose.call(this); return;}
  const {renderer, controls, resize} = internals;
  const canvas = renderer.domElement;
  canvases.add(canvas);
  canvas.addEventListener('webglcontextlost', () => {lifecycle.contextsLost++; report();}, {once: true});
  const disposeRenderer = renderer.dispose.bind(renderer);
  renderer.dispose = () => {lifecycle.rendererDisposals++; disposeRenderer();};
  const releaseContext = renderer.forceContextLoss.bind(renderer);
  renderer.forceContextLoss = () => {lifecycle.contextReleases++; releaseContext();};
  const disposeControls = controls.dispose.bind(controls);
  controls.dispose = () => {lifecycle.controlsDisposals++; disposeControls();};
  const disconnect = resize.disconnect.bind(resize);
  resize.disconnect = () => {lifecycle.resizeDisconnects++; disconnect();};
  const remove = canvas.removeEventListener.bind(canvas);
  const removed = new Set<string>();
  canvas.removeEventListener = (...args: Parameters<typeof remove>) => {removed.add(args[0]); remove(...args);};
  const flight = internals.flight;
  const cancel = window.cancelAnimationFrame;
  if (flight !== null) lifecycle.pendingFlights++;
  window.cancelAnimationFrame = handle => {if (flight !== null && handle === flight) lifecycle.canceledFlights++; cancel.call(window, handle);};
  try {originalDispose.call(this);}
  finally {window.cancelAnimationFrame = cancel;}
  lifecycle.disposals++;
  activeScenes.delete(this);
  if (['keydown', 'pointerdown', 'pointerup', 'pointercancel'].every(type => removed.has(type))) lifecycle.listenerCleanups++;
  report();
};

const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
async function until(predicate: () => unknown, name: string) {
  for (let n = 0; n < 240; n++) {if (predicate()) return; await frame();}
  throw new Error(`Timed out: ${name}`);
}
const testId = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;
async function click(id: string) {
  await until(() => testId(id), id);
  const element = testId<HTMLButtonElement>(id);
  if (element.disabled) throw new Error(`Disabled control: ${id}`);
  element.click(); await frame();
}
async function button(text: string) {
  const element = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === text);
  if (!element || element.disabled) throw new Error(`Missing/enabled button: ${text}`);
  element.click(); await frame();
}
async function route(id: string) {await click(`nav-${id}`); await until(() => location.hash === `#/${id}`, id);}
async function predict(id: string, choice: string) {
  const input = testId(id).querySelector<HTMLInputElement>(`input[value="${choice}"]`)!;
  input.click(); await frame();
  testId(id).querySelector<HTMLButtonElement>('button')!.click(); await frame();
}
async function roundTrip(via: string, back: string) {await route(via); await route(back);}
async function measure(substrate: number) {await click(`substrate-${substrate}`); await click('run-assay'); await click('measure-v0');}
const jsonOnly = (value: unknown): boolean => value === null || ['number', 'string', 'boolean'].includes(typeof value)
  || (typeof value === 'object' && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) && Object.values(value).every(jsonOnly));

async function learningChecks() {
  await route('kinetics'); await click('reset-module');
  await predict('q-linear', 'slows'); await measure(50); await click('progress-explanation-button');
  const oldPanel = testId('panel-03a');
  await route('model-notes'); assert(!oldPanel.isConnected, '03 really unmounts on Reference exit');
  await route('kinetics');
  assert(testId('assay-table').textContent?.includes('50'), 'A: 50 µM measurement survives Reference');
  assert(testId('substrate-50').getAttribute('aria-pressed') === 'true' && testId('q-linear').dataset.locked === 'yes'
    && testId('q-linear').querySelector<HTMLInputElement>('input[value="slows"]')?.checked
    && testId('measure-v0').hasAttribute('disabled') && testId('progress-explanation'), '03A selected/checked/locked/reveal DOM matches restored progress');
  for (const substrate of [10, 100, 500]) await measure(substrate);
  await route('start'); await route('carbonic-anhydrase'); await route('kinetics');
  assert(testId('assay-table').querySelectorAll('tbody tr').length === 4, 'B: 10/50/100/500 µM survive Start → 02 → 03');
  await button('03B · Michaelis–Menten 탐색'); await roundTrip('model-notes', 'kinetics');
  assert(testId('panel-03b') && session.get('kinetics', 'assays').length === 4, 'C: 03B stage and four assay points survive Reference');
  await predict('q-saturation', 'ceiling');
  const slider = testId<HTMLInputElement>('current-substrate');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setValue.call(slider, '500'); slider.dispatchEvent(new Event('input', {bubbles: true})); slider.dispatchEvent(new Event('change', {bubbles: true})); await frame();
  await click('saturation-explanation-button'); await click('toggle-vmax-guide'); await click('capture-baseline');
  const baseline = session.get('kinetics', 'baseline'); const axisLock = session.get('kinetics', 'axisLock');
  await roundTrip('reaction-energy', 'kinetics');
  assert(session.get('kinetics', 'baseline') === baseline && session.get('kinetics', 'axisLock') === axisLock
    && testId('mm-plot').dataset.baselineVmax === '100.000', 'D: baseline, axis policy and accessible graph values survive another module');
  assert(testId('q-saturation').dataset.locked === 'yes' && testId('saturation-explanation')
    && session.get('kinetics', 'exploredHigh') && session.get('kinetics', 'showVmaxGuide'), '03B prediction, exploration gate and revealed guide survive');
  await click('reset-module'); await roundTrip('start', 'kinetics');
  assert(session.get('kinetics', 'assays').length === 0 && session.get('kinetics', 'baseline') === null
    && session.get('kinetics', 'section') === 'a' && testId('q-linear').dataset.locked === 'no'
    && !testId('progress-explanation') && !testId('measure-v0'), 'E: explicit reset clears all kinetics progress and never revives it');
  await measure(50); await click('clear-assays'); await roundTrip('model-notes', 'kinetics');
  assert(session.get('kinetics', 'assays').length === 0, 'clear-assays remains cleared after Reference');
  await route('reaction-energy'); await click('reset-module'); await predict('opening-question', 'no'); await button('있음');
  await roundTrip('model-notes', 'reaction-energy');
  assert(session.get('reactionEnergy', 'enzyme') && session.get('reactionEnergy', 'enzymeSeen')
    && testId('opening-question').dataset.locked === 'yes', '01 catalyst condition, prediction and exploration survive');
  await click('reset-module'); await roundTrip('start', 'reaction-energy');
  assert(!session.get('reactionEnergy', 'enzymeSeen') && testId('opening-question').dataset.locked === 'no', '01 explicit reset remains reset');
  await route('carbonic-anhydrase'); await until(() => testId('module-carbonic-anhydrase'), '02 load'); await click('reset-module'); await click('stage-2');
  for (const row of testId('residue-finder').querySelectorAll<HTMLElement>('li')) {
    row.querySelector<HTMLButtonElement>('button')!.click(); await frame();
    row.querySelector<HTMLInputElement>('input[value="yes"]')!.click(); await frame();
  }
  await click('lock-guess'); await click('ligand-explanation-button'); await roundTrip('model-notes', 'carbonic-anhydrase');
  await until(() => testId('module-carbonic-anhydrase'), '02 restored');
  assert(testId('stage-2').getAttribute('aria-pressed') === 'true' && session.get('carbonicAnhydrase', 'measured').length === 6
    && testId('residue-finder').querySelectorAll('input:checked').length === 6 && testId('ligand-explanation'), '02 stage, six measured residues, locked answers and explanation survive');
  await click('reset-module'); await roundTrip('model-notes', 'carbonic-anhydrase');
  await until(() => testId('stage-1'), '02 reset restored');
  assert(testId('stage-1').getAttribute('aria-pressed') === 'true' && session.get('carbonicAnhydrase', 'measured').length === 0
    && Object.keys(session.get('carbonicAnhydrase', 'judgements')).length === 0
    && !session.get('carbonicAnhydrase', 'judgementsLocked') && !testId('ligand-explanation'), '02 explicit reset clears answers, measurements, stage and reveals');
  await route('regulation'); await click('reset-module'); await predict('reg-prediction', 'insulin');
  for (const scenario of ['insulinDominant', 'glucagonDominant']) {
    await click(`signal-${scenario}`);
    if (session.get('regulation', 'lab').narration.status === 'playing') await button('Ⅱ 일시정지');
    while (session.get('regulation', 'lab').narration.step < 5) await button('다음 →');
  }
  await click('reg-explanation-button'); await button('중간 신호 직접 조작'); await button('높게 고정'); await click('reg-intervention-explanation-button');
  await roundTrip('model-notes', 'regulation');
  assert(session.get('regulation', 'lab').observed.length === 2 && testId('module-regulation').dataset.step === '5'
    && testId('signal-glucagonDominant').getAttribute('aria-pressed') === 'true' && testId('reg-intervention-explanation')
    && testId('reg-explanation') && session.get('regulation', 'lab').control.mode === 'clamped', '05 scenario, narration progress, comparison, clamp and reveals survive');
  await button('▶ 재생'); await route('model-notes');
  const paused = session.get('regulation', 'lab');
  assert(paused.narration.status === 'paused', '05 route exit pauses playback and invalidates pending ticks');
  await route('regulation'); assert(session.get('regulation', 'lab') === paused, '05 restored narration remains paused at the same step');
  await click('reset-module'); await roundTrip('start', 'regulation');
  assert(testId('module-regulation').dataset.step === '0' && !session.get('regulation', 'lab').scenario
    && session.get('regulation', 'lab').observed.length === 0, '05 explicit reset clears scenario/progress/clamp/reveals');
  assert(jsonOnly(session.snapshot()) && JSON.stringify(JSON.parse(JSON.stringify(session.snapshot()))) === JSON.stringify(session.snapshot()), 'all module snapshots contain only JSON learning data');
  assert(createLearningSession().get('kinetics', 'assays').length === 0, 'new App/refresh starts empty; no durable browser persistence');
}

async function lifecycleChecks() {
  for (const module of ['carbonic-anhydrase', 'regulation']) {
    await route(module);
    if (module === 'regulation') {await button('실제 3D 구조');}
    else {await until(() => testId('stage-2'), '02 loaded'); await click('stage-2');}
    const baseline = {...lifecycle};
    for (let n = 0; n < 20; n++) {
      await until(() => document.querySelector('canvas'), 'canvas restored');
      const canvas = document.querySelector('canvas')!;
      if (module === 'regulation') await button('선택 범위 맞춤');
      else await click('find-94');
      await route('model-notes');
      await until(() => lifecycle.contextsLost > baseline.contextsLost + n, 'context release');
      assert(!canvas.isConnected && document.querySelectorAll('canvas').length === 0, `${module} exit ${n + 1}: no connected canvas`);
      await route(module); await until(() => document.querySelector('canvas'), 'new viewer');
      assert(document.querySelectorAll('canvas').length === 1 && document.querySelector('canvas') !== canvas, `${module} return ${n + 1}: new viewer, no accumulation`);
      assert(module === 'regulation' ? session.get('regulation', 'lab').view === 'structure'
        : testId('stage-2').getAttribute('aria-pressed') === 'true', `${module} learning stage restored ${n + 1}`);
    }
    for (const key of ['disposals', 'rendererDisposals', 'contextReleases', 'contextsLost', 'listenerCleanups', 'controlsDisposals', 'resizeDisconnects'] as const) {
      assert(lifecycle[key] - baseline[key] === 20, `${module}: 20 ${key}`);
    }
    assert(lifecycle.canceledFlights === lifecycle.pendingFlights, `${module}: every pending camera RAF canceled`);
    if (module === 'regulation') {
      await button('크게 보기'); await route('model-notes');
      assert(!document.querySelector('dialog:modal') && document.body.style.overflow !== 'hidden', '05 expanded modal exit removes dialog and releases scroll');
      await route('regulation'); await until(() => document.querySelector('canvas'), '05 inline restore');
      assert(!document.querySelector('dialog:modal') && document.querySelector('[data-expanded="false"]'), '05 returns inline; open modal/camera state never restored');
    }
  }
  // Exercise a route exit immediately after the real viewer starts a camera flight.
  for (const scene of activeScenes) scene.cameraView('overview');
  await route('start');
  await until(() => [...canvases].every(canvas => !canvas.isConnected), 'final viewer teardown');
  assert(lifecycle.pendingFlights > 0 && lifecycle.pendingFlights === lifecycle.canceledFlights, 'real in-flight RAF cleanup exercised');
  assert(jsonOnly(session.snapshot()), 'WebGL stress adds no viewer objects to snapshots');
}

for (const [label, run] of [['학습 세션 회귀 검사 실행', learningChecks], ['WebGL 왕복 20회씩 검사 실행', lifecycleChecks]] as const) {
  const start = document.createElement('button'); start.textContent = label; document.body.append(start);
  start.onclick = async () => {
    start.disabled = true;
    try {await run(); checks.push(`ALL ${run === learningChecks ? 'LEARNING' : 'LIFECYCLE'} CHECKS PASSED`);}
    catch (error) {checks.push(`FAIL ${String(error)}`); console.error(error);}
    finally {start.disabled = false; report();}
  };
}
createRoot(document.getElementById('root')!).render(<App session={session} />);
report();
