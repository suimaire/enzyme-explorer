import {describe, expect, it} from 'vitest';
import {
  BARRIER_TOP_RANGE,
  COORDINATE,
  ENERGY_DOMAIN,
  LOWERING_RANGE,
  MIN_BARRIER,
  PRODUCT_RANGE,
  REACTANT_ENERGY,
  RT_298,
  clampTransitionState,
  energyAt,
  pathwayPoints,
  reactionEnergyProfile,
  relativeRateFactor,
} from '../src/modules/reaction-energy/energyProfile';

/** Every slider position the UI can produce, at its own step. */
const range = (r: {min: number; max: number; step: number}) =>
  Array.from({length: Math.round((r.max - r.min) / r.step) + 1}, (_, i) => r.min + i * r.step);
const PRODUCTS = range(PRODUCT_RANGE);
const TOPS = range(BARRIER_TOP_RANGE);
const LOWERINGS = range(LOWERING_RANGE);

describe('reaction energy model', () => {
  it('1 · switching the enzyme on changes neither end-point energy nor ΔG', () => {
    for (const productEnergy of PRODUCTS)
      for (const barrierTop of TOPS)
        for (const barrierLowering of [LOWERING_RANGE.min, 20, LOWERING_RANGE.max]) {
          const off = reactionEnergyProfile({productEnergy, barrierTop, barrierLowering, enzyme: false});
          const on = reactionEnergyProfile({productEnergy, barrierTop, barrierLowering, enzyme: true});
          expect(on.catalyzed).not.toBeNull();
          expect(on.uncatalyzed).toEqual(off.uncatalyzed);
          expect(on.catalyzed!.reactant).toBe(off.uncatalyzed.reactant);
          expect(on.catalyzed!.product).toBe(off.uncatalyzed.product);
          expect(on.deltaG).toBe(off.deltaG);
          expect(on.deltaG).toBe(productEnergy - REACTANT_ENERGY);
        }
  });

  it('2 · the catalysed transition state is lower, and both barriers fall with it', () => {
    for (const productEnergy of PRODUCTS)
      for (const barrierTop of TOPS)
        for (const barrierLowering of LOWERINGS) {
          const {uncatalyzed, catalyzed} = reactionEnergyProfile({productEnergy, barrierTop, barrierLowering, enzyme: true});
          expect(catalyzed!.transitionState).toBeLessThanOrEqual(uncatalyzed.transitionState);
          expect(catalyzed!.forwardBarrier).toBeLessThanOrEqual(uncatalyzed.forwardBarrier);
          expect(catalyzed!.reverseBarrier).toBeLessThanOrEqual(uncatalyzed.reverseBarrier);
          // Both barriers fall by exactly the same amount, because there is one shared maximum.
          const forwardDrop = uncatalyzed.forwardBarrier - catalyzed!.forwardBarrier;
          const reverseDrop = uncatalyzed.reverseBarrier - catalyzed!.reverseBarrier;
          expect(forwardDrop).toBeCloseTo(reverseDrop, 12);
          expect(forwardDrop).toBeCloseTo(uncatalyzed.transitionState - catalyzed!.transitionState, 12);
        }
  });

  it('3 · a real lowering produces a strictly lower barrier whenever the clamp is not binding', () => {
    // With the default product energy the barrier has room to fall, so the effect must be strict, not merely ≤.
    const {uncatalyzed, catalyzed} = reactionEnergyProfile({productEnergy: -18, barrierTop: 55, barrierLowering: 20, enzyme: true});
    expect(catalyzed!.transitionState).toBe(35);
    expect(catalyzed!.forwardBarrier).toBe(35);
    expect(uncatalyzed.forwardBarrier).toBe(55);
    expect(catalyzed!.reverseBarrier).toBe(53);
    expect(uncatalyzed.reverseBarrier).toBe(73);
  });

  it('4 · the transition state never drops below either end point, at any slider combination', () => {
    for (const productEnergy of PRODUCTS)
      for (const barrierTop of TOPS)
        for (const barrierLowering of LOWERINGS) {
          const profile = reactionEnergyProfile({productEnergy, barrierTop, barrierLowering, enzyme: true});
          for (const pathway of [profile.uncatalyzed, profile.catalyzed!]) {
            expect(pathway.transitionState).toBeGreaterThanOrEqual(pathway.reactant + MIN_BARRIER);
            expect(pathway.transitionState).toBeGreaterThanOrEqual(pathway.product + MIN_BARRIER);
            expect(pathway.forwardBarrier).toBeGreaterThanOrEqual(MIN_BARRIER);
            expect(pathway.reverseBarrier).toBeGreaterThanOrEqual(MIN_BARRIER);
          }
        }
  });

  it('5 · the clamp only ever raises a transition state, never lowers one', () => {
    for (const productEnergy of PRODUCTS)
      for (const barrierTop of TOPS) {
        const clamped = clampTransitionState(barrierTop, productEnergy);
        expect(clamped).toBeGreaterThanOrEqual(barrierTop);
        expect(clamped).toBe(Math.max(barrierTop, Math.max(REACTANT_ENERGY, productEnergy) + MIN_BARRIER));
      }
  });

  it('6 · every drawable energy stays inside the fixed y-axis domain, so the axis never has to rescale', () => {
    for (const productEnergy of PRODUCTS)
      for (const barrierTop of TOPS)
        for (const barrierLowering of [LOWERING_RANGE.min, LOWERING_RANGE.max]) {
          const profile = reactionEnergyProfile({productEnergy, barrierTop, barrierLowering, enzyme: true});
          for (const pathway of [profile.uncatalyzed, profile.catalyzed!])
            for (const {energy} of pathwayPoints(pathway, 40)) {
              expect(energy).toBeGreaterThanOrEqual(ENERGY_DOMAIN.min);
              expect(energy).toBeLessThanOrEqual(ENERGY_DOMAIN.max);
            }
        }
  });

  it('7 · the drawn pathway has flat end plateaus and its single maximum at the transition state', () => {
    const {uncatalyzed} = reactionEnergyProfile({productEnergy: -18, barrierTop: 55, barrierLowering: 20, enzyme: false});
    expect(energyAt(uncatalyzed, 0)).toBe(uncatalyzed.reactant);
    expect(energyAt(uncatalyzed, COORDINATE.reactantEnd)).toBe(uncatalyzed.reactant);
    expect(energyAt(uncatalyzed, COORDINATE.transitionState)).toBeCloseTo(uncatalyzed.transitionState, 12);
    expect(energyAt(uncatalyzed, COORDINATE.productStart)).toBeCloseTo(uncatalyzed.product, 12);
    expect(energyAt(uncatalyzed, 1)).toBe(uncatalyzed.product);
    const points = pathwayPoints(uncatalyzed, 401);
    const peak = points.reduce((best, p) => (p.energy > best.energy ? p : best));
    expect(peak.energy).toBeCloseTo(uncatalyzed.transitionState, 10);
    expect(peak.x).toBeCloseTo(COORDINATE.transitionState, 3);
    // Exactly one maximum: energy rises monotonically to the peak and falls monotonically after it.
    const rising = points.filter((p) => p.x <= COORDINATE.transitionState);
    const falling = points.filter((p) => p.x >= COORDINATE.transitionState);
    for (let i = 1; i < rising.length; i++) expect(rising[i].energy).toBeGreaterThanOrEqual(rising[i - 1].energy - 1e-12);
    for (let i = 1; i < falling.length; i++) expect(falling[i].energy).toBeLessThanOrEqual(falling[i - 1].energy + 1e-12);
  });

  it('8 · the rate factor is exp(ΔΔG‡/RT) and is the same for both directions', () => {
    expect(relativeRateFactor(0)).toBe(1);
    expect(RT_298).toBeCloseTo(2.4789, 3);
    expect(relativeRateFactor(RT_298)).toBeCloseTo(Math.E, 12);
    const {uncatalyzed, catalyzed} = reactionEnergyProfile({productEnergy: -18, barrierTop: 55, barrierLowering: 20, enzyme: true});
    const forward = relativeRateFactor(uncatalyzed.forwardBarrier - catalyzed!.forwardBarrier);
    const reverse = relativeRateFactor(uncatalyzed.reverseBarrier - catalyzed!.reverseBarrier);
    expect(forward).toBeCloseTo(reverse, 9);
    expect(forward).toBeGreaterThan(1);
  });

  it('9 · with the enzyme off there is no catalysed pathway at all', () => {
    const profile = reactionEnergyProfile({productEnergy: 5, barrierTop: 40, barrierLowering: 20, enzyme: false});
    expect(profile.catalyzed).toBeNull();
    expect(profile.uncatalyzed.forwardBarrier).toBe(40);
    expect(profile.uncatalyzed.reverseBarrier).toBe(35);
    expect(profile.deltaG).toBe(5);
  });
});
