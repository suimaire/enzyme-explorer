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
      <section className="controls" aria-label="Model parameters">
        <h3>Manipulate</h3>
        <Slider
          testId="current-substrate"
          label="Current [S]"
          value={substrate}
          min={PARAMETER_RANGES.substrate.min}
          max={PARAMETER_RANGES.substrate.max}
          step={PARAMETER_RANGES.substrate.step}
          unit="µM"
          onChange={setSubstrateTracked}
          note="Selects a point on the curve. It does not change the curve."
        />
        <hr />
        <Slider
          testId="enzyme-total"
          label="[E]T"
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
              Clear reference curve
            </button>
          ) : (
            <button type="button" onClick={() => captureBaseline(experiment === 'enzyme' ? 2.2 : 1.15)} data-testid="capture-baseline">
              Keep this curve as reference
            </button>
          )}
        </div>
      </section>

      <section className="workspace" aria-label="Michaelis–Menten plot">
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
            Current parameters
          </li>
          {baseline ? (
            <li>
              <svg width="26" height="10" aria-hidden="true">
                <line x1="1" x2="25" y1="5" y2="5" stroke={KINETICS_COLORS.baseline} strokeWidth="2.2" strokeDasharray="7 4" />
              </svg>
              Reference curve (dashed)
            </li>
          ) : null}
          <li>
            <svg width="16" height="14" aria-hidden="true">
              <circle cx="8" cy="7" r="5" fill={KINETICS_COLORS.marker} />
            </svg>
            Current [S]
          </li>
          {assays.length ? (
            <li>
              <svg width="16" height="14" aria-hidden="true">
                <rect x="3" y="2" width="9" height="9" fill={KINETICS_COLORS.measured} transform="rotate(45 7.5 6.5)" />
              </svg>
              03A measurements (open diamond = measured under different parameters)
            </li>
          ) : null}
        </ul>
        <p className="plot-caption" data-testid="axis-note">
          Substrate axis fixed at 0–{SUBSTRATE_AXIS_MAX} µM. Velocity axis {axisLock ? 'locked while a reference curve is on screen' : 'follows the current Vmax'}.
        </p>
      </section>

      <section className="inquiry" aria-label="Experiments">
        <div className="readout" data-testid="mm-readout">
          <h3>Observe</h3>
          <dl>
            <div>
              <dt>Vmax = kcat[E]T</dt>
              <dd data-testid="readout-vmax">{vmax.toFixed(1)} nM·s⁻¹</dd>
            </div>
            <div>
              <dt>Current [S]</dt>
              <dd>{substrate} µM</dd>
            </div>
            <div>
              <dt>Current v₀</dt>
              <dd data-testid="readout-v0">{v0.toFixed(1)} nM·s⁻¹</dd>
            </div>
            <div>
              <dt>v₀ / Vmax</dt>
              <dd data-testid="readout-fraction">{(saturationFraction(parameters, substrate) * 100).toFixed(1)}%</dd>
            </div>
            {baseline ? (
              <div>
                <dt>vs reference at this [S]</dt>
                <dd data-testid="readout-vs-baseline">
                  {ratio(v0, baselineV0!)} (Vmax {ratio(vmax, baselineVmax!)}, Km {ratio(parameters.km, baseline.km)})
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <Segmented
          label="Experiment"
          value={experiment}
          options={
            [
              ['saturation', 'A · Saturation'],
              ['enzyme', 'B · Double [E]T'],
              ['km', 'C · Change Km'],
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
              question="If substrate concentration keeps increasing, will v₀ keep increasing proportionally?"
              choices={[
                {id: 'proportional', label: 'Yes — double [S], double v₀, without limit'},
                {id: 'ceiling', label: 'No — v₀ climbs towards a ceiling'},
                {id: 'falls', label: 'No — v₀ rises, peaks, then falls'},
              ]}
            />
            <p className="small">Now drag <strong>Current [S]</strong> from the bottom of its range to the top and watch v₀ / Vmax.</p>
            <Reveal
              testId="saturation-explanation"
              gate={predictions.get('saturation').locked && exploredHigh}
              gateMessage="Lock your prediction, then raise [S] to several times Km to reveal the explanation."
            >
              <p>
                v₀ approaches a ceiling. In this model the fraction of Vmax reached is [S]/(Km + [S]), so three regimes
                appear on one curve:
              </p>
              <ul>
                <li>
                  <strong>[S] ≪ Km</strong> — the denominator is dominated by Km, so v₀ ≈ (Vmax/Km)·[S]: almost a straight
                  line through the origin.
                </li>
                <li>
                  <strong>[S] = Km</strong> — v₀ is exactly Vmax/2.
                </li>
                <li>
                  <strong>[S] ≫ Km</strong> — the ratio approaches 1, so v₀ approaches Vmax and adding more substrate
                  changes almost nothing.
                </li>
              </ul>
              <p>
                Vmax is a limit the curve never actually reaches at any finite [S]; it is the value the curve tends to.
              </p>
              <button type="button" onClick={() => setShowVmaxGuide((v) => !v)} data-testid="toggle-vmax-guide">
                {showVmaxGuide ? 'Hide' : 'Show'} the Vmax guide line
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
              question="If you double [E]T, what happens to Vmax?"
              choices={[
                {id: 'double', label: 'It doubles'},
                {id: 'same', label: 'It is unchanged'},
                {id: 'half', label: 'It halves'},
              ]}
            />
            <PredictQuestion
              predictions={predictions}
              name="enzymeKm"
              testId="q-enzyme-km"
              question="And what happens to Km?"
              choices={[
                {id: 'double', label: 'It doubles'},
                {id: 'same', label: 'It is unchanged'},
                {id: 'half', label: 'It halves'},
              ]}
            />
            <PredictQuestion
              predictions={predictions}
              name="enzymeV0"
              testId="q-enzyme-v0"
              question="And v₀ at the same [S]?"
              choices={[
                {id: 'double', label: 'It doubles'},
                {id: 'same', label: 'It is unchanged'},
                {id: 'depends', label: 'It changes, but by a factor that depends on [S]'},
              ]}
            />
            <button
              type="button"
              className="primary"
              onClick={doubleEnzyme}
              disabled={!predictions.allLocked(['enzymeVmax', 'enzymeKm', 'enzymeV0']) || parameters.enzymeTotal * 2 > PARAMETER_RANGES.enzymeTotal.max}
              data-testid="double-enzyme"
            >
              Double [E]T
            </button>
            {parameters.enzymeTotal * 2 > PARAMETER_RANGES.enzymeTotal.max ? (
              <p className="small">[E]T is already too high to double within the slider range — lower it first.</p>
            ) : null}
            <Reveal
              testId="enzyme-explanation"
              gate={predictions.allLocked(['enzymeVmax', 'enzymeKm', 'enzymeV0']) && baseline !== null}
              gateMessage="Lock all three predictions and press Double [E]T to reveal the explanation."
            >
              <p>
                <strong>Vmax doubled</strong>, because Vmax = kcat·[E]T and only [E]T changed. <strong>Km is unchanged</strong>:
                it does not contain [E]T at all, so the curve reaches half of its own (new) maximum at exactly the same
                substrate concentration. On the plot the two curves cross the [S] = Km line at half their respective
                ceilings.
              </p>
              <p>
                <strong>v₀ doubled at every [S]</strong>, not only at saturation: v₀ = Vmax·[S]/(Km + [S]), and doubling Vmax
                with Km fixed multiplies the whole curve by two. The readout above shows the measured ratio at the current
                [S] — try moving [S] and confirm the ratio stays the same.
              </p>
              <p className="small">
                The velocity axis was locked before the change, so what you are seeing is a genuine change in height and not
                a rescaled axis.
              </p>
            </Reveal>
          </div>
        ) : null}

        {experiment === 'km' ? (
          <div data-testid="experiment-c">
            <p className="small">
              Keep the current curve as a reference, then move the <strong>Km</strong> slider and watch what moves with it.
            </p>
            <PredictQuestion
              predictions={predictions}
              name="kmHalf"
              testId="q-km-half"
              question="On the new curve, at which [S] does v₀ reach exactly half of Vmax?"
              choices={[
                {id: 'half-vmax-s', label: 'At half of the saturating [S]'},
                {id: 'at-km', label: 'At [S] equal to the Km value'},
                {id: 'fixed', label: 'At the same [S] as before, whatever Km is'},
              ]}
              hint="Use the v₀ / Vmax readout and move [S] until it reads 50.0%."
            />
            <Reveal
              testId="km-explanation"
              gate={predictions.get('kmHalf').locked}
              gateMessage="Lock your prediction, then reveal the guide."
            >
              <p>
                Setting v₀ = Vmax/2 in v₀ = Vmax·[S]/(Km + [S]) gives Km + [S] = 2[S], so [S] = Km. Changing Km slides the
                half-maximal point along the [S] axis and changes how steeply the curve rises, while the ceiling Vmax stays
                exactly where it was — Vmax = kcat·[E]T contains no Km.
              </p>
              <button type="button" onClick={() => setShowKmGuide((v) => !v)} data-testid="toggle-km-guide">
                {showKmGuide ? 'Hide' : 'Show'} the [S] = Km guide
              </button>
            </Reveal>
          </div>
        ) : null}

        <Caution title="Km is not, in general, a direct measure of substrate-binding affinity">
          <p>
            In this model Km has one definition: <strong>the substrate concentration at which v₀ = Vmax/2</strong>. It is a
            kinetic quantity measured from rates.
          </p>
          <p lang="ko">
            Km이 달라졌다는 사실만으로 substrate-binding affinity가 어떻게 변했는지 일반적으로 단정할 수 없습니다. Km은 결합
            단계뿐 아니라 촉매 단계의 속도상수도 함께 포함하기 때문입니다.
          </p>
          <p className="small">
            Section 03C shows where the binding constants sit inside Km, and when the two can come close.
          </p>
        </Caution>
      </section>
    </div>
  );
}
