/**
 * Sanitising for numeric text fields (age, height, weight).
 *
 * Every change — a typed key or a whole pasted string — goes through the same
 * function. A value is either accepted as a clean number string, or rejected
 * so the field keeps its previous value. Input is never "repaired" into a
 * different number (e.g. "1.78" → 178, "1a2b" → 12, "1780" → 178).
 */

export type NumericSpec = {
  /** Max digits before the decimal separator. */
  maxIntDigits: number;
  /** Max digits after the separator; 0 = integers only. */
  maxDecimals: 0 | 1 | 2;
};

export type NumericRejectReason = 'invalid' | 'too_long' | 'too_many_decimals';

export type NumericResult = { ok: true; value: string } | { ok: false; reason: NumericRejectReason };

/** Arabic-Indic (U+0660–0669) and Extended/Persian (U+06F0–06F9) digits → ASCII. */
function asciiDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0x0f) % 10));
}

/** Units people commonly paste along with the number. Matched after tr-TR lowercasing. */
const UNIT_SUFFIX = /\s*(cm|kg|kilo|yıl|yil|yaş|yas|years?|yrs?)\.?$/;

export function sanitizeNumericInput(raw: string, spec: NumericSpec): NumericResult {
  // NFKC folds full-width digits/commas (e.g. "７５，５") into ASCII.
  let s = asciiDigits(raw.normalize('NFKC')).toLocaleLowerCase('tr-TR').trim();
  s = s.replace(UNIT_SUFFIX, '').trim();
  if (s === '') return { ok: true, value: '' };

  const pattern = spec.maxDecimals > 0 ? /^(\d+)(?:([.,])(\d*))?$/ : /^(\d+)$/;
  const m = pattern.exec(s);
  if (!m) return { ok: false, reason: 'invalid' };

  const [, intPart, sep, decRaw = ''] = m;
  if (intPart.length > spec.maxIntDigits) return { ok: false, reason: 'too_long' };

  let dec = decRaw;
  if (dec.length > spec.maxDecimals) {
    // Trailing zeros don't change the number ("75,50" = 75,5); anything else would be rounding.
    const extra = dec.slice(spec.maxDecimals);
    if (/[^0]/.test(extra)) return { ok: false, reason: 'too_many_decimals' };
    dec = dec.slice(0, spec.maxDecimals);
  }

  // Keep the user's own separator so Turkish "," and "." both feel natural while typing.
  return { ok: true, value: sep ? `${intPart}${sep}${dec}` : intPart };
}

export function numericRejectMessage(reason: NumericRejectReason, spec: NumericSpec): string {
  switch (reason) {
    case 'too_long':
      return `En fazla ${spec.maxIntDigits} basamak girebilirsin.`;
    case 'too_many_decimals':
      return `Virgülden sonra en fazla ${spec.maxDecimals} basamak girebilirsin.`;
    case 'invalid':
      return spec.maxDecimals > 0 ? 'Yalnızca sayı girebilirsin (ör. 75,5).' : 'Yalnızca rakam girebilirsin.';
  }
}
