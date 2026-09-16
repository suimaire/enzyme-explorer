import {useMemo, useState} from 'react';
import {EnergyDiagram, PATHWAY_COLORS} from './EnergyDiagram';
import {
  BARRIER_TOP_RANGE,
  LOWERING_RANGE,
  PRODUCT_RANGE,
  clampTransitionState,
  reactionEnergyProfile,
  relativeRateFactor,
} from './energyProfile';
import {ModuleHeader} from '../../shared/components/ModuleHeader';
import {PredictQuestion, Reveal, usePredictions} from '../../shared/components/Prediction';
import {Segmented} from '../../shared/components/Segmented';
import {Slider} from '../../shared/components/Slider';
import {TeachingModel} from '../../shared/components/Callout';
import {multiplier, signed} from '../../shared/math/format';

const DEFAULTS = {productEnergy: -18, barrierTop: 55, barrierLowering: 20};

type QuestionKey = 'opening' | 'deltaG' | 'barrier' | 'rate' | 'equilibrium';

/**
 * Module 01. A student sets the energies of a one-barrier reaction, predicts what a catalyst does, then
 * switches the enzyme on and reads the same three numbers off the same axis.
 */
export function ReactionEnergyLab() {
  const [productEnergy, setProductEnergy] = useState(DEFAULTS.productEnergy);
  const [barrierTop, setBarrierTop] = useState(DEFAULTS.barrierTop);
  const [barrierLowering, setBarrierLowering] = useState(DEFAULTS.barrierLowering);
  const [enzyme, setEnzyme] = useState(false);
  /** Remembers that the catalysed pathway has been seen at least once, so the follow-up questions are earned. */
  const [enzymeSeen, setEnzymeSeen] = useState(false);
  const predictions = usePredictions<QuestionKey>();

  const profile = useMemo(
    () => reactionEnergyProfile({productEnergy, barrierTop, barrierLowering, enzyme}),
    [productEnergy, barrierTop, barrierLowering, enzyme],
  );
  const {uncatalyzed, catalyzed} = profile;
  /** The slider can ask for a transition state below an end point; this is the value the model actually uses. */
  const clampedTop = clampTransitionState(barrierTop, productEnergy);
  const clamped = clampedTop > barrierTop;

  const openingLocked = predictions.get('opening').locked;
  const followUps: QuestionKey[] = ['deltaG', 'barrier', 'rate', 'equilibrium'];

  const reset = () => {
    setProductEnergy(DEFAULTS.productEnergy);
    setBarrierTop(DEFAULTS.barrierTop);
    setBarrierLowering(DEFAULTS.barrierLowering);
    setEnzyme(false);
    setEnzymeSeen(false);
    predictions.reset();
  };

  const switchEnzyme = (value: 'off' | 'on') => {
    setEnzyme(value === 'on');
    if (value === 'on') setEnzymeSeen(true);
  };

  return (
    <main className="module" data-testid="module-reaction-energy">
      <ModuleHeader
        id="reaction-energy"
        tag={<TeachingModel>하나의 활성화 장벽으로 단순화한 교육용 모델 · 상대 에너지(kJ·mol⁻¹)는 측정값이 아닌 설정값</TeachingModel>}
        onReset={reset}
      />

      <div className="workbench">
        <section className="controls" aria-label="조건 조절">
          <h3>조건 조절</h3>
          <Slider
            testId="product-energy"
            label="생성물의 자유에너지"
            value={productEnergy}
            min={PRODUCT_RANGE.min}
            max={PRODUCT_RANGE.max}
            step={PRODUCT_RANGE.step}
            unit="kJ·mol⁻¹"
            onChange={setProductEnergy}
            note="반응물 상태를 0으로 고정한 상대값입니다."
          />
          <Slider
            testId="barrier-top"
            label="효소가 없을 때 전이 상태(transition state)의 에너지"
            value={barrierTop}
            min={BARRIER_TOP_RANGE.min}
            max={BARRIER_TOP_RANGE.max}
            step={BARRIER_TOP_RANGE.step}
            unit="kJ·mol⁻¹"
            onChange={setBarrierTop}
            note={
              clamped
                ? `${clampedTop} kJ·mol⁻¹로 유지됨: 전이 상태는 그것이 연결하는 두 상태보다 낮을 수 없습니다.`
                : '반응 경로에서 에너지가 가장 높은 지점입니다. 항상 반응물과 생성물보다 높게 유지됩니다.'
            }
          />
          <Segmented
            label="효소"
            value={enzyme ? 'on' : 'off'}
            options={
              [
                ['off', '없음'],
                ['on', '있음'],
              ] as const
            }
            onChange={switchEnzyme}
            disabled={!openingLocked}
          />
          {openingLocked ? null : <p className="gate-note">효소를 넣기 전에 첫 번째 예측을 먼저 확정하세요.</p>}
          <Slider
            testId="barrier-lowering"
            label="효소에 의한 전이 상태 에너지 감소"
            value={barrierLowering}
            min={LOWERING_RANGE.min}
            max={LOWERING_RANGE.max}
            step={LOWERING_RANGE.step}
            unit="kJ·mol⁻¹"
            onChange={setBarrierLowering}
            disabled={!enzyme}
            note="전이 상태의 에너지에만 적용됩니다. 반응물과 생성물의 에너지는 그대로입니다."
          />
        </section>

        <section className="workspace" aria-label="반응 좌표 다이어그램">
          <EnergyDiagram profile={profile} />
          <ul className="legend">
            <li>
              <svg width="26" height="10" aria-hidden="true">
                <line x1="1" x2="25" y1="5" y2="5" stroke={PATHWAY_COLORS.uncatalyzed} strokeWidth="2.4" strokeDasharray={enzyme ? '6 4' : undefined} />
              </svg>
              효소가 없을 때의 경로 {enzyme ? '(점선, 비교용)' : ''}
            </li>
            {enzyme ? (
              <li>
                <svg width="26" height="10" aria-hidden="true">
                  <line x1="1" x2="25" y1="5" y2="5" stroke={PATHWAY_COLORS.catalyzed} strokeWidth="3" />
                </svg>
                효소가 있을 때의 경로 (실선)
              </li>
            ) : null}
            <li>
              <svg width="26" height="10" aria-hidden="true">
                <line x1="1" x2="25" y1="5" y2="5" stroke="#9aa6ae" strokeWidth="1.4" strokeDasharray="2 3" />
              </svg>
              반응물·생성물의 에너지 수준
            </li>
          </ul>
        </section>

        <section className="inquiry" aria-label="질문과 관찰 결과">
          <PredictQuestion
            predictions={predictions}
            name="opening"
            testId="opening-question"
            question="ΔG < 0인 반응은 반드시 빠르게 일어날까?"
            choices={[
              {id: 'yes', label: '그렇다'},
              {id: 'no', label: '아니다'},
              {id: 'unknown', label: '이 정보만으로는 알 수 없다'},
            ]}
            hint="다이어그램을 조작하기 전에 먼저 정하세요."
          />

          <div className="readout" data-testid="energy-readout">
            <h3>관찰</h3>
            <dl>
              <div>
                <dt>반응의 ΔG</dt>
                <dd data-testid="readout-delta-g">{signed(profile.deltaG, 0)} kJ·mol⁻¹</dd>
              </div>
              <div>
                <dt>정반응 활성화 장벽 ΔG‡</dt>
                <dd data-testid="readout-forward">
                  {uncatalyzed.forwardBarrier.toFixed(0)}
                  {catalyzed ? <> → <strong>{catalyzed.forwardBarrier.toFixed(0)}</strong></> : null} kJ·mol⁻¹
                </dd>
              </div>
              <div>
                <dt>역반응 활성화 장벽 ΔG‡</dt>
                <dd data-testid="readout-reverse">
                  {uncatalyzed.reverseBarrier.toFixed(0)}
                  {catalyzed ? <> → <strong>{catalyzed.reverseBarrier.toFixed(0)}</strong></> : null} kJ·mol⁻¹
                </dd>
              </div>
              <div className="prose-row">
                <dt>평형의 위치</dt>
                <dd data-testid="readout-equilibrium">효소가 있어도 평형의 위치는 변하지 않습니다.</dd>
              </div>
            </dl>
            {catalyzed ? (
              <p className="small" data-testid="rate-factor">
                두 장벽이 모두 {(uncatalyzed.forwardBarrier - catalyzed.forwardBarrier).toFixed(0)} kJ·mol⁻¹씩 낮아졌습니다.
                298 K에서 전이 상태 이론을 적용하고 두 경로의 앞지수 인자(pre-exponential factor)가 같다고 가정하면, 정반응과
                역반응 <em>각각</em>의 속도가 약{' '}
                <strong>{multiplier(relativeRateFactor(uncatalyzed.forwardBarrier - catalyzed.forwardBarrier))}</strong> 빨라집니다.
                이 값은 여러분이 설정한 에너지에서 계산된 결과이며, 실제 효소의 측정값이 아닙니다.
              </p>
            ) : (
              <p className="small">효소를 &lsquo;있음&rsquo;으로 바꾸면 같은 축 위에서 두 번째 경로를 비교할 수 있습니다.</p>
            )}
          </div>

          {enzymeSeen ? (
            <div className="follow-ups" data-testid="follow-ups">
              <PredictQuestion
                predictions={predictions}
                name="deltaG"
                testId="q-delta-g"
                question="ΔG는 변했을까?"
                choices={[
                  {id: 'yes', label: '변했다'},
                  {id: 'no', label: '변하지 않았다'},
                ]}
              />
              <PredictQuestion
                predictions={predictions}
                name="barrier"
                testId="q-barrier"
                question="ΔG‡는 변했을까?"
                choices={[
                  {id: 'forward', label: '정반응 활성화 장벽만 낮아졌다'},
                  {id: 'both', label: '정반응과 역반응 활성화 장벽이 모두 낮아졌다'},
                  {id: 'no', label: '둘 다 변하지 않았다'},
                ]}
              />
              <PredictQuestion
                predictions={predictions}
                name="rate"
                testId="q-rate"
                question="반응 속도는 변했을까?"
                choices={[
                  {id: 'forward', label: '정반응만 빨라졌다'},
                  {id: 'both', label: '정반응과 역반응이 모두 빨라졌다'},
                  {id: 'no', label: '변하지 않았다'},
                ]}
              />
              <PredictQuestion
                predictions={predictions}
                name="equilibrium"
                testId="q-equilibrium"
                question="평형의 위치는 변했을까?"
                choices={[
                  {id: 'products', label: '그렇다 — 생성물 쪽으로 옮겨 갔다'},
                  {id: 'reactants', label: '그렇다 — 반응물 쪽으로 옮겨 갔다'},
                  {id: 'no', label: '아니다 — 변하지 않았다'},
                ]}
              />
            </div>
          ) : null}
        </section>
      </div>

      <section className="observation" aria-label="설명">
        <Reveal
          testId="energy-explanation"
          gate={enzymeSeen && predictions.allLocked(followUps)}
          gateMessage={
            enzymeSeen
              ? '위의 네 가지 예측을 모두 확정하면 설명을 볼 수 있습니다.'
              : '첫 번째 예측을 확정하고 효소를 ‘있음’으로 바꾼 뒤, 새로 나타나는 네 가지 질문에 답하세요.'
          }
        >
          <p>
            <strong>ΔG는 변하지 않았습니다.</strong> 효소가 있을 때의 경로도 정확히 같은 두 에너지 수준에서 시작하고
            끝납니다. 다이어그램을 가로지르는 점선이 반응물과 생성물의 에너지 수준입니다. 효소가 바꾼 것은 그 사이의
            최고점이며, 두 수준 자체는 그대로입니다.
          </p>
          <p>
            <strong>정반응과 역반응 활성화 장벽이 모두 낮아졌습니다.</strong> 이 경로에는 최고점이 하나뿐입니다. 정반응
            장벽은 반응물 수준에서 그 최고점까지, 역반응 장벽은 생성물 수준에서 같은 최고점까지의 높이입니다. 최고점이
            낮아지면 두 높이가 함께 줄어듭니다. 여기서는 각각{' '}
            {catalyzed ? (uncatalyzed.forwardBarrier - catalyzed.forwardBarrier).toFixed(0) : '—'} kJ·mol⁻¹만큼 줄었습니다.
          </p>
          <p>
            <strong>정반응과 역반응이 모두 빨라졌습니다.</strong> 반응 속도는 활성화 장벽의 높이에 따라 달라지므로 두 방향의
            반응이 모두 빨라집니다. 이 모델에서는 빨라지는 배율도 같습니다.
          </p>
          <p>
            <strong>평형의 위치는 변하지 않았습니다.</strong> 반응이 어디에서 평형에 도달하는지는 두 끝 상태의 자유에너지
            차이로 정해지는데, 그 차이는 그대로입니다. 촉매는 평형에 도달하는 속도를 바꿀 뿐, 평형의 위치는 바꾸지 않습니다.
            이것이 첫 질문에 대한 답이기도 합니다. ΔG가 음수라는 사실은 반응이 열역학적으로 유리하다는 것만 알려 줄 뿐,
            그 사이의 활성화 장벽이 얼마나 높은지는 알려 주지 않습니다. 그래서 매우 유리한 반응도 측정하기 어려울 만큼
            느릴 수 있습니다.
          </p>
          <p className="small">
            엄밀히 말하면 평형 상수를 결정하는 것은 표준 자유에너지 변화 ΔG°이며, 이 다이어그램의 에너지 수준도 표준 상태의
            자유에너지입니다. 자세한 내용과 하나의 장벽으로 그린 모델의 한계는{' '}
            <a href="#/model-notes">모델 및 주의사항</a>을 참고하세요.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
