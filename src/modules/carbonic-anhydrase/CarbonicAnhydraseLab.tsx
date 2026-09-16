import {useEffect, useMemo, useState} from 'react';
import pdbUrl from '../../data/structures/2CBA.pdb?url';
import {StructureViewer, type CameraRequest} from './StructureViewer';
import {ChemistryPanel} from './ChemistryPanel';
import {STRUCTURE_SOURCE} from './structureSource';
import {COORDINATION_MAX, analyzeActiveSite, type ActiveSite} from './activeSite';
import {ModuleHeader} from '../../shared/components/ModuleHeader';
import {Segmented} from '../../shared/components/Segmented';
import {PredictQuestion, Reveal, usePredictions} from '../../shared/components/Prediction';
import {Caution, SourceTag} from '../../shared/components/Callout';
import {parseStructure, residueLabel, type Structure} from '../../viewer/pdb/parsePdb';
import {inferBonds} from '../../viewer/pdb/bonds';
import {PROTEIN_EXPLORER_URL} from '../../app/App';
import type {Measurement, Representation, StructureView} from '../../viewer/rendering/StructureScene';

type Stage = 1 | 2 | 3 | 4;
type QuestionKey = 'shuttle';

const STAGES: {id: Stage; label: string; eyebrow: string}[] = [
  {id: 1, label: 'Whole protein', eyebrow: 'Stage 1'},
  {id: 2, label: 'Zn ligands', eyebrow: 'Stage 2'},
  {id: 3, label: 'Zn-bound solvent', eyebrow: 'Stage 3'},
  {id: 4, label: 'His64', eyebrow: 'Stage 4'},
];

type Model = {structure: Structure; bonds: [number, number][]; site: ActiveSite};

/** Reads the bundled structure once and derives everything the stages need from its coordinates. */
function useStructure() {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(pdbUrl)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        if (cancelled) return;
        const structure = parseStructure(text, STRUCTURE_SOURCE.chain);
        setModel({structure, bonds: inferBonds(structure), site: analyzeActiveSite(structure)});
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);
  return {model, error};
}

export function CarbonicAnhydraseLab() {
  const {model, error} = useStructure();
  if (error)
    return (
      <main className="module">
        <p role="alert">
          PDB {STRUCTURE_SOURCE.pdbId} 구조를 불러오지 못했습니다. ({error})
        </p>
      </main>
    );
  if (!model)
    return (
      <main className="module">
        <p>Loading PDB {STRUCTURE_SOURCE.pdbId}…</p>
      </main>
    );
  return <Lab model={model} />;
}

function Lab({model}: {model: Model}) {
  const {structure, bonds, site} = model;
  const [stage, setStage] = useState<Stage>(1);
  const [representation, setRepresentation] = useState<Representation>('ribbon');
  const [selected, setSelected] = useState<number | null>(null);
  const [camera, setCamera] = useState<CameraRequest>({preset: 'overview', token: 0});
  const [guess, setGuess] = useState<Set<number>>(new Set());
  const [guessLocked, setGuessLocked] = useState(false);
  const predictions = usePredictions<QuestionKey>();

  /** His64 is named here, but its classification comes from the measured distance, not from its number. */
  const shuttle = site.histidines.find((h) => h.resSeq === 64) ?? null;
  const solventResidue = site.boundSolvent?.residueIndex ?? null;

  const view: StructureView = useMemo(() => {
    const highlighted = new Set<number>();
    const spheres = new Set<number>([site.metal.residueIndex]);
    const measurements: Measurement[] = [];
    if (stage >= 2) for (const l of site.ligands) highlighted.add(l.residueIndex);
    if (stage === 2) for (const l of site.ligands) measurements.push({a: site.metal.atomIndex, b: l.atomIndex});
    if (stage >= 3 && solventResidue !== null) spheres.add(solventResidue);
    if (stage === 3 && site.boundSolvent) {
      measurements.push({a: site.metal.atomIndex, b: site.boundSolvent.atomIndex});
      if (site.nextWater) measurements.push({a: site.metal.atomIndex, b: site.nextWater.atomIndex});
    }
    if (stage === 4 && shuttle) {
      highlighted.add(shuttle.residueIndex);
      measurements.push({a: site.metal.atomIndex, b: shuttle.closest.atomIndex});
    }
    if (stage === 2 && guessLocked) for (const index of guess) highlighted.add(index);
    if (selected !== null) highlighted.add(selected);
    return {representation, highlighted, spheres, selected, measurements, showLabels: stage >= 2};
  }, [stage, representation, selected, site, shuttle, solventResidue, guess, guessLocked]);

  const focus = (preset: CameraRequest['preset']) => setCamera((c) => ({preset, token: c.token + 1}));
  const goToStage = (next: Stage) => {
    setStage(next);
    setSelected(null);
    if (next >= 2) focus('active-site');
  };

  const reset = () => {
    setStage(1);
    setRepresentation('ribbon');
    setSelected(null);
    setGuess(new Set());
    setGuessLocked(false);
    predictions.reset();
    focus('overview');
  };

  const selectedResidue = selected === null ? null : structure.residues[selected];
  const selectedDistance =
    selected === null
      ? null
      : Math.min(
          ...structure.residues[selected].atoms.map((i) => {
            const a = structure.atoms[i].position;
            const b = structure.atoms[site.metal.atomIndex].position;
            return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          }),
        );

  const toggleGuess = (index: number) =>
    setGuess((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <main className="module" data-testid="module-carbonic-anhydrase">
      <ModuleHeader
        id="carbonic-anhydrase"
        tag={
          <span className="teaching-model">
            <SourceTag kind="experimental" />
            PDB {STRUCTURE_SOURCE.pdbId} · {STRUCTURE_SOURCE.method} · {STRUCTURE_SOURCE.resolution} Å
          </span>
        }
        onReset={reset}
      />

      <div className="workbench">
        <section className="controls" aria-label="Viewer controls">
          <h3>Guided sequence</h3>
          <ul className="stage-list">
            {STAGES.map((s) => (
              <li key={s.id}>
                <button type="button" aria-pressed={stage === s.id} onClick={() => goToStage(s.id)} data-testid={`stage-${s.id}`}>
                  <small>{s.eyebrow}</small>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
          <Segmented
            label="Representation"
            value={representation}
            options={
              [
                ['ribbon', 'Ribbon'],
                ['sticks', 'Sticks'],
                ['spacefill', 'Spheres'],
              ] as const
            }
            onChange={setRepresentation}
          />
          <div className="button-row">
            <button type="button" onClick={() => focus('active-site')} data-testid="focus-active-site">
              Focus active site
            </button>
            <button type="button" onClick={() => focus('overview')} data-testid="reset-camera">
              Reset camera
            </button>
          </div>
          <p className="small">
            Drag or swipe to rotate, scroll or pinch to zoom, tap a residue to select it. Arrow keys rotate and + / −
            zoom when the view has keyboard focus.
          </p>
        </section>

        <section className="workspace" aria-label="3D structure">
          <StructureViewer
            structure={structure}
            bonds={bonds}
            view={view}
            camera={camera}
            onPick={setSelected}
            options={{
              ariaLabel: `Human carbonic anhydrase II, PDB ${STRUCTURE_SOURCE.pdbId}, chain ${STRUCTURE_SOURCE.chain}. Ribbon of the polymer with the catalytic zinc ion marked. Drag to rotate, scroll to zoom, tap a residue to select it.`,
              focus: {target: structure.atoms[site.metal.atomIndex].position, distance: 17},
            }}
          />
          <div className="viewer-footer">
            <span>
              {structure.residues.slice(...structure.ranges.polymer).length} residues · {structure.atoms.length} heavy atoms ·{' '}
              {structure.residues.slice(...structure.ranges.water).length} ordered waters
            </span>
            <span>Distances measured from deposited coordinates, Å</span>
          </div>
          {selectedResidue ? (
            <p className="plot-caption" data-testid="selection-readout">
              Selected <strong>{residueLabel(selectedResidue)}</strong> — closest approach to {site.metal.resName}:{' '}
              {selectedDistance!.toFixed(2)} Å{' '}
              {selectedDistance! <= COORDINATION_MAX ? '(within direct coordination range)' : '(too far for direct coordination)'}
            </p>
          ) : (
            <p className="plot-caption">No residue selected. Tap the ribbon or a side chain to measure its distance to the metal.</p>
          )}
        </section>

        <section className="inquiry" aria-label="Stage notes and questions">
          {stage === 1 ? (
            <div data-testid="stage-1-panel">
              <h3>Stage 1 · The whole enzyme</h3>
              <p>
                One polypeptide chain of about 260 residues, dominated by a twisted β-sheet. The single Zn²⁺ ion is the
                dark sphere; everything this module is about happens within a few ångströms of it.
              </p>
              <p>
                <button type="button" className="primary" onClick={() => goToStage(2)} data-testid="go-active-site">
                  Focus active site
                </button>
              </p>
              <p className="small">
                Need a refresher on how a chain folds into this shape?{' '}
                <a href={PROTEIN_EXPLORER_URL} target="_blank" rel="noreferrer noopener">
                  Review protein structure and folding ↗
                </a>
              </p>
            </div>
          ) : null}

          {stage === 2 ? (
            <div data-testid="stage-2-panel">
              <h3>Stage 2 · Which histidines coordinate the zinc?</h3>
              <p className="small">
                These are all the histidines with an atom within 12 Å of the Zn²⁺ ion. Tick the ones you think are direct
                ligands, then lock your answer to see the measured distances.
              </p>
              <fieldset disabled={guessLocked}>
                <legend>
                  <span className="predict-tag">Predict</span> Which histidines directly coordinate Zn²⁺?
                </legend>
                {site.histidines.map((h) => (
                  <label key={h.residueIndex} className="choice">
                    <input type="checkbox" checked={guess.has(h.residueIndex)} onChange={() => toggleGuess(h.residueIndex)} />
                    <span>His {h.resSeq}</span>
                  </label>
                ))}
              </fieldset>
              {guessLocked ? (
                <table className="residue-table" data-testid="ligand-table">
                  <thead>
                    <tr>
                      <th scope="col">Residue</th>
                      <th scope="col">Closest atom</th>
                      <th scope="col">Distance to Zn (Å)</th>
                      <th scope="col">Direct ligand?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site.histidines.map((h) => (
                      <tr key={h.residueIndex} data-testid={`his-${h.resSeq}`}>
                        <td>His {h.resSeq}</td>
                        <td>{h.closest.atomName}</td>
                        <td className="number">{h.closest.distance.toFixed(2)}</td>
                        <td>{h.coordinating ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <button type="button" className="primary" disabled={guess.size === 0} onClick={() => setGuessLocked(true)} data-testid="lock-guess">
                  Lock answer and measure
                </button>
              )}
              <Reveal
                testId="ligand-explanation"
                gate={guessLocked}
                gateMessage="Tick your choices and lock the answer to reveal the explanation."
              >
                <p>
                  Three histidine side chains reach the metal: {site.ligands.map((l) => residueLabel(structure.residues[l.residueIndex])).join(', ')},
                  at {site.ligands.map((l) => l.distance.toFixed(2)).join(', ')} Å. Two of them donate through Nε2 and one through
                  Nδ1 — which nitrogen is used is a property of each residue&rsquo;s geometry, and the app reports whichever
                  atom the coordinates place closest rather than assuming it.
                </p>
                <p>
                  Every other histidine in the list sits several ångströms further away. There is a clear gap between the
                  three ligands and the rest, which is why a cutoff of {COORDINATION_MAX} Å separates them cleanly instead
                  of being an arbitrary choice.
                </p>
                <p>
                  Three protein ligands leave a fourth coordination position on the metal open — that is what Stage 3 is
                  about.
                </p>
              </Reveal>
            </div>
          ) : null}

          {stage === 3 ? (
            <div data-testid="stage-3-panel">
              <h3>Stage 3 · The fourth position</h3>
              {site.boundSolvent ? (
                <>
                  <table className="residue-table" data-testid="solvent-table">
                    <tbody>
                      <tr>
                        <th scope="row">Zn-bound solvent</th>
                        <td className="number">{site.boundSolvent.distance.toFixed(2)} Å</td>
                      </tr>
                      {site.nextWater ? (
                        <tr>
                          <th scope="row">Next nearest ordered water</th>
                          <td className="number">{site.nextWater.distance.toFixed(2)} Å</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                  <p>
                    <SourceTag kind="experimental" />A single solvent oxygen occupies the fourth coordination position, at a
                    distance typical of direct metal coordination. The next ordered water is well outside that range, so this
                    assignment does not depend on where the cutoff is drawn.
                  </p>
                  <Caution title="What the structure does and does not say">
                    <p>
                      <SourceTag kind="experimental" />
                      The coordinates place an <strong>oxygen</strong> here. That is the experimental result.
                    </p>
                    <p>
                      <SourceTag kind="interpretation" />
                      Whether that oxygen belongs to a water molecule or to a hydroxide at any given pH is a mechanistic
                      conclusion. A standard X-ray structure at this resolution does not locate hydrogen atoms, so the app
                      labels the position <strong>Zn-bound solvent</strong> and nothing stronger.
                    </p>
                  </Caution>
                </>
              ) : (
                <p role="alert">No ordered water lies within {COORDINATION_MAX} Å of the metal in this entry.</p>
              )}
            </div>
          ) : null}

          {stage === 4 && shuttle ? (
            <div data-testid="stage-4-panel">
              <h3>Stage 4 · His64</h3>
              <PredictQuestion
                predictions={predictions}
                name="shuttle"
                testId="q-shuttle"
                question="Does His64 directly coordinate Zn²⁺?"
                choices={[
                  {id: 'yes', label: 'Yes — it is a fourth protein ligand'},
                  {id: 'no', label: 'No — it is too far away'},
                ]}
                hint="Select His64 in the viewer and read its distance before you decide."
              />
              <table className="residue-table" data-testid="shuttle-table">
                <tbody>
                  <tr>
                    <th scope="row">His {shuttle.resSeq} closest atom</th>
                    <td>{shuttle.closest.atomName}</td>
                    <td className="number">{shuttle.closest.distance.toFixed(2)} Å</td>
                  </tr>
                  <tr>
                    <th scope="row">Direct ligands, for comparison</th>
                    <td colSpan={2} className="number">
                      {site.ligands.map((l) => l.distance.toFixed(2)).join(' · ')} Å
                    </td>
                  </tr>
                </tbody>
              </table>
              {shuttle.hasAlternates ? (
                <p className="small">
                  <SourceTag kind="experimental" />
                  His{shuttle.resSeq} is modelled in two alternate conformations in this entry. The viewer shows the
                  higher-occupancy one; the measured distance refers to that conformer.
                </p>
              ) : null}
              <Reveal
                testId="shuttle-explanation"
                gate={predictions.get('shuttle').locked}
                gateMessage="Lock your prediction to reveal the explanation."
              >
                <p>
                  His{shuttle.resSeq} is <strong>not</strong> a direct zinc ligand. Its closest atom is{' '}
                  {shuttle.closest.distance.toFixed(2)} Å from the metal — roughly {Math.round(shuttle.closest.distance / site.ligands[0].distance)}{' '}
                  times the coordination distance of the three histidines you measured in Stage 2, which is far too long for
                  direct coordination.
                </p>
                <p>
                  <SourceTag kind="interpretation" />
                  His{shuttle.resSeq} is nevertheless part of the catalytic machinery: it sits between the metal site and the
                  bulk solvent and is associated with <strong>proton transfer</strong> — a proton shuttle — rather than with
                  binding the metal. That role is a mechanistic conclusion drawn from many kinds of experiment, not something
                  these coordinates show by themselves.
                </p>
                <p className="small">
                  Being in two conformations in this entry is consistent with a residue that has to move between an inward
                  and an outward orientation, but a pair of modelled conformers is a static observation, not a recorded
                  motion.
                </p>
              </Reveal>
            </div>
          ) : null}

          <div className="readout">
            <h3>Active-site summary</h3>
            <table className="residue-table">
              <tbody>
                {site.ligands.map((l) => (
                  <tr key={l.atomIndex}>
                    <th scope="row">
                      {residueLabel(structure.residues[l.residueIndex])} {l.atomName}
                    </th>
                    <td className="number">{l.distance.toFixed(2)} Å</td>
                  </tr>
                ))}
                {site.boundSolvent ? (
                  <tr>
                    <th scope="row">Zn-bound solvent O</th>
                    <td className="number">{site.boundSolvent.distance.toFixed(2)} Å</td>
                  </tr>
                ) : null}
                {shuttle ? (
                  <tr>
                    <th scope="row">
                      His {shuttle.resSeq} {shuttle.closest.atomName} (not a ligand)
                    </th>
                    <td className="number">{shuttle.closest.distance.toFixed(2)} Å</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <p className="small">
              All values measured from the deposited coordinates of PDB {STRUCTURE_SOURCE.pdbId}; nothing is read from a
              lookup table.
            </p>
          </div>
        </section>
      </div>

      <ChemistryPanel unlocked={stage >= 3} />
    </main>
  );
}
