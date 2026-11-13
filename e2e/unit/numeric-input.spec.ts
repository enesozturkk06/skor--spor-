/**
 * Unit tests for the numeric field sanitiser. Pure function → runs in the
 * Playwright Node runner without opening a browser (no `page` fixture used).
 */
import { expect, test } from '@playwright/test';

import { numericRejectMessage, sanitizeNumericInput, type NumericSpec } from '../../src/lib/numeric-input';

const AGE: NumericSpec = { maxIntDigits: 2, maxDecimals: 0 };
const HEIGHT: NumericSpec = { maxIntDigits: 3, maxDecimals: 0 };
const WEIGHT: NumericSpec = { maxIntDigits: 3, maxDecimals: 1 };

type Case = [input: string, expected: string | 'invalid' | 'too_long' | 'too_many_decimals'];

function check(spec: NumericSpec, cases: Case[]) {
  for (const [input, expected] of cases) {
    const r = sanitizeNumericInput(input, spec);
    const actual = r.ok ? r.value : r.reason;
    expect(actual, JSON.stringify(input)).toBe(expected);
  }
}

test.describe('sanitizeNumericInput', () => {
  test('boş ve yalnızca boşluk → boş değer', () => {
    check(AGE, [['', ''], ['   ', '']]);
  });

  test('yaş: geçerli tam sayılar ve birimli yapıştırma kabul edilir', () => {
    check(AGE, [
      ['2', '2'],
      ['27', '27'],
      [' 27 ', '27'],
      ['27 yaş', '27'],
      ['27 YAŞ', '27'],
      ['27yıl', '27'],
      ['27 YIL', '27'], // tr-TR lowercasing: YIL → yıl
      ['27 years', '27'],
    ]);
  });

  test('yaş: harf, işaret ve ondalık asla sayıya çevrilmez', () => {
    check(AGE, [
      ['2a7', 'invalid'],
      ['a', 'invalid'],
      ['-5', 'invalid'],
      ['+27', 'invalid'],
      ['27.5', 'invalid'],
      ['2 7', 'invalid'],
      ['27e1', 'invalid'],
      ['1a2b', 'invalid'],
    ]);
  });

  test('yaş: uzunluk sınırı aşılırsa kesilmez, reddedilir', () => {
    check(AGE, [['123', 'too_long'], ['100 yaş', 'too_long']]);
  });

  test('boy: metre cinsinden yapıştırma 178 olmaz, reddedilir', () => {
    check(HEIGHT, [
      ['178', '178'],
      ['178 cm', '178'],
      ['178CM', '178'],
      ['1.78', 'invalid'],
      ['1,78', 'invalid'],
      ['1780', 'too_long'],
      ['178 kg', '178'], // unit word is decoration; range check happens on submit
    ]);
  });

  test('kilo: virgül ve nokta ondalık ayırıcı olarak kabul edilir', () => {
    check(WEIGHT, [
      ['75', '75'],
      ['75,', '75,'], // mid-typing
      ['75.', '75.'],
      ['75,5', '75,5'],
      ['75.5', '75.5'],
      ['75,5 kg', '75,5'],
      ['75.5KG', '75.5'],
      ['75,50', '75,5'], // trailing zero → same number
      ['75,0', '75,0'],
    ]);
  });

  test('kilo: yuvarlama gerektiren veya bozuk değerler reddedilir', () => {
    check(WEIGHT, [
      ['75,55', 'too_many_decimals'],
      ['75,05', 'too_many_decimals'],
      ['7,5,5', 'invalid'],
      ['7.5.5', 'invalid'],
      [',5', 'invalid'],
      ['.', 'invalid'],
      ['75 , 5', 'invalid'],
      ['1.234', 'too_many_decimals'], // not a thousands separator → never 1234
      ['1000', 'too_long'],
      ['abc', 'invalid'],
    ]);
  });

  test('farklı klavyelerden gelen rakamlar ASCII olur', () => {
    check(WEIGHT, [
      ['٧٥', '75'], // Arabic-Indic
      ['۷۵٫۵', 'invalid'], // Arabic decimal separator is not accepted
      ['７５，５', '75,5'], // full-width (NFKC)
    ]);
    check(AGE, [['۲۷', '27']]); // Persian
  });

  test('ret mesajları Türkçe ve alana özel', () => {
    expect(numericRejectMessage('invalid', AGE)).toBe('Yalnızca rakam girebilirsin.');
    expect(numericRejectMessage('invalid', WEIGHT)).toBe('Yalnızca sayı girebilirsin (ör. 75,5).');
    expect(numericRejectMessage('too_long', HEIGHT)).toBe('En fazla 3 basamak girebilirsin.');
    expect(numericRejectMessage('too_many_decimals', WEIGHT)).toBe('Virgülden sonra en fazla 1 basamak girebilirsin.');
  });
});
