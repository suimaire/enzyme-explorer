import {Caution, SourceTag} from '../../shared/components/Callout';

/**
 * The chemistry of the site, kept strictly separate from the structure panel above it.
 *
 * Everything here is a mechanistic reading built from the wider literature; nothing in it is observed in the
 * deposited coordinates, and it is labelled accordingly.
 */
export function ChemistryPanel({unlocked}: {unlocked: boolean}) {
  return (
    <section className="observation prose-panel" aria-label="Active-site chemistry" data-testid="chemistry-panel">
      <h3>
        <SourceTag kind="interpretation" />
        How the site changes the reactivity of water
      </h3>
      {!unlocked ? (
        <p className="gate-note">Work through Stage 3 first — this section is about the solvent position you find there.</p>
      ) : (
        <>
          <p>
            The question this module opened with was how the chemical environment of an active site can change the
            reactivity of water. Water is a poor nucleophile. Hydroxide is a far better one, but at neutral pH there is very
            little of it about.
          </p>
          <p>
            A Zn²⁺ ion held by three histidines, in a pocket lined by particular residues, changes the{' '}
            <strong>acid–base properties of the solvent molecule bound to it</strong>. Binding to the metal makes that
            solvent molecule far more willing to give up a proton than free water is, so a reactive metal-bound hydroxide
            state becomes accessible at physiological pH — in an environment where, in bulk solution, it would be vanishingly
            rare.
          </p>
          <ol className="cycle" data-testid="catalytic-cycle">
            <li>A solvent molecule occupies the fourth coordination position on Zn²⁺.</li>
            <li>The metal and the surrounding active-site environment alter the acid–base properties of that bound solvent.</li>
            <li>A reactive Zn-bound hydroxide state becomes favourable under conditions where free hydroxide is scarce.</li>
            <li>That hydroxide attacks CO₂, which the pocket holds in position nearby.</li>
            <li>Bicarbonate forms and leaves the metal.</li>
            <li>A water molecule takes its place, and a proton is transferred away from the site towards bulk solvent.</li>
            <li>The catalytic state is regenerated and the cycle can repeat.</li>
          </ol>
          <Caution title="Two things this is not">
            <p>
              <strong>The zinc does not hand over a hydroxide ion.</strong> It does not supply OH⁻ to the substrate. What it
              does is change the acid–base behaviour and the reactivity of the water already bound to it.
            </p>
            <p>
              <strong>None of this is visible in the structure.</strong> Steps 2 to 7 are a mechanistic interpretation. A
              crystal structure is one refined set of atomic positions, not a recording of a reaction; it shows no proton
              transfer and no protonation state.
            </p>
          </Caution>
          <p>
            Read this back against Module 01: the enzyme has not made the reaction more favourable, and it has not moved the
            equilibrium. It has provided a route whose highest barrier is lower than the barrier of the uncatalysed reaction
            in solution.
          </p>
          <p className="small">
            Full list of simplifications: <a href="#/model-notes">Model Notes</a>.
          </p>
        </>
      )}
    </section>
  );
}
