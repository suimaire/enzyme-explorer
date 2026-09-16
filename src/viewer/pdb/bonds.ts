import {COVALENT_RADII, isMetal} from './elements';
import {distance} from '../measurements/distance';
import type {Structure} from './parsePdb';

/**
 * Covalent bonds inferred from heavy-atom distances: within a residue, plus the peptide bond C(i)–N(i+1)
 * inside one chain. Adapted from the bond inference in the Protein 3D Explorer project.
 *
 * Metals are excluded: `COVALENT_RADII` has no entry for Zn, so no Zn–ligand stick is ever produced. Metal
 * coordination is shown as a measured distance instead, which is what the coordinates actually support.
 * Waters are single atoms and produce no bonds either way.
 */
export function inferBonds(structure: Structure, tolerance = 0.45): [number, number][] {
  const bonds: [number, number][] = [];
  const bondable = (i: number) => {
    const element = structure.atoms[i].element;
    return !isMetal(element) && COVALENT_RADII[element] !== undefined;
  };
  structure.residues.forEach((residue, position) => {
    const atoms = residue.atoms.filter(bondable);
    for (let x = 0; x < atoms.length; x++)
      for (let y = x + 1; y < atoms.length; y++) {
        const a = structure.atoms[atoms[x]];
        const b = structure.atoms[atoms[y]];
        if (distance(a.position, b.position) <= COVALENT_RADII[a.element] + COVALENT_RADII[b.element] + tolerance)
          bonds.push([atoms[x], atoms[y]]);
      }
    const next = structure.residues[position + 1];
    if (!next || next.kind !== 'polymer' || residue.kind !== 'polymer' || next.chain !== residue.chain) return;
    const c = residue.atoms.find((i) => structure.atoms[i].name === 'C');
    const n = next.atoms.find((i) => structure.atoms[i].name === 'N');
    if (c === undefined || n === undefined) return;
    if (distance(structure.atoms[c].position, structure.atoms[n].position) <= COVALENT_RADII.C + COVALENT_RADII.N + tolerance)
      bonds.push([c, n]);
  });
  return bonds;
}
