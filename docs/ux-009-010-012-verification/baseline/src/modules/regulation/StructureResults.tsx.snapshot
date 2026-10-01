import {Results} from './Diagrams';
import {F26_DIRECTION_LABEL, LEVEL_LABEL, SCENARIO_LABEL, type RegulationResult} from './model';

/** The same staged disclosure as the pathway, with full downstream detail retained. */
export function StructureResults({result, step, clamped, onPathway}: {result: RegulationResult | null; step: number; clamped: boolean; onPathway: () => void}) {
  return <section className="reg-result-summary" aria-label="현재 비교 상태" data-testid="reg-result-summary">
    <div className="reg-summary-heading"><strong>현재 비교 상태{result ? ` · ${SCENARIO_LABEL[result.scenario]}` : ''}</strong><button type="button" onClick={onPathway}>조절 경로에서 자세히 보기 →</button></div>
    {!result ? <p>아직 호르몬 신호를 비교하지 않았습니다.</p> : <dl>
      <div><dt>조절 Ser</dt><dd>{step >= 2 ? result.phosphorylated ? '인산화 방향' : '순탈인산화 우세' : '2단계에서 확인'}</dd></div>
      <div><dt>PFK-2</dt><dd>{step >= 3 ? result.pfk2 : '3단계에서 확인'}</dd></div>
      <div><dt>FBPase-2</dt><dd>{step >= 3 ? result.fbpase2 : '3단계에서 확인'}</dd></div>
      <div><dt>F-2,6-BP · 호르몬 예측</dt><dd>{step >= 4 ? F26_DIRECTION_LABEL[result.hormoneF26] : '4단계에서 확인'}</dd></div>
      {clamped && <div><dt>F-2,6-BP · 하위 효소에 적용</dt><dd>{step >= 4 ? `${LEVEL_LABEL[result.effectiveF26]} · 가상 고정` : '4단계에서 확인'}</dd></div>}
    </dl>}
    <details><summary>하위 효소와 대사 조절 방향 · {result && step >= 5 ? '결과 펼치기' : '5단계에서 확인'}</summary><Results result={result} step={step} clamped={clamped} /></details>
  </section>;
}
