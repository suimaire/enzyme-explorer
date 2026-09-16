/**
 * 03C — what Km is made of.
 *
 * Deliberately not a simulator. In the basic model a student sets Km and kcat; letting them also set k1 and
 * k−1 at the same time would mean two independent routes to the same quantity. A mechanistic mode with k1
 * and k−1 as the controls, and Km derived from them, is an Enzyme II extension — `michaelisMentenModel` in
 * src/kinetics is already the boundary it would plug into.
 */
export function MechanisticCaveatPanel() {
  return (
    <div className="prose-panel" data-testid="panel-03c">
      <h3>Where Km comes from</h3>
      <p>The three-step scheme behind the model is</p>
      <p className="equation">E + S ⇌ ES → E + P</p>
      <p>
        with association k₁, dissociation k₋₁ and catalysis k<sub>cat</sub>. Solving it under the steady-state assumption
        gives
      </p>
      <p className="equation" data-testid="km-expression">
        Km = (k₋₁ + k<sub>cat</sub>) / k₁
      </p>
      <p>while the equilibrium dissociation constant of the ES complex — the quantity that actually describes binding — is</p>
      <p className="equation" data-testid="kd-expression">
        K<sub>d</sub> = k₋₁ / k₁
      </p>
      <details data-testid="km-kd-details">
        <summary>When do Km and K<sub>d</sub> come close, and when do they not?</summary>
        <ul>
          <li>
            If k<sub>cat</sub> ≪ k₋₁ — the complex falls apart far more often than it turns over — the k<sub>cat</sub> term is
            negligible and <strong>Km approaches K<sub>d</sub></strong>.
          </li>
          <li>
            If k<sub>cat</sub> is comparable to or larger than k₋₁, Km is larger than K<sub>d</sub>, and how much larger depends
            on the catalytic step, not on binding.
          </li>
          <li>
            <strong>In general Km and K<sub>d</sub> are different quantities.</strong> Two enzymes with the same Km can have
            very different binding constants, and a mutation that raises Km may have changed k<sub>cat</sub> rather than
            binding.
          </li>
        </ul>
        <p>
          So a measured Km on its own constrains the combination (k₋₁ + k<sub>cat</sub>)/k₁ and nothing finer. Separating the
          individual rate constants takes further experiments — for example pre-steady-state measurements — not a v₀-vs-[S]
          curve.
        </p>
      </details>
      <p className="small">
        The whole of Module 03 also assumes one substrate, initial-rate conditions and no cooperativity. Plenty of real
        enzymes do not follow Michaelis–Menten kinetics at all; see <a href="#/model-notes">Model Notes</a>.
      </p>
    </div>
  );
}
