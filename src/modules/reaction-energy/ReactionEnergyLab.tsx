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
        tag={<TeachingModel>Simplified one-barrier model · relative energies in kJ·mol⁻¹ are chosen, not measured</TeachingModel>}
        onReset={reset}
      />

      <div className="workbench">
        <section className="controls" aria-label="Controls">
          <h3>Manipulate</h3>
          <Slider
            testId="product-energy"
            label="Product free energy"
            value={productEnergy}
            min={PRODUCT_RANGE.min}
            max={PRODUCT_RANGE.max}
            step={PRODUCT_RANGE.step}
            unit="kJ·mol⁻¹"
            onChange={setProductEnergy}
            note="Relative to the reactant state, which is fixed at 0."
          />
          <Slider
            testId="barrier-top"
            label="Uncatalysed transition-state energy"
            value={barrierTop}
            min={BARRIER_TOP_RANGE.min}
            max={BARRIER_TOP_RANGE.max}
            step={BARRIER_TOP_RANGE.step}
            unit="kJ·mol⁻¹"
            onChange={setBarrierTop}
            note={
              clamped
                ? `Held at ${clampedTop} kJ·mol⁻¹: a transition state cannot lie below the states it connects.`
                : 'The maximum of the pathway. It is always kept above both end points.'
            }
          />
          <Segmented
            label="Enzyme"
            value={enzyme ? 'on' : 'off'}
            options={
              [
                ['off', 'OFF'],
                ['on', 'ON'],
              ] as const
            }
            onChange={switchEnzyme}
            disabled={!openingLocked}
          />
          {openingLocked ? null : <p className="gate-note">Lock your opening prediction before switching the enzyme on.</p>}
          <Slider
            testId="barrier-lowering"
            label="Transition-state lowering by the enzyme"
            value={barrierLowering}
            min={LOWERING_RANGE.min}
            max={LOWERING_RANGE.max}
            step={LOWERING_RANGE.step}
            unit="kJ·mol⁻¹"
            onChange={setBarrierLowering}
            disabled={!enzyme}
            note="Applied to the transition-state energy only. The end-point energies are not touched."
          />
        </section>

        <section className="workspace" aria-label="Reaction-coordinate diagram">
          <EnergyDiagram profile={profile} />
          <ul className="legend">
            <li>
              <svg width="26" height="10" aria-hidden="true">
                <line x1="1" x2="25" y1="5" y2="5" stroke={PATHWAY_COLORS.uncatalyzed} strokeWidth="2.4" strokeDasharray={enzyme ? '6 4' : undefined} />
              </svg>
              Uncatalysed pathway {enzyme ? '(dashed, kept for comparison)' : ''}
            </li>
            {enzyme ? (
              <li>
                <svg width="26" height="10" aria-hidden="true">
                  <line x1="1" x2="25" y1="5" y2="5" stroke={PATHWAY_COLORS.catalyzed} strokeWidth="3" />
                </svg>
                Catalysed pathway (solid)
              </li>
            ) : null}
            <li>
              <svg width="26" height="10" aria-hidden="true">
                <line x1="1" x2="25" y1="5" y2="5" stroke="#9aa6ae" strokeWidth="1.4" strokeDasharray="2 3" />
              </svg>
              Reactant and product levels
            </li>
          </ul>
        </section>

        <section className="inquiry" aria-label="Question and results">
          <PredictQuestion
            predictions={predictions}
            name="opening"
            testId="opening-question"
            question="A reaction has ΔG < 0. Must it be fast?"
            choices={[
              {id: 'yes', label: 'Yes'},
              {id: 'no', label: 'No'},
              {id: 'unknown', label: 'Not enough information'},
            ]}
            hint="Decide before you touch the diagram."
          />

          <div className="readout" data-testid="energy-readout">
            <h3>Observe</h3>
            <dl>
              <div>
                <dt>ΔG (reaction)</dt>
                <dd data-testid="readout-delta-g">{signed(profile.deltaG, 0)} kJ·mol⁻¹</dd>
              </div>
              <div>
                <dt>Forward activation barrier ΔG‡</dt>
                <dd data-testid="readout-forward">
                  {uncatalyzed.forwardBarrier.toFixed(0)}
                  {catalyzed ? <> → <strong>{catalyzed.forwardBarrier.toFixed(0)}</strong></> : null} kJ·mol⁻¹
                </dd>
              </div>
              <div>
                <dt>Reverse activation barrier ΔG‡</dt>
                <dd data-testid="readout-reverse">
                  {uncatalyzed.reverseBarrier.toFixed(0)}
                  {catalyzed ? <> → <strong>{catalyzed.reverseBarrier.toFixed(0)}</strong></> : null} kJ·mol⁻¹
                </dd>
              </div>
              <div>
                <dt>Equilibrium position</dt>
                <dd data-testid="readout-equilibrium">Unchanged by the catalyst</dd>
              </div>
            </dl>
            {catalyzed ? (
              <p className="small" data-testid="rate-factor">
                Both barriers fall by {(uncatalyzed.forwardBarrier - catalyzed.forwardBarrier).toFixed(0)} kJ·mol⁻¹. On
                transition-state theory with the same pre-exponential factor at 298 K, that is a rate increase of about{' '}
                <strong>{multiplier(relativeRateFactor(uncatalyzed.forwardBarrier - catalyzed.forwardBarrier))}</strong> in{' '}
                <em>each</em> direction — a consequence of the energies you chose, not a measured value for any real enzyme.
              </p>
            ) : (
              <p className="small">Switch the enzyme on to compare a second pathway on this same axis.</p>
            )}
          </div>

          {enzymeSeen ? (
            <div className="follow-ups" data-testid="follow-ups">
              <PredictQuestion
                predictions={predictions}
                name="deltaG"
                testId="q-delta-g"
                question="Did ΔG change?"
                choices={[
                  {id: 'yes', label: 'Yes'},
                  {id: 'no', label: 'No'},
                ]}
              />
              <PredictQuestion
                predictions={predictions}
                name="barrier"
                testId="q-barrier"
                question="Did ΔG‡ change?"
                choices={[
                  {id: 'forward', label: 'Only the forward barrier fell'},
                  {id: 'both', label: 'Both barriers fell'},
                  {id: 'no', label: 'Neither changed'},
                ]}
              />
              <PredictQuestion
                predictions={predictions}
                name="rate"
                testId="q-rate"
                question="Did the reaction rate change?"
                choices={[
                  {id: 'forward', label: 'The forward reaction got faster only'},
                  {id: 'both', label: 'Both directions got faster'},
                  {id: 'no', label: 'No change'},
                ]}
              />
              <PredictQuestion
                predictions={predictions}
                name="equilibrium"
                testId="q-equilibrium"
                question="Did the equilibrium position change?"
                choices={[
                  {id: 'products', label: 'Yes — it moved towards products'},
                  {id: 'reactants', label: 'Yes — it moved towards reactants'},
                  {id: 'no', label: 'No'},
                ]}
              />
            </div>
          ) : null}
        </section>
      </div>

      <section className="observation" aria-label="Explanation">
        <Reveal
          testId="energy-explanation"
          gate={enzymeSeen && predictions.allLocked(followUps)}
          gateMessage={
            enzymeSeen
              ? 'Lock all four predictions above to reveal the explanation.'
              : 'Lock your opening prediction, switch the enzyme on, then answer the four questions that appear.'
          }
        >
          <p>
            <strong>ΔG did not change.</strong> The catalysed pathway starts and ends at exactly the same two energies. On
            the diagram the reactant and product levels are the dotted lines that run right across: the enzyme moves the
            maximum between them, never the levels themselves.
          </p>
          <p>
            <strong>Both activation barriers fell.</strong> There is only one maximum on this pathway, and the forward
            barrier is measured from the reactant level up to it while the reverse barrier is measured from the product
            level up to the same point. Lower the maximum and both distances shrink — here by{' '}
            {catalyzed ? (uncatalyzed.forwardBarrier - catalyzed.forwardBarrier).toFixed(0) : '—'} kJ·mol⁻¹ each.
          </p>
          <p>
            <strong>Both rates increased.</strong> Rates depend on the activation barrier, so the forward and the reverse
            reaction both speed up, by the same factor in this model.
          </p>
          <p>
            <strong>The equilibrium position did not change.</strong> Where a reaction settles is set by the free-energy
            difference between the two end states, and that difference is untouched. A catalyst changes how fast
            equilibrium is reached, not where it lies. That is also the answer to the opening question: a negative ΔG tells
            you a reaction is favourable, and says nothing at all about how high the barrier in between is — so a strongly
            favourable reaction can still be immeasurably slow.
          </p>
          <p className="small">
            Strictly, the equilibrium constant is fixed by the standard free-energy change ΔG°, and the levels in this
            diagram are standard-state free energies. See <a href="#/model-notes">Model Notes</a> for that and for the
            limits of drawing a single barrier.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
