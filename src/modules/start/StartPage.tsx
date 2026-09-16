import {MODULES, type ModuleId} from '../../app/modules';

const CARDS: {id: ModuleId; number: string; eyebrow: string; english: string; question: string}[] = [
  {id: 'reaction-energy', number: '01', eyebrow: '에너지', english: 'Energy', question: '왜 열역학적으로 유리한 반응도 느릴 수 있을까?'},
  {
    id: 'carbonic-anhydrase',
    number: '02',
    eyebrow: '활성 부위 화학',
    english: 'Active-site chemistry',
    question: '분자의 3차원 환경은 어떻게 반응성을 바꿀까?',
  },
  {id: 'kinetics', number: '03', eyebrow: '반응속도론', english: 'Kinetics', question: '효소의 효과를 실험적으로 어떻게 측정할 수 있을까?'},
];

/** The home screen opens with the question of the whole session rather than with an explanation. */
export function StartPage({onNavigate}: {onNavigate: (id: ModuleId) => void}) {
  const planned = MODULES.filter((m) => m.status === 'planned');
  return (
    <main className="module start-page" data-testid="module-start">
      <section className="start-question">
        <p className="eyebrow">Basic Biochemistry ET · 7차시 · Enzyme I</p>
        <h2>단백질은 어떻게 화학 반응을 더 빠르게 만들 수 있을까?</h2>
        <p>
          같은 질문을 세 가지 방향에서 살펴봅니다. 각 모듈은 앞 모듈이 남긴 질문에 답하므로 순서대로 진행하세요. 모든
          모듈에서 먼저 예측하고, 조건을 바꾸고, 결과를 관찰한 뒤에 설명을 읽습니다.
        </p>
      </section>

      <ul className="card-grid">
        {CARDS.map((c) => (
          <li key={c.id}>
            <button type="button" className="module-card" onClick={() => onNavigate(c.id)} data-testid={`card-${c.id}`}>
              <span className="card-number">{c.number}</span>
              <span className="card-eyebrow">
                {c.eyebrow} <small lang="en">{c.english}</small>
              </span>
              <span className="card-question">{c.question}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="start-flow" aria-label="세 모듈의 연결">
        <h3>세 모듈을 잇는 흐름</h3>
        <ol>
          <li>
            <strong>에너지.</strong> 열역학적으로 유리한 반응도 매우 오래 걸릴 수 있습니다. 반응 속도를 결정하는 것은
            반응물과 생성물 사이의 활성화 장벽이기 때문입니다. 효소는 이 장벽을 낮출 뿐, 반응물과 생성물의 에너지 차이는
            바꾸지 않습니다.
          </li>
          <li>
            <strong>활성 부위 화학.</strong> 인간 탄산무수화효소 II(human carbonic anhydrase II)에서는 Zn²⁺ 이온과 그 주변
            잔기들이 결합한 solvent 분자의 화학적 성질을 바꿉니다. 단백질이 활성화 장벽이 더 낮은 반응 경로를 만드는 구체적인
            예입니다.
          </li>
          <li>
            <strong>반응속도론.</strong> 이런 과정은 직접 볼 수 없습니다. 실험에서 측정할 수 있는 것은 반응 속도이므로,
            마지막 모듈에서는 하나의 반응 진행 곡선에서 출발해 v₀ 대 [S] 관계 전체를 직접 쌓아 올립니다.
          </li>
        </ol>
      </section>

      <section className="start-planned" aria-label="이후 모듈">
        <h3>이후 수업에서 다룰 내용</h3>
        <ul>
          {planned.map((m) => (
            <li key={m.id}>
              <strong>
                모듈 {m.number} — {m.title}
              </strong>{' '}
              <span className="badge">Enzyme II에서 다룰 예정</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
