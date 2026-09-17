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

/**
 * The minimum a student needs to read the Stage 2 table: what a residue label means, which atoms ND1 and NE2
 * are, and what "direct coordination" is being judged. Open by default; it can be folded away on a phone.
 */
export function ReadingGuide() {
  return (
    <details className="reading-guide" open data-testid="reading-guide">
      <summary>구조 읽는 법 · His94, Nε2/Nδ1, 배위</summary>
      <section>
        <h4>① His94는 무엇을 뜻할까?</h4>
        <p>
          <strong>His</strong>는 histidine의 세 글자 약어이고, <strong>94</strong>는 이 PDB 구조에서 그 잔기에 붙인
          잔기 번호(residue number)입니다. 번호는 구조 파일의 numbering을 따르므로 사슬 앞에서부터 센 순서와 항상 같지는
          않습니다. 예를 들어 이 구조에는 126번이 없습니다.
        </p>
      </section>
      <section>
        <h4>② Nε2 (NE2)와 Nδ1 (ND1)</h4>
        <HistidineRing />
        <p>
          Histidine 곁사슬 끝의 imidazole 고리에는 질소 원자가 두 개 있습니다. Cγ에서 한 칸 떨어진 질소가{' '}
          <strong>Nδ1</strong>, 두 칸 떨어진 질소가 <strong>Nε2</strong>이며, PDB 파일에서는 그리스 문자 대신{' '}
          <strong>ND1</strong>, <strong>NE2</strong>로 적습니다. 어느 질소가 Zn²⁺ 쪽을 향하는지는 잔기마다 다를 수 있으므로,
          [찾기]로 측정해서 확인합니다.
        </p>
      </section>
      <section>
        <h4>③ 배위(coordination)란?</h4>
        <p>
          배위는 금속 이온과 리간드(ligand) 원자 사이의 금속–리간드 상호작용입니다. 여기서는 histidine 질소 원자의
          비공유 전자쌍이 Zn²⁺와 상호작용합니다. Zn²⁺는 전자쌍을 받아들이는 쪽, 질소는 전자쌍을 내어 주는 쪽으로 생각할 수
          있습니다.
        </p>
        <p className="small">
          직접 배위하는 원자는 Zn²⁺에서 대략 2 Å 거리에 놓입니다. 이 앱은 질소·산소·황 원자가 Zn²⁺에서{' '}
          {COORDINATION_MAX} Å 이내에 있을 때 직접 배위로 판단합니다. 근처에 있다는 것만으로는 직접 배위가 아닙니다.
        </p>
      </section>
    </details>
  );
}
