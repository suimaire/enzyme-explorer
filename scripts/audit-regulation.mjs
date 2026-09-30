// Offline, reproducible audit. Reads downloaded data only; never downloads or executes code.
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {URL} from 'node:url';
import console from 'node:console';
const root = new URL('../src/data/regulation/', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const cif = read('1K6M.cif');
const pdb = read('1K6M.pdb');
const uni = JSON.parse(read('P16118.json'));
const sequence = cif.match(/_entity_poly\.pdbx_seq_one_letter_code_can\s*\n;([\s\S]*?)\n;/)[1].replace(/\s/g, '');
const differences = [...sequence].flatMap((aa, i) => aa === uni.sequence.value[i + 39] ? [] : [{canonical: i + 40, auth: i + 39, label: i + 1, reference: uni.sequence.value[i + 39], deposited: aa}]);
const lines = pdb.split(/\r?\n/);
const atoms = lines.filter(l => l.startsWith('ATOM  ') && l[21] === 'A');
const residueNumbers = [...new Set(atoms.map(l => Number(l.slice(22, 26))))];
if (sequence.length !== 432 || residueNumbers.length !== 432 || residueNumbers[0] !== 39 || residueNumbers.at(-1) !== 470) throw Error('Unexpected coordinate mapping');
if (!cif.includes('1 1,2 A,C,D,E,I') || !cif.includes('-1.0954984649') || !cif.includes('89.6633078975')) throw Error('Re-audit assembly operators');
// Assembly 1 = original A + operator 2(A), NOT deposited A+B. New chain C denotes symmetry mate.
const transform = [[-1, 0, 0, -1.0954984649], [0, 1, 0, 0], [0, 0, -1, 89.6633078975]];
const copies = atoms.map((l, i) => {
  const p = [Number(l.slice(30, 38)), Number(l.slice(38, 46)), Number(l.slice(46, 54))];
  const xyz = transform.map(row => (row[0]*p[0] + row[1]*p[1] + row[2]*p[2] + row[3]).toFixed(3).padStart(8)).join('');
  return l.slice(0, 6) + String(atoms.length + i + 1).padStart(5) + l.slice(11, 21) + 'C' + l.slice(22, 30) + xyz + l.slice(54);
});
const secondary = lines.filter(l => (l.startsWith('HELIX ') && l[19] === 'A') || (l.startsWith('SHEET ') && l[21] === 'A'));
const secondaryCopy = secondary.map(l => {
  const chars = [...l];
  for (const i of l.startsWith('HELIX ') ? [19, 31] : [21, 32, 49, 64]) if (chars[i] === 'A') chars[i] = 'C';
  return chars.join('');
});
const processed = ['HEADER    PFKFB1 ASSEMBLY 1 PROTEIN ONLY', 'TITLE     1K6M A AND OPERATOR 2(A); AUTH NUMBERING; NO LIGANDS', ...secondary, ...secondaryCopy, ...atoms, 'TER', ...copies, 'TER', 'END', ''].join('\n');
writeFileSync(new URL('1K6M-assembly1-protein.pdb', root), processed);
const sourceUrls = {
  '1K6M.cif': 'https://files.rcsb.org/download/1K6M.cif',
  '1K6M.pdb': 'https://files.rcsb.org/download/1K6M.pdb',
  'P16118.json': 'https://rest.uniprot.org/uniprotkb/P16118.json',
  'P47871.json': 'https://rest.uniprot.org/uniprotkb/P47871.json',
  '1k6m-mapping.json': 'https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/1k6m',
  'structure-paper.json': 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:10.1074/jbc.M209105200&format=json&resultType=core',
};
for (const id of ['6323408','1339450','6296099','6455662','6260770','32193322','10749675','8390983','7549867','2158992','15170386','2846551','9211863']) sourceUrls[`PMID-${id}.json`] = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:${id}%20AND%20SRC:MED&format=json&resultType=core`;
const manifest = {
  acquired: '2026-09-30', sourceId: '1K6M', species: 'Homo sapiens', reference: 'P16118-1', tissue: 'liver L form, truncated engineered construct',
  method: 'X-RAY DIFFRACTION', resolutionAngstrom: 2.4,
  entitySequence: sequence, entityLength: 432,
  numbering: {canonical: [40,471], auth: [39,470], label: [1,432], rule: 'canonical = auth + 1 = label + 39'},
  excludedFromConstructCanonical: [[1,39]], unresolvedWithinDepositedEntity: [],
  regulatorySer: {canonical: 33, presentInConstruct: false, coordinate: null, evidence: 'ECO:0000250 (by similarity), UniProtKB P07953'},
  declaredMutationsCanonical: ['W68F','W302F','W323F','D410E'], sequenceDifferences: differences,
  discrepancy: 'H305R (auth 304, label 266) is present in the deposited sequence but absent from SEQADV; origin unverified. Do not call it a fifth confirmed engineered mutation.',
  domains: {source: 'P16118 UniProt Region annotations; functional regions, not a geometric half split', pfk2Canonical: [2,250], fbpase2Canonical: [251,471], pfk2VisibleAuth: [39,249], fbpase2VisibleAuth: [250,470]},
  assembly: {id: 1, oligomer: 'homodimer', sourceChains: ['A'], operators: ['1','2'], outputChains: ['A','C'], operator2: transform, excluded: 'deposited B; all HETATM (AGS, PO4, waters)', coordinatePolicy: 'A unchanged; C is assembly transform rounded to PDB 0.001 Å; no hormone-dependent coordinate changes'},
  files: readdirSync(root).filter(n => n !== 'provenance.json').map(name => ({name, kind: name.includes('assembly1') ? 'processed' : 'source', url: sourceUrls[name] ?? null, sha256: createHash('sha256').update(readFileSync(new URL(name, root))).digest('hex')})),
};
writeFileSync(new URL('provenance.json', root), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({residuesPerChain: residueNumbers.length, differences, assembly: manifest.assembly}, null, 2));
