import {describe, expect, it} from 'vitest';
import {
  assayDuration,
  elapsedTimeForSubstrate,
  generateProgressCurve,
  initialRateTangent,
  measuredInitialVelocity,
} from '../src/kinetics/progressCurve';
import {calculateV0, calculateVmax} from '../src/kinetics/michaelisMenten';
import {NM_PER_UM, type MichaelisMentenParameters} from '../src/kinetics/types';
import {PREPARATION} from '../src/modules/kinetics/KineticsLab';
import {SUBSTRATE_CHOICES} from '../src/modules/kinetics/InitialVelocityPanel';

const SETS: MichaelisMentenParameters[] = [PREPARATION, {km: 10, kcat: 5, enzymeTotal: 2}, {km: 300, kcat: 40, enzymeTotal: 12}];

describe('progress curve', () => {
  it('1 · P(t) never decreases and S(t) never goes negative', () => {
    for (const p of SETS)
      for (const s0 of SUBSTRATE_CHOICES) {
        const samples = generateProgressCurve(p, s0, assayDuration(p, s0), 400);
        for (let i = 1; i < samples.length; i++) {
          expect(samples[i].product).toBeGreaterThanOrEqual(samples[i - 1].product);
          expect(samples[i].substrate).toBeLessThanOrEqual(samples[i - 1].substrate);
          expect(samples[i].substrate).toBeGreaterThanOrEqual(0);
        }
      }
  });

  it('2 · P(t) ≤ S0 at every sample, and S + P is conserved', () => {
    for (const p of SETS)
      for (const s0 of SUBSTRATE_CHOICES) {
        const samples = generateProgressCurve(p, s0, assayDuration(p, s0), 400);
        for (const s of samples) {
          expect(s.product).toBeLessThanOrEqual(s0 + 1e-12);
          expect(s.substrate + s.product).toBeCloseTo(s0, 10);
        }
      }
  });

  it('3 · the slope near t = 0 equals calculateV0 (after the nM → µM conversion)', () => {
    for (const p of SETS)
      for (const s0 of SUBSTRATE_CHOICES) {
        const duration = assayDuration(p, s0);
        const samples = generateProgressCurve(p, s0, duration, 4000);
        const dt = samples[1].time;
        const numericSlope = (samples[1].product - samples[0].product) / dt; // µM·s⁻¹
        const expected = calculateV0(p, s0) / NM_PER_UM;
        // A one-step forward difference is first-order accurate, so it is checked as a relative error and
        // then shown to converge: halving the step must roughly halve the error.
        expect(Math.abs(numericSlope / expected - 1)).toBeLessThan(1e-3);
        const coarse = generateProgressCurve(p, s0, duration, 2000);
        const coarseSlope = (coarse[1].product - coarse[0].product) / coarse[1].time;
        expect(Math.abs(numericSlope - expected)).toBeLessThan(0.6 * Math.abs(coarseSlope - expected));
        expect(measuredInitialVelocity(p, s0)).toBe(calculateV0(p, s0));
      }
  });

  it('4 · the integrator reproduces the closed-form implicit solution Km·ln(S0/S) + (S0 − S) = Vmax·t', () => {
    for (const p of SETS)
      for (const s0 of SUBSTRATE_CHOICES) {
        const duration = assayDuration(p, s0);
        const samples = generateProgressCurve(p, s0, duration, 400);
        const vmax = calculateVmax(p) / NM_PER_UM;
        for (const s of samples.slice(1)) {
          const implied = (p.km * Math.log(s0 / s.substrate) + (s0 - s.substrate)) / vmax;
          // RK4 at this step size is accurate to far better than a plotted pixel.
          expect(implied).toBeCloseTo(s.time, 4);
        }
      }
  });

  it('5 · the assay window really consumes the requested fraction of substrate', () => {
    for (const p of SETS)
      for (const s0 of SUBSTRATE_CHOICES)
        for (const fraction of [0.25, 0.5, 0.8]) {
          const duration = assayDuration(p, s0, fraction);
          const samples = generateProgressCurve(p, s0, duration, 800);
          expect(samples.at(-1)!.product / s0).toBeCloseTo(fraction, 5);
          expect(elapsedTimeForSubstrate(p, s0, s0 * (1 - fraction))).toBeCloseTo(duration, 10);
        }
  });

  it('6 · the real curve always falls below its own initial-rate tangent', () => {
    for (const p of SETS)
      for (const s0 of SUBSTRATE_CHOICES) {
        const duration = assayDuration(p, s0);
        const samples = generateProgressCurve(p, s0, duration, 400);
        const [start, end] = initialRateTangent(p, s0, duration);
        expect(start).toEqual({time: 0, product: 0});
        const slope = end.product / duration;
        expect(slope).toBeCloseTo(calculateV0(p, s0) / NM_PER_UM, 12);
        for (const s of samples.slice(1)) expect(s.product).toBeLessThan(slope * s.time + 1e-9);
        // How far it departs depends on the regime, which is the point of the panel. Below saturation the
        // rate falls off noticeably within the window; at [S]₀ ≫ Km the run is still nearly zero-order and
        // the curve legitimately hugs its own tangent, so no lower bound on the departure applies there.
        if (s0 <= p.km) expect(samples.at(-1)!.product).toBeLessThan(0.95 * slope * duration);
      }
  });

  it('6b · the departure from the tangent grows as [S]₀ falls below Km', () => {
    const p = PREPARATION;
    const shortfall = (s0: number) => {
      const duration = assayDuration(p, s0);
      const samples = generateProgressCurve(p, s0, duration, 400);
      const [, end] = initialRateTangent(p, s0, duration);
      return 1 - samples.at(-1)!.product / end.product;
    };
    const values = [...SUBSTRATE_CHOICES].sort((a, b) => a - b).map(shortfall);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThan(values[i - 1]);
    // At the lowest substrate the initial rate overestimates the window average substantially; at the
    // highest it barely does, because the enzyme stays near saturation throughout the run.
    expect(values[0]).toBeGreaterThan(0.2);
    expect(values.at(-1)!).toBeLessThan(0.05);
  });

  it('7 · invalid arguments are rejected', () => {
    expect(() => generateProgressCurve(PREPARATION, 100, 0)).toThrow(RangeError);
    expect(() => generateProgressCurve(PREPARATION, -1, 10)).toThrow(RangeError);
    expect(() => generateProgressCurve(PREPARATION, 100, 10, 0)).toThrow(RangeError);
    expect(() => elapsedTimeForSubstrate(PREPARATION, 100, 0)).toThrow(RangeError);
    expect(() => elapsedTimeForSubstrate(PREPARATION, 100, 200)).toThrow(RangeError);
    expect(() => assayDuration(PREPARATION, 100, 1)).toThrow(RangeError);
  });
});
