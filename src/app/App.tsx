import {Suspense, lazy, useEffect, useRef} from 'react';
import {hashFor, moduleEntry, type ModuleId} from './modules';
import {ModuleNavigation} from './ModuleNavigation';
import {useHashModule} from './useHashModule';
import {StartPage} from '../modules/start/StartPage';
import {ReactionEnergyLab} from '../modules/reaction-energy/ReactionEnergyLab';
import {KineticsLab} from '../modules/kinetics/KineticsLab';
import {ModelNotes} from '../modules/notes/ModelNotes';
import {ComingSoon} from '../modules/placeholder/ComingSoon';
import {LearningModuleScope, LearningSessionProvider} from './LearningSession';
import type {LearningSession} from './learningSessionStore';
import {pageTitle} from './modelNotesNavigation';

/** Experimental structures and their renderer are loaded on demand. */
const CarbonicAnhydraseLab = lazy(() =>
  import('../modules/carbonic-anhydrase/CarbonicAnhydraseLab').then((m) => ({default: m.CarbonicAnhydraseLab})),
);
const HormonalRegulation = lazy(() => import('../modules/regulation/HormonalRegulation').then(m => ({default: m.HormonalRegulation})));

export const PROTEIN_EXPLORER_URL = 'https://suimaire.github.io/protein-3d-explorer/';

export function App({session}: {session?: LearningSession} = {}) {
  return <LearningSessionProvider session={session}><AppContent /></LearningSessionProvider>;
}

function AppContent() {
  const [current, navigate, referenceSection] = useHashModule();
  const entry = moduleEntry(current);
  const main = useRef<HTMLElement>(null);
  const returnTarget = useRef<ModuleId | null>(null);
  useEffect(() => {document.title = pageTitle(current);}, [current]);
  useEffect(() => {
    if (returnTarget.current !== current) return;
    returnTarget.current = null;
    main.current?.focus({preventScroll: true});
    main.current?.scrollIntoView({block: 'start', behavior: 'auto'});
  }, [current]);
  function returnToModule(id: ModuleId) {returnTarget.current = id; navigate(id);}

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={event => {
        event.preventDefault();
        main.current?.focus({preventScroll: true});
        main.current?.scrollIntoView({block: 'start', behavior: 'auto'});
      }}>본문으로 건너뛰기</a>
      <header className={`site-header${current === 'regulation' ? ' regulation-shell' : ''}`}>
        <div className="brand-mark" aria-hidden="true">
          E
        </div>
        <div>
          <h1>
            Enzyme <span>Explorer</span>
          </h1>
          <p>효소는 어떻게 반응 속도를 바꾸는가 · 촉매 작용과 반응속도론</p>
        </div>
        <p className="current-module">
          {entry.number ? `모듈 ${entry.number} · ` : ''}
          {entry.title}
        </p>
      </header>

      <ModuleNavigation current={current} navigate={navigate} />

      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {referenceSection ? '' : `${entry.title} 페이지로 이동했습니다.`}
      </p>
      <main id="main-content" ref={main} tabIndex={-1} aria-label={`${entry.title} 본문`}>

      {current === 'start' ? <StartPage onNavigate={navigate} /> : null}
      {current === 'reaction-energy' ? <LearningModuleScope module="reactionEnergy"><ReactionEnergyLab /></LearningModuleScope> : null}
      {current === 'kinetics' ? <LearningModuleScope module="kinetics"><KineticsLab /></LearningModuleScope> : null}
      {current === 'carbonic-anhydrase' ? (
        <Suspense
          fallback={
            <div className="module">
              <p>PDB 2CBA 구조를 불러오는 중…</p>
            </div>
          }
        >
          <LearningModuleScope module="carbonicAnhydrase"><CarbonicAnhydraseLab /></LearningModuleScope>
        </Suspense>
      ) : null}
      {current === 'regulation' ? <Suspense fallback={<div className="module"><p>효소 조절 모듈을 불러오는 중…</p></div>}><LearningModuleScope module="regulation"><HormonalRegulation /></LearningModuleScope></Suspense> : null}
      {current === 'inhibition' ? <ComingSoon id={current} /> : null}
      {current === 'model-notes' ? <ModelNotes section={referenceSection} onReturn={returnToModule} /> : null}
      </main>

      <footer>
        <span>Enzyme Explorer · Enzyme I — 촉매 작용과 반응속도론</span>
        <span>
          <a href={hashFor('model-notes')} onClick={(e) => {e.preventDefault(); navigate('model-notes');}}>
            모델 및 주의사항
          </a>{' '}
          ·{' '}
          <a href={PROTEIN_EXPLORER_URL} target="_blank" rel="noreferrer noopener" data-testid="protein-explorer-link">
            단백질 구조와 접힘 복습하기 ↗
          </a>
        </span>
        {/* 조회수: 포털 공통 모듈(page-views.js)이 채운다. index.html 의 loader 참고 */}
        <span data-page-views="" hidden />
      </footer>
    </>
  );
}
