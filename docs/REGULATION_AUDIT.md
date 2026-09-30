# Hormonal Regulation — science and coordinate audit

Audit/acquisition date: 2026-09-30 (Asia/Seoul). Scope: acute qualitative regulation of the liver L form of PFKFB1. Other PFKFB isoforms, systemic glucose, fluxes, concentrations, fitted kinetics and real reaction timing are outside this model.

## Evidence ledger

The request was not used as a scientific source. Primary paper abstracts were retrieved as Europe PMC MED records; some PubMed HTML requests returned an access-check page. Full publisher text of the structure paper was not accessible; no detailed structural mechanism is inferred from its abstract. The final polish rechecked the live RCSB/mmCIF/PDBe/UniProt records and added the kinetic, isoform and insulin evidence below.

| Claim implemented | Evidence inspected | Limits retained |
|---|---|---|
| PFKFB1 phosphorylation reciprocally regulates its two activities | [UniProt P16118](https://www.uniprot.org/uniprotkb/P16118/entry), [PMID 6323408](https://pubmed.ncbi.nlm.nih.gov/6323408/), [PMID 1339450](https://pubmed.ncbi.nlm.nih.gov/1339450/) | Human Ser33 annotation and activity-regulation comment are **ECO:0000250, by similarity to P07953**. Relative tendencies, not absolute activity fractions or universally changed Vmax. |
| Rat liver conventional Ser32 | PMID 1339450 title and abstract | Species/reference dependent. The extra Ser33 phosphorylation of a rat mutant reported in this paper is not substituted for the human canonical annotation. |
| Insulin opposes glucagon/cAMP effects on liver F-2,6-BP | [PMID 6296099](https://pubmed.ncbi.nlm.nih.gov/6296099/) | Hepatocyte/rat evidence. The model summarizes net dephosphorylation; it does not identify a universal insulin → Akt → named phosphatase chain. |
| Glucagon receptor couples to G proteins / adenylate cyclase | [UniProt GCGR P47871](https://www.uniprot.org/uniprotkb/P47871/entry); [primary receptor structure study PMID 32193322](https://pubmed.ncbi.nlm.nih.gov/32193322/) abstract | Only the Gs/AC/cAMP/PKA teaching branch is displayed. This primary study also reports Gi coupling; other GCGR signaling is outside scope. Hormones themselves do not catalyze phosphate transfer. |
| F-2,6-BP activates liver PFK-1 | [PMID 6455662](https://pubmed.ncbi.nlm.nih.gov/6455662/) | Qualitative direction only; no affinity-from-Km generalization or numeric dose-response extracted. |
| F-2,6-BP inhibits FBPase-1 | [PMID 6260770](https://pubmed.ncbi.nlm.nih.gov/6260770/) | Rat liver biochemical evidence; no claim to cancel all glucagon effects in vivo. |
| Kinase / bisphosphatase functional regions and reactions | P16118 Region and catalytic-activity annotations | ATP-dependent synthesis and water-dependent hydrolysis are separate reactions. Protein phosphatase dephosphorylation is not the FBPase-2 reaction. |
| Experimental human liver structure | [RCSB 1K6M](https://www.rcsb.org/structure/1K6M), raw PDB/mmCIF, [PDBe UniProt mapping](https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/1k6m), [Lee et al., DOI 10.1074/jbc.M209105200](https://doi.org/10.1074/jbc.M209105200) | Static truncated/engineered construct, not a hormone-dependent conformational movie. The paper compares tissue isozymes, not acute hormone-driven domain motion. |

All downloaded raw records and SHA-256 checksums are in `src/data/regulation/`; `provenance.json` distinguishes source and processed files. `scripts/audit-regulation.mjs` is a locally authored offline reproduction script. No downloaded executable code was run. The runtime imports only the processed local structure on opening the 3D tab.

## Sequence and residue audit

- Species: **Homo sapiens**, human liver PFKFB1, reference **P16118-1**, L-type regulation.
- X-ray diffraction, **2.40 Å**.
- Deposited entity sequence: **432 residues**, explicitly stored in provenance. It maps to canonical **40–471**, auth **39–470**, label **1–432**.
- Mapping: `canonical = auth + 1 = label + 39`. Supported independently by DBREF, mmCIF and PDBe/SIFTS mapping.
- Canonical **1–39** are outside the deposited construct sequence; Ser33 therefore has no coordinates and is not an unresolved residue within this deposited entity. All 432 entity residues in each deposited chain have ATOM coordinates. This says nothing about the visibility of every side-chain atom, alternative constructs or the reason the construct was designed that way; the full experimental methods were not verified.
- Four **declared engineered mutations**, human canonical numbering: **W68F, W302F, W323F, D410E**. Their auth numbers are 67, 301, 322, 409; label numbers 29, 263, 284, 371.
- An additional sequence difference **H305R** (auth 304, label 266) exists against the currently retrieved UniProt sequence. It is absent from `_struct_ref_seq_dif` / SEQADV. Its origin is **unverified**; it is not presented as a fifth confirmed engineered mutation.
- Functional region coloring follows UniProt Region annotations: **PFK-2 2–250**, **FBPase-2 251–471** (canonical). Visible auth ranges are **39–249** (211 residues) and **250–470** (221 residues). These are annotated functional regions, not an invented equal-length split or an atomic active-site boundary.

## Biological assembly and coordinate provenance

The asymmetric unit contains deposited A and B, but they are **not used as the displayed dimer pair**.

- Assembly **1**, author assigned homodimer: `_pdbx_struct_assembly_gen` lists operators **1,2** for asym IDs `A,C,D,E,I` (protein plus associated nonpolymers/water).
- Only the protein A is retained in this teaching view; AGS, PO4 and water are omitted. The second protein is generated with operator 2 and called **C** in the processed PDB (this output chain name is not the raw mmCIF ligand asym ID C).
- Identity copy A retains deposited coordinates exactly.
- Symmetry copy C uses Cartesian `x' = -x - 1.0954984649`, `y' = y`, `z' = -z + 89.6633078975`, rounded to the PDB 0.001 Å output precision.
- Assembly **2** uses deposited B with operators 1,3 and is not displayed.
- Source files: `1K6M.cif`, `1K6M.pdb`. Processed file: `1K6M-assembly1-protein.pdb`.
- No molecule is morphed when a hormone is selected. Domain colors and qualitative activity badges update while the same StructureScene/camera persists. Focus buttons hide the symmetry copy or color annotated regions, without editing coordinates.
- Ser33 is never selected, invented or anchored to a different residue. Its independent 2D inset explicitly says it is not an actual 3D location. The PDB PO4 ligand is never used as a protein regulatory phosphate.

## Learning state and disclosure

`deriveRegulation` is the single pure biochemical model. `regulationReducer` separately manages view, step, observation history and a monotonic run token. Timers carry both the run token and step, so stale or duplicate callbacks cannot advance a new selection. Effects clear timers on dependency change and unmount; document hiding pauses narration. View changes pause the run. Reduced-motion selection jumps directly to the final observation and retains manual stage controls.

Initial predictions use the shared Prediction component. Signal buttons stay disabled until locked. Results are absent from the DOM until their stage. No previous-hormone values remain visible during a new run. Both scenarios must reach stage 5 to unlock clamping. Clamp selection leaves all upstream fields unchanged and sets only the effective mediator level; return-to-hormone mode restores the derived level. The existing Reveal explanations mount only after their controls are explicitly opened. The new kinetic details mount after both observations and start collapsed; the independent isoform caution starts collapsed at the bottom.

F-2,6-BP / F-1,6-BP positions are numbered diagrams, not newly invented chemical structures. Solid reaction arrows and dashed regulatory marks distinguish conversion from activation/inhibition. No direct F-2,6-BP → F-1,6-BP reaction is drawn. Phosphate tracing separates a diamond/dashed protein mark from a circular/solid sugar mark, both with labels.

## Final scientific and educational polish — 2026-09-30

### Activity and intervention semantics

Every acute PFK-2/FBPase-2 readout now carries **상대적 활성 증가 ↑ / 상대적 활성 감소 ↓** in the model itself, covering pathway domains, narration, 3D legends and intervention summaries. This does not model protein abundance. The intervention view shows separate preserved-upstream, hormone-predicted and downstream-applied blocks. Results repeat both mediator states, so a clamp remains clear after changing tabs. A high clamp under glucagon does not change the hormone, Ser state or either PFKFB1 activity.

### Kinetic evidence

| Inspected source | Observation used | Scope |
|---|---|---|
| [PMID 1339450](https://pubmed.ncbi.nlm.nih.gov/1339450/), original paper abstract | Rat liver phospho/dephospho forms and Ser32 mutants support increased PFK-2 Km for F6P and increased FBPase-2 maximal velocity. | Mutants are compared with wild-type states; mutant-specific values are not transferred to the UI. |
| [PMID 8390983](https://pubmed.ncbi.nlm.nih.gov/8390983/), original paper abstract | Liver isoform phosphorylation increases F6P Km and bisphosphatase activity; N-terminal deletion greatly diminishes these effects despite phosphorylation. | Native versus deletion constructs and liver versus muscle differ. No mixed fold-change is presented. |
| [PMID 10749675](https://pmc.ncbi.nlm.nih.gov/articles/PMC1220978/), original paper abstract | N-/C-terminal deletion and pH studies support regulation of both activities and stimulation of bisphosphatase Vmax. | Abstract uses affinity language; student copy instead says **F6P에 대한 apparent Km 증가** and explicitly avoids identifying Km with a binding constant. |
| [PMID 7549867](https://pubmed.ncbi.nlm.nih.gov/7549867/), review abstract | Context for reciprocal hepatic regulation and terminal-region interactions. | Classified as a review, not an independent new experiment. A confusing Km-direction phrase in this abstract is not used to override the original studies above. |

The collapsible kinetic explanation is a qualitative liver L-form summary: same substrate conditions may make the kinase reaction less favorable; FBPase-2 Vmax increases. No kinetic fitting, numerical rate, atomic mechanism or human fold-change is inferred. The primary studies were checked at **abstract level**; scanned full text was not inspected.

### Isoform comparison

[Rider et al., PMID 15170386](https://pmc.ncbi.nlm.nih.gov/articles/PMC1133864/) was inspected in full HTML, particularly the bovine-heart phosphorylation section and its original-paper references. The C-terminal BH1 Ser466/Ser483 example was crosschecked against the original study [PMID 9211863](https://pubmed.ncbi.nlm.nih.gov/9211863/) abstract. The original [PMID 2846551](https://pubmed.ncbi.nlm.nih.gov/2846551/) abstract was also inspected; its preparations/kinetic effects differ, so its numerical results were not merged with those of later studies. The UI says specific heart phosphorylation **can** increase PFK-2 relative activity and specifies isoform, site and signaling context. Heart signaling is not substituted for liver insulin signaling.

### Insulin evidence level

[PMID 2158992](https://pubmed.ncbi.nlm.nih.gov/2158992/) is explicitly titled “Indirect evidence for an action via a phosphatase.” Its abstract describes anesthetized postabsorptive rats, increased hepatic PFK-2 activity and reduced FBPase-2 activity. Reduced phosphorylation and one or more phosphatases are supported **indirectly**, rather than established as one uniquely identified cascade. The UI preserves the net-dephosphorylation summary and states this evidence level. Europe PMC's DOI field appears inconsistent with its linked JBC citation; the UI therefore links the PMID without adopting that DOI.

### Structure and discrepancy recheck

- The live [RCSB mmCIF](https://files.rcsb.org/download/1K6M.cif) returned the same 839,650-byte content as the retained raw file. `_entity_poly` has 432 residues; `_struct_ref_seq` maps label 1–432 to P16118 canonical 40–471 and auth 39–470. Live [PDBe mapping](https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/1k6m) independently confirms this range. **Ser33 is excluded from the deposited construct, not unresolved within it.**
- The structure-paper abstract [Lee et al., PMID 12379646](https://pubmed.ncbi.nlm.nih.gov/12379646/) was crosschecked on [RCSB](https://www.rcsb.org/structure/1K6M): it concerns tissue-isozyme structure/function differences and ligand states. The publisher's fulltext/PDF returned HTTP 403. Construct boundaries are confirmed from deposited sequence/coordinate records, not asserted from uninspected methods.
- Live UniProt P16118 sequence version 3 still has H at canonical 305. The mmCIF entity and coordinate sequence have R/ARG at label 266 / auth 304; neither `_struct_ref_seq_dif` nor SEQADV declares this difference. Four declared engineered mutations remain separate. **H305R: 원인 미확인.** No verified source explains its origin; no historical-sequence, polymorphism, cloning or engineering explanation is invented.
- No raw/processed structure or sequence was edited or regenerated. Only new literature records and their checksums were added to provenance. The display remains assembly 1, static domain/dimer architecture. Ser is an independent labeled 2D schematic; no tail, Ser33 atom or substitute residue was added.
- The 3D scope help lists catalytic domains and dimer architecture as visible, and regulatory-Ser phosphorylation and pre/post-phosphorylation atomic motion as unavailable. The schematic's non-3D-location note stays visible when help is closed.

New raw MED evidence records are retained locally and hashed in provenance; they are not imported at runtime. Remaining limitations include species/experimental-condition dependence, human Ser33's by-similarity annotation, abstract-only primary kinetic/insulin verification, inaccessible full structure methods, and the unexplained H305R discrepancy.
