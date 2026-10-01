import {describe, expect, it} from 'vitest';
import {
  calculateV0,
  calculateVmax,
  generateMichaelisMentenCurve,
  halfSaturationSubstrate,
  michaelisMentenModel,
  saturationFraction,
} from '../src/kinetics/michaelisMenten';
import type {MichaelisMentenParameters} from '../src/kinetics/types';
import {PREPARATION} from '../src/modules/kinetics/KineticsLab';

const P: MichaelisMentenParameters = PREPARATION;
const SETS: MichaelisMentenParameters[] = [
  P,
  {km: 10, kcat: 2, enzymeTotal: 1},
  {km: 300, kcat: 60, enzymeTotal: 20},
  {km: 45.5, kcat: 7.25, enzymeTotal: 0.4},
];
const SUBSTRATES = [0, 1, 10, 25, 50, 75, 100, 250, 500, 600, 5000];

describe('Michaelis–Menten core', () => {
  it('1 · v0 = Vmax/2 exactly at [S] = Km, for every parameter set', () => {
    for (const p of SETS) {
      expect(halfSaturationSubstrate(p)).toBe(p.km);
      expect(calculateV0(p, p.km)).toBeCloseTo(calculateVmax(p) / 2, 12);
      expect(saturationFraction(p, p.km)).toBeCloseTo(0.5, 15);
    }
  });

  it('2 · doubling [E]T doubles Vmax and leaves Km untouched', () => {
    for (const p of SETS) {
      const doubled = {...p, enzymeTotal: p.enzymeTotal * 2};
      expect(calculateVmax(doubled)).toBeCloseTo(2 * calculateVmax(p), 12);
      expect(doubled.km).toBe(p.km);
      expect(halfSaturationSubstrate(doubled)).toBe(halfSaturationSubstrate(p));
    }
  });

  it('3 · doubling [E]T doubles v0 at every [S], with Km and kcat unchanged', () => {
    for (const p of SETS) {
      const doubled = {...p, enzymeTotal: p.enzymeTotal * 2};
      for (const s of SUBSTRATES) {
        if (s === 0) {
          expect(calculateV0(doubled, s)).toBe(0);
          continue;
        }
        expect(calculateV0(doubled, s) / calculateV0(p, s)).toBeCloseTo(2, 12);
      }
    }
  });

  it('4 · changing Km does not change Vmax, and moves the half-maximal point with it', () => {
    for (const p of SETS)
      for (const km of [5, 40, 120, 480]) {
        const changed = {...p, km};
        expect(calculateVmax(changed)).toBe(calculateVmax(p));
        expect(calculateV0(changed, km)).toBeCloseTo(calculateVmax(p) / 2, 12);
        // The half-maximal point really moved: at the old Km the new curve is no longer at half maximum.
        if (km !== p.km) expect(calculateV0(changed, p.km)).not.toBeCloseTo(calculateVmax(p) / 2, 6);
      }
  });

  it('5 · Vmax = kcat[E]T with consistent units: s⁻¹ × nM = nM·s⁻¹', () => {
    // 20 s⁻¹ × 5 nM = 100 nM·s⁻¹, and the same numbers scale linearly in each factor.
    expect(calculateVmax({km: 75, kcat: 20, enzymeTotal: 5})).toBe(100);
    expect(calculateVmax({km: 75, kcat: 40, enzymeTotal: 5})).toBe(200);
    expect(calculateVmax({km: 75, kcat: 20, enzymeTotal: 10})).toBe(200);
    expect(calculateVmax({km: 75, kcat: 0, enzymeTotal: 5})).toBe(0);
    for (const p of SETS) expect(calculateVmax(p)).toBeCloseTo(p.kcat * p.enzymeTotal, 12);
  });

  it('6 · the curve is monotonically increasing, bounded by Vmax, and approaches it', () => {
    for (const p of SETS) {
      const vmax = calculateVmax(p);
      const curve = generateMichaelisMentenCurve(p, 600, 200);
      expect(curve[0]).toEqual({substrate: 0, velocity: 0});
      expect(curve.at(-1)!.substrate).toBeCloseTo(600, 12);
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].velocity).toBeGreaterThanOrEqual(curve[i - 1].velocity);
        expect(curve[i].velocity).toBeLessThan(vmax + 1e-12);
      }
      // Never reached at a finite substrate concentration, but approached.
      expect(calculateV0(p, 1e9)).toBeLessThan(vmax);
      expect(calculateV0(p, 1e9) / vmax).toBeGreaterThan(0.999);
    }
  });

  it('7 · below Km the response is near-proportional, above it near-saturated', () => {
    for (const p of SETS) {
      const vmax = calculateVmax(p);
      const low = p.km / 100;
      // [S] << Km: doubling [S] nearly doubles v0.
      expect(calculateV0(p, 2 * low) / calculateV0(p, low)).toBeGreaterThan(1.97);
      // [S] >> Km: 10 × Km is already past 90% of Vmax.
      expect(calculateV0(p, 10 * p.km) / vmax).toBeGreaterThan(0.9);
    }
  });

  it('8 · the model boundary reports the same numbers as the bare functions', () => {
    const model = michaelisMentenModel(P);
    expect(model.vmax).toBe(calculateVmax(P));
    for (const s of SUBSTRATES) expect(model.velocity(s)).toBe(calculateV0(P, s));
  });

  it('9 · invalid parameters are rejected rather than producing a silent NaN', () => {
    expect(() => calculateVmax({km: 0, kcat: 1, enzymeTotal: 1})).toThrow(RangeError);
    expect(() => calculateVmax({km: -1, kcat: 1, enzymeTotal: 1})).toThrow(RangeError);
    expect(() => calculateVmax({km: 1, kcat: -1, enzymeTotal: 1})).toThrow(RangeError);
    expect(() => calculateVmax({km: 1, kcat: 1, enzymeTotal: -1})).toThrow(RangeError);
    expect(() => calculateV0(P, -5)).toThrow(RangeError);
    expect(() => generateMichaelisMentenCurve(P, 0)).toThrow(RangeError);
    expect(() => generateMichaelisMentenCurve(P, 100, 1)).toThrow(RangeError);
  });
});
