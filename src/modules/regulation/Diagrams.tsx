import {useEffect, useRef, useState} from 'react';
import {F26_DIRECTION_LABEL, LEVEL_LABEL, SCENARIO_LABEL, SCOPE_NOTE, type RegulationResult} from './model';

export function RegulatorySite({result, revealed}: {result: RegulationResult | null; revealed: boolean}) {
  return <div className="reg-ser" data-testid="regulatory-site">
    <span className="reg-protein-p">◇ 단백질 조절 부위</span>
    <strong>{revealed && result ? result.phosphorylated ? '조절 Ser–O–P ◇' : '조절 Ser–OH' : '조절 Ser · 아직 확인하지 않음'}</strong>
    {revealed && result && <span>{result.phosphorylated ? '인산화 방향 · PKA' : '순탈인산화 우세 · protein phosphatase'}</span>}
  </div>;
}

export function Pathway({result, step, clamped, onCompare}: {result: RegulationResult | null; step: number; clamped: boolean; onCompare: () => void}) {
  return <div className="reg-pathway" data-testid="reg-pathway">
    <div className={`reg-signal-chain ${step === 1 ? 'reg-current' : ''}`}>
      {result ? result.phosphorylated ? <><strong>글루카곤 수용체</strong><span>→ Gs → adenylyl cyclase</span><span>→ cAMP ↑ → <b>PKA</b></span></> : <><strong>인슐린 수용체 신호</strong><span>→ 세부 신호전달 요약</span><span>→ 순탈인산화가 우세한 조절 상태</span></> : <><strong>아직 비교하지 않음</strong><span>호르몬 신호를 보내면 여기에 경로가 나타납니다.</span></>}
    </div>
    <div className="reg-connect" aria-hidden="true">↓</div>
    <div className={`reg-polypeptide ${step === 2 || step === 3 ? 'reg-current' : ''}`} data-testid="one-polypeptide">
      <div className="reg-chain-label">하나의 PFKFB1 폴리펩타이드 · 한 사슬 개념도</div>
      <RegulatorySite result={result} revealed={step >= 2} />
      <div className="reg-domains">
        <div className="reg-domain reg-kinase" data-testid="pfk2-domain"><span>PFK-2</span><small>catalytic domain</small><strong>{result && step >= 3 ? result.pfk2 : '다음 단계에서 확인'}</strong></div>
        <span className="reg-chain-link" aria-label="동일 사슬 연결">━</span>
        <div className="reg-domain reg-phosphatase" data-testid="fbpase2-domain"><span>FBPase-2</span><small>catalytic domain</small><strong>{result && step >= 3 ? result.fbpase2 : '다음 단계에서 확인'}</strong></div>
      </div>
      <div className="reg-domain-caption">{step >= 3 ? '상대적 활성 · 두 도메인은 계속 함께 존재' : '두 도메인의 상대적 활성을 비교합니다.'}</div>
    </div>
    <div className="reg-reactions" data-testid="catalytic-reactions">
      {step >= 3 ? <>
        <div><b>PFK-2</b><span>F6P + ATP <i className="reg-reaction-arrow">→</i> F-2,6-BP + ADP</span></div>
        <div><b>FBPase-2</b><span>F6P + Pi <i className="reg-reaction-arrow">←</i> F-2,6-BP + H₂O</span></div>
      </> : <p className="small">3단계에서 두 촉매 반응을 확인합니다.</p>}
    </div>
    <button type="button" className={`reg-metabolite ${step === 4 ? 'reg-current' : ''}`} onClick={onCompare} aria-label="F-2,6-BP와 F-1,6-BP 비교" disabled={step < 4}>
      <span className="reg-sugar-p">● 조절물질 · 하위 효소에 적용</span><b>F-2,6-BP</b>
      <strong>{result && step >= 4 ? LEVEL_LABEL[result.effectiveF26] : '다음 단계에서 확인'}</strong>
      {result && step >= 4 && <small>{clamped ? `가상 고정 적용 · 호르몬 조절이 예측: ${LEVEL_LABEL[result.hormoneF26]}` : `호르몬 조절 · ${F26_DIRECTION_LABEL[result.hormoneF26]}`}</small>}
      <small>눌러서 F-1,6-BP와 비교 ↗</small>
    </button>
    <p className="reg-legend">실선 → 촉매 반응 · 점선 ⇢ 활성화 조절 · 점선 ┤ 억제 조절</p>
  </div>;
}

export function InterventionFlow({result, step, clamped}: {result: RegulationResult; step: number; clamped: boolean}) {
  return <div className="reg-intervention-flow" data-testid="reg-intervention-flow" data-clamped={clamped}>
    <div className="reg-upstream" data-testid="reg-preserved-upstream">
      <b>{SCENARIO_LABEL[result.scenario]} · 상위 상태 유지</b>
      <span>{step >= 2 ? result.phosphorylated ? '조절 Ser 인산화 방향 · PKA' : '순탈인산화 우세' : '조절 Ser · 다음 단계에서 확인'}</span>
      <span>{step >= 3 ? `PFK-2 ${result.pfk2}` : 'PFK-2 · 다음 단계에서 확인'}</span>
      <span>{step >= 3 ? `FBPase-2 ${result.fbpase2}` : 'FBPase-2 · 다음 단계에서 확인'}</span>
    </div>
    <div className="reg-predicted-readout" data-testid="reg-predicted-f26">
      <span>호르몬 조절이 예측</span>
      <strong>F-2,6-BP {step >= 4 ? LEVEL_LABEL[result.hormoneF26] : '다음 단계에서 확인'}</strong>
      {step >= 4 && <small>{F26_DIRECTION_LABEL[result.hormoneF26]}</small>}
    </div>
    <div className="reg-override-link"><span aria-hidden="true">↓</span> {clamped ? '가상 개입으로 덮어쓰기 · 하위 효과만 변경' : '호르몬 예측을 그대로 적용'}</div>
    <div className="reg-clamp-readout" data-testid="reg-applied-f26" data-clamped={clamped}>
      <span>하위 효소에 적용</span>
      <strong>F-2,6-BP {step >= 4 ? LEVEL_LABEL[result.effectiveF26] : '다음 단계에서 확인'}</strong>
      <small>{clamped ? '가상 고정 · 호르몬 / 조절 Ser / 두 촉매 활성 유지' : '호르몬 조절을 따르는 상태'}</small>
    </div>
    <span className="small">하위 효소와 대사 조절 방향 → 결과 패널</span>
  </div>;
}

export function Results({result, step, clamped}: {result: RegulationResult | null; step: number; clamped: boolean}) {
  return <aside className="reg-results reg-panel" aria-labelledby="reg-results-heading">
    <h3 id="reg-results-heading">③ 어떤 결과인가?</h3>
    <p className="reg-caption">이 조절축이 이끄는 방향</p>
    {result && step >= 5 ? <div data-testid="reg-results" className="reg-result-content">
      <div className="reg-result-mediator">
        <p data-testid="reg-result-predicted">호르몬 조절이 예측<br/><b>F-2,6-BP {LEVEL_LABEL[result.hormoneF26]}</b> · {F26_DIRECTION_LABEL[result.hormoneF26]}</p>
        <p className="reg-applied" data-testid="reg-result-applied">하위 효소에 적용<br/><b>F-2,6-BP {LEVEL_LABEL[result.effectiveF26]}</b>{clamped ? ' · 가상 고정' : ' · 호르몬 조절'}</p>
      </div>
      <div className="reg-target"><span className="reg-regulation-arrow">⇢</span><div><b>PFK-1</b><strong>{result.pfk1}</strong></div></div>
      <div className="reg-target"><span className="reg-regulation-arrow">┤</span><div><b>FBPase-1</b><strong>{result.fbpase1}</strong></div></div>
      <div className="reg-outcome"><span>해당과정</span><strong>{result.glycolysis}</strong></div>
      <div className="reg-outcome"><span>포도당신생</span><strong>{result.gluconeogenesis}</strong></div>
      <p className="small">F-2,6-BP는 조절 신호로 작용하며, 이 조절 표시에서 소모되지 않습니다.</p>
    </div> : <div className="reg-result-pending" data-testid="reg-results-pending"><span aria-hidden="true">⇢</span><strong>{result ? '5단계에서 확인' : '아직 비교하지 않음'}</strong><p>하위 효소와 대사 조절 방향이 여기에 연결됩니다.</p></div>}
    <p className="reg-scope">{SCOPE_NOTE}</p>
  </aside>;
}

export function PhosphateTrace() {
  const [target, setTarget] = useState<'protein' | 'sugar'>('protein');
  const [run, setRun] = useState(0);
  return <div className="reg-trace" data-testid="phosphate-trace">
    <div className="reg-inline-buttons" role="group" aria-label="인산기 전달 대상">
      <button type="button" aria-pressed={target === 'protein'} onClick={() => {setTarget('protein'); setRun(0);}}>A · PKA → 단백질</button>
      <button type="button" aria-pressed={target === 'sugar'} onClick={() => {setTarget('sugar'); setRun(0);}}>B · PFK-2 → 당</button>
    </div>
    <div className={`reg-transfer ${target}`} key={`${target}-${run}`}>
      <div><b>{run ? 'ADP' : 'ATP'}</b><small>말단 인산기 공여체</small></div>
      <div className="reg-transfer-track"><b>{target === 'protein' ? 'PKA' : 'PFK-2'}</b><span aria-hidden="true">━━━━━━━━→</span><i className={run ? 'reg-phosphate moving' : 'reg-phosphate'}>{target === 'protein' ? '◇P' : '●P'}</i></div>
      <div><b>{target === 'protein' ? run ? '조절 Ser–O–P ◇' : '조절 Ser–OH' : run ? 'F-2,6-BP · 2번 ●P' : 'F6P · 2번 위치'}</b><small>{target === 'protein' ? '◇ 단백질의 조절 인산기' : '● 당에 붙는 인산기'}</small></div>
    </div>
    <button type="button" onClick={() => setRun(n => n + 1)}>인산기 전달 보기</button>
    <p className="small">{target === 'protein' ? 'ATP → ADP; PKA의 대상은 단백질입니다. cAMP는 인산기 공여체가 아닙니다.' : 'F6P + ATP → F-2,6-BP + ADP; PFK-2의 대상은 F6P입니다.'}</p>
    <p className="small">조절 Ser 탈인산화: protein phosphatase가 수행합니다. FBPase-2의 당인산 가수분해와 구분합니다.</p>
    <p className="small">교육용 반응 모식도 · 입자 이동은 실제 원자 궤적이나 반응속도를 뜻하지 않습니다.</p>
  </div>;
}

export function SugarComparison({onClose}: {onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {dialog.current?.showModal();}, []);
  return <dialog ref={dialog} className="reg-comparison" onCancel={onClose} onClose={onClose} aria-labelledby="reg-sugar-title">
    <div className="reg-dialog-heading"><h3 id="reg-sugar-title">이름은 비슷해도 위치와 역할은 다릅니다</h3><button type="button" autoFocus onClick={onClose}>닫기</button></div>
    <p>인산기 위치 모식도 · 실제 고리 구조나 입체화학을 뜻하는 구조식이 아닙니다.</p>
    <div className="reg-sugar-grid">{[{name: 'F-2,6-BP', positions: [2,6], enzyme: 'PFK-2', role: '이 조절축의 조절물질'}, {name: 'F-1,6-BP', positions: [1,6], enzyme: 'PFK-1', role: '해당과정 중간체'}].map(s => <section key={s.name}><h4>{s.name}</h4><div className="reg-carbon-positions" aria-label={`인산기 위치 ${s.positions.join(', ')}`}>{[1,2,3,4,5,6].map(n => <div key={n}><span>{n}</span><b>{s.positions.includes(n) ? '●P' : '·'}</b></div>)}</div><p><b>{s.enzyme}</b>가 생성 · {s.role}</p></section>)}</div>
    <p><b>PFK-1:</b> F6P + ATP → F-1,6-BP + ADP</p><p><b>FBPase-1:</b> F-1,6-BP + H₂O → F6P + Pi</p>
    <p className="reg-control-equation">F-2,6-BP ⇢ PFK-1 활성화<br/>F-2,6-BP ┤ FBPase-1 억제</p>
    <p className="small">실선 → 반응 · 점선 ⇢ / ┤ 조절. 두 당인산 사이의 직접 전환을 나타내지 않습니다.</p>
  </dialog>;
}
