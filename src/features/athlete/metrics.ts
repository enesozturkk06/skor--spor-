/** Body-mass index, rounded to one decimal. Returns null for out-of-range input. */
export function bmi(heightCm: number, weightKg: number): number | null {
  if (!(heightCm > 0) || !(weightKg > 0)) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** WHO adult BMI bands (informational only — not a diagnosis). */
export function bmiBand(value: number): string {
  if (value < 18.5) return 'Düşük';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Yüksek';
  return 'Çok yüksek';
}
