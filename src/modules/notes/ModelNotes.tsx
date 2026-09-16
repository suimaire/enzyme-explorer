import {ModuleHeader} from '../../shared/components/ModuleHeader';
import {STRUCTURE_SOURCE} from '../carbonic-anhydrase/structureSource';

/**
 * Every simplification the three modules make, in one place. Nothing here is hidden behind a prediction:
 * a student who wants to know what the model leaves out should be able to find it immediately.
 */
export function ModelNotes() {
  return (
    <main className="module" data-testid="module-model-notes">
      <ModuleHeader id="model-notes" />
      <div className="prose-panel notes">
        <p className="lead">
          Each module uses a deliberately simplified model. None of them is wrong for what it is used for, and all of them
          break somewhere. This page says where.
        </p>

        <section>
          <h3>01 · Reaction energy</h3>
          <ul>
            <li>
              <strong>One barrier.</strong> The diagram draws a single transition state per pathway. Real enzyme mechanisms
              usually pass through several intermediates and several transition states; the &ldquo;activation barrier&rdquo; then
              refers to the highest effective barrier along the route, and a catalysed route may not even have the same
              intermediates as the uncatalysed one.
            </li>
            <li>
              <strong>The reaction coordinate is not time.</strong> The x axis is conceptual progress along a pathway. A
              position on it does not correspond to a moment during a reaction, and molecules do not travel along it at a
              steady speed.
            </li>
            <li>
              <strong>The energies are chosen, not measured.</strong> They are on an arbitrary kJ·mol⁻¹ teaching scale, set by
              the sliders. No value in that module describes any particular real reaction.
            </li>
            <li>
              <strong>ΔG and ΔG°.</strong> The vertical difference drawn between the two end points is a difference of
              standard free energies. It is ΔG° that fixes the equilibrium constant, while the instantaneous ΔG of a
              reacting mixture also depends on the concentrations present at that moment.
            </li>
            <li>
              <strong>The rate factor.</strong> The quoted rate increase is exp(ΔΔG‡/RT) at 298 K, from transition-state
              theory with the same pre-exponential factor assumed for both pathways. It follows from the energies you chose
              and is not a measured rate enhancement.
            </li>
          </ul>
        </section>

        <section>
          <h3>02 · Carbonic anhydrase</h3>
          <ul>
            <li>
              <strong>A structure is a model, not a film.</strong> PDB {STRUCTURE_SOURCE.pdbId} is an experimental model fitted
              to X-ray diffraction data from a crystal at {STRUCTURE_SOURCE.resolution} Å resolution. It shows one refined set
              of positions, not the motion of the enzyme and not the reaction happening.
            </li>
            <li>
              <strong>Protonation states are interpretations.</strong> A standard X-ray structure at this resolution does not
              locate hydrogen atoms. Whether the solvent molecule bound to Zn²⁺ is water or hydroxide at a given pH is a
              mechanistic conclusion drawn from many kinds of evidence, not something read off these coordinates. The app
              therefore labels that position &ldquo;Zn-bound solvent&rdquo;.
            </li>
            <li>
              <strong>Crystallographic waters are not the whole solvent.</strong> Only ordered water molecules appear in the
              model. The mobile solvent, and the exchange of water in and out of the active site during turnover, are not
              represented.
            </li>
            <li>
              <strong>Hydrogen bonds are geometric inferences.</strong> Without hydrogen positions, a short donor–acceptor
              distance is evidence for a possible hydrogen bond, not a confirmed one. The app describes such contacts as
              possible interactions and reports the distance it measured.
            </li>
            <li>
              <strong>Alternate conformations.</strong> His64 is modelled in two conformations in this entry. The viewer shows
              the higher-occupancy one and says so; the presence of two is itself part of the experimental result.
            </li>
            <li>
              <strong>The catalytic cycle is a teaching summary.</strong> The arrows in the chemistry panel are a mechanistic
              interpretation built from the wider literature, not something observed in this file.
            </li>
          </ul>
        </section>

        <section>
          <h3>03 · Michaelis–Menten kinetics</h3>
          <ul>
            <li>
              <strong>One substrate, one product, no inhibitor.</strong> The model is E + S ⇌ ES → E + P under the
              steady-state assumption.
            </li>
            <li>
              <strong>Initial-rate conditions.</strong> v₀ = Vmax[S]/(Km + [S]) is the rate at the instant the reaction starts,
              when [S] is still the concentration you set and essentially no product has accumulated.
            </li>
            <li>
              <strong>The progress-curve simulation is irreversible.</strong> It integrates dS/dt = −Vmax·S/(Km + S) with
              P = S₀ − S: no reverse reaction, no product inhibition, no enzyme inactivation, and the steady-state
              approximation assumed to hold for the whole run rather than only at the start.
            </li>
            <li>
              <strong>No cooperativity or allosteric regulation.</strong> Enzymes that show sigmoidal v₀-vs-[S] behaviour are
              not described by this equation at all. &ldquo;All enzymes follow Michaelis–Menten kinetics&rdquo; is false.
            </li>
            <li>
              <strong>Km is not K<sub>d</sub>.</strong> Km = (k₋₁ + k<sub>cat</sub>)/k₁, while K<sub>d</sub> = k₋₁/k₁. The two
              coincide only in the limit k<sub>cat</sub> ≪ k₋₁. A change in Km does not, on its own, tell you how
              substrate-binding affinity changed.
            </li>
            <li>
              <strong>Vmax is an asymptote.</strong> It is the limit v₀ approaches as [S] → ∞, not a velocity reached at any
              finite substrate concentration.
            </li>
          </ul>
        </section>

        <section>
          <h3>Structure source</h3>
          <p>
            PDB {STRUCTURE_SOURCE.pdbId} — {STRUCTURE_SOURCE.title}. {STRUCTURE_SOURCE.method}, {STRUCTURE_SOURCE.resolution} Å.{' '}
            {STRUCTURE_SOURCE.citation} The file is bundled with the app exactly as downloaded from RCSB PDB, so the app never
            depends on a network service at runtime.
          </p>
          <p className="small">
            <a href={STRUCTURE_SOURCE.url} target="_blank" rel="noreferrer noopener">
              RCSB PDB entry {STRUCTURE_SOURCE.pdbId}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
