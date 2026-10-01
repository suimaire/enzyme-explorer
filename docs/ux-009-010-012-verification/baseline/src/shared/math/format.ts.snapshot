/** Number formatting shared by the readouts. Keeps significant figures honest for teaching-scale values. */

/** Fixed-decimal value, with a real minus sign so negative energies read correctly. */
export const fixed = (value: number, digits = 1): string => value.toFixed(digits).replace('-', '\u2212');

/** Signed value, used where the sign carries the meaning (ΔG, barrier changes). */
export const signed = (value: number, digits = 1): string =>
  `${value > 0 ? '+' : value < 0 ? '\u2212' : ''}${Math.abs(value).toFixed(digits)}`;

/** Large rate ratios as a power of ten, small ones as a plain multiplier. */
export function multiplier(value: number): string {
  if (!Number.isFinite(value)) return '\u2014';
  if (value < 1000) return `\u00d7${value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString('en-US')}`;
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / 10 ** exponent;
  return `\u00d7${mantissa.toFixed(1)} \u00d7 10${superscript(exponent)}`;
}

const SUPERSCRIPTS = '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079';
const superscript = (n: number): string => String(n).replace(/\d/g, (d) => SUPERSCRIPTS[Number(d)]);

/** Ratio of two values as "×2.00", used where the point of the experiment is the ratio itself. */
export const ratio = (a: number, b: number, digits = 2): string =>
  b === 0 ? '\u2014' : `\u00d7${(a / b).toFixed(digits)}`;
