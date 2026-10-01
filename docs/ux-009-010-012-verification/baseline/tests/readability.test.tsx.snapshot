import {describe, expect, it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EnergyDiagram, ENERGY_TEXT_COLORS, PATHWAY_COLORS} from '../src/modules/reaction-energy/EnergyDiagram';
import {reactionEnergyProfile} from '../src/modules/reaction-energy/energyProfile';
import {MichaelisMentenPlot} from '../src/modules/kinetics/MichaelisMentenPlot';
import {ProgressCurvePlot} from '../src/modules/kinetics/ProgressCurvePlot';

function contrastOnWhite(hex: string) {
  const rgb = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = rgb.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return 1.05 / (.2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2] + .05);
}

describe('UX-006 text contrast without replacing pathway colors', () => {
  it.each(Object.entries(ENERGY_TEXT_COLORS))('%s text exceeds the normal-text contrast minimum', (_name, color) => {
    expect(contrastOnWhite(color)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps neutral barrier, blue catalyst and gold ΔG distinct from the original lines', () => {
    expect(PATHWAY_COLORS).toEqual({uncatalyzed: '#6b7a85', catalyzed: '#15618f', level: '#a8761c'});
    expect(new Set(Object.values(ENERGY_TEXT_COLORS)).size).toBe(3);
    expect(ENERGY_TEXT_COLORS.uncatalyzed).not.toBe(PATHWAY_COLORS.uncatalyzed);
    expect(ENERGY_TEXT_COLORS.level).not.toBe(PATHWAY_COLORS.level);
    const profile = reactionEnergyProfile({productEnergy: 30, barrierTop: 55, barrierLowering: 20, enzyme: true});
    const html = renderToStaticMarkup(<EnergyDiagram profile={profile} />);
    for (const color of Object.values(ENERGY_TEXT_COLORS)) expect(html).toContain(`fill="${color}"`);
    expect(html).toContain('정반응 35');
    expect(html).toContain('역반응 5');
    expect(html).toContain('role="img"');
    expect(html).toContain('정반응 장벽 35');
  });
});

describe('UX-007 graph annotations retain meaning and units', () => {
  it('exposes both MM guide annotations and the common typography roles', () => {
    const html = renderToStaticMarkup(<MichaelisMentenPlot parameters={{km: 300, kcat: 60, enzymeTotal: 5}}
      baseline={{km: 75, kcat: 20, enzymeTotal: 5}} currentSubstrate={600} velocityAxisMax={330}
      showVmaxGuide showKmGuide assays={[]} />);
    expect(html).toContain('class="chart-key"');
    expect(html).toContain('[S] = Km = 300 µM');
    expect(html).toContain('Vmax = 300 nM·s⁻¹');
    expect(html).toContain('v₀ (nM·s⁻¹)');
    expect(html).toContain('기준 곡선');
  });
  it('keeps the measurement annotation in a reserved header when the tangent is present', () => {
    const html = renderToStaticMarkup(<ProgressCurvePlot initialSubstrate={50}
      samples={[{time: 0, product: 0, substrate: 50}, {time: 700, product: 25, substrate: 25}]}
      tangent={[{time: 0, product: 0}, {time: 700, product: 28}]} />);
    expect(html).toContain('초기 속도 (t = 0에서의 접선)');
    expect(html).toContain('class="chart-key"');
    expect(html).toContain('[P] (µM)');
    expect(html).toContain('시간 (s)');
  });
});
