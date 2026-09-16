import type {PdbResidue, Structure, Vec3} from '../pdb/parsePdb';

/** Euclidean distance between two deposited positions, Å. */
export const distance = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** One measured atom-to-atom contact. All distances in this app are computed here, from coordinates. */
export type Contact = {
  /** Index into `Structure.atoms` of the partner atom. */
  atomIndex: number;
  /** Index into `Structure.residues` of the residue the partner atom belongs to. */
  residueIndex: number;
  atomName: string;
  distance: number;
};

/** Residue index of every atom, for turning an atom hit into a residue. */
export function residueOfAtom(structure: Structure): Int32Array {
  const map = new Int32Array(structure.atoms.length).fill(-1);
  for (const r of structure.residues) for (const a of r.atoms) map[a] = r.index;
  return map;
}

/**
 * Every atom within `cutoff` Å of `fromAtom`, nearest first. `accept` restricts the search — for example to
 * the nitrogen and oxygen atoms that could coordinate a metal — so the caller states its chemistry explicitly
 * rather than relying on the cutoff alone to do the filtering.
 */
export function contactsWithin(
  structure: Structure,
  fromAtom: number,
  cutoff: number,
  accept: (atomIndex: number) => boolean,
  ownerOfAtom = residueOfAtom(structure),
): Contact[] {
  const origin = structure.atoms[fromAtom].position;
  const found: Contact[] = [];
  for (let i = 0; i < structure.atoms.length; i++) {
    if (i === fromAtom || !accept(i)) continue;
    const d = distance(origin, structure.atoms[i].position);
    if (d <= cutoff) found.push({atomIndex: i, residueIndex: ownerOfAtom[i], atomName: structure.atoms[i].name, distance: d});
  }
  return found.sort((a, b) => a.distance - b.distance);
}

/** Closest approach between one atom and any atom of a residue — the shortest measurable distance between them. */
export function closestApproach(structure: Structure, fromAtom: number, residue: PdbResidue): Contact {
  const origin = structure.atoms[fromAtom].position;
  let best: Contact | null = null;
  for (const i of residue.atoms) {
    const d = distance(origin, structure.atoms[i].position);
    if (!best || d < best.distance) best = {atomIndex: i, residueIndex: residue.index, atomName: structure.atoms[i].name, distance: d};
  }
  if (!best) throw new Error(`Residue ${residue.resName} ${residue.resSeq} has no atoms`);
  return best;
}

/** Geometric centre of a set of atoms, used for camera targets. */
export function centroid(structure: Structure, atoms: readonly number[]): Vec3 {
  const sum: Vec3 = [0, 0, 0];
  for (const i of atoms) {
    const p = structure.atoms[i].position;
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }
  const n = Math.max(atoms.length, 1);
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}
