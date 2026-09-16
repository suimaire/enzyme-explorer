/**
 * Fixed-column PDB reader.
 *
 * Adapted from the parser in the Protein 3D Explorer project (same author), with one substantive change:
 * water molecules are kept rather than discarded, because the solvent position bound to the catalytic zinc
 * is part of what Module 02 is about. Hetero groups (the Zn²⁺ ion here) are kept as their own residues.
 *
 * Policy, stated once so nothing downstream has to guess:
 *   - first MODEL only;
 *   - hydrogens and deuteriums are counted and omitted (this entry has none anyway);
 *   - alternate locations: the highest-occupancy conformer of each atom slot is kept, the first listed on
 *     ties, and the residues that had alternates are recorded so the UI can say so;
 *   - coordinates are used exactly as deposited — nothing is recentred, rotated or idealised.
 */

export type Vec3 = [number, number, number];

export type AtomKind = 'polymer' | 'hetero' | 'water';

export type PdbAtom = {
  serial: number;
  name: string;
  element: string;
  resName: string;
  resSeq: number;
  insertionCode: string;
  chain: string;
  altLoc: string;
  occupancy: number;
  bFactor: number;
  position: Vec3;
  kind: AtomKind;
};

export type SecondaryStructure = 'helix' | 'helix310' | 'strand' | 'other';

export type PdbResidue = {
  /** Index into `Structure.residues` — polymer, then hetero, then waters, numbered continuously. */
  index: number;
  resName: string;
  resSeq: number;
  insertionCode: string;
  chain: string;
  /** Indices into `Structure.atoms`. */
  atoms: number[];
  kind: AtomKind;
  secondary: SecondaryStructure;
  /** True when the deposited entry models this residue in more than one conformation. */
  hasAlternates: boolean;
};

/** A deposited LINK record, used to check the coordinate-derived contacts rather than to draw anything. */
export type PdbLink = {
  a: {name: string; resName: string; chain: string; resSeq: number};
  b: {name: string; resName: string; chain: string; resSeq: number};
  distance: number;
};

export type Structure = {
  id: string;
  title: string;
  method: string;
  resolution: number | null;
  chains: string[];
  atoms: PdbAtom[];
  /** Every residue: polymer chain, then hetero groups, then waters. */
  residues: PdbResidue[];
  /** Index ranges into `residues`, so a caller never has to filter by `kind` to walk one category. */
  ranges: {polymer: [number, number]; hetero: [number, number]; water: [number, number]};
  links: PdbLink[];
  omitted: {hydrogens: number; alternateLocations: number; otherChains: number};
};

const column = (line: string, start: number, end: number) => line.slice(start - 1, end).trim();
const WATER = new Set(['HOH', 'DOD', 'WAT']);

/** Residue identity: chain + number + insertion code + name. resSeq alone is not unique across chains. */
export const residueKey = (r: {chain: string; resSeq: number; insertionCode: string; resName: string}) =>
  `${r.chain}:${r.resSeq}${r.insertionCode}:${r.resName}`;

const atomSlotKey = (a: PdbAtom) => `${a.chain}:${a.resSeq}${a.insertionCode}:${a.name}`;

function atomOf(line: string, kind: AtomKind): PdbAtom {
  const name = column(line, 13, 16);
  return {
    serial: Number(column(line, 7, 11)),
    name,
    element: (column(line, 77, 78) || name.replace(/[^A-Z]/g, '')[0] || '?').toUpperCase(),
    resName: column(line, 18, 20),
    resSeq: Number(column(line, 23, 26)),
    insertionCode: column(line, 27, 27),
    chain: column(line, 22, 22),
    altLoc: column(line, 17, 17),
    occupancy: Number(column(line, 55, 60)),
    bFactor: Number(column(line, 61, 66)),
    position: [Number(column(line, 31, 38)), Number(column(line, 39, 46)), Number(column(line, 47, 54))],
    kind,
  };
}

/** Lines of the first model only. */
function firstModel(text: string): string[] {
  const out: string[] = [];
  let models = 0;
  for (const line of text.split(/\r?\n/)) {
    const record = column(line, 1, 6);
    if (record === 'MODEL') {
      models++;
      continue;
    }
    if (record === 'ENDMDL' && models >= 1) break;
    out.push(line);
  }
  return out;
}

type Range = {chain: string; start: number; end: number; type: SecondaryStructure};

function secondaryRanges(lines: string[]): Range[] {
  const ranges: Range[] = [];
  for (const line of lines) {
    const record = column(line, 1, 6);
    if (record === 'HELIX')
      ranges.push({
        chain: column(line, 20, 20),
        start: Number(column(line, 22, 25)),
        end: Number(column(line, 34, 37)),
        type: Number(column(line, 39, 40)) === 5 ? 'helix310' : 'helix',
      });
    if (record === 'SHEET')
      ranges.push({chain: column(line, 22, 22), start: Number(column(line, 23, 26)), end: Number(column(line, 34, 37)), type: 'strand'});
  }
  return ranges;
}

/** Deposited HELIX/SHEET records, matched by chain and residue-number range. Helix records take precedence. */
function assignSecondary(residues: PdbResidue[], ranges: Range[]): void {
  for (const r of residues) {
    const inside = (x: Range) => x.chain === r.chain && r.resSeq >= x.start && r.resSeq <= x.end;
    const helix = ranges.find((x) => x.type !== 'strand' && inside(x));
    if (helix) r.secondary = helix.type;
    else if (ranges.some((x) => x.type === 'strand' && inside(x))) r.secondary = 'strand';
  }
}

/** Consecutive atoms sharing a residue identity form one residue. */
function groupResidues(atoms: PdbAtom[], atomOffset: number, indexOffset: number, alternates: Set<string>): PdbResidue[] {
  const residues: PdbResidue[] = [];
  let last = '';
  atoms.forEach((atom, i) => {
    const key = residueKey(atom);
    let residue = residues.at(-1);
    if (!residue || key !== last) {
      residue = {
        index: indexOffset + residues.length,
        resName: atom.resName,
        resSeq: atom.resSeq,
        insertionCode: atom.insertionCode,
        chain: atom.chain,
        atoms: [],
        kind: atom.kind,
        secondary: 'other',
        hasAlternates: alternates.has(key),
      };
      residues.push(residue);
      last = key;
    }
    residue.atoms.push(atomOffset + i);
  });
  return residues;
}

function parseHeader(lines: string[]) {
  let title = '';
  let method = '';
  let resolution: number | null = null;
  const links: PdbLink[] = [];
  for (const line of lines) {
    const record = column(line, 1, 6);
    if (record === 'TITLE') title += (title ? ' ' : '') + column(line, 11, 80);
    else if (record === 'EXPDTA') method ||= column(line, 11, 79);
    else if (record === 'LINK') {
      const side = (offset: number) => ({
        name: column(line, 13 + offset, 16 + offset),
        resName: column(line, 18 + offset, 20 + offset),
        chain: column(line, 22 + offset, 22 + offset),
        resSeq: Number(column(line, 23 + offset, 26 + offset)),
      });
      links.push({a: side(0), b: side(30), distance: Number(column(line, 74, 78))});
    } else if (record === 'REMARK' && Number(column(line, 8, 10)) === 2) {
      const match = line.slice(11).match(/RESOLUTION\.\s+([\d.]+)\s+ANGSTROMS/);
      if (match) resolution = Number(match[1]);
    }
  }
  return {title, method, resolution, links};
}

/**
 * Reads one chain of a structure, keeping its hetero groups and waters.
 * `chain` selects the polymer chain; hetero groups and waters of that chain are kept with it.
 */
export function parseStructure(text: string, chain = 'A'): Structure {
  const lines = firstModel(text);
  const id = column(text.split(/\r?\n/, 1)[0] ?? '', 63, 66);
  const omitted = {hydrogens: 0, alternateLocations: 0, otherChains: 0};
  const alternates = new Set<string>();
  const slots = new Map<string, PdbAtom>();

  for (const line of lines) {
    const record = column(line, 1, 6);
    if (record !== 'ATOM' && record !== 'HETATM') continue;
    if (column(line, 22, 22) !== chain) {
      omitted.otherChains++;
      continue;
    }
    const resName = column(line, 18, 20);
    const kind: AtomKind = record === 'ATOM' ? 'polymer' : WATER.has(resName) ? 'water' : 'hetero';
    const atom = atomOf(line, kind);
    if (atom.element === 'H' || atom.element === 'D') {
      omitted.hydrogens++;
      continue;
    }
    if (atom.altLoc) alternates.add(residueKey(atom));
    const key = atomSlotKey(atom);
    const previous = slots.get(key);
    if (!previous) {
      slots.set(key, atom);
      continue;
    }
    omitted.alternateLocations++;
    if (atom.occupancy > previous.occupancy) slots.set(key, atom);
  }

  const all = [...slots.values()];
  const polymerAtoms = all.filter((a) => a.kind === 'polymer');
  const heteroAtoms = all.filter((a) => a.kind === 'hetero');
  const waterAtoms = all.filter((a) => a.kind === 'water');
  const atoms = [...polymerAtoms, ...heteroAtoms, ...waterAtoms];

  const polymer = groupResidues(polymerAtoms, 0, 0, alternates);
  const hetero = groupResidues(heteroAtoms, polymerAtoms.length, polymer.length, alternates);
  const water = groupResidues(waterAtoms, polymerAtoms.length + heteroAtoms.length, polymer.length + hetero.length, alternates);
  assignSecondary(polymer, secondaryRanges(lines));

  const header = parseHeader(lines);
  return {
    id,
    title: header.title,
    method: header.method,
    resolution: header.resolution,
    chains: [chain],
    atoms,
    residues: [...polymer, ...hetero, ...water],
    ranges: {
      polymer: [0, polymer.length],
      hetero: [polymer.length, polymer.length + hetero.length],
      water: [polymer.length + hetero.length, polymer.length + hetero.length + water.length],
    },
    links: header.links,
    omitted,
  };
}

/** Residues of one category, as a slice of `structure.residues`. */
export const residuesOfKind = (structure: Structure, kind: AtomKind): PdbResidue[] =>
  structure.residues.slice(...structure.ranges[kind === 'polymer' ? 'polymer' : kind === 'hetero' ? 'hetero' : 'water']);

export const BACKBONE_NAMES = new Set(['N', 'CA', 'C', 'O', 'OXT']);
export const isSideChainAtom = (atom: PdbAtom): boolean => !BACKBONE_NAMES.has(atom.name);

/** "His 64" — a residue label for the UI, from the deposited three-letter name. */
export const residueLabel = (r: PdbResidue): string =>
  `${r.resName[0]}${r.resName.slice(1).toLowerCase()} ${r.resSeq}${r.insertionCode}`;
