import * as T from 'three';
import type {PdbAtom, PdbResidue} from '../pdb/parsePdb';

const SAMPLES = 8;
const SEGMENTS = 10;

/**
 * Cartoon tube through the actual Cα coordinates of one continuous run of residues; the cross-section width
 * follows the deposited HELIX/SHEET records. Adapted from the ribbon builder in the Protein 3D Explorer
 * project. `vertexResidue` holds each vertex's residue index so a ribbon hit can be resolved to a residue.
 *
 * The caller passes one run at a time, so a gap in the model never draws a tube through empty space.
 */
export function ribbonGeometry(
  residues: PdbResidue[],
  atoms: PdbAtom[],
  positions: T.Vector3[],
  colorOf: (residue: PdbResidue) => number,
): {geometry: T.BufferGeometry; vertexResidue: number[]} {
  const n = residues.length;
  const ca = residues.map((r) => positions[r.atoms.find((i) => atoms[i].name === 'CA')!]);
  const guide = residues.map((r, i) => {
    const c = r.atoms.find((j) => atoms[j].name === 'C');
    const o = r.atoms.find((j) => atoms[j].name === 'O');
    return c !== undefined && o !== undefined
      ? positions[o].clone().sub(positions[c])
      : ca[Math.min(i + 1, n - 1)].clone().sub(ca[Math.max(i - 1, 0)]).cross(new T.Vector3(0, 0, 1));
  });
  const curve = new T.CatmullRomCurve3(ca, false, 'centripetal');
  const size = (i: number, frac: number): [number, number] => {
    const ss = residues[i].secondary;
    const nextIsStrand = i + 1 < n && residues[i + 1].secondary === 'strand';
    if (ss === 'strand' && !nextIsStrand) return [2.4 * (1 - frac) + 0.25, 0.34];
    if (ss === 'strand') return [1.6, 0.34];
    if (ss === 'helix') return [1.5, 0.32];
    if (ss === 'helix310') return [1.1, 0.3];
    return [0.5, 0.5];
  };

  const rings = (n - 1) * SAMPLES + 1;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const index: number[] = [];
  const vertexResidue: number[] = [];
  // Consecutive carbonyl vectors alternate along a helix; flipping them keeps the ribbon from twisting 180°.
  const flipped = guide.map(() => 1);
  for (let i = 1; i < n; i++) if (guide[i].dot(guide[i - 1]) * flipped[i - 1] < 0) flipped[i] = -1;
  let previous: T.Vector3 | null = null;

  for (let s = 0; s < rings; s++) {
    const t = s / (rings - 1);
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const u = t * (n - 1);
    const i = Math.min(Math.floor(u), n - 1);
    const frac = u - i;
    const j = Math.min(i + 1, n - 1);
    const g = guide[i].clone().multiplyScalar(flipped[i]).lerp(guide[j].clone().multiplyScalar(flipped[j]), frac);
    let normal = g.sub(tangent.clone().multiplyScalar(g.dot(tangent)));
    if (normal.lengthSq() < 1e-6) normal = previous?.clone() ?? new T.Vector3(0, 0, 1).cross(tangent);
    normal.normalize();
    if (previous && normal.dot(previous) < 0) normal.negate();
    previous = normal.clone();
    const binormal = tangent.clone().cross(normal).normalize();
    const ri = Math.round(u);
    const [w0, h0] = size(i, frac);
    const [w1, h1] = size(j, 0);
    const arrow = residues[i].secondary === 'strand' && residues[j].secondary !== 'strand';
    const blend = arrow || residues[i].secondary === residues[j].secondary || frac < 0.5 ? 0 : (frac - 0.5) * 2;
    const w = (w0 + (w1 - w0) * blend) / 2;
    const h = (h0 + (h1 - h0) * blend) / 2;
    const color = new T.Color(colorOf(residues[ri]));
    for (let k = 0; k < SEGMENTS; k++) {
      const a = (k / SEGMENTS) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      pos.push(...p.clone().addScaledVector(normal, c * w).addScaledVector(binormal, sn * h).toArray());
      nor.push(...normal.clone().multiplyScalar(c / w).addScaledVector(binormal, sn / h).normalize().toArray());
      col.push(color.r, color.g, color.b);
      vertexResidue.push(residues[ri].index);
    }
    if (s > 0)
      for (let k = 0; k < SEGMENTS; k++) {
        const a = (s - 1) * SEGMENTS + k;
        const b = (s - 1) * SEGMENTS + ((k + 1) % SEGMENTS);
        index.push(a, a + SEGMENTS, b, b, a + SEGMENTS, b + SEGMENTS);
      }
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geometry.setIndex(index);
  return {geometry, vertexResidue};
}

/**
 * Splits a polymer chain into runs that can be drawn as one continuous tube.
 *
 * Continuity is decided by geometry — same chain, a Cα present, and a Cα–Cα distance consistent with a
 * peptide bond (about 3.8 Å) — and deliberately not by residue numbering. Entries often skip a number
 * without any break in the chain; PDB 2CBA is one, since carbonic anhydrase II numbering has no residue 126
 * while the chain runs straight through. Keying on numbers would put a false seam in the ribbon there.
 *
 * A run of fewer than two residues is dropped, since a tube needs a start and an end.
 */
export function ribbonRuns(residues: PdbResidue[], atoms: PdbAtom[], positions: T.Vector3[], maxCaGap = 4.5): PdbResidue[][] {
  const runs: PdbResidue[][] = [];
  let current: PdbResidue[] = [];
  const caOf = (r: PdbResidue) => r.atoms.find((i) => atoms[i].name === 'CA');
  for (const residue of residues) {
    const ca = caOf(residue);
    if (ca === undefined) {
      if (current.length > 1) runs.push(current);
      current = [];
      continue;
    }
    const previous = current.at(-1);
    const continuous =
      previous !== undefined && previous.chain === residue.chain && positions[caOf(previous)!].distanceTo(positions[ca]) <= maxCaGap;
    if (previous && !continuous) {
      if (current.length > 1) runs.push(current);
      current = [];
    }
    current.push(residue);
  }
  if (current.length > 1) runs.push(current);
  return runs;
}
