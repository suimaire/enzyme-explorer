import {useState} from 'react';
import {COORDINATION_MAX} from './activeSite';

/** A histidine side chain, drawn only to name its atoms: Cβ–Cγ, then the five-membered imidazole ring. */
function HistidineRing() {
  const atoms = {
    CB: [14, 56],
    CG: [52, 56],
    ND1: [66, 30],
    CE1: [95, 36],
    NE2: [98, 66],
    CD2: [68, 82],
  } as const;
  const ring: (keyof typeof atoms)[] = ['CG', 'ND1', 'CE1', 'NE2', 'CD2', 'CG'];
  const path = ring.map((k, i) => `${i ? 'L' : 'M'}${atoms[k][0]} ${atoms[k][1]}`).join(' ');
  return (
    <svg
      className="his-ring"
      viewBox="0 0 230 104"
      role="img"
      aria-label="Histidine 곁사슬 모식도. 주사슬 쪽 Cβ에 Cγ가 붙고, Cγ에서 시작하는 다섯 원자 고리에 Nδ1, Cε1, Nε2, Cδ2가 차례로 이어집니다. 두 질소는 Nδ1(ND1)과 Nε2(NE2)입니다."
    >
      <path d={`M${atoms.CB[0]} ${atoms.CB[1]} L${atoms.CG[0]} ${atoms.CG[1]}`} className="bond" />
      <path d={path} className="bond" />
      {(['CB', 'CG', 'CE1', 'CD2'] as const).map((k) => (
        <circle key={k} cx={atoms[k][0]} cy={atoms[k][1]} r={4.5} className="carbon" />
      ))}
      {(['ND1', 'NE2'] as const).map((k) => (
        <circle key={k} cx={atoms[k][0]} cy={atoms[k][1]} r={7} className="nitrogen" />
      ))}
      <text x={6} y={78} className="atom-name">Cβ</text>
      <text x={40} y={44} className="atom-name">Cγ</text>
      <text x={60} y={98} className="atom-name">Cδ2</text>
      <text x={104} y={34} className="atom-name">Cε1</text>
      <text x={78} y={17} className="n-name">Nδ1 (ND1)</text>
      <text x={112} y={70} className="n-name">Nε2 (NE2)</text>
      <text x={6} y={16} className="note">← 주사슬 쪽</text>
    </svg>
  );
}

/** On a phone the guide starts as one folded accordion, so it adds no long scroll before the finder. */
const NARROW_QUERY = '(max-width: 760px)';

/**
 * The minimum a student needs to read the Stage 2 finder: what a residue label means, which atoms ND1 and NE2
 * are, and what "direct coordination" is being judged. It is a reference strip beside the 3D viewer rather than
 * part of the inquiry panel, so the finder comes first. Each card shows a short summary and folds its caveats
 * under 자세히 보기. On tablet and wider screens, opening one grows only the strip, never the viewer or the finder.
 */
export function ReadingGuide() {
  const [open, setOpen] = useState(() => typeof window.matchMedia !== 'function' || !window.matchMedia(NARROW_QUERY).matches);
  return (
    <details className="reading-guide" open={open} onToggle={(e) => setOpen(e.currentTarget.open)} data-testid="reading-guide">
      <summary>
        구조 읽는 법 <span className="reading-guide-topics">His94 · Nε2/Nδ1 · 배위</span>
      </summary>
      <div className="guide-cards">
        <section className="guide-card" data-testid="guide-card-numbering">
          <h4>① His94는 무엇을 뜻할까?</h4>
          <p>
            <strong>His</strong>는 histidine의 세 글자 약어(3-letter code)이고, <strong>94</strong>는 이 PDB 구조에서
            사용하는 잔기 번호(residue number)입니다.
          </p>
          <p className="small">잔기 번호는 사슬 앞에서부터 센 94번째 아미노산과 항상 같은 뜻은 아닙니다.</p>
          <details className="guide-more">
            <summary>자세히 보기</summary>
            <p>
              번호는 구조 파일의 numbering을 따르므로 사슬 앞에서부터 센 순서와 항상 같지는 않습니다. 예를 들어 이
              구조에는 126번이 없습니다.
            </p>
          </details>
        </section>
        <section className="guide-card" data-testid="guide-card-nitrogens">
          <h4>② Nε2 / Nδ1은 무엇일까?</h4>
          <p>
            Histidine의 imidazole 고리에는 질소 원자가 두 개 있고, PDB에서는 이를 <strong>NE2</strong>,{' '}
            <strong>ND1</strong>로 적습니다.
          </p>
          <HistidineRing />
          <details className="guide-more">
            <summary>자세히 보기</summary>
            <p>
              Cγ에서 한 칸 떨어진 질소가 <strong>Nδ1</strong>, 두 칸 떨어진 질소가 <strong>Nε2</strong>입니다. 어느
              질소가 Zn²⁺ 쪽을 향하는지는 잔기마다 다를 수 있으므로, [찾기]로 측정해서 확인합니다.
            </p>
          </details>
        </section>
        <section className="guide-card" data-testid="guide-card-coordination">
          <h4>③ 배위(coordination)란?</h4>
          <p>
            금속 이온과 리간드(ligand) 원자 사이의 금속–리간드 상호작용입니다. 여기서는 histidine 질소의 비공유
            전자쌍이 Zn²⁺와 상호작용합니다.
          </p>
          <p className="small">Zn²⁺는 전자쌍을 받아들이는 쪽, 질소는 전자쌍을 내어 주는 쪽으로 생각할 수 있습니다.</p>
          <details className="guide-more">
            <summary>자세히 보기</summary>
            <p>
              직접 배위하는 원자는 Zn²⁺에서 대략 2 Å 거리에 놓입니다. 이 앱은 질소·산소·황 원자가 Zn²⁺에서{' '}
              {COORDINATION_MAX} Å 이내에 있을 때 직접 배위로 판단합니다.
            </p>
            <p>근처에 있다는 것만으로는 직접 배위가 아닙니다.</p>
          </details>
        </section>
      </div>
    </details>
  );
}
