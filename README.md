# Enzyme Explorer · Catalysis & Kinetics

Student inquiry app for **Basic Biochemistry ET, session 7 — Enzyme I: Catalysis & Kinetics** (80 minutes, high-achieving Grade 10–11 students).

Live: <https://suimaire.github.io/enzyme-explorer/>

The whole app answers one question:

> **How can a protein change the rate of a chemical reaction?**

and it answers it in three passes:

```
ENERGY              Why can a thermodynamically favourable reaction still be slow?
      ↓
ACTIVE-SITE         How can an enzyme lower an activation barrier?
CHEMISTRY
      ↓
KINETICS            How can we experimentally observe the effect?
```

It is not a set of explanation pages. Every module runs the same loop —
**predict → lock → manipulate → observe → explain** — and no explanation exists in the DOM
until the student has locked a prediction and made the corresponding observation.

## Local development

Requires Node ≥ 22.12.

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on 127.0.0.1 |
| `npm test` | Vitest, run once |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, type-aware TS rules + React hooks) |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build, including the `/enzyme-explorer/` base path |

## Deployment

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` with the
official GitHub Pages actions (`configure-pages` → `upload-pages-artifact` → `deploy-pages`).
Enable it once under **Settings → Pages → Source → GitHub Actions**.

Vite's `base` is `/enzyme-explorer/`, matching the repository name. Navigation between modules is
**hash-based** (`#/kinetics`), so a reload or a deep link never asks the static host for a path that
does not exist — there is no SPA-rewrite 404 to work around.

## Module structure

| Route | Module | State |
| --- | --- | --- |
| `#/start` | Start — the session question and the three cards | ✅ |
| `#/reaction-energy` | 01 Reaction Energy — interactive reaction-coordinate diagram | ✅ |
| `#/carbonic-anhydrase` | 02 Carbonic Anhydrase — guided 3D active site (PDB 2CBA) | ✅ |
| `#/kinetics` | 03 Enzyme Kinetics Lab — 03A initial velocity, 03B Michaelis–Menten, 03C Km and mechanism | ✅ |
| `#/inhibition` | 04 Inhibition | Coming in Enzyme II |
| `#/regulation` | 05 Regulation | Coming in Enzyme II |
| `#/model-notes` | Model Notes — every simplification, stated | ✅ |

```
src/
  app/            shell, module registry, hash navigation
  kinetics/       pure velocity + progress-curve maths (no UI imports)
    michaelisMenten.ts   calculateVmax, calculateV0, generateMichaelisMentenCurve
    progressCurve.ts     generateProgressCurve (RK4), closed-form checks, tangent
    types.ts             units, parameters, and the KineticModel boundary
  modules/
    start/ reaction-energy/ carbonic-anhydrase/ kinetics/ notes/ placeholder/
  shared/         Prediction/Reveal, Slider, Segmented, callouts, formatting
  viewer/         framework-independent 3D stack
    pdb/          parseStructure, inferBonds, element tables
    rendering/    StructureScene (three.js), ribbon geometry
    picking/      raycast registry, pointer tap-vs-drag guard
    measurements/ distances and contacts
  data/structures/2CBA.pdb
```

Modules do not share state. Module 03's three sections share one set of measurements through their
own parent component, and nothing else crosses a module boundary. There is no global state library.

**Extension point for Enzyme II:** `src/kinetics/types.ts` defines `KineticModel`, and the plots only
ever ask a model for `velocity(substrate)`. `CompetitiveInhibitionModel`, `UncompetitiveInhibitionModel`
and `MixedInhibitionModel` are new implementations of that interface, not changes to the plotting code.
No inhibition maths is implemented yet.

## PDB source

`src/data/structures/2CBA.pdb` — **human carbonic anhydrase II, native enzyme**, X-ray diffraction,
1.54 Å. Håkansson, Carlsson, Svensson & Liljas (1992) *J. Mol. Biol.* **227**, 1192–1204.
Downloaded from RCSB PDB (<https://files.rcsb.org/download/2CBA.pdb>) and bundled **byte-identical**
(`.gitattributes` disables newline conversion):

```
SHA-256  7862c050b41ed8a867555699c6a0266c7997c06f7552593febf2af9c92c6e5a8
size     219510 bytes
```

The app never calls an external API or CDN at runtime; every dependency is an npm package and the
structure is a bundled static asset.

Nothing about the active site is hard-coded. The metal is found by element, its ligands by measuring
distances to candidate donor atoms, and the bound solvent by measuring distances to water oxygens.
The test suite checks the result against the entry's own `LINK` records, which the app itself never
uses for drawing:

| Measured from coordinates | Deposited `LINK` |
| --- | --- |
| His94 NE2 — Zn 2.10 Å | 2.10 |
| His96 NE2 — Zn 2.12 Å | 2.12 |
| His119 ND1 — Zn 2.11 Å | 2.11 |
| Zn — solvent O 2.05 Å | 2.05 |
| His64 ND1 — Zn **7.45 Å** (not a ligand) | — |

## Scientific simplifications

Stated in full on the in-app **Model Notes** page and in [`docs/SCIENTIFIC_NOTES.md`](docs/SCIENTIFIC_NOTES.md).
In short:

- **Module 01** draws *one* barrier per pathway; the reaction coordinate is not time; the energies are
  chosen on a teaching scale, not measured.
- **Module 02** separates what the coordinates contain (atom positions) from what is a mechanistic
  reading of them (protonation states, proton transfer, the catalytic cycle). Every mechanistic
  statement carries a *Mechanistic interpretation* tag. The solvent bound to Zn²⁺ is labelled
  **Zn-bound solvent**, never "hydroxide", because a 1.54 Å X-ray model does not locate hydrogens.
- **Module 03** is single-substrate, irreversible, initial-rate Michaelis–Menten, with no product
  inhibition and no cooperativity. **Km is never equated with binding affinity.**

`tests/language.test.ts` enforces this: it scans every source file for the specific over-simplifications
the app exists to avoid ("Km = affinity", "enzymes give energy", "moves the equilibrium", "all enzymes
follow Michaelis–Menten", "Zn provides OH⁻", "His64 binds Zn", "the PDB shows proton transfer", a
negative ΔG implying speed, the reaction coordinate as time) and fails if any of them reappears as an
affirmative claim. It also asserts that the replacement safeguards are still present.

## Relationship with Protein 3D Explorer

Sibling project: <https://suimaire.github.io/protein-3d-explorer/> (repo `suimaire/protein-3d-explorer`),
linked from Module 02 and from the footer as prerequisite review.

**The two repositories are independent.** No monorepo, no shared package, no symlink, no import.
The viewer *technique* was reused by copying and adapting it into `src/viewer/`:

| Reused from Protein 3D Explorer | Adapted here as |
| --- | --- |
| Fixed-column PDB parser, altloc/occupancy policy, HELIX/SHEET assignment | `viewer/pdb/parsePdb.ts` — **now keeps waters**, which the original discards, since the Zn-bound solvent is the point of Module 02 |
| Covalent-radius bond inference | `viewer/pdb/bonds.ts` — metals excluded, so coordination is never drawn as a covalent bond |
| Ribbon through real Cα positions (Catmull–Rom, SS-dependent width) | `viewer/rendering/ribbon.ts` — plus `ribbonRuns`, which splits on **geometry** rather than residue numbering (2CBA has no residue 126 although the chain is continuous) |
| Renderer/OrbitControls setup, instanced spheres and cylinders, projected HTML labels, extent-based camera fitting, explicit `dispose()` | `viewer/rendering/StructureScene.ts` |
| Pointer-based tap-vs-drag picking | `viewer/picking/picking.ts` — extended to reject multi-touch so pinch-zoom never selects |

Deliberately **not** carried over: φ/ψ and Ramachandran, folding-lesson state, protein-curriculum
navigation, and any Protein II state management. Only viewer technique was reused; all pedagogical
state in this app is new.

## Toolchain note

This project pins **TypeScript 5.9** while Protein 3D Explorer uses TypeScript 7. `typescript-eslint`
does not yet support TS 7 (its peer range is `>=4.8.4 <6.1.0`), and a working `npm run lint` with
type-aware rules was worth more here than matching the sibling project's compiler version. Nothing in
the source depends on the difference.
