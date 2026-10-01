import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import {MODULES} from '../../src/app/modules';
import {MODEL_NOTES_SECTIONS, modelNotesHash, modelNotesTarget, pageTitle} from '../../src/app/modelNotesNavigation';
import {createLearningSession} from '../../src/app/learningSessionStore';
import {jumpToSection} from '../../src/shared/components/SectionJumpButton';
import '../../src/styles.css';

const session = createLearningSession();
const checks: string[] = [];
const evidence: Record<string, unknown> = {};
const output = document.createElement('pre');
output.dataset.testid = 'navigation-results';
output.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;padding:12px';
const report = () => {output.textContent = JSON.stringify({viewport:[innerWidth,innerHeight],checks,evidence},null,2);};
const frame = () => new Promise<void>(resolve => setTimeout(resolve,100));
const testId = <T extends HTMLElement = HTMLElement>(id: string) => document.querySelector<T>(`[data-testid="${id}"]`)!;
async function until(test: () => unknown, label: string) {
  const deadline = Date.now()+10000;
  while (!test()) {if (Date.now()>deadline) throw Error(`Timeout: ${label}`); await frame();}
}
function assert(value: unknown, label: string) {if (!value) throw Error(label); checks.push(`PASS ${label}`); report();}
async function click(id: string) {testId<HTMLButtonElement>(id).click(); await frame();}
async function button(name: string) {
  const b = [...document.querySelectorAll<HTMLButtonElement>('button')].find(e => e.textContent === name);
  if (!b || b.disabled) throw Error(`Unavailable button: ${name}`);
  b.click(); await frame();
}
async function predict(id: string, choice: string) {
  testId(id).querySelector<HTMLInputElement>(`input[value="${choice}"]`)!.click(); await frame();
  testId(id).querySelector<HTMLButtonElement>('button')!.click(); await frame();
}
async function slider(id: string, value: number) {
  const input=testId<HTMLInputElement>(id);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,String(value));
  input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); await frame();
}
const focused = () => ({tag:document.activeElement?.tagName,id:document.activeElement?.id,name:document.activeElement?.getAttribute('aria-label')});
function positioned(id: string) {
  const target = document.getElementById(id)!;
  assert(document.activeElement===target, `${id}: focused`);
  const bounds=target.getBoundingClientRect();
  assert(bounds.top>=0 && bounds.bottom<=innerHeight, `${id}: heading visible`);
  evidence[id]={top:bounds.top,bottom:bounds.bottom,scroll:scrollY,focus:focused()};
}
async function reference(section: 'energy'|'carbonic'|'kinetics'|'regulation') {
  const a=document.querySelector<HTMLAnchorElement>(`main a[href="${modelNotesHash(section)}"]`)!;
  assert(a, `${section}: contextual Reference link exists`); a.focus(); a.click();
  await until(()=>document.activeElement?.id===modelNotesTarget(section),'Reference focus');
  positioned(modelNotesTarget(section));
  assert(document.title===pageTitle('model-notes'),'Reference title');
}
async function returnFrom(section: string) {
  const target = document.getElementById(`model-notes-${section}`)!.closest('section')!.querySelector<HTMLAnchorElement>('.notes-return a')!;
  const hash=target.getAttribute('href'); target.click(); await frame();
  assert(location.hash===hash && document.activeElement?.id==='main-content', `${section}: explicit return route and main focus`);
}
async function runChecks() {
  checks.length=0;
  const stableMain=document.getElementById('main-content');
  for (const entry of MODULES) {
    const link=testId(`nav-${entry.id}`); link.focus(); link.click(); await frame();
    assert(document.activeElement===link, `${entry.id}: rail focus retained`);
    assert(document.title===pageTitle(entry.id), `${entry.id}: title matches registry`);
    assert(link.getAttribute('aria-current')==='page', `${entry.id}: aria-current`);
    assert(document.querySelectorAll('main').length===1 && document.getElementById('main-content')===stableMain, `${entry.id}: one stable main`);
    const panel=document.querySelector<HTMLElement>('main .module')!;
    assert(parseFloat(getComputedStyle(panel).paddingLeft)===(innerWidth<=760?14:24) && panel.getBoundingClientRect().width<=1440, `${entry.id}: original module padding and max width retained`);
    assert(document.documentElement.scrollWidth<=innerWidth, `${entry.id}: no horizontal overflow`);
  }
  location.hash='#/unknown'; await frame();
  assert(document.title===pageTitle('start') && testId('module-start'), 'unknown route uses Start title/content');
  const skip=document.querySelector<HTMLAnchorElement>('.skip-link')!;
  skip.focus(); assert(skip.getBoundingClientRect().top>=0, 'skip visible on focus');
  skip.click(); await frame();
  assert(document.activeElement===stableMain && location.hash==='#/unknown', 'skip focuses main without changing route');

  await click('nav-model-notes');
  const toc=document.querySelector('.notes-toc')!;
  assert(toc.querySelectorAll('a').length===5, 'compact semantic TOC has five links');
  assert([...document.querySelectorAll('.notes h3[id]')].map(e=>e.id).join()===MODEL_NOTES_SECTIONS.map(e=>modelNotesTarget(e.id)).join(), 'Reference section learning order');
  assert([...document.querySelectorAll('.notes > section')].every(e=>e.id==='model-notes-common'||e.querySelector('h4')||e.querySelector('h3')?.id==='model-notes-common'), 'sections retain visible core limitations');
  const historyLength=history.length;
  for (const item of MODEL_NOTES_SECTIONS) {
    const a=toc.querySelector<HTMLAnchorElement>(`a[href="${modelNotesHash(item.id)}"]`)!; a.click(); await frame();
    positioned(modelNotesTarget(item.id));
    assert(history.length===historyLength, `${item.id}: TOC replaces current history entry`);
  }
  assert(document.documentElement.scrollWidth<=innerWidth, 'TOC/Reference no horizontal overflow');
  for (const details of document.querySelectorAll<HTMLDetailsElement>('.notes-details')) {details.open=true;}
  assert(document.querySelector('.notes a[href="https://www.rcsb.org/structure/2CBA"]'), 'source link preserved');
  assert(document.documentElement.scrollWidth<=innerWidth, 'expanded Reference no horizontal overflow');

  await click('nav-reaction-energy'); await click('reset-module'); await predict('opening-question','no');
  await slider('product-energy',30); await button('있음');
  const energyBefore=JSON.stringify(session.snapshot().reactionEnergy);
  await reference('energy'); await returnFrom('energy');
  assert(JSON.stringify(session.snapshot().reactionEnergy)===energyBefore,'UX-001 01 prediction and conditions survive direct Reference/return');
  if (innerWidth<=760) {
    jumpToSection(document.getElementById('energy-prediction')!);
    assert(document.activeElement?.id==='energy-prediction','UX-008 local jump retains focus after global navigation');
  }
  await click('nav-kinetics'); await click('reset-module');
  await click('run-assay'); await click('measure-v0');
  const kineticsBefore=JSON.stringify(session.snapshot().kinetics);
  await reference('kinetics');
  history.back(); await until(()=>location.hash==='#/kinetics' && testId('module-kinetics'),'Back to kinetics');
  assert(JSON.stringify(session.snapshot().kinetics)===kineticsBefore && testId('assay-table').querySelectorAll('tbody tr').length===1, 'Back restores 03A measurement');
  assert(document.activeElement?.id==='main-content', 'Back from removed Reference heading uses surviving main');
  history.forward(); await until(()=>document.activeElement?.id==='model-notes-kinetics','Forward Reference'); positioned('model-notes-kinetics');
  assert(location.hash===modelNotesHash('kinetics'), 'Forward restores the direct section URL');
  await returnFrom('kinetics');
  await button('03B · Michaelis–Menten 탐색'); await click('capture-baseline'); await slider('kcat',60);
  const baselineBefore=JSON.stringify(session.snapshot().kinetics);
  await reference('kinetics'); await returnFrom('kinetics');
  assert(JSON.stringify(session.snapshot().kinetics)===baselineBefore && testId('baseline-curve'),'UX-001 03B baseline, axis and conditions survive direct Reference/return');

  await click('nav-carbonic-anhydrase'); await until(()=>testId('module-carbonic-anhydrase'),'02 loaded');
  await reference('carbonic'); await returnFrom('carbonic');
  await click('nav-regulation'); await until(()=>testId('reg-prediction'),'05 loaded');
  await click('reset-module'); await predict('reg-prediction','insulin');
  for (const scenario of ['insulinDominant','glucagonDominant']) {
    await click(`signal-${scenario}`);
    if (session.get('regulation','lab').narration.status==='playing') await button('Ⅱ 일시정지');
    while(session.get('regulation','lab').narration.step<5) await button('다음 →');
  }
  const trigger=document.querySelector<HTMLButtonElement>('.reg-metabolite')!;
  trigger.focus(); trigger.click(); await frame();
  const dialog=document.querySelector<HTMLDialogElement>('.reg-comparison')!;
  assert(dialog.matches(':modal') && dialog.contains(document.activeElement),'dialog opens with internal focus');
  for (const shiftKey of [false,true]) {
    dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey,bubbles:true,cancelable:true}));
    assert(dialog.contains(document.activeElement),`dialog Tab containment shift=${shiftKey}`);
  }
  dialog.dispatchEvent(new Event('cancel',{cancelable:true})); await frame();
  assert(document.activeElement===trigger && !document.querySelector('.reg-comparison'),'cancel/ESC path returns to trigger');
  trigger.click(); await frame(); await button('닫기');
  assert(document.activeElement===trigger,'close button returns to trigger');
  trigger.click(); await frame(); document.querySelector<HTMLDialogElement>('.reg-comparison')!.close(); await frame();
  await until(()=>!document.querySelector('.reg-comparison') && document.activeElement===trigger, 'native close event/cleanup');
  assert(document.activeElement===trigger && !document.querySelector('.reg-comparison'),'native close event returns to trigger');
  trigger.click(); await frame(); await click('reset-module');
  assert(document.activeElement?.id==='reg-center-heading','state reset uses section fallback when trigger becomes disabled');

  await predict('reg-prediction','insulin');
  for (const scenario of ['insulinDominant','glucagonDominant']) {
    await click(`signal-${scenario}`);
    if (session.get('regulation','lab').narration.status==='playing') await button('Ⅱ 일시정지');
    while(session.get('regulation','lab').narration.step<5) await button('다음 →');
  }
  await button('중간 신호 직접 조작'); await button('높게 고정');
  const regulationBefore=JSON.stringify(session.snapshot().regulation);
  await reference('regulation'); await returnFrom('regulation'); await until(()=>testId('reg-applied-f26'),'05 restored');
  assert(JSON.stringify(session.snapshot().regulation)===regulationBefore && session.get('regulation','lab').control.mode==='clamped','UX-001 05 hormone and clamp survive direct Reference/return');
  await button('조절 경로');
  document.querySelector<HTMLButtonElement>('.reg-metabolite')!.click(); await frame();
  // Forced DOM disappearance simulates an abnormal missing trigger, without changing application code.
  document.querySelector('.reg-metabolite')!.remove();
  document.querySelector<HTMLDialogElement>('.reg-comparison')!.dispatchEvent(new Event('cancel',{cancelable:true})); await frame();
  assert(document.activeElement?.id==='reg-center-heading','missing trigger falls back to live comparison heading');
  await click('nav-start'); await click('nav-regulation'); await frame();
  document.querySelector<HTMLButtonElement>('.reg-metabolite')!.click(); await frame();
  testId('nav-start').click(); await frame();
  assert(!document.querySelector('dialog:modal') && document.activeElement?.id==='main-content','route unmount releases modal and uses live main fallback');
  evidence.session=session.snapshot();
  checks.push('ALL NAVIGATION CONTEXT CHECKS PASSED'); report();
}
const run=document.createElement('button'); run.textContent='Run navigation checks'; run.dataset.testid='run-navigation';
run.addEventListener('click',()=>{run.disabled=true; void runChecks().catch(error=>{checks.push(`FAIL ${String(error)}`);report();console.error(error);}).finally(()=>{run.disabled=false;});});
document.body.append(run,output);
createRoot(document.getElementById('root')!).render(<App session={session} />);
report();
