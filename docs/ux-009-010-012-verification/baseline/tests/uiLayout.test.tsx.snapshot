import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {PerspectiveCamera, Vector3} from 'three';
import {ModuleNavigation} from '../src/app/ModuleNavigation';
import {MODULES, hashFor, moduleFromHash} from '../src/app/modules';
import {StructureResults} from '../src/modules/regulation/StructureResults';
import {deriveRegulation} from '../src/modules/regulation/model';
import {parseStructure} from '../src/viewer/pdb/parsePdb';
import {domainOf} from '../src/modules/regulation/structureSource';
import {fitSelection} from '../src/viewer/rendering/fitSelection';

describe('compact module navigation', () => {
  it.each(MODULES)('preserves the $id route and active link semantics', ({id}) => {
    const html = renderToStaticMarkup(<ModuleNavigation current={id} navigate={() => {}} />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(`href="${hashFor(id)}" aria-current="page"`);
    expect(moduleFromHash(hashFor(id))).toBe(id);
    for (const module of MODULES) expect(html).toContain(`href="${hashFor(module.id)}"`);
    expect(html.match(/<a /g)).toHaveLength(7);
    expect(html).not.toContain('tabindex="-1"');
  });
});

describe('structure result strip', () => {
  it('shows a pending comparison without exposing answers', () => {
    const html = renderToStaticMarkup(<StructureResults result={null} step={0} clamped={false} onPathway={() => {}} />);
    expect(html).toContain('아직 호르몬 신호를 비교하지 않았습니다.');
    expect(html).not.toContain('data-testid="reg-results"');
  });
  it.each(['insulinDominant', 'glucagonDominant'] as const)('retains all downstream results and staged disclosure for %s', scenario => {
    const result = deriveRegulation(scenario, {mode: 'clamped', level: 'high'});
    for (const step of [1, 2, 3, 4, 5]) {
      const html = renderToStaticMarkup(<StructureResults result={result} step={step} clamped onPathway={() => {}} />);
      expect(html.includes(result.pfk2)).toBe(step >= 3);
      expect(html.includes(result.glycolysis)).toBe(step >= 5);
      if (step === 5) {
        for (const text of [result.pfk1, result.fbpase1, result.glycolysis, result.gluconeogenesis, 'reg-result-predicted', 'reg-result-applied', '실제 대사속도나 혈당을 계산하지 않습니다']) expect(html).toContain(text);
      }
    }
  });
});

describe('coordinate-based structure framing', () => {
  const structure = parseStructure(readFileSync(new URL('../src/data/regulation/1K6M-assembly1-protein.pdb', import.meta.url), 'utf8'), '*');
  const direction = new Vector3(.35, .2, 1).normalize();
  const up = new Vector3(0, 1, 0);
  it.each(['dimer', 'chain', 'pfk2', 'fbpase2'])('frames %s at desktop and portrait aspect ratios', focus => {
    const points = structure.residues.filter(r => (focus === 'dimer' || r.chain === 'A') && (focus === 'dimer' || focus === 'chain' || domainOf(r) === focus)).flatMap(r => r.atoms).map(i => new Vector3(...structure.atoms[i].position));
    for (const aspect of [1.85, .7]) {
      const {target, distance} = fitSelection(points, direction, up, aspect, 36);
      const camera = new PerspectiveCamera(36, aspect, .5, 900);
      camera.position.copy(target).addScaledVector(direction, distance);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      const projected = points.map(p => p.clone().project(camera));
      const x = projected.map(p => p.x), y = projected.map(p => p.y);
      const width = (Math.max(...x) - Math.min(...x)) / 2;
      const height = (Math.max(...y) - Math.min(...y)) / 2;
      expect(Math.max(...x.map(Math.abs), ...y.map(Math.abs))).toBeLessThan(.85);
      expect(Math.max(width, height)).toBeGreaterThan(.79);
      if (aspect > 1 && focus === 'dimer') expect(height).toBeGreaterThan(.79);
    }
  });
});
