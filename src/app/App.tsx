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
          <p>Catalysis &amp; Kinetics · 효소는 어떻게 반응 속도를 바꾸는가</p>
        </div>
        <p className="current-module">
          {entry.number ? `Module ${entry.number} · ` : ''}
          {entry.title}
        </p>
      </header>

      <nav className="module-nav" aria-label="Modules">
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
            {m.status === 'planned' ? <em>Coming in Enzyme II</em> : null}
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
              <p>Loading PDB 2CBA…</p>
            </main>
          }
        >
          <CarbonicAnhydraseLab />
        </Suspense>
      ) : null}
      {current === 'inhibition' || current === 'regulation' ? <ComingSoon id={current} /> : null}
      {current === 'model-notes' ? <ModelNotes /> : null}

      <footer>
        <span>Enzyme Explorer · Enzyme I — Catalysis &amp; Kinetics</span>
        <span>
          <a href={hashFor('model-notes')} onClick={(e) => {e.preventDefault(); navigate('model-notes');}}>
            Model Notes
          </a>{' '}
          ·{' '}
          <a href={PROTEIN_EXPLORER_URL} target="_blank" rel="noreferrer noopener" data-testid="protein-explorer-link">
            Review protein structure and folding ↗
          </a>
        </span>
      </footer>
    </>
  );
}
