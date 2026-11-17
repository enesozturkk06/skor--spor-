import type { Prescription, PrescriptionGoal } from './types';

export const GOAL_LABELS: Record<PrescriptionGoal, string> = {
  strength: 'Güç',
  hypertrophy: 'Hipertrofi',
  endurance: 'Dayanıklılık',
  power: 'Patlayıcılık',
  technique: 'Teknik',
  conditioning: 'Kondisyon',
  mobility: 'Mobilite',
};

const rx = (goal: PrescriptionGoal, sets: string, target: string, rest: string): Prescription => ({ goal, sets, target, rest });

/** Shared starting points; exercises can still define their own. */
export const RX = {
  compound: [
    rx('strength', '4–5', '3–6 tekrar', '2–3 dk'),
    rx('hypertrophy', '3–4', '6–12 tekrar', '90–120 sn'),
    rx('endurance', '2–3', '15–20 tekrar', '60 sn'),
  ],
  accessory: [
    rx('hypertrophy', '3–4', '10–15 tekrar', '60–90 sn'),
    rx('endurance', '2–3', '15–25 tekrar', '45–60 sn'),
  ],
  bodyweight: [
    rx('strength', '4–5', '5–8 tekrar (ek ağırlıkla)', '2 dk'),
    rx('hypertrophy', '3–4', '8–15 tekrar', '90 sn'),
    rx('endurance', '2–3', 'Tükenişe 2 tekrar kala', '60 sn'),
  ],
  core: [
    rx('strength', '3–4', '8–12 tekrar', '60–90 sn'),
    rx('endurance', '3', '15–20 tekrar', '45 sn'),
  ],
  hold: [
    rx('endurance', '3–4', '30–60 sn', '45–60 sn'),
    rx('strength', '3', '20–30 sn (ek yükle)', '60–90 sn'),
  ],
  power: [
    rx('power', '4–6', '3–5 tekrar, maksimum hız', '2–3 dk'),
    rx('conditioning', '3–4', '20–30 sn', '60 sn'),
  ],
  conditioning: [
    rx('conditioning', '4–8', '20–40 sn', '20–40 sn'),
    rx('endurance', '3', '60–90 sn', '60 sn'),
  ],
  strike: [
    rx('technique', '3–4 raund', '2 dk, temiz form', '60 sn'),
    rx('power', '5–6', '10 sn maksimum hız', '50 sn'),
    rx('conditioning', '5–8 raund', '3 dk', '60 sn'),
  ],
  kick: [
    rx('technique', '3–4', '8–10 tekrar / taraf', '60 sn'),
    rx('power', '4–5', '5 tekrar / taraf, tam güç', '90 sn'),
    rx('conditioning', '4–6 raund', '2 dk, taraf değiştirerek', '60 sn'),
  ],
  mobility: [
    rx('mobility', '2–3', '5–8 tekrar / taraf', 'Gerekmez'),
    rx('technique', '1–2', 'Isınmada 60–90 sn', 'Gerekmez'),
  ],
} as const satisfies Record<string, readonly Prescription[]>;

/** Shared breathing cues. */
export const BREATH = {
  press:
    'İnişte burundan nefes al ve karnını sık (brace). İtişin en zor noktasını geçerken nefesini kontrollü şekilde ver.',
  pull: 'Başlangıçta nefes al ve gövdeni sabitle; çekişte nefes ver, bırakırken yeniden al.',
  hinge:
    'Her tekrardan önce derin nefes alıp karnı 360° sık; kaldırışı nefes tutarak tamamla, üstte ver ve yeniden doldur.',
  squat: 'Yukarıda derin nefes alıp karnı sık, nefesi tutarak in ve en zor noktayı geçince ver.',
  isolation: 'Kasılma (zor) fazında nefes ver, kontrollü dönüşte nefes al. Nefesini asla tutma.',
  core: 'Kasılmada nefes ver ve kaburgaları aşağı çek; başlangıç pozisyonuna dönerken nefes al.',
  hold: 'Kısa ve ritmik nefes al-ver; karın gerginliğini bozmadan burundan nefes almaya çalış.',
  plyo: 'Hareketten önce hızlıca nefes al; patlayıcı fazda sert bir şekilde ver.',
  strike: 'Her vuruşta dişler hafif kapalıyken kısa ve keskin nefes ver ("tıs"); vuruşlar arasında burundan al.',
  run: 'Ritmik nefes: kolay tempoda 3 adım al – 3 adım ver, tempo arttıkça 2–2. Omuzları gevşek tut.',
  swim: 'Su altında burundan sürekli nefes ver; baş döndüğünde ağızdan hızlı nefes al.',
  mobility: 'Yavaş ve derin nefes al; her nefes verişte pozisyona biraz daha yerleş.',
} as const;
