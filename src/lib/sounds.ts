'use client';

import { getPrefs } from './prefs';

// Sons do tabuleiro sintetizados com WebAudio — sem ficheiros externos.
let ctx: AudioContext | null = null;

function on(): boolean { return getPrefs().sound; }

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.15, delay = 0) {
  if (!on()) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function knock(gain = 0.3, freq = 180, dur = 0.09) {
  if (!on()) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sounds = {
  /** toque seco de madeira — peça pousa na casa */
  move() { knock(0.35, 200, 0.08); },
  /** batida mais forte — captura */
  capture() { knock(0.5, 150, 0.12); tone(90, 0.1, 'triangle', 0.12); },
  /** alerta de xeque */
  check() { tone(660, 0.12, 'square', 0.08); tone(880, 0.15, 'square', 0.08, 0.1); },
  /** início de partida — peças no tabuleiro */
  start() { knock(0.25, 260, 0.07); knock(0.25, 220, 0.07); setTimeout(() => knock(0.3, 240, 0.08), 120); },
  /** vitória */
  win() { tone(523, 0.15, 'triangle', 0.15); tone(659, 0.15, 'triangle', 0.15, 0.12); tone(784, 0.3, 'triangle', 0.15, 0.24); },
  /** derrota / empate */
  end() { tone(392, 0.2, 'triangle', 0.12); tone(330, 0.3, 'triangle', 0.12, 0.15); },
  /** jogada ilegal */
  illegal() { tone(140, 0.15, 'sawtooth', 0.1); },
  /** tick de relógio baixo (últimos 10s) */
  tick() { tone(1200, 0.03, 'square', 0.04); },
  /** notificação de desafio / oferta de empate */
  notify() { tone(587, 0.1, 'sine', 0.12); tone(880, 0.15, 'sine', 0.12, 0.1); },
};
