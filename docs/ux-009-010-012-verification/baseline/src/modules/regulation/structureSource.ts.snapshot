import type {PdbResidue} from '../../viewer/pdb/parsePdb';

export const REGULATION_STRUCTURE = {
  id: '1K6M', species: 'Homo sapiens', isoform: 'P16118-1 · liver L construct', resolution: 2.4,
  regulatorySerCanonical: 33, regulatorySerHasCoordinates: false,
  canonicalRange: [40,471], authRange: [39,470], labelRange: [1,432],
  pfk2Canonical: [2,250], fbpase2Canonical: [251,471], assembly: 1,
  sourceChain: 'A', mateChain: 'C',
} as const;
export const canonicalNumber = (auth: number) => auth + 1;
export const labelNumber = (auth: number) => auth - 38;
export function domainOf(residue: Pick<PdbResidue, 'kind' | 'resSeq'>): 'pfk2' | 'fbpase2' | null {
  if (residue.kind !== 'polymer') return null;
  const n = canonicalNumber(residue.resSeq);
  if (n >= 2 && n <= 250) return 'pfk2';
  if (n >= 251 && n <= 471) return 'fbpase2';
  return null;
}
export const DOMAIN_COLORS = {pfk2: 0x16868b, fbpase2: 0x987040, muted: 0xc5cdd4};
