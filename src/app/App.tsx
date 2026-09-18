import {Suspense, lazy} from 'react';
import {MODULES, hashFor, moduleEntry} from './modules';
import {useHashModule} from './useHashModule';
import {StartPage} from '../modules/start/StartPage';
import {ReactionEnergyLab} from '../modules/reaction-energy/ReactionEnergyLab';
import {KineticsLab} from '../modules/kinetics/KineticsLab';
import {ModelNotes} from '../modules/notes/ModelNotes';
import {ComingSoon} from '../modules/placeholder/ComingSoon';

/** Loaded on demand: this is the only module that pulls in three.js and the bundled 2CBA coordinates. */
const CarbonicAnhydraseLab = lazy(() =>
  import('../modules/carbonic-anhydrase/CarbonicAnhydraseLab').then((m) => ({default: m.CarbonicAnhydraseLab})),
);

export const PROTEIN_EXPLORER_URL = 'https://suimaire.github.io/protein-3d-explorer/';

export function App() {
  const [current, navigate] = useHashModule();
  const entry = moduleEntry(current);

  return (
    <>
      <header className="site-header">
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

      <nav className="module-nav" aria-label="학습 모듈">
        {MODULES.map((m) => (
          <a
            key={m.id}
            href={hashFor(m.id)}
            aria-current={current === m.id ? 'page' : undefined}
            data-testid={`nav-${m.id}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(m.id);
            }}
          >
            <small>{m.number ? `${m.number} · ${m.eyebrow}` : m.eyebrow}</small>
            {m.title}
            {m.status === 'planned' ? <em>Enzyme II에서 다룰 예정</em> : null}
          </a>
        ))}
      </nav>

      {current === 'start' ? <StartPage onNavigate={navigate} /> : null}
      {current === 'reaction-energy' ? <ReactionEnergyLab /> : null}
      {current === 'kinetics' ? <KineticsLab /> : null}
      {current === 'carbonic-anhydrase' ? (
        <Suspense
          fallback={
            <main className="module">
              <p>PDB 2CBA 구조를 불러오는 중…</p>
            </main>
          }
        >
          <CarbonicAnhydraseLab />
        </Suspense>
      ) : null}
      {current === 'inhibition' || current === 'regulation' ? <ComingSoon id={current} /> : null}
      {current === 'model-notes' ? <ModelNotes /> : null}

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
