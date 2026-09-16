import {closestApproach, contactsWithin, residueOfAtom, type Contact} from '../../viewer/measurements/distance';
import {isMetal} from '../../viewer/pdb/elements';
import type {PdbResidue, Structure} from '../../viewer/pdb/parsePdb';

/**
 * Active-site analysis of a metalloenzyme, done entirely from the deposited coordinates.
 *
 * Nothing here is keyed to an atom name or a residue number: the metal is found by element, its ligands by
 * measuring distances to candidate donor atoms, and the bound solvent by measuring distances to water
 * oxygens. The module that uses this can then name the residues it finds, and the test suite checks the
 * result against the entry's own LINK records.
 */

/**
 * Upper bound for a direct metal–ligand contact, Å. Zn–N and Zn–O coordination distances in protein
 * structures cluster near 2.0–2.2 Å; 2.6 Å is deliberately tight, so a merely nearby atom is not promoted
 * to a ligand. Anything between this and `SHELL_MAX` is reported as a second-shell neighbour instead.
 */
export const COORDINATION_MAX = 2.6;

/** Distance out to which neighbours are reported for comparison, so the cutoff can be seen to be a real gap. */
export const SHELL_MAX = 6;

/** Radius around the metal within which residues count as "in the active site" for the residue list. */
export const SITE_RADIUS = 12;

/** Elements that can donate a lone pair to a metal in a protein structure. */
const DONOR_ELEMENTS = new Set(['N', 'O', 'S']);

export type SiteResidue = {
  residueIndex: number;
  resName: string;
  resSeq: number;
  /** Shortest distance between any atom of this residue and the metal, Å. */
  closest: Contact;
  /** True when that shortest distance is inside `COORDINATION_MAX` and the closest atom is a donor. */
  coordinating: boolean;
  hasAlternates: boolean;
};

export type ActiveSite = {
  metal: {residueIndex: number; atomIndex: number; element: string; resName: string};
  /** Protein donor atoms directly coordinating the metal, nearest first. */
  ligands: Contact[];
  /** Water oxygens near the metal, nearest first, out to `SHELL_MAX`. */
  waters: Contact[];
  /** The single water oxygen inside `COORDINATION_MAX`, or null if the coordinates do not place one there. */
  boundSolvent: Contact | null;
  /** The nearest water beyond `COORDINATION_MAX`, for comparison with `boundSolvent`. */
  nextWater: Contact | null;
  /** Every histidine with an atom within `SITE_RADIUS` of the metal, nearest first. */
  histidines: SiteResidue[];
};

/** Finds the one metal ion in the structure. Throws if there is not exactly one, rather than guessing. */
function findMetal(structure: Structure) {
  const metals = structure.atoms
    .map((atom, atomIndex) => ({atom, atomIndex}))
    .filter(({atom}) => atom.kind === 'hetero' && isMetal(atom.element));
  if (metals.length !== 1) throw new Error(`Expected exactly one metal ion, found ${metals.length}`);
  const owner = residueOfAtom(structure);
  const {atom, atomIndex} = metals[0];
  return {residueIndex: owner[atomIndex], atomIndex, element: atom.element, resName: atom.resName};
}

export function analyzeActiveSite(structure: Structure): ActiveSite {
  const owner = residueOfAtom(structure);
  const metal = findMetal(structure);
  const atoms = structure.atoms;

  const ligands = contactsWithin(
    structure,
    metal.atomIndex,
    COORDINATION_MAX,
    (i) => atoms[i].kind === 'polymer' && DONOR_ELEMENTS.has(atoms[i].element),
    owner,
  );

  const waters = contactsWithin(structure, metal.atomIndex, SHELL_MAX, (i) => atoms[i].kind === 'water' && atoms[i].element === 'O', owner);
  const boundSolvent = waters.find((w) => w.distance <= COORDINATION_MAX) ?? null;
  const nextWater = waters.find((w) => w.distance > COORDINATION_MAX) ?? null;

  const ligandResidues = new Set(ligands.map((l) => l.residueIndex));
  const histidines: SiteResidue[] = structure.residues
    .slice(...structure.ranges.polymer)
    .filter((r: PdbResidue) => r.resName === 'HIS')
    .map((r) => {
      const closest = closestApproach(structure, metal.atomIndex, r);
      return {
        residueIndex: r.index,
        resName: r.resName,
        resSeq: r.resSeq,
        closest,
        coordinating: ligandResidues.has(r.index),
        hasAlternates: r.hasAlternates,
      };
    })
    .filter((h) => h.closest.distance <= SITE_RADIUS)
    .sort((a, b) => a.closest.distance - b.closest.distance);

  return {metal, ligands, waters, boundSolvent, nextWater, histidines};
}

/**
 * The deposited LINK records that involve the metal, as plain text. Used by the tests to check that the
 * coordinate-derived ligand list agrees with what the depositors recorded — the app itself draws only the
 * measured distances.
 */
export function metalLinks(structure: Structure, metalResName: string) {
  return structure.links.filter((l) => l.a.resName === metalResName || l.b.resName === metalResName);
}
