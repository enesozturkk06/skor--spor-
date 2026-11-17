import { Platform } from 'react-native';

import { haptics } from './haptics';

/**
 * Timer cues: a haptic on phones, plus a short synthesized tone on web
 * (Web Audio, no asset, no dependency). Native sound needs an audio module
 * and a development build — not added yet. Never throws.
 */
export type SignalKind = 'start' | 'end' | 'tick' | 'done';

const TONES: Record<SignalKind, { freq: number; ms: number; repeat: number }> = {
  start: { freq: 880, ms: 220, repeat: 1 },
  end: { freq: 523, ms: 380, repeat: 2 },
  tick: { freq: 1320, ms: 60, repeat: 1 },
  done: { freq: 660, ms: 260, repeat: 3 },
};

let ctx: AudioContext | null = null;

function tone(kind: SignalKind) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const { freq, ms, repeat } = TONES[kind];
    for (let i = 0; i < repeat; i++) {
      const t0 = ctx.currentTime + i * (ms / 1000 + 0.08);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.02);
    }
  } catch {
    /* audio unavailable (autoplay policy, old browser) — haptics/visuals still carry the cue */
  }
}

export function signal(kind: SignalKind) {
  if (kind === 'tick') haptics.select();
  else if (kind === 'start') haptics.success();
  else haptics.warning();
  tone(kind);
}
