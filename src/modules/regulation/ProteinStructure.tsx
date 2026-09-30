import {useMemo, useState} from 'react';
import pdb from '../../data/regulation/1K6M-assembly1-protein.pdb?raw';
import {parseStructure} from '../../viewer/pdb/parsePdb';
import {StructureViewer, type CameraRequest} from '../carbonic-anhydrase/StructureViewer';
import type {StructureView} from '../../viewer/rendering/StructureScene';
import {Segmented} from '../../shared/components/Segmented';
import {RegulatorySite} from './Diagrams';
import {canonicalNumber, domainOf, DOMAIN_COLORS, labelNumber} from './structureSource';
import type {RegulationResult} from './model';

const structure = parseStructure(pdb, '*');
const bonds: [number, number][] = [];
const options = {ariaLabel: '사람 간 PFKFB1 1K6M 실험 구조. 드래그로 회전, 휠로 확대. 방향 키로 회전, 더하기 빼기로 확대.'};
type Focus = 'dimer' | 'chain' | 'pfk2' | 'fbpase2';
export function ProteinStructure({result, step}: {result: RegulationResult | null; step: number}) {
  const [focus, setFocus] = useState<Focus>('dimer');
  const [selected, setSelected] = useState<number | null>(null);
  const [camera, setCamera] = useState<CameraRequest>({preset: 'overview', token: 1});
  const activeDomain = result && step >= 3 ? result.phosphorylated ? 'fbpase2' : 'pfk2' : null;
  const view = useMemo<StructureView>(() => {
    const colors = new Map<number, number>();
    const visible = new Set<number>();
    for (const r of structure.residues) {
      const domain = domainOf(r);
      if (!domain) continue;
      if (focus === 'dimer' || r.chain === 'A') visible.add(r.index);
      colors.set(r.index, focus === 'pfk2' || focus === 'fbpase2' ? domain === focus ? DOMAIN_COLORS[domain] : DOMAIN_COLORS.muted : activeDomain && domain !== activeDomain ? domain === 'pfk2' ? 0x83b5b7 : 0xbba68b : DOMAIN_COLORS[domain]);
    }
    return {representation: 'ribbon', highlighted: new Set(), spheres: new Set(), selected: null, measurements: [], showLabels: false, ribbonColors: colors, visibleResidues: visible};
  }, [focus, activeDomain]);
  const picked = selected === null ? null : structure.residues[selected];
  return <div className="reg-structure" data-testid="reg-structure">
    <p className="reg-structure-source"><b>1K6M · 사람 간 PFKFB1</b> · X선 2.40 Å<br/>실험 구조 데이터 · 절단·변이 construct · assembly 1</p>
    <Segmented label="3D 구조 범위" value={focus} options={[[ 'dimer', '전체 이량체'], ['chain', '한 사슬 보기'], ['pfk2', 'PFK-2 도메인'], ['fbpase2', 'FBPase-2 도메인']]} onChange={f => {setFocus(f); setSelected(null);}} />
    <div className="reg-structure-visual"><StructureViewer structure={structure} bonds={bonds} view={view} camera={camera} onPick={setSelected} options={options} testId="reg-structure-viewer" />
      <div className="reg-structure-inset" data-testid="reg-ser-schematic"><RegulatorySite result={result} revealed={step >= 2}/><p><b>Ser schematic은 실제 3D 위치가 아닙니다.</b></p><p>N-terminal regulatory Ser33은 이 실험 construct에 직접 포함되지 않아 독립적인 2D 개념도로 표시합니다.</p></div>
    </div>
    <div className="reg-structure-legend"><span>▰ PFK-2 · {result && step >= 3 ? result.pfk2 : '상대적 활성 미관찰'}</span><span>▰ FBPase-2 · {result && step >= 3 ? result.fbpase2 : '상대적 활성 미관찰'}</span></div>
    <details className="reg-structure-scope" data-testid="reg-structure-scope"><summary>이 구조에서 보이는 것 / 보이지 않는 것</summary>
      <p><b>이 구조에서 확인</b><br/>✓ 한 사슬의 PFK-2 / FBPase-2 catalytic domains<br/>✓ dimer architecture · assembly 1</p>
      <p><b>이 구조에서 직접 확인하지 않음</b><br/>× N-terminal regulatory Ser의 phosphorylation<br/>× phosphorylation 전후의 실제 atomic motion</p>
      <p>실험 좌표는 고정되어 있습니다. 활성 범례와 Ser 개념도는 교육용 regulation overlay입니다.</p>
    </details>
    <div className="reg-structure-tools"><button type="button" onClick={() => setCamera(c => ({preset: 'overview', token: c.token + 1}))}>전체 맞춤</button><span className="small">드래그 회전 · 휠 확대 · 키보드 방향 키 / + / −</span></div>
    <p className="reg-picked">{picked ? `선택: ${picked.chain === 'C' ? '대칭 사슬 C' : '사슬 A'} ${picked.resName} · canonical ${canonicalNumber(picked.resSeq)} / auth ${picked.resSeq} / label ${labelNumber(picked.resSeq)}` : '색은 기능 영역을 구분합니다. 잔기를 누르면 세 가지 번호를 확인합니다.'}</p>
    <p className="small">호르몬 선택은 실험 좌표를 바꾸지 않습니다. WebGL 미지원 시 조절 경로 탭을 이용하세요.</p>
  </div>;
}
