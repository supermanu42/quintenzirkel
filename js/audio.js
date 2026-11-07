'use strict';

/*
 * Klang: ein Klavier-ähnlicher Ton aus der Web-Audio-API (keine Samples, funktioniert offline).
 * Pro Ton mehrere Obertöne (leicht „gestreckt“ wie bei echten Saiten), die unterschiedlich schnell abklingen: hohe Obertöne verschwinden
 * zuerst, tiefe Töne klingen länger. Dazu ein kurzer „Hammer“-Anschlag und ein weicher Tiefpass.
 */

let audioCtx, master;

function audioStart() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!master) {
    const comp = audioCtx.createDynamicsCompressor(), g = audioCtx.createGain();
    g.gain.value = 0.9;
    master = audioCtx.createGain();
    master.connect(comp); comp.connect(g); g.connect(audioCtx.destination);
  }
  return audioCtx;
}

/** Ein Klavierton: MIDI-Nummer, Startzeit, Anschlagstärke 0–1. */
function pianoNote(midi, t, vel) {
  const c = audioCtx, f0 = 440 * Math.pow(2, (midi - 69) / 12);
  const low = Math.max(0, Math.min(1, (96 - midi) / 60));               // 1 = sehr tief, 0 = sehr hoch
  const sustain = 0.45 + 1.1 * low;                                     // Grundton-Ausklang in Sekunden (kurz, wenig Nachhall)
  const out = c.createGain(), lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(9000, f0 * (5 + 7 * vel));              // lauter = heller
  lp.Q.value = 0.4;
  out.gain.value = 0.34 * vel / (1 + 0.5 * low);
  out.connect(lp); lp.connect(master);
  const B = 0.00035 + 0.0006 * (1 - low);                              // Inharmonizität der Saite
  for (let n = 1; n <= 9; n++) {
    const f = f0 * n * Math.sqrt(1 + B * n * n);
    if (f > 12000) break;
    const amp = Math.pow(0.62, n - 1) * (n === 2 ? 1.15 : 1) * (1 - 0.35 * (n % 2 === 0 ? 0 : 0));
    const tau = sustain / (1 + 1.2 * (n - 1));                          // höhere Obertöne klingen schneller ab
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.006, tau / 2.4);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + tau * 1.5 + 0.15);
  }
  // Hammeranschlag: sehr kurzes gefiltertes Rauschen
  const len = Math.floor(c.sampleRate * 0.03), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const ns = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
  ns.buffer = buf; nf.type = 'bandpass'; nf.frequency.value = Math.min(4000, f0 * 3); nf.Q.value = 0.8;
  ng.gain.value = 0.10 * vel;
  ns.connect(nf); nf.connect(ng); ng.connect(out);
  ns.start(t);
}

/** Einen Ton kurz „pulsieren“ lassen: Kasten in der Notenzeile (Nr. i) und die zugehörige Taste der Klaviatur. */
function pulseNote(i, n) {
  const restart = e => { if (!e) return; e.classList.remove('pulse'); void e.getBoundingClientRect(); e.classList.add('pulse'); setTimeout(() => e.classList.remove('pulse'), 650); };
  restart(document.querySelector(`#staff .nbox[data-i="${i}"]`));
  const pc = pcOf(n);
  restart([...document.querySelectorAll('#keys .kk[data-hl="1"]')].find(k => +k.dataset.m % 12 === pc));
}

/** Pulsieren zeitgleich zum Klang: delays in Sekunden ab jetzt. */
function pulseLater(notes, idx, delayOf) {
  idx.forEach((i, k) => { if (notes[i]) setTimeout(() => pulseNote(i, notes[i]), Math.round(delayOf(k) * 1000)); });
}

/** Tonleiter (oder die Töne eines Akkords) nacheinander abspielen; jeder Ton leuchtet beim Erklingen kurz auf. */
function playScale(notes) {
  try {
    audioStart(); flashRoot(notes);
    const t0 = audioCtx.currentTime + 0.05;
    notes.forEach((n, i) => pianoNote(midiOf(n), t0 + i * 0.45, 0.85));
    pulseLater(notes, notes.map((_, i) => i), k => 0.05 + k * 0.45);
  } catch (e) { /* Audio nicht verfügbar – still ignorieren */ }
}

/** Töne (MIDI-Nummern) gleichzeitig anspielen (leicht versetzt wie ein angeschlagener Akkord). */
function playMidis(midis) {
  try {
    audioStart();
    const t = audioCtx.currentTime + 0.03;
    [...midis].sort((a, b) => a - b).forEach((m, i) => pianoNote(m, t + i * 0.012, 0.7));
  } catch (e) { /* Audio nicht verfügbar – still ignorieren */ }
}

/** Dreiklang (Grundton, Terz, Quinte) der Tonleiter anspielen. */
function playChord(notes) {
  flashRoot(notes);
  playMidis(notes.isChord ? notes.map(midiOf) : [0, 2, 4].map(i => midiOf(notes[i])));
  pulseLater(notes, notes.isChord ? notes.map((_, i) => i) : [0, 2, 4], () => 0.04);   // alle Akkordtöne leuchten zusammen auf
}
