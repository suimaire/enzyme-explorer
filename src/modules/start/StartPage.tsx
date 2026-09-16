import {MODULES, type ModuleId} from '../../app/modules';

const CARDS: {id: ModuleId; number: string; eyebrow: string; question: string}[] = [
  {id: 'reaction-energy', number: '01', eyebrow: 'Energy', question: 'Why can a favourable reaction still be slow?'},
  {
    id: 'carbonic-anhydrase',
    number: '02',
    eyebrow: 'Active-site chemistry',
    question: 'How can a molecular environment change reactivity?',
  },
  {id: 'kinetics', number: '03', eyebrow: 'Kinetics', question: 'How can we measure the effect?'},
];

/** The home screen opens with the question of the whole session rather than with an explanation. */
export function StartPage({onNavigate}: {onNavigate: (id: ModuleId) => void}) {
  const planned = MODULES.filter((m) => m.status === 'planned');
  return (
    <main className="module start-page" data-testid="module-start">
      <section className="start-question">
        <p className="eyebrow">Basic Biochemistry ET · Session 7 · Enzyme I</p>
        <h2>How can a protein make a chemical reaction faster?</h2>
        <p>
          Three ways of approaching the same question. Work through them in order — each one answers something the
          previous one leaves open. In every module you predict first, then change something, then look at what happened,
          and only then read an explanation.
        </p>
      </section>

      <ul className="card-grid">
        {CARDS.map((c) => (
          <li key={c.id}>
            <button type="button" className="module-card" onClick={() => onNavigate(c.id)} data-testid={`card-${c.id}`}>
              <span className="card-number">{c.number}</span>
              <span className="card-eyebrow">{c.eyebrow}</span>
              <span className="card-question">{c.question}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="start-flow" aria-label="How the three modules connect">
        <h3>The thread</h3>
        <ol>
          <li>
            <strong>Energy.</strong> A reaction can be thermodynamically favourable and still take years, because the
            barrier between reactants and products is what sets the rate. An enzyme lowers that barrier — and nothing else.
          </li>
          <li>
            <strong>Active-site chemistry.</strong> In human carbonic anhydrase II, a Zn²⁺ ion and the residues around it
            change the chemistry of a single water molecule. This is one concrete way a protein can create a lower-barrier
            route.
          </li>
          <li>
            <strong>Kinetics.</strong> None of that is visible directly. What you can measure is a rate — so the last
            module builds the measurement up from a single progress curve to a full v₀-versus-[S] relationship.
          </li>
        </ol>
      </section>

      <section className="start-planned" aria-label="Later modules">
        <h3>Later in this course</h3>
        <ul>
          {planned.map((m) => (
            <li key={m.id}>
              <strong>
                Module {m.number} — {m.title}
              </strong>{' '}
              <span className="badge">Coming in Enzyme II</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
