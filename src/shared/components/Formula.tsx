import type {ReactNode} from 'react';

/**
 * Small typeset-looking formulas built from plain HTML and CSS rather than a math renderer.
 *
 * Module 03 needs only a handful of expressions, and a stacked `<span>` fraction renders identically in every
 * engine. Subscripts are real `<sub>` elements: the Unicode subscript minus (U+208B) is missing from common
 * UI fonts, and a fallback glyph made `k₋₁` read as `k₁`, so no subscript here relies on those code points.
 */

/** A rate constant: italic k with an upright subscript, e.g. `<RateConstant step="-1" />` → k₋₁. */
export function RateConstant({step}: {step: '1' | '-1' | 'cat'}) {
  return (
    <span className="formula-symbol">
      <i>k</i>
      {/* U+2212 minus sign, not a hyphen, so the subscript reads as −1. */}
      <sub>{step === '-1' ? '−1' : step}</sub>
    </span>
  );
}

/** An equilibrium or Michaelis constant: italic K with an upright label subscript (K_m, K_d). */
export function Constant({label}: {label: 'm' | 'd'}) {
  return (
    <span className="formula-symbol">
      <i>K</i>
      <sub>{label}</sub>
    </span>
  );
}

/** A built-up fraction with a real fraction bar. Screen readers get the linear form from the enclosing equation. */
export function Fraction({numerator, denominator}: {numerator: ReactNode; denominator: ReactNode}) {
  return (
    <span className="fraction" aria-hidden="true">
      <span className="fraction-numerator">{numerator}</span>
      <span className="fraction-denominator">{denominator}</span>
    </span>
  );
}

/** An arrow with its rate constants written above and below it, as in a kinetic scheme. */
export function SchemeArrow({arrow, above, below}: {arrow: string; above?: ReactNode; below?: ReactNode}) {
  return (
    <span className="scheme-arrow" aria-hidden="true">
      <span className="scheme-arrow-label">{above}</span>
      <span className="scheme-arrow-glyph">{arrow}</span>
      <span className="scheme-arrow-label">{below}</span>
    </span>
  );
}

/**
 * A displayed equation. `spoken` is the linear reading given to assistive technology, because the stacked
 * layout on its own reads as an unordered run of symbols.
 */
export function DisplayEquation({spoken, testId, children}: {spoken: string; testId?: string; children: ReactNode}) {
  return (
    <div className="equation" role="math" aria-label={spoken} data-testid={testId}>
      {children}
    </div>
  );
}
