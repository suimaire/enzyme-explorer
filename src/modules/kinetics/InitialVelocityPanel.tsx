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
      <section className="controls" aria-label="Assay controls">
        <h3>Run an assay</h3>
        <p className="small">
          Enzyme preparation X, held at a fixed concentration. Its kinetic parameters are what these assays are
          for — you will put numbers on them in 03B.
        </p>
        <fieldset className="choice-grid">
          <legend>Initial substrate concentration [S]₀</legend>
          {SUBSTRATE_CHOICES.map((s) => (
            <button key={s} type="button" aria-pressed={substrate === s} onClick={() => setSubstrate(s)} data-testid={`substrate-${s}`}>
              {s} µM
            </button>
          ))}
        </fieldset>
        <button type="button" className="primary" onClick={startRun} data-testid="run-assay">
          Run assay
        </button>
        {simulation ? (
          <button type="button" onClick={measure} disabled={measured} data-testid="measure-v0">
            Measure initial velocity
          </button>
        ) : null}
        <TeachingModel>Simplified irreversible Michaelis–Menten model</TeachingModel>
      </section>

      <section className="workspace" aria-label="Product progress curve">
        {simulation ? (
          <>
            <p className="plot-caption">
              [S]₀ = {run!.substrate} µM · window {simulation.duration.toFixed(0)} s (half of the substrate consumed)
            </p>
            <ProgressCurvePlot samples={simulation.samples} initialSubstrate={run!.substrate} tangent={measured ? simulation.tangent : null} />
          </>
        ) : (
          <p className="placeholder-note">Choose an initial substrate concentration and run the assay to record a progress curve.</p>
        )}
      </section>

      <section className="inquiry" aria-label="Question and results">
        <PredictQuestion
          predictions={predictions}
          name="linear"
          testId="q-linear"
          question="Once the assay starts, does product accumulate at a constant rate?"
          choices={[
            {id: 'constant', label: 'Yes — [P] rises as a straight line'},
            {id: 'slows', label: 'No — it rises fastest at the start and then slows'},
            {id: 'speeds', label: 'No — it starts slowly and then speeds up'},
          ]}
          hint="Run an assay afterwards and compare."
        />

        <div className="readout">
          <h3>Measurement</h3>
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
            <p className="small">Run an assay, then measure its initial slope.</p>
          )}
        </div>

        <div className="readout">
          <h3>Collected points ({assays.length})</h3>
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
            <p className="small">No measurements yet.</p>
          )}
          <p className="small">
            Every point you measure here is carried into 03B and drawn on the v₀-vs-[S] plot as a diamond.
          </p>
          {assays.length ? (
            <button type="button" onClick={onClear} data-testid="clear-assays">
              Clear collected points
            </button>
          ) : null}
        </div>
      </section>

      <section className="observation" aria-label="Explanation">
        <Reveal
          testId="progress-explanation"
          gate={predictions.get('linear').locked && measured}
          gateMessage="Lock your prediction, run an assay and measure its initial velocity to reveal the explanation."
        >
          <p>
            The curve bends. As substrate is consumed, [S] falls, and in this model the rate depends on [S] — so the
            reaction slows down throughout the run. The straight tangent drawn at t = 0 is the rate <em>before</em> any
            of that happens, and the gap that opens between the tangent and the curve is exactly the error you would make
            by measuring over too long a window.
          </p>
          <p>
            That is why the quantity plotted against [S] in the next section is the <strong>initial</strong> velocity: it
            is the only rate that corresponds to the substrate concentration you actually set. Each of your measurements
            gives one (·[S]₀, v₀·) pair, and 03B assembles them.
          </p>
          <p className="small">
            The simulation integrates dS/dt = −Vmax·S/(Km + S) with P = S₀ − S. It has no reverse reaction, no product
            inhibition and no enzyme inactivation — see <a href="#/model-notes">Model Notes</a>.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
