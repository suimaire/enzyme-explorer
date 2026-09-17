import {atomDisplayName} from '../../viewer/pdb/atomNames';
import type {SiteResidue} from './activeSite';

export type Judgement = 'yes' | 'no';

/**
 * Stage 2 as a sequence a student can follow: find a candidate in 3D, read its nearest atom and distance, then
 * judge whether it coordinates the metal directly. The measured values appear only for residues the student
 * has actually found, and the coordinate-based verdict only after every judgement is locked.
 */
export function ResidueFinder({
  candidates,
  selected,
  measured,
  judgements,
  locked,
  onFind,
  onJudge,
}: {
  candidates: readonly SiteResidue[];
  selected: number | null;
  measured: ReadonlySet<number>;
  judgements: ReadonlyMap<number, Judgement>;
  locked: boolean;
  onFind: (residueIndex: number, from: HTMLElement) => void;
  onJudge: (residueIndex: number, judgement: Judgement) => void;
}) {
  return (
    <ul className="finder-list" data-testid="residue-finder">
      {candidates.map((h) => {
        const name = `His ${h.resSeq}`;
        const active = selected === h.residueIndex;
        const judgement = judgements.get(h.residueIndex);
        const verdict: Judgement = h.coordinating ? 'yes' : 'no';
        return (
          <li key={h.residueIndex} className="finder-item" data-active={active ? 'yes' : 'no'} data-testid={`finder-${h.resSeq}`}>
            <div className="finder-head">
              <strong className="finder-name">{name}</strong>
              <button
                type="button"
                className="find-button"
                aria-pressed={active}
                aria-label={`3D 구조에서 찾기: ${name}`}
                onClick={(e) => onFind(h.residueIndex, e.currentTarget)}
                data-testid={`find-${h.resSeq}`}
              >
                <span aria-hidden="true">⌖</span> 찾기
              </button>
            </div>
            {measured.has(h.residueIndex) ? (
              <p className="finder-measure" data-testid={`measure-${h.resSeq}`}>
                Zn²⁺에 가장 가까운 원자 <strong>{atomDisplayName(h.closest.atomName)}</strong>
                <span className="finder-distance">{h.closest.distance.toFixed(2)} Å</span>
              </p>
            ) : (
              <p className="finder-measure pending">[찾기]를 누르면 가장 가까운 원자와 거리가 측정됩니다.</p>
            )}
            <fieldset className="judgement" disabled={locked}>
              <legend>{name}는 Zn²⁺에 직접 배위하는 잔기일까?</legend>
              <div className="judgement-options">
                {(
                  [
                    ['yes', '예 · 직접 배위한다'],
                    ['no', '아니오'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="judgement-option">
                    <input
                      type="radio"
                      name={`judge-${h.residueIndex}`}
                      value={value}
                      checked={judgement === value}
                      onChange={() => onJudge(h.residueIndex, value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {locked ? (
              <p className="finder-verdict" data-match={judgement === verdict ? 'yes' : 'no'} data-testid={`verdict-${h.resSeq}`}>
                측정 결과: <strong>{h.coordinating ? '직접 배위함' : '직접 배위하지 않음'}</strong>
                <span className="finder-match">{judgement === verdict ? '✓ 내 판단과 같음' : '✗ 내 판단과 다름'}</span>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
