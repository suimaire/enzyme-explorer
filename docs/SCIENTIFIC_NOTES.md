# Scientific notes

Every model in this app is a deliberate simplification. This document says what each one assumes, where
it breaks, and what the app does to stop a student generalising past it. The in-app **모델 및 주의사항** (Model Notes) page
(`#/model-notes`) carries a student-facing version of the same content; this file adds the reasoning
behind the implementation choices.

---

## 1 · Module 01 — Reaction energy

### The model

One reaction coordinate, one maximum per pathway. The reactant state is fixed at 0; the student sets the
product energy (ΔG) and the uncatalysed transition-state energy, and the enzyme lowers the
transition-state energy only.

`src/modules/reaction-energy/energyProfile.ts`:

```
deltaG            = product − reactant
forwardBarrier    = transitionState − reactant
reverseBarrier    = transitionState − product
```

Both pathways are built from **the same** `reactant` and `product` values. It is not possible, by
construction, for switching the enzyme on to change ΔG — that invariant lives in the model, not in the
drawing code, and is asserted across every reachable slider combination in `tests/reactionEnergy.test.ts`.

### What it gets right, and why that matters

- **ΔG and ΔG‡ are independent.** The point of the module: a reaction with ΔG ≪ 0 can have an
  arbitrarily high barrier. The opening question ("A reaction has ΔG < 0. Must it be fast?") cannot be
  answered from the sign of ΔG alone.
- **One maximum ⇒ both barriers fall together.** Because the forward barrier is measured from the
  reactant level and the reverse barrier from the product level *to the same point*, lowering that point
  necessarily lowers both, by exactly the same amount. The catalyst speeds up both directions.
- **The equilibrium position is untouched.** It is set by the difference between the end states, which
  the enzyme does not move.

### Where it breaks

- **Real mechanisms are not one-barrier.** An enzyme-catalysed route normally passes through several
  intermediates and several transition states, and usually is not the same chemical route as the
  uncatalysed reaction. "The" activation barrier then means the highest effective barrier along the
  route. The UI carries a *Simplified one-barrier model* tag for exactly this reason.
- **The reaction coordinate is not time.** It is conceptual progress along a pathway. The app therefore
  contains **no animation of anything travelling along the x axis**, and the axis carries the sub-label
  *"Conceptual progress along a reaction pathway — not time"*. `energyProfile.ts` exposes no
  position-versus-time quantity at all.
- **ΔG versus ΔG°.** The vertical difference drawn between the two end points is a difference of
  standard free energies, and it is ΔG° that fixes the equilibrium constant. The instantaneous ΔG of a
  reacting mixture also depends on the concentrations present at that moment. The app deliberately does
  **not** compute a numerical Keq from the student's arbitrary teaching energies; it states that the
  equilibrium position is unchanged, which is the robust claim.
- **The energies are chosen, not measured.** They are on a conceptual kJ·mol⁻¹ scale set by sliders.
  Nothing in the module describes a particular real reaction.

### The rate factor

The readout quotes exp(ΔΔG‡/RT) at 298.15 K (`relativeRateFactor`). This is transition-state theory with
the *same pre-exponential factor assumed for both pathways* — a genuine consequence of the chosen
energies, not a measured rate enhancement. The UI says so in the same sentence as the number.

### Slider safety

A transition state must lie above both states it connects. `clampTransitionState` enforces a minimum gap
of 5 kJ·mol⁻¹ above the higher end point, so no slider combination can draw a maximum below a state, and
no barrier can reach zero. The plotted y domain is derived from the *slider bounds*, not from the current
values, so the axis never rescales while a student works — the enzyme-on and enzyme-off pictures are
always read against the same scale.

---

## 2 · Module 02 — Human carbonic anhydrase II (PDB 2CBA)

### The single most important distinction

The module separates two categories and labels them in the UI:

| *Experimental structure* | *Mechanistic interpretation* |
| --- | --- |
| atom positions, residues, the Zn²⁺ ion, ordered solvent oxygens, measured distances, alternate conformations | protonation states, proton transfer, the Zn-bound hydroxide state, nucleophilic attack, the catalytic cycle |

Everything drawn in 3D comes from the left column. Everything in the chemistry panel is tagged as the
right column.

### A structure is a model, not a film

PDB 2CBA is a model fitted to X-ray diffraction data from a crystal at 1.54 Å. It is one refined set of
positions. It shows no motion and no reaction.

### Protonation states are not observed here

A standard X-ray structure at this resolution does not locate hydrogen atoms. Whether the solvent
molecule on the zinc is water or hydroxide at a given pH is a mechanistic conclusion drawn from many
kinds of evidence, not something read off these coordinates.

**Consequence in the app:** the fourth coordination position is labelled **`Zn²⁺에 결합한 solvent`** (Zn-bound solvent) in the
viewer and nowhere reads "Zn–OH⁻ observed in the PDB".

### Coordination is measured, never assumed

`src/modules/carbonic-anhydrase/activeSite.ts` finds:

1. the metal, by element (`ZN`), asserting there is exactly one;
2. its ligands, as polymer N/O/S atoms within **2.6 Å**;
3. the bound solvent, as the water oxygen within the same cutoff.

No atom name and no residue number is hard-coded as a ligand. The measured result reproduces the
deposited `LINK` records exactly, which `tests/structure.test.ts` asserts:

```
His94  NE2 — Zn   2.10 Å      LINK 2.10
His96  NE2 — Zn   2.12 Å      LINK 2.12
His119 ND1 — Zn   2.11 Å      LINK 2.11
Zn — HOH263 O     2.05 Å      LINK 2.05
```

Note that two histidines coordinate through NE2 and one through ND1. The app reports whichever nitrogen
the coordinates place closest rather than assuming a convention.

**The cutoff is not doing the work.** The next nearest ordered water is at **3.83 Å** — 1.78 Å beyond the
bound one. The three ligands and the next-nearest histidines are separated by more than 4 Å. Any cutoff
between roughly 2.6 and 3.5 Å gives the same answer, so the classification is a property of the
structure, not of the threshold. The app displays the next-nearest water distance so a student can see
this for themselves.

### His64

His64 is **not** a zinc ligand: its closest atom (ND1) is **7.45 Å** from the metal, more than three
times the coordination distance. The module asks the student to predict, then measure, then concludes:

- His94 / His96 / His119 → direct Zn ligands (*experimental*)
- His64 → not a direct ligand (*experimental*)
- His64 is associated with proton transfer, a proton shuttle (*mechanistic interpretation*)

His64 is modelled in **two alternate conformations** in this entry (occupancies 0.70 and 0.20). The
viewer keeps the higher-occupancy conformer and says so. Two modelled conformers are a static
observation consistent with a residue that moves; they are not a recorded motion.

### Alternate locations and other parsing policy

- First `MODEL` only.
- One conformer per atom slot (chain + residue number + insertion code + atom name): highest occupancy,
  first listed on ties. Residues that had alternates are flagged so the UI can disclose it.
- Hydrogens/deuteriums counted and omitted (this entry has none).
- Waters **kept** — the deviation from the sibling project's parser, and the reason Module 02 can find
  the Zn-bound solvent at all.
- Coordinates are used exactly as deposited: nothing is recentred, rotated or idealised.

### Bonds and coordination are drawn differently

`COVALENT_RADII` has no entry for any metal, so `inferBonds` can never emit a Zn–ligand stick. Metal
coordination is drawn as a **measured dashed distance with its value labelled**, which is what the
coordinates actually support.

### Residue numbering

Carbonic anhydrase II numbering has **no residue 126**, although the chain runs continuously from 125 to
127. Both the bond inference and `ribbonRuns` therefore decide continuity by **geometry** (Cα–Cα ≤ 4.5 Å,
C–N within covalent range), never by residue numbering. Keying on numbers would put a false break in the
ribbon and drop a real peptide bond. `tests/structure.test.ts` asserts the ribbon is a single unbroken
run of all 258 residues.

### Hydrogen bonds

The app does not assert hydrogen bonds. Without hydrogen positions, a short donor–acceptor distance is
*evidence for a possible hydrogen bond*, not a confirmed one. Where such contacts are discussed they are
described as possible interactions with the measured distance shown. Water-network tracing is out of
scope for this MVP.

### The chemistry, stated safely

The claim the app makes is:

> Zn²⁺ and the surrounding active-site environment modify the acid–base properties and reactivity of the
> bound water.

The claim it never makes is "Zn²⁺ provides OH⁻". The metal does not hand a hydroxide to the substrate;
it changes the acid–base behaviour of the solvent molecule already bound to it, so that a reactive
metal-bound hydroxide state becomes accessible at a pH where free hydroxide is scarce.

The seven-step catalytic cycle in the chemistry panel is a teaching summary assembled from the wider
literature and is tagged *Mechanistic interpretation* as a whole.

---

## 3 · Module 03 — Michaelis–Menten kinetics

### Units

Fixed across the module and never converted implicitly:

```
[S], Km      µM
[E]T         nM
kcat         s⁻¹
Vmax, v0     nM·s⁻¹        (Vmax = kcat · [E]T : s⁻¹ × nM = nM·s⁻¹)
time         s
```

The single place the two concentration units meet is `dS/dt` inside the progress-curve integrator, which
converts explicitly through `NM_PER_UM`. Unit consistency is asserted in `tests/michaelisMenten.test.ts`.

### The model

```
E + S ⇌ ES → E + P                    v0 = Vmax[S] / (Km + [S])
```

under the steady-state assumption, at **initial-rate** conditions — the rate at the instant the reaction
starts, when [S] is still the concentration set and essentially no product has accumulated.

### 03A · the progress-curve simulation

```
dS/dt = −Vmax·S / (Km + S)            P(t) = S0 − S(t)
```

integrated with classical **RK4** at a fixed step. RK4 rather than Euler so the drawn curvature is the
model's and not the integrator's: `tests/progressCurve.test.ts` checks every sample against the
closed-form implicit solution

```
Km·ln(S0/S) + (S0 − S) = Vmax·t
```

to four decimal places — far below a plotted pixel. This is why the curve is a simulation of a stated
model rather than a plausible-looking free-hand shape.

**Assumptions that are false for a real assay:**

- no reverse reaction (irreversible approximation);
- no product inhibition;
- no enzyme inactivation over the run;
- the steady-state/initial-rate relation is applied for the *whole* run, not only at the start.

The panel is tagged *Simplified irreversible Michaelis–Menten model*.

**A genuine consequence students can see:** the departure of the curve from its initial-rate tangent
depends on the regime. At [S]₀ ≪ Km the rate falls off quickly within the window; at [S]₀ ≫ Km the
enzyme stays near saturation and the run is nearly zero-order, so the curve legitimately hugs its own
tangent. The test suite asserts this ordering rather than demanding visible curvature everywhere.

### 03B · what the controls mean

**[S] is a marker, not a parameter.** Moving "Current [S]" selects which condition on the curve is being
read; it does not reshape the curve. Km, kcat and [E]T are what reshape it. The UI says this under the
slider.

**Axis discipline.** The substrate axis is fixed at 0–600 µM always. The velocity axis is **locked before
a comparison begins**: entering Experiment B reserves headroom for a doubling *before* [E]T moves, so
pressing "Double [E]T" produces no rescale at all and the new curve visibly grows. Without that lock,
doubling Vmax would double the axis too and the two curves would look identical — the comparison would
show nothing.

**The three relationships the experiments establish:**

| Experiment | Vmax | Km | v0 at fixed [S] |
| --- | --- | --- | --- |
| A — raise [S] | — | — | approaches Vmax; equals Vmax/2 at [S] = Km |
| B — double [E]T | ×2 | unchanged | ×2 at *every* [S] |
| C — change Km | unchanged | moves | half-maximal point moves to the new Km |

**Vmax is an asymptote**, not a velocity reached at any finite [S].

### Measurements are data; the curve is a model

The v₀ values measured in 03A are carried into 03B as diamonds. If the student then changes a parameter,
the points no longer lie on the curve — and that is correct. The app marks them as measured under
different conditions, explains that they are data while the curve is a model, and offers a one-click
restore of the assay conditions. It does not silently re-fit them.

### Km — the misconception this module exists to prevent

The app states one definition and never any other:

> **Km is the substrate concentration at which v₀ = Vmax/2 in the Michaelis–Menten model.**

It is a kinetic quantity measured from rates. **Km is not, in general, a direct measure of
substrate-binding affinity.** From the three-step scheme:

```
Km = (k₋₁ + kcat) / k₁            Kd = k₋₁ / k₁
```

- If kcat ≪ k₋₁ — the complex falls apart far more often than it turns over — Km approaches Kd.
- If kcat is comparable to or larger than k₋₁, Km exceeds Kd by an amount set by the *catalytic* step.
- A measured Km constrains the combination (k₋₁ + kcat)/k₁ and nothing finer. Separating the individual
  rate constants needs further experiments (e.g. pre-steady-state measurements), not a v₀-vs-[S] curve.

A prominent caution box carries this in English and Korean, on screen, throughout 03B.

### Why 03C is not a simulator

In the basic mode the student sets Km and kcat. Letting them *also* set k₁ and k₋₁ would give two
independent routes to the same quantity and invite an inconsistent state. 03C therefore shows the
relationships and the limiting case, and a mechanistic mode with k₁/k₋₁ as the controls (Km derived from
them) is left as an Enzyme II extension. `KineticModel` in `src/kinetics/types.ts` is the boundary it
would plug into.

### Not modelled at all

No cooperativity, no allosteric regulation, no inhibition of any kind, no multi-substrate kinetics.
Enzymes showing sigmoidal v₀-vs-[S] behaviour are not described by this equation — **it is false that
every enzyme follows Michaelis–Menten kinetics.**

---

## 4 · How these commitments are enforced

`tests/language.test.ts` scans every `.ts`/`.tsx` file for the specific claims this app exists to avoid,
and fails the build if one appears as an affirmative statement:

```
Km = affinity
enzymes give / supply energy
moves / shifts the equilibrium
all enzymes follow …
Zn provides / supplies / donates OH⁻
His64 binds / coordinates Zn
the PDB / structure shows proton transfer
Zn–OH⁻ observed
ΔG < 0 … therefore … fast
the reaction coordinate is time
```

A fragment that negates or refutes a claim is allowed, because refuting a misconception explicitly is
part of the teaching. The same test asserts that the replacement safeguards are still present — the Km
caution in both languages, the `Zn-bound solvent` label, the *Teaching model* /
*Mechanistic interpretation* / *Experimental structure* tags, and the reaction-coordinate sub-label — and
that any sentence mentioning a hydrogen bond keeps it hedged.
