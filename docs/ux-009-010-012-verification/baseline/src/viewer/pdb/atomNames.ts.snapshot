/**
 * Student-facing names for PDB atom names.
 *
 * PDB files spell the Greek position letters of an amino-acid side chain with Latin capitals (CA = Cα,
 * ND1 = Nδ1, NE2 = Nε2). The viewer keeps the file's name next to the Greek form, so a student can match what
 * the app says to what the file says. Only the naming changes; which atom is meant is never reinterpreted.
 */

const GREEK: Record<string, string> = {A: 'α', B: 'β', G: 'γ', D: 'δ', E: 'ε', Z: 'ζ', H: 'η'};

/** Backbone atoms have no Greek position letter. */
const BACKBONE: Record<string, string> = {N: 'N (주사슬)', C: 'C (주사슬)', O: 'O (주사슬)', OXT: 'OXT (주사슬)'};

/** Greek form of a side-chain atom name without the PDB name, e.g. "NE2" → "Nε2". Unknown names are returned unchanged. */
export function greekAtomName(name: string): string {
  const match = /^([CNOS])([ABGDEZH])(\d?)$/.exec(name);
  return match ? `${match[1]}${GREEK[match[2]]}${match[3]}` : name;
}

/** Greek form followed by the PDB name, e.g. "NE2" → "Nε2 (NE2)", "N" → "N (주사슬)". */
export function atomDisplayName(name: string): string {
  if (BACKBONE[name]) return BACKBONE[name];
  const greek = greekAtomName(name);
  return greek === name ? name : `${greek} (${name})`;
}
