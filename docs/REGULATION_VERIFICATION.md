# Hormonal Regulation — implementation and verification

Date: 2026-09-30, Asia/Seoul.

Sections 1–11 retain the earlier implementation record. The final-polish report below records the current request, its starting state, evidence recheck and final verification.

## 1. Route and changed files

Implemented **`#/regulation`**, keeping the navigation label **05 효소 조절**, with the module title **Hormonal Regulation** and requested Korean question.

- `src/modules/regulation/HormonalRegulation.tsx`: module-local prediction, timer lifecycle, tab and intervention controls, source disclosure.
- `src/modules/regulation/model.ts`: pure biochemical derivation and narration reducer.
- `src/modules/regulation/Diagrams.tsx`: one-chain diagram, reaction arrows, outcomes, phosphate tracing and sugar-position dialog.
- `src/modules/regulation/ProteinStructure.tsx`, `structureSource.ts`: lazy experimental dimer/domain view and audited mapping.
- `src/modules/regulation/regulation.css`: responsive layout and reduced-motion particle rule.
- `src/app/App.tsx`, `modules.ts`: route registration, lazy module loading and compact shell on this route.
- `src/viewer/pdb/parsePdb.ts`: explicit `'*'` multichain option; default single-chain behavior preserved.
- `src/viewer/rendering/StructureScene.ts`: optional ribbon colors and visible-residue set; same scene, camera and disposal implementation.
- `src/data/regulation/`: raw records, processed assembly and SHA-256 provenance.
- `scripts/audit-regulation.mjs`: locally authored offline audit/reproduction.
- `tests/regulation.test.tsx`: 31 additional tests; `tests/browser/`: development-only WebGL failure / JS reduced-motion / network audit fixture.
- `src/modules/notes/ModelNotes.tsx`, `README.md`, `docs/SCIENTIFIC_NOTES.md`, `docs/REGULATION_AUDIT.md`, this report, and verification screenshots.

## 2. Existing work preserved

At start: `main...origin/main`, clean tracked working tree, remote `https://github.com/suimaire/enzyme-explorer.git`. Regulation was confirmed to be a ComingSoon route, not assumed to be empty. No commit, push, branch operation, pull, rebase, reset, deployment or sibling-repository edit was performed. No new runtime library or 3D engine was installed.

Existing tests were retained. The registry assertion that both modules 04/05 were planned was updated to assert 04 remains planned and 05 is ready with its original number/name and new heading. Scientific language guards were not weakened.

## 3. Hormone and intervention rules

| Input | Regulatory Ser | PFK-2 / FBPase-2 relative activity | Hormone-predicted F-2,6-BP |
|---|---|---|---|
| Insulin dominant | Net dephosphorylation favored | Increase / decrease | High |
| Glucagon dominant | PKA phosphorylation favored | Decrease / increase | Low |

Clamping F-2,6-BP changes only the effective level supplied to downstream enzymes. It preserves the hormone, Ser state and the two domain activities. High increases PFK-1 activation stimulus and FBPase-1 inhibition; low does the opposite. These are directions from this axis with other factors fixed, not calculated metabolic fluxes or blood glucose. Both scenarios × both clamp levels and restoration were tested.

## 4. Implemented interaction

Prediction must be locked once. Large insulin/glucagon buttons start five stages with about 3.8 seconds between the first and final display (pedagogical timing). Both domains remain inside one polypeptide outline. Stage-specific text and results update together; later-stage values are absent until reached. Play/pause, previous, next, restart and full reset are implemented. Run tokens reject old callbacks.

Both complete observations unlock low/high/return controls. The clamp badge and predicted-versus-applied mediator labels remain distinct. Explanations use shared Reveal and do not mount until requested after observation. Phosphate tracing distinguishes protein Ser and sugar C2 targets by symbol, border and labels. The F-2,6-BP button opens a keyboard-accessible comparison dialog with carbon-number position diagrams and separate PFK-1/FBPase-1 reactions.

## 5–7. Sources, residue numbers, structure and conceptual overlays

See [the full source/coordinate audit](REGULATION_AUDIT.md) and `src/data/regulation/provenance.json`.

- Human P16118-1 **Ser33**, with the UniProt **by similarity, ECO:0000250** qualifier. Rat conventional **Ser32** is distinguished.
- **1K6M**, Homo sapiens liver PFKFB1 construct; X-ray **2.40 Å**.
- Entity/coordinates: **432 residues per chain**, canonical **40–471**, auth **39–470**, label **1–432**.
- Declared mutations: **W68F, W302F, W323F, D410E**. Additional **H305R** discrepancy against current UniProt is explicitly unresolved, not silently treated as a declared mutation.
- Domain coloring: UniProt functional regions **2–250 / 251–471**, mapped to the actually present residues.
- Registered **assembly 1 = A + operator 2(A)**, not deposited A+B. Processed symmetry mate is named C. Every transformed atom was checked against the registered matrix; original A coordinates remain unchanged.
- Ser33 is outside the deposited construct. No tail or Ser sphere was invented. A separate inset says it does not represent a 3D location. PO4 ligands were omitted, not assigned to Ser.

## 8. Automated checks

| Check | Baseline | Final |
|---|---|---|
| `npm test` | 121 / 121 passed | **152 / 152 passed**, 8 files |
| `npm run typecheck` | Pass | Pass |
| `npm run lint` | Pass | Pass |
| `npm run build` | Pass | Pass |

One intervening full run hit the existing exhaustive reaction-energy test's 5-second timeout while other work was active. The new coordinate audit test was made cheaper by aggregating the maximum error across **all** coordinates instead of running thousands of individual matchers; the 0.0005 Å criterion is unchanged. The final ordinary `npm test` passed in 7.41 seconds. Existing tests and timeout thresholds were not altered.

Build warnings: the existing Three.js chunk exceeds 500 kB before gzip; the lazy structure chunk containing the local PDB also exceeds that threshold (about 580 kB, 149 kB gzip). Both load only when a 3D module/view is needed; no build error occurred.

## 9. Actual browser verification

Used the actual Codex in-app browser against the development server and the production preview. These are browser checks, separate from unit tests:

- Initial prediction / disabled signals / no result explanation; lock prediction; insulin and glucagon observations.
- Rapid insulin → glucagon → insulin → glucagon selection; final glucagon scenario and results.
- Previous/next, play/pause, restart, reset during a running explanation; reset returns to step 0 with locked controls.
- F-2,6-BP comparison dialog, position 2/6 versus 1/6, Escape dismissal.
- PKA → protein and PFK-2 → sugar transfer controls; distinct markings/products.
- Glucagon + high clamp preserves upstream and changes downstream; low clamp and return-to-hormone control.
- Real local 3D loading, dimer / chain / both domain focus controls, keyboard rotation/zoom and mouse drag/wheel.
- PFKFB1 camera distance changed from 173.345 to 156.011 using keyboard zoom, then to 141.399 after further mouse interaction; hormone switching retained 141.399. Coordinate invariance is independently checked in unit tests.
- Exiting 3D removes its canvas; module re-entry resets module-local learning state. Existing 2CBA rendered and zoomed from 148.288 to 133.459; shared viewer still operates.
- All hash menu destinations load, including existing start/energy/kinetics/inhibition/model-notes pages. The production preview deep link `/enzyme-explorer/#/regulation` works.
- Layout inspected at **1440×900**, **1280×800**, **820px tablet**, and **390×844** mobile. Page scroll width did not exceed viewport width; the navigation has its existing internal horizontal scroll. Mobile panels stay in input → observation → result order. The 3D view was also inspected at mobile width.
- WebGL unavailable was **fault-injected** in a development-only HTML fixture: error message shown, 2D tab and both hormone outcomes still work.
- Reduced motion's **JavaScript preference branch was emulated** in that fixture: signal jumps immediately to step 5 and retains manual navigation. The actual OS/browser media setting was not changed; the CSS reduced-motion media rule was reviewed, not separately emulated at browser level.
- Visible resource audit in the fixture, including the 3D chunk, showed **external resources: 0**, all from the localhost server. This module has no runtime external structure API/CDN fetch. The existing production-only site page-view loader is outside this module and was preserved.
- Captured browser console: no errors in normal or injected-failure flows.

The browser helper's selector wait timed out twice before the 3.8-second narration ended; subsequent UI observations confirmed step 5 and the correct outcomes. These were tool wait limits, not app exceptions.

Screenshots: [experimental 3D](verification/regulation-3d.jpg) and [causal intervention](verification/regulation-intervention.jpg).

## 10. Remaining limits

The model is deliberately qualitative and tissue/isoform-specific. Paper abstracts and primary sequence/structure records were inspected; the publisher's full structure-paper methods were not accessible. The additional H305R discrepancy remains unclassified. There is no experimental Ser33 position in this construct. Browser reduced-motion CSS was not tested under a changed OS preference. Resource cleanup uses the existing StructureScene disposal path and was checked for canvas removal and clean console; no long-duration GPU memory profile was performed.

## 11. Preview and recommended scenes

Production preview: **http://127.0.0.1:4173/enzyme-explorer/#/regulation**.

Development preview: **http://127.0.0.1:5173/enzyme-explorer/#/regulation**.

Try both hormones, then **glucagon → high F-2,6-BP clamp** to compare preserved upstream with altered downstream. In 3D, switch **whole dimer → one chain → each domain** and compare the separate Ser inset. Full module reset returns to the initial prediction.

## Final scientific / educational polish

### A. Activity terminology

The biochemical model now returns `상대적 활성 증가 ↑` / `상대적 활성 감소 ↓` for both activities, so every pathway domain, intervention summary, narration and 3D legend carries the qualifier. F-2,6-BP's hormone-derived trend is explicitly `증가 방향` / `감소 방향`. PFK-1 activation stimulus, FBPase-1 inhibition and metabolic direction wording are preserved. Protein abundance is not modeled.

### B. Virtual intervention UI

The upstream hormone, regulatory Ser and both activities are in a preserved-state block. Two separate readouts show **호르몬 조절이 예측** and **하위 효소에 적용**, linked by the virtual-override label. They are side by side on desktop and stacked on mobile. The result panel repeats both states, including when another tab is selected. Return-to-hormone removes the override and restores the predicted level.

### C. 1K6M construct / Ser33

Live RCSB mmCIF was identical to the retained raw record. mmCIF `_entity_poly`, `_struct_ref_seq`, the PDB DBREF and live PDBe mapping agree: 432 residues per chain, canonical **40–471**, auth **39–470**, label **1–432**. **Ser33 is outside the deposited construct**, not an unresolved residue inside it. All retained coordinate and reference-sequence hashes are unchanged. The structure-paper abstract was checked; full publisher text/PDF was inaccessible (403), so uninspected methods are not cited for the boundary claim. Scope and source links are in [the audit](REGULATION_AUDIT.md).

The 3D view still uses assembly 1. The independent Ser 2D schematic always states it is not a 3D location. Collapsible scope help distinguishes domain/dimer architecture from unavailable regulatory-Ser phosphorylation and atomic transitions.

### D. Kinetic explanation

One initially collapsed section is available after both hormone observations: **인산화가 두 활성을 어떻게 바꾸는지 보기**. Liver PKA phosphorylation is summarized as PFK-2 **F6P apparent Km ↑** and FBPase-2 **Vmax ↑**. It distinguishes same-substrate reaction dependence from maximal reaction capacity and explicitly rejects equating Km with binding affinity. Original abstracts **1339450, 8390983, 10749675** were compared; no numerical fold changes from different conditions are mixed. **7549867** was inspected as review context, not mislabeled as an original experiment.

### E. Isoform comparison

The initially collapsed **다른 조직에서도 같을까?** card compares liver N-terminal regulation with specific C-terminal heart PFKFB2 regulation. It names the bovine BH1 Ser466/Ser483 example and limits it to that isoform. Review **15170386** was inspected in full HTML and crosschecked with original abstract **9211863** (also inspected **2846551**); there is no universal phosphorylation rule.

### F. Insulin evidence level

The existing net-dephosphorylation summary remains. The source disclosure identifies **2158992** as indirect evidence in anesthetized postabsorptive rats, supporting one or more phosphatases. It does not introduce an insulin → Akt → single named phosphatase cascade. Species and evidence level are explicit.

### G. H305R recheck

Current live P16118 sequence version 3 has H305; the deposited entity and coordinates have R/ARG at canonical 305 / auth 304 / label 266. This discrepancy is absent from the four declared mutation records in mmCIF/SEQADV. **원인 미확인** remains. No sequence or structure was corrected. Domain architecture remains the interpretation scope; no hormone-induced atomic transition is inferred.

### H. Files changed in this polish request

- `src/modules/regulation/model.ts`, `Diagrams.tsx`, `HormonalRegulation.tsx`, `ProteinStructure.tsx`, `regulation.css`.
- New module-local `src/modules/regulation/ScientificContext.tsx` (only the two requested scientific explanations).
- `src/modules/notes/ModelNotes.tsx`.
- `tests/regulation.test.tsx` (existing cases retained; six additional test instances, plus strengthened structure assertions).
- `scripts/audit-regulation.mjs` (source URL list only), `src/data/regulation/provenance.json` (new evidence hashes only).
- Seven new MED records: `PMID-10749675.json`, `PMID-8390983.json`, `PMID-7549867.json`, `PMID-2158992.json`, `PMID-15170386.json`, `PMID-2846551.json`, `PMID-9211863.json`.
- `docs/REGULATION_AUDIT.md`, this verification report, and `docs/verification/regulation-polish-{clamp,3d,mobile}.jpg`.

The request started with the previous regulation implementation and other uncommitted changes already present. Existing changes were preserved. No commit, push, branch change, architecture replacement, library installation or structure regeneration was performed.

### I. Automated checks

| Final check | Result |
|---|---|
| `npm test` | **158 / 158 passed**, 8 files, final standalone run **8.29 s** |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |

Starting baseline: 152 tests passed. After the six additional cases, an early full run passed all 158. A later run concurrent with lint/typecheck hit the existing exhaustive reaction-energy test's 5 s timeout (157 passed, one timeout). A standalone ordinary `npm test` passed all 158; no assertion, timeout or existing test was weakened or removed. The existing >500 kB Three.js/local-structure chunk warning remains. No final application console error or warning was observed in the fresh verification fixture/production tab.

### J. Actual browser scenes

Used the real Codex in-app browser on development **5174** and production preview **4175**. The earlier preview ports in section 11 are historical; the current final preview is **http://127.0.0.1:4175/enzyme-explorer/#/regulation**.

- Locked prediction, automatic five-stage playback, manual previous/next, reset, and insulin/glucagon observations.
- **Glucagon + high clamp:** glucagon and phosphorylated Ser remain, PFK-2 relative activity stays lower and FBPase-2 higher; predicted F-2,6-BP is low, applied F-2,6-BP is high, and only downstream directions reverse.
- **Return-to-hormone:** glucagon remains, both mediator readouts return to low, clamp badge clears, and downstream directions restore.
- Both scientific disclosures open/close; kinetic summary also works with Enter. The material/scope source disclosure shows the insulin evidence level.
- 3D dimer, single chain, kinase and bisphosphatase focus controls; scope help and persistent non-3D Ser annotation.
- Existing sugar-position comparison, Escape dismissal and protein/sugar phosphate-transfer controls still work in the production preview.
- **1440×900** desktop, **820×1000** tablet and **390×844** mobile inspected. At tablet, `innerWidth=820`, document/main scroll width **805**; at mobile, `innerWidth=390`, document/main scroll width **375**. No page overflow; existing navigation scroll remains internal. Mobile intervention and scientific cards stack vertically, and the 3D schematic sits below the structure.
- Reduced-motion **JS preference branch emulated with the existing development fixture**: both signals immediately reach step 5, previous reaches step 4, next returns to step 5. Real browser media preference was false; OS preference was not altered. Production CSS reduced-motion rule is unchanged and reviewed.
- During initial UI QA, equal React sibling keys caused repeated kinetic cards. Distinct reset keys were applied. Fresh browser checks after hormone, tab and clamp updates show **one kinetic card and one isoform card**; no duplicate-key warning remains.

Screenshots: [override scene](verification/regulation-polish-clamp.jpg), [3D view](verification/regulation-polish-3d.jpg), [mobile layout](verification/regulation-polish-mobile.jpg).

### K. Remaining scientific / verification limits

This is a qualitative liver L-form model. Original kinetic/insulin studies were verified at abstract level; the full isoenzyme review was inspected, but full structure-paper methods were inaccessible. Rat experimental results are not converted to exact human kinetics. Human Ser33 annotation remains by similarity. H305R's origin remains unknown. The static truncated structure does not contain regulatory Ser33 or demonstrate phosphorylation-induced atomic motion. Flux, concentration, glucose and actual reaction timing are not predicted. Reduced-motion's JS branch was tested by emulation; the actual OS/browser reduced-motion CSS setting was not changed or independently exercised.
