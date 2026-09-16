import {useMemo, useState} from 'react';
import {ProgressCurvePlot} from './ProgressCurvePlot';
import {PredictQuestion, Reveal, usePredictions} from '../../shared/components/Prediction';
import {TeachingModel} from '../../shared/components/Callout';
import {assayDuration, generateProgressCurve, initialRateTangent, measuredInitialVelocity} from '../../kinetics/progressCurve';
import type {AssayResult, MichaelisMentenParameters} from '../../kinetics/types';

/** Substrate concentrations offered by the virtual assay, µM. */
export const SUBSTRATE_CHOICES = [10, 25, 50, 100, 250, 500] as const;

type QuestionKey = 'linear';

/**
 * 03A — where a v0 value comes from.
 *
 * A student picks [S]₀, runs an assay, sees a product progress curve, and only then measures its initial
 * slope. The Michaelis–Menten curve is never shown here; it is assembled in 03B out of the points measured
 * in this panel.
 */
export function InitialVelocityPanel({
  parameters,
  assays,
  onRecord,
  onClear,
}: {
  parameters: MichaelisMentenParameters;
  assays: readonly AssayResult[];
  onRecord: (result: AssayResult) => void;
  onClear: () => void;
}) {
  const [substrate, setSubstrate] = useState<number>(SUBSTRATE_CHOICES[2]);
  const [run, setRun] = useState<{substrate: number} | null>(null);
  const [measured, setMeasured] = useState(false);
  const predictions = usePredictions<QuestionKey>();

  const simulation = useMemo(() => {
    if (!run) return null;
    const duration = assayDuration(parameters, run.substrate, 0.5);
    return {
      duration,
      samples: generateProgressCurve(parameters, run.substrate, duration, 400),
      tangent: initialRateTangent(parameters, run.substrate, duration),
      velocity: measuredInitialVelocity(parameters, run.substrate),
    };
  }, [run, parameters]);

  const alreadyRecorded = run ? assays.some((a) => a.initialSubstrate === run.substrate) : false;

  const startRun = () => {
    setRun({substrate});
    setMeasured(false);
  };

  const measure = () => {
    if (!run || !simulation) return;
    setMeasured(true);
    if (!alreadyRecorded) {
      onRecord({initialSubstrate: run.substrate, initialVelocity: simulation.velocity, parameters});
    }
  };

  return (
    <div className="workbench" data-testid="panel-03a">
      <section className="controls" aria-label="측정 조건">
        <h3>반응 측정하기</h3>
        <p className="small">
          효소 시료 X를 일정한 농도로 사용합니다. 이 측정의 목적은 효소의 반응속도 상수를 알아내는 것이며, 03B에서 그
          값을 구체적으로 다룹니다.
        </p>
        <p className="small flow-note" data-testid="velocity-flow">
          반응 진행 곡선 → 초기 구간의 기울기 → 초기 속도 v₀ → v₀ 대 [S] 그래프(03B)
        </p>
        <fieldset className="choice-grid">
          <legend>초기 기질 농도 [S]₀</legend>
          {SUBSTRATE_CHOICES.map((s) => (
            <button key={s} type="button" aria-pressed={substrate === s} onClick={() => setSubstrate(s)} data-testid={`substrate-${s}`}>
              {s} µM
            </button>
          ))}
        </fieldset>
        <button type="button" className="primary" onClick={startRun} data-testid="run-assay">
          반응 시작
        </button>
        {simulation ? (
          <button type="button" onClick={measure} disabled={measured} data-testid="measure-v0">
            초기 속도 측정
          </button>
        ) : null}
        <TeachingModel>비가역 반응으로 단순화한 Michaelis–Menten 모델</TeachingModel>
      </section>

      <section className="workspace" aria-label="반응 진행 곡선">
        {simulation ? (
          <>
            <p className="plot-caption">
              [S]₀ = {run!.substrate} µM · 측정 시간 {simulation.duration.toFixed(0)} s (기질의 절반이 소모될 때까지)
            </p>
            <ProgressCurvePlot samples={simulation.samples} initialSubstrate={run!.substrate} tangent={measured ? simulation.tangent : null} />
          </>
        ) : (
          <p className="placeholder-note">초기 기질 농도 [S]₀를 고르고 반응을 시작하면 반응 진행 곡선(progress curve)이 그려집니다.</p>
        )}
      </section>

      <section className="inquiry" aria-label="질문과 측정 결과">
        <PredictQuestion
          predictions={predictions}
          name="linear"
          testId="q-linear"
          question="반응이 시작된 뒤 생성물은 일정한 속도로 계속 쌓일까?"
          choices={[
            {id: 'constant', label: '그렇다 — 생성물 농도 [P]가 직선으로 증가한다'},
            {id: 'slows', label: '아니다 — 처음에 가장 빠르게 증가하고 점차 느려진다'},
            {id: 'speeds', label: '아니다 — 처음에는 느리다가 점차 빨라진다'},
          ]}
          hint="예측을 확정한 뒤 반응을 시작해 비교해 보세요."
        />

        <div className="readout">
          <h3>측정 결과</h3>
          {measured && simulation ? (
            <dl>
              <div>
                <dt>[S]₀</dt>
                <dd>{run!.substrate} µM</dd>
              </div>
              <div>
                <dt>v₀ = Vmax[S]₀ / (Km + [S]₀)</dt>
                <dd data-testid="measured-v0">{simulation.velocity.toFixed(1)} nM·s⁻¹</dd>
              </div>
            </dl>
          ) : (
            <p className="small">반응을 시작한 뒤, 초기 구간의 기울기로 초기 속도(initial velocity, v₀)를 측정하세요.</p>
          )}
        </div>

        <div className="readout">
          <h3>모은 측정값 ({assays.length}개)</h3>
          {assays.length ? (
            <table data-testid="assay-table">
              <thead>
                <tr>
                  <th scope="col">[S]₀ (µM)</th>
                  <th scope="col">v₀ (nM·s⁻¹)</th>
                </tr>
              </thead>
              <tbody>
                {[...assays]
                  .sort((a, b) => a.initialSubstrate - b.initialSubstrate)
                  .map((a) => (
                    <tr key={a.initialSubstrate}>
                      <td>{a.initialSubstrate}</td>
                      <td>{a.initialVelocity.toFixed(1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="small">아직 측정값이 없습니다.</p>
          )}
          <p className="small">
            측정값은 자동으로 03B의 Michaelis–Menten 그래프(v₀ 대 [S])로 보내져 마름모로 표시됩니다.
          </p>
          {assays.length ? (
            <button type="button" onClick={onClear} data-testid="clear-assays">
              측정값 모두 지우기
            </button>
          ) : null}
        </div>
      </section>

      <section className="observation" aria-label="설명">
        <Reveal
          testId="progress-explanation"
          gate={predictions.get('linear').locked && measured}
          gateMessage="예측을 확정하고, 반응을 시작한 뒤 초기 속도를 측정하면 설명을 볼 수 있습니다."
        >
          <p>
            반응 진행 곡선은 휘어집니다. 기질이 소모되면서 [S]가 줄어들고, 이 모델에서 반응 속도는 [S]에 따라 달라지므로 반응은
            진행되는 내내 점점 느려집니다. t = 0에서 그린 직선 접선, 즉 초기 구간의 기울기는 이런 변화가 일어나기 <em>전</em>의 속도이며, 접선과
            곡선 사이에 벌어지는 간격은 너무 긴 시간 구간으로 속도를 측정할 때 생기는 오차를 그대로 보여 줍니다.
          </p>
          <p>
            그래서 다음 단계에서 [S]에 대해 그래프로 나타내는 값은 <strong>초기</strong> 속도입니다. 초기 속도만이 여러분이
            실제로 설정한 기질 농도에 대응하는 속도이기 때문입니다. 측정할 때마다 ([S]₀, v₀) 한 쌍이 얻어지고, 03B에서 이
            점들을 모아 그래프를 완성합니다.
          </p>
          <p className="small">
            이 시뮬레이션은 P = S₀ − S 조건에서 dS/dt = −Vmax·S/(Km + S)를 적분합니다. 역반응, 생성물 저해(product
            inhibition), 효소 불활성화는 고려하지 않습니다. 자세한 내용은 <a href="#/model-notes">모델 및 주의사항</a>을
            참고하세요.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
