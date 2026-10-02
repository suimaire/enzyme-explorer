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
const PORTAL_URL = 'https://suimaire.github.io/';

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
        <div>
          <nav className="breadcrumb" aria-label="현재 위치">
            <a href={PORTAL_URL}>수업 포털</a>
            <span aria-hidden="true">›</span>
            <a href={`${PORTAL_URL}#molecular`}>분자 · 생화학 탐구</a>
          </nav>
          <h1>효소 촉매와 반응속도론 탐색기</h1>
          <p>효소가 반응을 빠르게 만드는 원리를 에너지 그림, 3D 구조, 측정 그래프로 차례로 확인합니다.</p>
        </div>
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
        <span>Enzyme Explorer · 효소의 촉매 작용, 반응속도론과 조절</span>
        <span>
          <a href={hashFor('model-notes')} onClick={(e) => {e.preventDefault(); navigate('model-notes');}}>
            모델 및 주의사항
          </a>{' '}
          ·{' '}
          <a href={PROTEIN_EXPLORER_URL} target="_blank" rel="noreferrer noopener" data-testid="protein-explorer-link">
            단백질 구조와 접힘 복습하기 (새 창)
          </a>
        </span>
        <span className="footer-brand">HAFS Biology Lab · CH Park</span>
        {/* 조회수: 포털 공통 모듈(page-views.js)이 채운다. index.html 의 loader 참고 */}
        <span data-page-views="" hidden />
      </footer>
    </>
  );
}
