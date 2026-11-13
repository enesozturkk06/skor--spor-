const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validate = {
  email(value: string): string | null {
    if (!value.trim()) return 'E-posta gerekli.';
    return EMAIL_RE.test(value.trim()) ? null : 'Geçerli bir e-posta girin.';
  },
  password(value: string): string | null {
    if (!value) return 'Şifre gerekli.';
    if (value.length < 8) return 'Şifre en az 8 karakter olmalı.';
    if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value) || !/\d/.test(value)) return 'Şifre harf ve rakam içermeli.';
    return null;
  },
  name(value: string): string | null {
    const v = value.trim();
    if (v.length < 2) return 'Adınızı girin.';
    if (v.length > 40) return 'Ad en fazla 40 karakter olabilir.';
    return null;
  },
  /** Integer within an inclusive range. */
  intInRange(value: string, min: number, max: number, label: string): string | null {
    if (!value.trim()) return `${label} gerekli.`;
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n)) return `${label} sayı olmalı.`;
    if (n < min || n > max) return `${label} ${min}–${max} arasında olmalı.`;
    return null;
  },
};

export function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}
