import {useMemo, useState} from 'react';
import {MichaelisMentenPlot, SUBSTRATE_AXIS_MAX} from './MichaelisMentenPlot';
import {KINETICS_COLORS} from './ProgressCurvePlot';
import {PredictQuestion, Reveal, usePredictions} from '../../shared/components/Prediction';
import {Segmented} from '../../shared/components/Segmented';
import {Slider} from '../../shared/components/Slider';
import {Caution} from '../../shared/components/Callout';
import {calculateV0, calculateVmax, saturationFraction} from '../../kinetics/michaelisMenten';
import {ratio} from '../../shared/math/format';
import type {AssayResult, MichaelisMentenParameters} from '../../kinetics/types';

export const PARAMETER_RANGES = {
  substrate: {min: 0, max: SUBSTRATE_AXIS_MAX, step: 5},
  enzymeTotal: {min: 1, max: 20, step: 0.5},
  km: {min: 10, max: 300, step: 5},
  kcat: {min: 2, max: 60, step: 1},
} as const;

type Experiment = 'saturation' | 'enzyme' | 'km';
type QuestionKey =
  | 'saturation'
  | 'enzymeVmax'
  | 'enzymeKm'
  | 'enzymeV0'
  | 'kmHalf';

/**
 * 03B — the Michaelis–Menten curve itself.
 *
 * [S] is a marker on the curve, not a parameter of it: moving it selects the condition being read, while
 * Km, kcat and [E]T are what actually reshape the curve.
 */
export function MichaelisMentenPanel({
  parameters,
  onParameters,
  assays,
}: {
  parameters: MichaelisMentenParameters;
  onParameters: (next: MichaelisMentenParameters) => void;
  assays: readonly AssayResult[];
}) {
  const [experiment, setExperiment] = useState<Experiment>('saturation');
  const [substrate, setSubstrate] = useState(80);
  const [baseline, setBaseline] = useState<MichaelisMentenParameters | null>(null);
  /**
   * Velocity axis held fixed while a reference curve is on screen. It is set from the reference *before*
   * any parameter moves, with room for a doubling, so a comparison never rescales the y axis.
   */
  const [axisLock, setAxisLock] = useState<number | null>(null);
  const [showVmaxGuide, setShowVmaxGuide] = useState(false);
  const [showKmGuide, setShowKmGuide] = useState(false);
  const [exploredHigh, setExploredHigh] = useState(false);
  const predictions = usePredictions<QuestionKey>();

  const vmax = calculateVmax(parameters);
  const v0 = calculateV0(parameters, substrate);
  const axisMax = useMemo(() => Math.max(axisLock ?? 0, vmax * 1.1), [axisLock, vmax]);

  const setSubstrateTracked = (value: number) => {
    setSubstrate(value);
    if (value >= 4 * parameters.km) setExploredHigh(true);
  };

  /**
   * Freezes the current curve as a reference and locks the velocity axis with enough headroom for what the
   * experiment is about to do. Headroom is reserved *before* any parameter moves, so the comparison itself
   * never rescales the axis: the new curve visibly grows rather than the reference visibly shrinking.
   */
  const captureBaseline = (headroom: number) => {
    setBaseline(parameters);
    setAxisLock(calculateVmax(parameters) * headroom);
  };
  const clearBaseline = () => {
    setBaseline(null);
    setAxisLock(null);
  };
  /** Entering an experiment sets its reference curve up, so the "before" state is already on screen. */
  const chooseExperiment = (next: Experiment) => {
    setExperiment(next);
    // Doubling [E]T doubles Vmax, so that experiment needs twice the room; changing Km leaves Vmax alone.
    if (!baseline && next !== 'saturation') captureBaseline(next === 'enzyme' ? 2.2 : 1.15);
  };
  const doubleEnzyme = () => {
    if (!baseline) captureBaseline(2.2);
    onParameters({...parameters, enzymeTotal: parameters.enzymeTotal * 2});
  };

  const baselineVmax = baseline ? calculateVmax(baseline) : null;
  const baselineV0 = baseline ? calculateV0(baseline, substrate) : null;

  return (
    <div className="workbench" data-testid="panel-03b">
      <section className="controls" aria-label="조건 조절">
        <h3>조건 조절</h3>
        <Slider
          testId="current-substrate"
          label="현재 기질 농도 [S]"
          value={substrate}
          min={PARAMETER_RANGES.substrate.min}
          max={PARAMETER_RANGES.substrate.max}
          step={PARAMETER_RANGES.substrate.step}
          unit="µM"
          onChange={setSubstrateTracked}
          note="그래프에서 현재 기질 농도에 해당하는 점을 선택합니다. [S]를 바꾸어도 곡선 자체는 변하지 않습니다."
        />
        <hr />
        <Slider
          testId="enzyme-total"
          label="총 효소 농도 [E]T"
          value={parameters.enzymeTotal}
          min={PARAMETER_RANGES.enzymeTotal.min}
          max={PARAMETER_RANGES.enzymeTotal.max}
          step={PARAMETER_RANGES.enzymeTotal.step}
          unit="nM"
          onChange={(enzymeTotal) => onParameters({...parameters, enzymeTotal})}
        />
        <Slider
          testId="kcat"
          label="kcat"
          value={parameters.kcat}
          min={PARAMETER_RANGES.kcat.min}
          max={PARAMETER_RANGES.kcat.max}
          step={PARAMETER_RANGES.kcat.step}
          unit="s⁻¹"
          onChange={(kcat) => onParameters({...parameters, kcat})}
        />
        <Slider
          testId="km"
          label="Km"
          value={parameters.km}
          min={PARAMETER_RANGES.km.min}
          max={PARAMETER_RANGES.km.max}
          step={PARAMETER_RANGES.km.step}
          unit="µM"
          onChange={(km) => onParameters({...parameters, km})}
        />
        <div className="button-row">
          {baseline ? (
            <button type="button" onClick={clearBaseline} data-testid="clear-baseline">
              비교 기준 곡선 지우기
            </button>
          ) : (
            <button type="button" onClick={() => captureBaseline(experiment === 'enzyme' ? 2.2 : 1.15)} data-testid="capture-baseline">
              현재 곡선을 비교 기준으로 저장
            </button>
          )}
        </div>
      </section>

      <section className="workspace" aria-label="Michaelis–Menten 그래프">
        <MichaelisMentenPlot
          parameters={parameters}
          baseline={baseline}
          currentSubstrate={substrate}
          velocityAxisMax={axisMax}
          showVmaxGuide={showVmaxGuide}
          showKmGuide={showKmGuide}
          assays={assays}
        />
        <ul className="legend">
          <li>
            <svg width="26" height="10" aria-hidden="true">
              <line x1="1" x2="25" y1="5" y2="5" stroke={KINETICS_COLORS.curve} strokeWidth="3" />
            </svg>
            현재 조건
          </li>
          {baseline ? (
            <li>
              <svg width="26" height="10" aria-hidden="true">
                <line x1="1" x2="25" y1="5" y2="5" stroke={KINETICS_COLORS.baseline} strokeWidth="2.2" strokeDasharray="7 4" />
              </svg>
              비교 기준 곡선 (점선)
            </li>
          ) : null}
          <li>
            <svg width="16" height="14" aria-hidden="true">
              <circle cx="8" cy="7" r="5" fill={KINETICS_COLORS.marker} />
            </svg>
            현재 [S]
          </li>
          {assays.length ? (
            <li>
              <svg width="16" height="14" aria-hidden="true">
                <rect x="3" y="2" width="9" height="9" fill={KINETICS_COLORS.measured} transform="rotate(45 7.5 6.5)" />
              </svg>
              03A 측정값 (속이 빈 마름모 = 현재와 다른 조건에서 측정)
            </li>
          ) : null}
        </ul>
        <p className="plot-caption" data-testid="axis-note">
          기질 농도 축: 0–{SUBSTRATE_AXIS_MAX} µM로 고정.{' '}
          {axisLock
            ? '비교 기준 곡선이 표시되는 동안에는 속도 축도 고정되어, 곡선 높이의 변화를 그대로 비교할 수 있습니다.'
            : '기본 탐색에서는 속도 축을 현재 Vmax에 맞추어 표시합니다.'}
        </p>
      </section>

      <section className="inquiry" aria-label="탐구 활동">
        <div className="readout" data-testid="mm-readout">
          <h3>관찰</h3>
          <dl>
            <div>
              <dt>Vmax = kcat[E]T</dt>
              <dd data-testid="readout-vmax">{vmax.toFixed(1)} nM·s⁻¹</dd>
            </div>
            <div>
              <dt>현재 [S]</dt>
              <dd>{substrate} µM</dd>
            </div>
            <div>
              <dt>현재 초기 속도 v₀</dt>
              <dd data-testid="readout-v0">{v0.toFixed(1)} nM·s⁻¹</dd>
            </div>
            <div>
              <dt>v₀ / Vmax</dt>
              <dd data-testid="readout-fraction">{(saturationFraction(parameters, substrate) * 100).toFixed(1)}%</dd>
            </div>
            {baseline ? (
              <div>
                <dt>같은 [S]에서 기준 곡선 대비</dt>
                <dd data-testid="readout-vs-baseline">
                  {ratio(v0, baselineV0!)} (Vmax {ratio(vmax, baselineVmax!)}, Km {ratio(parameters.km, baseline.km)})
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <Segmented
          label="탐구 활동"
          value={experiment}
          options={
            [
              ['saturation', 'A · 기질 포화'],
              ['enzyme', 'B · 효소 농도 2배'],
              ['km', 'C · Km 변화'],
            ] as const
          }
          onChange={chooseExperiment}
        />

        {experiment === 'saturation' ? (
          <div data-testid="experiment-a">
            <PredictQuestion
              predictions={predictions}
              name="saturation"
              testId="q-saturation"
              question="기질 농도 [S]를 계속 높이면 v₀도 같은 비율로 계속 증가할까?"
              choices={[
                {id: 'proportional', label: '그렇다 — [S]가 2배가 되면 v₀도 계속 2배가 된다'},
                {id: 'ceiling', label: '아니다 — v₀는 증가하지만 점차 한계값에 가까워진다'},
                {id: 'falls', label: '아니다 — v₀는 증가하다가 최고점 이후 다시 감소한다'},
              ]}
            />
            <p className="small">
              이제 <strong>현재 기질 농도 [S]</strong>를 낮은 값에서 높은 값까지 움직이며 v₀와 Vmax의 관계를 관찰해 보세요.
            </p>
            <Reveal
              testId="saturation-explanation"
              gate={predictions.get('saturation').locked && exploredHigh}
              gateMessage="먼저 예측을 확정한 뒤 [S]를 Km보다 충분히 크게 높여 그래프가 어떻게 변하는지 확인하세요."
            >
              <p>
                v₀는 한계값에 가까워집니다. 이 모델에서 v₀가 Vmax에 도달한 비율은 [S]/(Km + [S])이므로, 하나의 곡선에서 세
                구간을 볼 수 있습니다.
              </p>
              <ul>
                <li>
                  <strong>[S] ≪ Km</strong> — 분모에서 Km이 대부분을 차지하므로 v₀ ≈ (Vmax/Km)·[S]입니다. 원점을 지나는
                  직선에 가깝습니다.
                </li>
                <li>
                  <strong>[S] = Km</strong> — v₀는 정확히 Vmax/2입니다.
                </li>
                <li>
                  <strong>[S] ≫ Km</strong> — 비율이 1에 가까워지므로 v₀는 Vmax에 가까워지고, 기질을 더 넣어도 v₀는 거의
                  변하지 않습니다.
                </li>
              </ul>
              <p>
                Vmax는 유한한 [S]에서는 실제로 도달하지 않는 한계값이며, [S]가 커질수록 곡선이 다가가는 값입니다.
              </p>
              <button type="button" onClick={() => setShowVmaxGuide((v) => !v)} data-testid="toggle-vmax-guide">
                Vmax 기준선 {showVmaxGuide ? '숨기기' : '보기'}
              </button>
            </Reveal>
          </div>
        ) : null}

        {experiment === 'enzyme' ? (
          <div data-testid="experiment-b">
            <PredictQuestion
              predictions={predictions}
              name="enzymeVmax"
              testId="q-enzyme-vmax"
              question="총 효소 농도 [E]T를 2배로 늘리면 Vmax는 어떻게 될까?"
              choices={[
                {id: 'double', label: '2배가 된다'},
                {id: 'same', label: '변하지 않는다'},
                {id: 'half', label: '절반이 된다'},
              ]}
            />
            <PredictQuestion
              predictions={predictions}
              name="enzymeKm"
              testId="q-enzyme-km"
              question="그렇다면 Km은 어떻게 될까?"
              choices={[
                {id: 'double', label: '2배가 된다'},
                {id: 'same', label: '변하지 않는다'},
                {id: 'half', label: '절반이 된다'},
              ]}
            />
            <PredictQuestion
              predictions={predictions}
              name="enzymeV0"
              testId="q-enzyme-v0"
              question="같은 [S]에서 v₀는 어떻게 될까?"
              choices={[
                {id: 'double', label: '2배가 된다'},
                {id: 'same', label: '변하지 않는다'},
                {id: 'depends', label: '변하지만, 변하는 배율은 [S]에 따라 다르다'},
              ]}
            />
            <button
              type="button"
              className="primary"
              onClick={doubleEnzyme}
              disabled={!predictions.allLocked(['enzymeVmax', 'enzymeKm', 'enzymeV0']) || parameters.enzymeTotal * 2 > PARAMETER_RANGES.enzymeTotal.max}
              data-testid="double-enzyme"
            >
              [E]T 2배로 늘리기
            </button>
            {parameters.enzymeTotal * 2 > PARAMETER_RANGES.enzymeTotal.max ? (
              <p className="small">[E]T가 이미 커서 조절 범위 안에서 2배로 늘릴 수 없습니다. 먼저 [E]T를 낮추세요.</p>
            ) : null}
            <Reveal
              testId="enzyme-explanation"
              gate={predictions.allLocked(['enzymeVmax', 'enzymeKm', 'enzymeV0']) && baseline !== null}
              gateMessage="세 가지 예측을 모두 확정하고 [E]T 2배로 늘리기를 누르면 설명을 볼 수 있습니다."
            >
              <p>
                <strong>Vmax는 2배가 되었습니다.</strong> Vmax = kcat·[E]T이고 [E]T만 바뀌었기 때문입니다.{' '}
                <strong>Km은 변하지 않았습니다.</strong> Km에는 [E]T가 전혀 포함되지 않으므로, 곡선은 정확히 같은 기질
                농도에서 자신의 (새로운) 최댓값의 절반에 도달합니다. 그래프에서 두 곡선은 [S] = Km인 지점에서 각자의
                한계값의 절반을 지납니다.
              </p>
              <p>
                <strong>v₀는 포화 구간뿐 아니라 모든 [S]에서 2배가 되었습니다.</strong> v₀ = Vmax·[S]/(Km + [S])에서 Km이
                그대로인 채 Vmax가 2배가 되면 곡선 전체가 2배가 됩니다. 위의 관찰 결과에 현재 [S]에서의 비율이 표시됩니다.
                [S]를 움직여도 이 비율이 그대로인지 확인해 보세요.
              </p>
              <p className="small">
                속도 축은 [E]T를 바꾸기 전에 고정되었습니다. 따라서 지금 보이는 차이는 축 눈금이 바뀐 것이 아니라 곡선 높이가
                실제로 달라진 것입니다.
              </p>
            </Reveal>
          </div>
        ) : null}

        {experiment === 'km' ? (
          <div data-testid="experiment-c">
            <p className="small">
              현재 곡선을 비교 기준으로 저장한 뒤 <strong>Km</strong> 슬라이더를 움직이며 그래프에서 무엇이 함께 변하는지
              관찰하세요.
            </p>
            <PredictQuestion
              predictions={predictions}
              name="kmHalf"
              testId="q-km-half"
              question="새 곡선에서 v₀가 정확히 Vmax의 절반이 되는 [S]는 어디일까?"
              choices={[
                {id: 'half-vmax-s', label: '포화가 일어나는 [S]의 절반인 지점'},
                {id: 'at-km', label: '[S]가 Km 값과 같은 지점'},
                {id: 'fixed', label: 'Km과 관계없이 이전과 같은 [S]'},
              ]}
              hint="관찰 영역의 v₀ / Vmax 값이 50.0%가 될 때까지 [S]를 움직여 보세요."
            />
            <Reveal
              testId="km-explanation"
              gate={predictions.get('kmHalf').locked}
              gateMessage="예측을 확정하면 설명과 기준선을 볼 수 있습니다."
            >
              <p>
                v₀ = Vmax·[S]/(Km + [S])에 v₀ = Vmax/2를 대입하면 Km + [S] = 2[S]이므로 [S] = Km입니다. Km을 바꾸면
                최댓값의 절반에 도달하는 지점이 [S] 축을 따라 이동하고 곡선이 올라가는 가파르기도 달라지지만, 한계값 Vmax는
                그대로입니다. Vmax = kcat·[E]T에는 Km이 들어 있지 않기 때문입니다.
              </p>
              <button type="button" onClick={() => setShowKmGuide((v) => !v)} data-testid="toggle-km-guide">
                [S] = Km 기준선 {showKmGuide ? '숨기기' : '보기'}
              </button>
            </Reveal>
          </div>
        ) : null}

        <Caution title="주의: Km을 기질 결합 친화도(binding affinity)와 단순히 같은 값으로 해석하면 안 됩니다">
          <p>
            Michaelis–Menten 모델에서 Km은 <strong>v₀ = Vmax/2가 되는 기질 농도</strong>입니다. 반응 속도를 측정해서 얻는
            반응속도론적 값입니다.
          </p>
          <p>
            Km과 기질 결합 친화도의 관계는 반응 메커니즘에 따라 달라집니다. Km에는 결합 단계뿐 아니라 촉매 단계의 속도상수도
            함께 포함되기 때문에, Km이 달라졌다는 사실만으로 기질 결합 친화도가 어떻게 변했는지 일반적으로 단정할 수 없습니다.
          </p>
          <p className="small">
            03C에서 Km 안에 결합 관련 속도상수가 어떻게 들어 있는지, 그리고 언제 Km이 K<sub>d</sub>에 가까워질 수 있는지
            확인할 수 있습니다.
          </p>
        </Caution>
      </section>
    </div>
  );
}
