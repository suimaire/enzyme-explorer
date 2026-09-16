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
  {id: 1, label: '전체 단백질에서 활성 부위 찾기', eyebrow: '1단계'},
  {id: 2, label: 'Zn²⁺에 직접 배위하는 잔기 찾기', eyebrow: '2단계'},
  {id: 3, label: 'Zn²⁺에 결합한 solvent 관찰', eyebrow: '3단계'},
  {id: 4, label: 'His64의 역할 비교', eyebrow: '4단계'},
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
        <p>PDB {STRUCTURE_SOURCE.pdbId} 구조를 불러오는 중…</p>
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
        <section className="controls" aria-label="3D 화면 조작">
          <h3>탐구 순서</h3>
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
            label="표시 방식"
            value={representation}
            options={
              [
                ['ribbon', '리본'],
                ['sticks', '막대'],
                ['spacefill', '공간 채움'],
              ] as const
            }
            onChange={setRepresentation}
          />
          <div className="button-row">
            <button type="button" onClick={() => focus('active-site')} data-testid="focus-active-site">
              활성 부위로 이동
            </button>
            <button type="button" onClick={() => focus('overview')} data-testid="reset-camera">
              카메라 초기화
            </button>
          </div>
          <p className="small">
            드래그하여 회전하고, 스크롤하거나 두 손가락으로 확대·축소합니다. 잔기를 클릭하면 선택되고 Zn²⁺까지의 거리가
            측정됩니다. 3D 화면에 키보드 초점이 있을 때는 방향키로 회전하고 + / − 키로 확대·축소할 수 있습니다.
          </p>
        </section>

        <section className="workspace" aria-label="3D 구조">
          <StructureViewer
            structure={structure}
            bonds={bonds}
            view={view}
            camera={camera}
            onPick={setSelected}
            options={{
              ariaLabel: `Human Carbonic Anhydrase II, PDB ${STRUCTURE_SOURCE.pdbId}, chain ${STRUCTURE_SOURCE.chain}. 촉매 작용을 하는 Zn²⁺ 이온이 표시된 단백질 리본 모델. 드래그하여 회전, 스크롤하여 확대·축소, 잔기를 클릭하여 선택.`,
              focus: {target: structure.atoms[site.metal.atomIndex].position, distance: 17},
            }}
          />
          <div className="viewer-footer">
            <span>
              잔기 {structure.residues.slice(...structure.ranges.polymer).length}개 · 수소를 제외한 원자 {structure.atoms.length}개 ·{' '}
              위치가 결정된 물 분자 {structure.residues.slice(...structure.ranges.water).length}개
            </span>
            <span>거리는 PDB에 등록된 좌표에서 측정한 값 (Å)</span>
          </div>
          {selectedResidue ? (
            <p className="plot-caption" data-testid="selection-readout">
              선택한 잔기 <strong>{residueLabel(selectedResidue)}</strong> — {site.metal.resName}까지의 최단 거리:{' '}
              {selectedDistance!.toFixed(2)} Å{' '}
              {selectedDistance! <= COORDINATION_MAX ? '(직접 배위가 가능한 거리)' : '(직접 배위하기에는 너무 먼 거리)'}
            </p>
          ) : (
            <p className="plot-caption">선택한 잔기가 없습니다. 리본이나 곁사슬을 클릭하면 Zn²⁺까지의 거리를 측정합니다.</p>
          )}
        </section>

        <section className="inquiry" aria-label="단계별 안내와 질문">
          {stage === 1 ? (
            <div data-testid="stage-1-panel">
              <h3>1단계 · 전체 단백질에서 활성 부위 찾기</h3>
              <p>
                인간 탄산무수화효소 II(Human Carbonic Anhydrase II)는 약 260개 잔기로 이루어진 하나의 폴리펩타이드
                사슬이며, 가운데의 비틀린 β-병풍 구조가 두드러집니다. 짙은 구가 Zn²⁺ 이온입니다. 이 모듈에서 다루는 일은
                모두 이 이온에서 몇 Å 이내의 활성 부위(active site)에서 일어납니다.
              </p>
              <p>
                <button type="button" className="primary" onClick={() => goToStage(2)} data-testid="go-active-site">
                  활성 부위로 이동
                </button>
              </p>
              <p className="small">
                폴리펩타이드 사슬이 어떻게 이런 모양으로 접히는지 다시 보고 싶다면{' '}
                <a href={PROTEIN_EXPLORER_URL} target="_blank" rel="noreferrer noopener">
                  단백질 구조와 접힘 복습하기 ↗
                </a>
              </p>
            </div>
          ) : null}

          {stage === 2 ? (
            <div data-testid="stage-2-panel">
              <h3>2단계 · Zn²⁺에 직접 배위하는 잔기 찾기</h3>
              <p className="small">
                Zn²⁺ 이온에서 12 Å 이내에 원자가 있는 histidine 잔기를 모두 나열했습니다. 직접 배위하는 리간드(ligand)라고
                생각하는 잔기를 고른 뒤 답을 확정하면 측정한 거리가 표시됩니다.
              </p>
              <fieldset disabled={guessLocked}>
                <legend>
                  <span className="predict-tag">먼저 예측</span> Zn²⁺에 직접 배위하는 histidine 잔기는 무엇일까?
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
                      <th scope="col">잔기</th>
                      <th scope="col">가장 가까운 원자</th>
                      <th scope="col">Zn²⁺까지 거리 (Å)</th>
                      <th scope="col">직접 배위?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {site.histidines.map((h) => (
                      <tr key={h.residueIndex} data-testid={`his-${h.resSeq}`}>
                        <td>His {h.resSeq}</td>
                        <td>{h.closest.atomName}</td>
                        <td className="number">{h.closest.distance.toFixed(2)}</td>
                        <td>{h.coordinating ? '예' : '아니오'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <button type="button" className="primary" disabled={guess.size === 0} onClick={() => setGuessLocked(true)} data-testid="lock-guess">
                  답 확정하고 거리 측정
                </button>
              )}
              <Reveal
                testId="ligand-explanation"
                gate={guessLocked}
                gateMessage="잔기를 고르고 답을 확정하면 설명을 볼 수 있습니다."
              >
                <p>
                  세 histidine 곁사슬이 Zn²⁺에 직접 닿습니다: {site.ligands.map((l) => residueLabel(structure.residues[l.residueIndex])).join(', ')}
                  (각각 {site.ligands.map((l) => l.distance.toFixed(2)).join(', ')} Å). 두 잔기는 Nε2, 한 잔기는 Nδ1 원자로
                  배위합니다. 어느 질소 원자가 배위하는지는 각 잔기의 기하 구조에 따라 정해지며, 이 앱은 미리 가정하지 않고
                  좌표상 가장 가까운 원자를 그대로 보여 줍니다.
                </p>
                <p>
                  목록의 나머지 histidine은 모두 몇 Å 이상 더 멀리 있습니다. 세 리간드와 나머지 잔기 사이에 뚜렷한 간격이
                  있으므로, {COORDINATION_MAX} Å 기준은 임의로 고른 값이 아니라 두 집단을 깔끔하게 나누는 값입니다.
                </p>
                <p>
                  단백질 리간드가 셋이므로 Zn²⁺에는 네 번째 배위 자리가 남습니다. 3단계에서 이 자리를 살펴봅니다.
                </p>
              </Reveal>
            </div>
          ) : null}

          {stage === 3 ? (
            <div data-testid="stage-3-panel">
              <h3>3단계 · Zn²⁺에 결합한 solvent 관찰</h3>
              {site.boundSolvent ? (
                <>
                  <table className="residue-table" data-testid="solvent-table">
                    <tbody>
                      <tr>
                        <th scope="row">Zn²⁺에 결합한 solvent</th>
                        <td className="number">{site.boundSolvent.distance.toFixed(2)} Å</td>
                      </tr>
                      {site.nextWater ? (
                        <tr>
                          <th scope="row">그다음으로 가까운 물 분자</th>
                          <td className="number">{site.nextWater.distance.toFixed(2)} Å</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                  <p>
                    <SourceTag kind="experimental" />네 번째 배위 자리에는 solvent(용매 분자)의 산소 원자 하나가 금속 직접
                    배위에 전형적인 거리로 놓여 있습니다. 그다음으로 가까운 물 분자는 이 범위를 훨씬 벗어나 있으므로, 이 판단은
                    거리 기준을 어디에 두든 달라지지 않습니다.
                  </p>
                  <Caution title="구조가 알려 주는 것과 알려 주지 않는 것">
                    <p>
                      <SourceTag kind="experimental" />
                      좌표는 이 자리에 <strong>산소 원자</strong>가 있다는 것을 보여 줍니다. 이것이 실험 결과입니다.
                    </p>
                    <p>
                      <SourceTag kind="interpretation" />
                      특정 pH에서 이 산소가 물 분자의 것인지 수산화 이온의 것인지, 즉 양성자화 상태(protonation state)는
                      반응 메커니즘에 대한 해석입니다. 이 분해능의 일반적인 X선 구조에서는 수소 원자의 위치가 결정되지
                      않으므로, 이 앱은 이 자리를 <strong>Zn²⁺에 결합한 solvent</strong>라고만 부릅니다.
                    </p>
                  </Caution>
                </>
              ) : (
                <p role="alert">이 구조에는 Zn²⁺에서 {COORDINATION_MAX} Å 이내에 위치가 결정된 물 분자가 없습니다.</p>
              )}
            </div>
          ) : null}

          {stage === 4 && shuttle ? (
            <div data-testid="stage-4-panel">
              <h3>4단계 · His64의 역할 비교</h3>
              <PredictQuestion
                predictions={predictions}
                name="shuttle"
                testId="q-shuttle"
                question="His64는 Zn²⁺에 직접 배위할까?"
                choices={[
                  {id: 'yes', label: '그렇다 — 네 번째 단백질 리간드이다'},
                  {id: 'no', label: '아니다 — 직접 배위하기에는 너무 멀다'},
                ]}
                hint="3D 화면에서 His64를 선택해 거리를 확인한 뒤 결정하세요."
              />
              <table className="residue-table" data-testid="shuttle-table">
                <tbody>
                  <tr>
                    <th scope="row">His {shuttle.resSeq}의 가장 가까운 원자</th>
                    <td>{shuttle.closest.atomName}</td>
                    <td className="number">{shuttle.closest.distance.toFixed(2)} Å</td>
                  </tr>
                  <tr>
                    <th scope="row">비교: 직접 배위하는 리간드</th>
                    <td colSpan={2} className="number">
                      {site.ligands.map((l) => l.distance.toFixed(2)).join(' · ')} Å
                    </td>
                  </tr>
                </tbody>
              </table>
              {shuttle.hasAlternates ? (
                <p className="small">
                  <SourceTag kind="experimental" />
                  이 구조에서 His{shuttle.resSeq}는 두 가지 형태(alternate conformation)로 모델링되어 있습니다. 3D 화면은
                  점유율(occupancy)이 더 높은 형태를 보여 주며, 측정한 거리도 그 형태를 기준으로 합니다.
                </p>
              ) : null}
              <Reveal
                testId="shuttle-explanation"
                gate={predictions.get('shuttle').locked}
                gateMessage="예측을 확정하면 설명을 볼 수 있습니다."
              >
                <p>
                  His{shuttle.resSeq}는 Zn²⁺의 직접 리간드가 <strong>아닙니다</strong>. 가장 가까운 원자도 Zn²⁺에서{' '}
                  {shuttle.closest.distance.toFixed(2)} Å 떨어져 있습니다. 2단계에서 측정한 세 histidine의 배위 거리의 약{' '}
                  {Math.round(shuttle.closest.distance / site.ligands[0].distance)}배로, 직접 배위하기에는 너무 먼 거리입니다.
                </p>
                <p>
                  <SourceTag kind="interpretation" />
                  그래도 His{shuttle.resSeq}는 촉매 작용에 참여합니다. 금속 자리와 바깥 용매 사이에 위치하며, 금속 결합이
                  아니라 <strong>양성자 이동(proton transfer)</strong>, 즉 양성자 셔틀(proton shuttle) 역할과 관련됩니다.
                  이 역할은 여러 종류의 실험을 종합해 얻은 메커니즘 해석이며, 이 좌표만으로 보이는 것은 아닙니다.
                </p>
                <p className="small">
                  두 가지 형태로 모델링되어 있다는 점은 안쪽과 바깥쪽 방향 사이를 오가야 하는 잔기라는 해석과 잘 맞습니다.
                  하지만 두 형태가 함께 모델링된 것은 정적인 관찰일 뿐, 움직임을 기록한 것은 아닙니다.
                </p>
              </Reveal>
            </div>
          ) : null}

          <div className="readout">
            <h3>활성 부위 요약</h3>
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
                    <th scope="row">Zn²⁺에 결합한 solvent의 O</th>
                    <td className="number">{site.boundSolvent.distance.toFixed(2)} Å</td>
                  </tr>
                ) : null}
                {shuttle ? (
                  <tr>
                    <th scope="row">
                      His {shuttle.resSeq} {shuttle.closest.atomName} (리간드 아님)
                    </th>
                    <td className="number">{shuttle.closest.distance.toFixed(2)} Å</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <p className="small">
              모든 값은 PDB {STRUCTURE_SOURCE.pdbId}에 등록된 좌표에서 직접 측정했으며, 미리 정해 둔 표에서 가져온 값이
              아닙니다.
            </p>
          </div>
        </section>
      </div>

      <ChemistryPanel unlocked={stage >= 3} />
    </main>
  );
}
