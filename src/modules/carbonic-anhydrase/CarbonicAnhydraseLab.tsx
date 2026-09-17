import {useEffect, useMemo, useRef, useState} from 'react';
import pdbUrl from '../../data/structures/2CBA.pdb?url';
import {StructureViewer, type CameraRequest} from './StructureViewer';
import {ChemistryPanel} from './ChemistryPanel';
import {ReadingGuide} from './ReadingGuide';
import {ResidueFinder, type Judgement} from './ResidueFinder';
import {STRUCTURE_SOURCE} from './structureSource';
import {COORDINATION_MAX, SITE_RADIUS, analyzeActiveSite, type ActiveSite} from './activeSite';
import {STAGE_PRESETS, buildStageView, metalContact, stageCameraAtoms, type Stage} from './stageView';
import {ModuleHeader} from '../../shared/components/ModuleHeader';
import {Segmented} from '../../shared/components/Segmented';
import {PredictQuestion, Reveal, usePredictions} from '../../shared/components/Prediction';
import {Caution, SourceTag} from '../../shared/components/Callout';
import {parseStructure, residueLabel, type Structure} from '../../viewer/pdb/parsePdb';
import {atomDisplayName} from '../../viewer/pdb/atomNames';
import {inferBonds} from '../../viewer/pdb/bonds';
import {PROTEIN_EXPLORER_URL} from '../../app/App';
import type {Representation} from '../../viewer/rendering/StructureScene';

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
  const [representation, setRepresentation] = useState<Representation>(STAGE_PRESETS[1].representation);
  const [selected, setSelected] = useState<number | null>(null);
  const [camera, setCamera] = useState<CameraRequest>({preset: 'overview', token: 0});
  const [judgements, setJudgements] = useState<Map<number, Judgement>>(new Map());
  const [judgementsLocked, setJudgementsLocked] = useState(false);
  const [measured, setMeasured] = useState<Set<number>>(new Set());
  const predictions = usePredictions<QuestionKey>();

  /** His64 is named here, but its classification comes from the measured distance, not from its number. */
  const shuttle = site.histidines.find((h) => h.resSeq === 64) ?? null;
  const shuttleLocked = predictions.get('shuttle').locked;

  const view = useMemo(
    () => buildStageView(structure, site, shuttle, {stage, representation, selected, judgementsLocked, shuttleLocked}),
    [structure, site, shuttle, stage, representation, selected, judgementsLocked, shuttleLocked],
  );

  const focus = (preset: CameraRequest['preset'], atoms?: readonly number[]) => setCamera((c) => ({preset, atoms, token: c.token + 1}));

  /** Frames one residue together with the metal, so both ends of the measured distance are on screen. */
  const frameResidue = (residueIndex: number, extra: readonly number[] = []) =>
    focus('atoms', [...structure.residues[residueIndex].atoms, site.metal.atomIndex, ...extra]);

  const markMeasured = (residueIndex: number) =>
    setMeasured((prev) => (prev.has(residueIndex) ? prev : new Set(prev).add(residueIndex)));

  const workspace = useRef<HTMLElement>(null);
  /** The [찾기] button last used, so a student on a narrow screen can jump back to the list after looking. */
  const returnTarget = useRef<HTMLElement | null>(null);
  const [canReturn, setCanReturn] = useState(false);

  /**
   * On a narrow screen the list sits below the viewer, so a [찾기] press would otherwise move a camera the
   * student cannot see. Bring the viewer into view when most of it is off screen; wide layouts never scroll.
   */
  const revealViewer = (from?: HTMLElement) => {
    const host = workspace.current;
    returnTarget.current = from ?? null;
    setCanReturn(Boolean(from));
    if (!host || !from) return;
    const rect = host.getBoundingClientRect();
    const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    if (visible < Math.min(rect.height, window.innerHeight) * 0.6) {
      const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      host.scrollIntoView({behavior: smooth ? 'smooth' : 'auto', block: 'start'});
    }
  };

  const backToList = () => {
    const target = returnTarget.current;
    if (!target) return;
    target.scrollIntoView({block: 'center'});
    target.focus({preventScroll: true});
  };

  const findResidue = (residueIndex: number, from?: HTMLElement) => {
    setSelected(residueIndex);
    markMeasured(residueIndex);
    frameResidue(residueIndex);
    revealViewer(from);
  };

  const pick = (residueIndex: number) => {
    setSelected(residueIndex);
    markMeasured(residueIndex);
  };

  /** Entering a stage applies its preset again: representation, cleared selection and camera. */
  const goToStage = (next: Stage) => {
    const preset = STAGE_PRESETS[next];
    setStage(next);
    setRepresentation(preset.representation);
    setSelected(null);
    setCanReturn(false);
    const atoms = stageCameraAtoms(structure, site, shuttle, next);
    if (atoms) focus('atoms', atoms);
    else focus('overview');
  };

  const reset = () => {
    setStage(1);
    setRepresentation(STAGE_PRESETS[1].representation);
    setSelected(null);
    setJudgements(new Map());
    setJudgementsLocked(false);
    setMeasured(new Set());
    predictions.reset();
    focus('overview');
  };

  const judge = (residueIndex: number, judgement: Judgement) =>
    setJudgements((prev) => new Map(prev).set(residueIndex, judgement));

  const allJudged = site.histidines.every((h) => judgements.has(h.residueIndex));
  const agreed = site.histidines.filter((h) => judgements.get(h.residueIndex) === (h.coordinating ? 'yes' : 'no')).length;
  const summaryOpen = stage >= 3 || judgementsLocked;

  const selectedResidue = selected === null ? null : structure.residues[selected];
  const selectedContact = metalContact(structure, site, selected);
  /** Before the Stage 2 judgements are locked, the readout gives the measurement but leaves the verdict to the student. */
  const showDistanceVerdict = !(stage === 2 && !judgementsLocked);

  const rowClass = (residueIndex: number) => (selected === residueIndex ? 'is-selected' : undefined);

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

      <div className="workbench has-guide">
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
          <p className="small preset-note" data-testid="preset-note">
            {stage === 1
              ? '1단계 기본 표시: 전체 단백질 리본과 Zn²⁺ 구.'
              : `${stage}단계 기본 표시: 옅은 리본 + 조사할 잔기 막대 모형 + Zn²⁺ 구.`}{' '}
            다른 단계로 이동하면 그 단계의 기본 표시로 돌아갑니다.
          </p>
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

        <section className="workspace" aria-label="3D 구조" ref={workspace}>
          <StructureViewer
            structure={structure}
            bonds={bonds}
            view={view}
            camera={camera}
            onPick={pick}
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
          <p className="plot-caption selection-readout" data-testid="selection-readout" aria-live="polite">
            {selectedResidue && selectedContact && selectedResidue.kind === 'water' ? (
              <>
                선택한 물 분자 <strong>HOH {selectedResidue.resSeq}</strong>의 산소 원자 — Zn²⁺까지{' '}
                <strong>{selectedContact.distance.toFixed(2)} Å</strong>
                {selectedContact.distance <= COORDINATION_MAX ? ' (Zn²⁺에 결합한 solvent)' : ' (Zn²⁺에 결합하지 않은 물 분자)'}
              </>
            ) : selectedResidue && selectedContact ? (
              <>
                선택한 잔기 <strong>{residueLabel(selectedResidue)}</strong> — Zn²⁺에 가장 가까운 원자{' '}
                <strong>{atomDisplayName(selectedContact.atomName)}</strong>,{' '}
                <strong>{selectedContact.distance.toFixed(2)} Å</strong>
                {showDistanceVerdict
                  ? selectedContact.distance <= COORDINATION_MAX
                    ? ' (직접 배위가 가능한 거리)'
                    : ' (직접 배위하기에는 너무 먼 거리)'
                  : null}
              </>
            ) : selectedResidue ? (
              <>
                <strong>Zn²⁺ 이온</strong>을 선택했습니다. 주변 잔기를 선택하면 Zn²⁺까지의 거리를 측정합니다.
              </>
            ) : (
              '선택한 잔기가 없습니다. [찾기] 버튼을 누르거나 리본·곁사슬을 클릭하면 Zn²⁺까지의 거리를 측정합니다.'
            )}
          </p>
          {canReturn && selected !== null ? (
            <button type="button" className="return-link" onClick={backToList} data-testid="back-to-list">
              ↩ 목록으로 돌아가기
            </button>
          ) : null}
        </section>

        {/* Reference, not inquiry: kept out of the finder panel so Stage 2 opens on the residues themselves. */}
        {stage >= 2 ? (
          <section className="structure-guide" aria-label="구조 읽는 법">
            <ReadingGuide />
          </section>
        ) : null}

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
              <ol className="inquiry-steps">
                <li>
                  <strong>찾기</strong> 후보 잔기의 [찾기]를 눌러 3D 구조에서 위치를 확인합니다.
                </li>
                <li>
                  <strong>측정</strong> Zn²⁺에 가장 가까운 원자와 그 거리를 읽습니다.
                </li>
                <li>
                  <strong>판단</strong> Zn²⁺에 직접 배위하는 잔기인지 예/아니오로 고릅니다.
                </li>
              </ol>
              <p className="small">
                Zn²⁺에서 {SITE_RADIUS} Å 이내에 원자가 있는 histidine {site.histidines.length}개를 가까운 순서로 나열했습니다.
                3D 화면에서는 모두 같은 막대 모형으로 표시됩니다.
              </p>
              <ResidueFinder
                candidates={site.histidines}
                selected={selected}
                measured={measured}
                judgements={judgements}
                locked={judgementsLocked}
                onFind={findResidue}
                onJudge={judge}
              />
              {judgementsLocked ? (
                <>
                  <p className="locked-note" data-testid="judgement-score">
                    {site.histidines.length}개 중 {agreed}개의 판단이 좌표로 측정한 결과와 같습니다.
                  </p>
                  <div className="table-scroll">
                    <table className="residue-table" data-testid="ligand-table">
                      <caption>좌표로 측정한 결과</caption>
                      <thead>
                        <tr>
                          <th scope="col">잔기</th>
                          <th scope="col">Zn²⁺에 가장 가까운 원자</th>
                          <th scope="col" className="number">
                            Zn²⁺까지 거리 (Å)
                          </th>
                          <th scope="col">직접 배위?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {site.histidines.map((h) => (
                          <tr key={h.residueIndex} data-testid={`his-${h.resSeq}`} className={rowClass(h.residueIndex)}>
                            <th scope="row">His {h.resSeq}</th>
                            <td>{atomDisplayName(h.closest.atomName)}</td>
                            <td className="number">{h.closest.distance.toFixed(2)}</td>
                            <td className={h.coordinating ? 'verdict-yes' : 'verdict-no'}>{h.coordinating ? '예' : '아니오'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="primary"
                    disabled={!allJudged}
                    onClick={() => setJudgementsLocked(true)}
                    data-testid="lock-guess"
                  >
                    판단 확정하고 결과 비교
                  </button>
                  {!allJudged ? (
                    <p className="small">
                      {site.histidines.length}개 잔기 모두에 예/아니오를 고르면 확정할 수 있습니다. (
                      {judgements.size}/{site.histidines.length})
                    </p>
                  ) : null}
                </>
              )}
              <Reveal
                testId="ligand-explanation"
                gate={judgementsLocked}
                gateMessage="모든 잔기를 판단하고 확정하면 설명을 볼 수 있습니다."
              >
                <p>
                  세 histidine 곁사슬이 Zn²⁺에 직접 닿습니다:{' '}
                  {site.ligands
                    .map((l) => `${residueLabel(structure.residues[l.residueIndex])} ${atomDisplayName(l.atomName)} ${l.distance.toFixed(2)} Å`)
                    .join(', ')}
                  . 두 잔기는 Nε2, 한 잔기는 Nδ1 원자로 배위합니다. 어느 질소 원자가 배위하는지는 각 잔기의 기하 구조에 따라
                  정해지며, 이 앱은 미리 가정하지 않고 좌표상 가장 가까운 원자를 그대로 보여 줍니다.
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
              <div className="guide-questions">
                <h4>생각해 볼 질문</h4>
                <ol>
                  <li>Zn²⁺에 가장 가까운 solvent(용매 분자)는 무엇이고, 얼마나 가까울까?</li>
                  <li>왜 이 solvent가 특별히 중요할까?</li>
                </ol>
                <p className="small">
                  3D 화면의 청록색 구가 Zn²⁺에 결합한 solvent의 산소 원자입니다. 막대 모형은 2단계에서 찾은 세 리간드입니다.
                </p>
              </div>
              {site.boundSolvent ? (
                <>
                  <div className="table-scroll">
                    <table className="residue-table" data-testid="solvent-table">
                      <tbody>
                        <tr className={rowClass(site.boundSolvent.residueIndex)}>
                          <th scope="row">Zn²⁺에 결합한 solvent의 O</th>
                          <td className="number">{site.boundSolvent.distance.toFixed(2)} Å</td>
                          <td className="find-cell">
                            <button
                              type="button"
                              className="find-button"
                              aria-label="Zn²⁺에 결합한 solvent를 3D 구조에서 찾기"
                              onClick={(e) => findResidue(site.boundSolvent!.residueIndex, e.currentTarget)}
                              data-testid="find-solvent"
                            >
                              <span aria-hidden="true">⌖</span> 찾기
                            </button>
                          </td>
                        </tr>
                        {site.nextWater ? (
                          <tr className={rowClass(site.nextWater.residueIndex)}>
                            <th scope="row">그다음으로 가까운 물 분자의 O</th>
                            <td className="number">{site.nextWater.distance.toFixed(2)} Å</td>
                            <td className="find-cell">
                              <button
                                type="button"
                                className="find-button"
                                aria-label="그다음으로 가까운 물 분자를 3D 구조에서 찾기"
                                onClick={(e) => findResidue(site.nextWater!.residueIndex, e.currentTarget)}
                                data-testid="find-next-water"
                              >
                                <span aria-hidden="true">⌖</span> 찾기
                              </button>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <p>
                    <SourceTag kind="experimental" />세 histidine은 Zn²⁺의 배위 자리 네 곳 중 세 곳을 채웁니다. 네 번째
                    배위 자리에는 solvent(용매 분자)의 산소 원자 하나가 금속 직접 배위에 전형적인 거리로 놓여 있습니다. 그다음으로
                    가까운 물 분자는 이 범위를 훨씬 벗어나 있으므로, 이 판단은 거리 기준을 어디에 두든 달라지지 않습니다.
                  </p>
                  <p>
                    이 solvent가 중요한 까닭은 촉매 금속에 직접 붙어 있는 유일한 용매 분자이기 때문입니다. 아래 화학 설명
                    영역에서 금속과 활성 부위 환경이 이 solvent의 성질을 어떻게 바꾸는지 해석합니다.
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
              <p className="small">
                3D 화면은 His{shuttle.resSeq}와 Zn²⁺를 함께 보여 줍니다. 세 리간드(막대 모형)와 His{shuttle.resSeq}의 거리를
                비교해 보세요.
              </p>
              <PredictQuestion
                predictions={predictions}
                name="shuttle"
                testId="q-shuttle"
                question="His64는 Zn²⁺에 직접 배위할까?"
                choices={[
                  {id: 'yes', label: '그렇다 — 네 번째 단백질 리간드이다'},
                  {id: 'no', label: '아니다 — 직접 배위하기에는 너무 멀다'},
                ]}
                hint="표의 거리와 3D 화면의 점선을 확인한 뒤 결정하세요."
              />
              <div className="table-scroll">
                <table className="residue-table" data-testid="shuttle-table">
                  <thead>
                    <tr>
                      <th scope="col">잔기</th>
                      <th scope="col">Zn²⁺에 가장 가까운 원자</th>
                      <th scope="col" className="number">
                        거리 (Å)
                      </th>
                      <th scope="col">
                        <span className="visually-hidden">찾기</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`shuttle-row ${rowClass(shuttle.residueIndex) ?? ''}`}>
                      <th scope="row">His {shuttle.resSeq}</th>
                      <td>{atomDisplayName(shuttle.closest.atomName)}</td>
                      <td className="number">{shuttle.closest.distance.toFixed(2)}</td>
                      <td className="find-cell">
                        <button
                          type="button"
                          className="find-button"
                          aria-label={`3D 구조에서 찾기: His ${shuttle.resSeq}`}
                          onClick={(e) => {
                            pick(shuttle.residueIndex);
                            focus('atoms', stageCameraAtoms(structure, site, shuttle, 4)!);
                            revealViewer(e.currentTarget);
                          }}
                          data-testid="find-shuttle"
                        >
                          <span aria-hidden="true">⌖</span> 찾기
                        </button>
                      </td>
                    </tr>
                    {site.ligands.map((l) => (
                      <tr key={l.atomIndex} className={rowClass(l.residueIndex)}>
                        <th scope="row">
                          {residueLabel(structure.residues[l.residueIndex])} <span className="row-note">비교: 리간드</span>
                        </th>
                        <td>{atomDisplayName(l.atomName)}</td>
                        <td className="number">{l.distance.toFixed(2)}</td>
                        <td className="find-cell">
                          <button
                            type="button"
                            className="find-button"
                            aria-label={`3D 구조에서 찾기: ${residueLabel(structure.residues[l.residueIndex])}`}
                            onClick={(e) => findResidue(l.residueIndex, e.currentTarget)}
                          >
                            <span aria-hidden="true">⌖</span> 찾기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {shuttle.hasAlternates ? (
                <p className="small">
                  <SourceTag kind="experimental" />
                  이 구조에서 His{shuttle.resSeq}는 두 가지 형태(alternate conformation)로 모델링되어 있습니다. 3D 화면은
                  점유율(occupancy)이 더 높은 형태를 보여 주며, 측정한 거리도 그 형태를 기준으로 합니다.
                </p>
              ) : null}
              <Reveal
                testId="shuttle-explanation"
                gate={shuttleLocked}
                gateMessage="예측을 확정하면 설명을 볼 수 있습니다."
              >
                <div className="role-compare" data-testid="role-compare">
                  <div className="role-card ligand">
                    <h5>{site.ligands.map((l) => residueLabel(structure.residues[l.residueIndex])).join(' · ')}</h5>
                    <p>
                      <SourceTag kind="experimental" />
                      질소 원자가 Zn²⁺에서 {site.ligands.map((l) => l.distance.toFixed(2)).join(' · ')} Å —{' '}
                      <strong>Zn²⁺에 직접 배위</strong>
                    </p>
                  </div>
                  <div className="role-card non-ligand">
                    <h5>His {shuttle.resSeq}</h5>
                    <p>
                      <SourceTag kind="experimental" />
                      가장 가까운 원자도 {shuttle.closest.distance.toFixed(2)} Å — <strong>직접 배위하지 않음</strong>
                    </p>
                    <p>
                      <SourceTag kind="interpretation" />
                      양성자 이동(proton transfer) · 양성자 셔틀(proton shuttle)과 관련된 잔기
                    </p>
                  </div>
                </div>
                <p>
                  His{shuttle.resSeq}는 Zn²⁺에 직접 배위하지 않습니다. 가장 가까운 원자도 Zn²⁺에서{' '}
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

          <div className="readout" data-testid="site-summary">
            <h3>활성 부위 요약</h3>
            {summaryOpen ? (
              <>
                <table className="residue-table summary-table">
                  <tbody>
                    <tr className="group-row">
                      <th scope="colgroup" colSpan={2}>
                        Zn²⁺에 직접 배위하는 원자 (≤ {COORDINATION_MAX} Å)
                      </th>
                    </tr>
                    {site.ligands.map((l) => (
                      <tr key={l.atomIndex} className={rowClass(l.residueIndex)}>
                        <th scope="row">
                          {residueLabel(structure.residues[l.residueIndex])} {atomDisplayName(l.atomName)}
                        </th>
                        <td className="number">{l.distance.toFixed(2)} Å</td>
                      </tr>
                    ))}
                    {site.boundSolvent ? (
                      <tr className={rowClass(site.boundSolvent.residueIndex)}>
                        <th scope="row">Zn²⁺에 결합한 solvent의 O</th>
                        <td className="number">{site.boundSolvent.distance.toFixed(2)} Å</td>
                      </tr>
                    ) : null}
                    {shuttle ? (
                      <>
                        <tr className="group-row contrast">
                          <th scope="colgroup" colSpan={2}>
                            비교: 직접 리간드가 아님
                          </th>
                        </tr>
                        <tr className={`non-ligand ${rowClass(shuttle.residueIndex) ?? ''}`} data-testid="summary-shuttle">
                          <th scope="row">
                            His {shuttle.resSeq} {atomDisplayName(shuttle.closest.atomName)}{' '}
                            <span className="not-ligand-tag">리간드 아님</span>
                          </th>
                          <td className="number">{shuttle.closest.distance.toFixed(2)} Å</td>
                        </tr>
                      </>
                    ) : null}
                  </tbody>
                </table>
                <p className="small">
                  모든 값은 PDB {STRUCTURE_SOURCE.pdbId}에 등록된 좌표에서 직접 측정했으며, 미리 정해 둔 표에서 가져온 값이
                  아닙니다.
                </p>
              </>
            ) : (
              <p className="gate-note">2단계에서 직접 배위 여부를 판단하고 확정하면 측정한 요약이 여기에 표시됩니다.</p>
            )}
          </div>
        </section>
      </div>

      <ChemistryPanel unlocked={stage >= 3} />
    </main>
  );
}
