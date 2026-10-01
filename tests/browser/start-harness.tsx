// Development-only integration checks against the real App, routes and session provider.
import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import {hashFor, moduleEntry} from '../../src/app/modules';
import {createLearningSession, KINETICS_PREPARATION} from '../../src/app/learningSessionStore';
import {pageTitle} from '../../src/app/modelNotesNavigation';
import {measuredInitialVelocity} from '../../src/kinetics/progressCurve';
import '../../src/styles.css';

const session = createLearningSession();
const checks: string[] = [];
const output = document.createElement('pre');
output.dataset.testid = 'start-results';
output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;padding:12px';
const report = () => {output.textContent = JSON.stringify({viewport: [innerWidth, innerHeight], checks, session: session.snapshot()}, null, 2);};
const frame = () => new Promise<void>(resolve => setTimeout(resolve, 100));
const testId = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;
async function until(test: () => unknown, label: string) {
  const deadline = Date.now() + 10000;
  while (!test()) {if (Date.now() > deadline) throw Error(`Timeout: ${label}`); await frame();}
}
function assert(value: unknown, label: string) {if (!value) throw Error(label); checks.push(`PASS ${label}`); report();}
async function click(id: string) {testId(id).click(); await frame();}
async function button(name: string) {
  const target = [...document.querySelectorAll<HTMLButtonElement>('button')].find(element => element.textContent === name);
  if (!target || target.disabled) throw Error(`Unavailable button: ${name}`);
  target.click(); await frame();
}

async function runChecks() {
  checks.length = 0;
  await click('nav-start');
  const main = document.getElementById('main-content');
  const entry = moduleEntry('regulation');
  let card = testId<HTMLAnchorElement>('card-regulation');
  assert(card.tagName === 'A' && card.getAttribute('href') === hashFor(entry.id), '05 has a semantic link to the registry route');
  assert(card.textContent?.includes('현재 이용 가능') && card.textContent.includes('학습 시작'), '05 is visibly usable');
  assert(document.querySelectorAll('.card-grid .module-card').length === 3, '01/02/03 basic cards retained');
  assert(document.querySelector('.start-planned')?.textContent?.includes('04') && moduleEntry('inhibition').status === 'planned', '04 remains planned');
  assert(!document.querySelector('.start-planned a, .start-planned button'), '04 announcement is non-interactive');
  const label = card.getAttribute('aria-labelledby')!.split(' ').map(id => document.getElementById(id)?.textContent).join(' ');
  assert(label.includes(entry.number!) && label.includes(entry.title) && label.includes('학습 시작'), '05 accessible name identifies the module and action');
  assert(card.tabIndex === 0 && !card.querySelector('a, button, input, [tabindex]'), '05 has a single keyboard stop');
  assert(document.querySelector('.start-explore')?.textContent?.includes('다른 모듈을 완료하지 않아도'), '05 states optional access without prerequisites');
  card.focus(); assert(document.activeElement === card, '05 link accepts keyboard focus');
  card.click(); await until(() => testId('reg-prediction'), '05 lazy load');
  assert(location.hash === hashFor(entry.id) && document.title === pageTitle(entry.id), 'Start CTA opens 05 with the existing route title');
  assert(testId('reg-prediction').dataset.locked === 'no', '05 opens before any basic-module completion');
  testId('reg-prediction').querySelector<HTMLInputElement>('input[value="insulin"]')!.click(); await frame();
  testId('reg-prediction').querySelector<HTMLButtonElement>('button')!.click(); await frame();
  await click('signal-insulinDominant');
  if (session.get('regulation', 'lab').narration.status === 'playing') await button('Ⅱ 일시정지');
  while (session.get('regulation', 'lab').narration.step < 5) await button('다음 →');
  await click('signal-glucagonDominant');
  if (session.get('regulation', 'lab').narration.status === 'playing') await button('Ⅱ 일시정지');
  while (session.get('regulation', 'lab').narration.step < 5) await button('다음 →');
  await button('중간 신호 직접 조작'); await button('높게 고정');
  session.set('reactionEnergy', 'enzymeSeen', true);
  session.set('kinetics', 'assays', [{initialSubstrate: 50, initialVelocity: measuredInitialVelocity(KINETICS_PREPARATION, 50), parameters: {...KINETICS_PREPARATION}}]);
  session.set('carbonicAnhydrase', 'judgements', {64: 'no', 94: 'yes'});
  const snapshot = JSON.stringify(session.snapshot());
  await click('nav-start');
  assert(testId('module-start') && location.hash === '#/start' && document.title === pageTitle('start'), '05 → Start restores the Start route and title');
  assert(JSON.stringify(session.snapshot()) === snapshot, 'Start does not reset any learning session');
  card = testId<HTMLAnchorElement>('card-regulation'); card.click(); await until(() => testId('reg-applied-f26'), '05 restored');
  assert(JSON.stringify(session.snapshot()) === snapshot && session.get('regulation', 'lab').control.mode === 'clamped', 'Start CTA restores prediction, hormone, narration, intervention and other modules');
  assert(document.querySelector('.reg-prediction-locked')?.textContent?.includes('인슐린 우세') && session.get('regulation', 'predictions').main?.f26?.locked, '05 prediction remains locked after the round trip');
  await click('nav-kinetics'); await click('nav-start'); await click('card-regulation'); await until(() => testId('reg-applied-f26'), 'cross-module return');
  assert(JSON.stringify(session.snapshot()) === snapshot, '03 → Start → 05 preserves the complete shared session');
  assert(document.getElementById('main-content') === main && document.querySelectorAll('main').length === 1 && document.querySelector('.skip-link'), 'stable main and skip-link policy retained');
  await click('nav-start');
  assert(document.documentElement.scrollWidth <= innerWidth, 'Start has no page horizontal overflow');
  checks.push('ALL START DISCOVERY CHECKS PASSED'); report();
}

const run = document.createElement('button'); run.textContent = 'Run Start checks'; run.dataset.testid = 'run-start';
run.addEventListener('click', () => {run.disabled = true; void runChecks().catch(error => {checks.push(`FAIL ${String(error)}`); report(); console.error(error);}).finally(() => {run.disabled = false;});});
document.body.append(run, output);
createRoot(document.getElementById('root')!).render(<App session={session} />);
report();
