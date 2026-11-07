'use strict';

/*
 * Notenzeile. Pro Ton eine Spalte, alles senkrecht untereinander:
 *   Kasten (Stufe + Notenname)  →  Note auf dem Notensystem  →  Schrittmarkierung (½ / 1)
 */

const SH  = [3, 0, 4, 1, 5, 2, 6], FL  = [6, 2, 5, 1, 4, 0, 3];   // Reihenfolge der Vorzeichen (Stammton-Index)
const SHS = [8, 5, 9, 6, 3, 7, 4], FLS = [4, 7, 3, 6, 2, 5, 1];   // Position im Violinschlüssel (Halblinien-Schritte)

const BY = 150, HG = 6;                 // unterste Notenlinie, halber Linienabstand
const BOX_Y = 6, BOX_H = 44, BOX_W = 46;
const yOf = s => BY - s * HG;

let lastStaffNotes = null, lastStaffCompact = null;
let staffClef = 'treble';                 // 'treble' (Violinschlüssel) oder 'bass' (Bassschlüssel)
/** Oktavbezeichnung deutsch: wissenschaftlich C4 = c¹ („1“), C5 = c² („2“); darunter kleine (kl), große (gr), Kontra- (K) und Subkontra-Oktave (S). */
function octLabel(o) { return o >= 4 ? String(o - 3) : ['S', 'K', 'gr', 'kl'][o] || '–'; }

let staffShown = null;                   // die Töne, die gerade in der Notenzeile stehen (werden vom Play-Knopf gespielt)
let staffShift = 0, staffSig = '';        // staffShift: um so viele Stufen ist die angezeigte Tonleiter verschoben (Pfeile links/rechts)
const STAFF_PAD = 72;                      // Platz für die Pfeile links und rechts (CSS .staffwrap)

/** Ausschnitt der Tonleiter (8 Töne) ab Stufe „shift“: die Tonleiter wird oktavweise fortgesetzt. */
function shiftedNotes(notes, shift) {
  if (!shift || notes.isChord) return notes;
  const base = notes.slice(0, 7), out = [];
  for (let j = shift; j < shift + 8; j++) {
    const k = Math.floor(j / 7), b = base[((j % 7) + 7) % 7];
    out.push(Object.assign({}, b, { oct: b.oct + k, semi: b.semi + 12 * k, deg: (j === shift + 7 && shift % 7 === 0) ? 8 : ((j % 7) + 7) % 7 + 1 }));
  }
  return out;
}

function shiftStaff(d) {
  staffShift = Math.max(-14, Math.min(14, staffShift + 7 * d));      // immer genau eine Oktave
  if (lastStaffNotes) drawStaff(lastStaffNotes);
}                 // 'treble' (Violinschlüssel) oder 'bass' (Bassschlüssel)

/** Schlüssel wechseln (Tippen auf den Schlüssel, oder automatisch beim Wechsel des Instruments). */
function setClef(c, redraw) {
  staffClef = c === 'bass' ? 'bass' : 'treble';
  store.set('clef', staffClef);
  if (redraw !== false && lastStaffNotes) drawStaff(lastStaffNotes);
}

function drawStaff(notes) {
  const svg = document.getElementById('staff');
  svg.innerHTML = '';
  lastStaffNotes = notes;
  // andere Tonart/Tonleiter/Akkord → wieder bei der Grundtonleiter beginnen
  const noteSig = notes.isChord + '|' + notes.slice(0, 3).map(n => n.l + ':' + n.a + ':' + n.semi).join(',') + '|' + notes.length;
  if (noteSig !== staffSig) { staffSig = noteSig; staffShift = 0; }
  notes = shiftedNotes(notes, staffShift);
  // Bassschlüssel: echte Tonhöhe – im Bassschlüssel steht dasselbe C eine Oktave tiefer notiert, hier wird es zwei Oktaven tiefer gespielt und beschriftet
  if (staffClef === 'bass') { const chord = notes.isChord; notes = notes.map(n => Object.assign({}, n, { oct: n.oct - 2 })); notes.isChord = chord; }
  staffShown = notes;
  drawKeys(notes);                      // Klaviatur zeigt denselben Ausschnitt/dieselbe Oktave wie die Notenzeile (Pfeile, Schlüssel)
  document.getElementById('stDown').style.display = document.getElementById('stUp').style.display = notes.isChord ? 'none' : '';
  const cp = document.getElementById('chordPlay');
  cp.style.display = notes.isChord ? '' : 'none';
  document.getElementById('stDown').disabled = staffShift <= -14;
  document.getElementById('stUp').disabled = staffShift >= 14;
  // Schmaler Platz (Handy hochkant): kompakte Notenzeile – kleiner, nur angedeuteter Schlüssel –, damit sie ohne Seitwärtswischen ganz sichtbar ist
  const compact = ((svg.parentElement.clientWidth || 700) - STAFF_PAD) < 600;
  lastStaffCompact = compact;
  const BW = compact ? 40 : BOX_W, bass = staffClef === 'bass';
  // Akkorde haben nur 3–5 Töne: die Notenzeile wird entsprechend schmaler, die Erklärung steht daneben
  const chord = !!notes.isChord, sigN = Math.abs(st.idx <= 6 ? st.idx : st.idx - 12);
  const FW = compact ? 470 : 640, sx0 = compact ? 44 : 62, sdx = compact ? 10 : 12;
  const x0 = sx0 + sdx * sigN + (compact ? 42 : 40);
  const sp = chord ? (compact ? 64 : 80) : Math.min(80, (FW - 28 - x0) / 7);
  const W = chord ? Math.min(FW, x0 + (notes.length - 1) * sp + 50) : FW;
  const VH = bass ? 216 : 198, arcY = bass ? 190 : 172, labY = bass ? 212 : 194;   // Bassschlüssel: tiefe Töne brauchen mehr Platz unten
  svg.setAttribute('viewBox', `0 0 ${W} ${VH}`);
  // Play-Knopf senkrecht genau auf die Mitte der Notenkästen setzen (nach dem Layout gemessen)
  requestAnimationFrame(() => {
    const pb = document.getElementById('play'), box = svg.querySelector('.nbox'), wrap = svg.parentElement;
    if (!pb || !box) return;
    const br = box.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    pb.style.top = Math.round(br.top - wr.top + wrap.scrollTop + br.height / 2 - pb.offsetHeight / 2) + 'px';
  });
  svg.parentElement.style.flex = chord ? `0 1 ${(W / FW * 100).toFixed(1)}%` : '';
  document.getElementById('scaleBody').classList.toggle('chord', chord);
  const add = e => svg.appendChild(e);
  const font = '"Noto Music","Segoe UI Symbol","Apple Symbols",serif';

  // Notensystem, Taktstrich, Violinschlüssel
  for (let i = 0; i < 5; i++) {
    add(el('line', { x1: 8, x2: W - 8, y1: BY - i * 12, y2: BY - i * 12, style: 'stroke:var(--fg)', 'stroke-width': 1.2 }));
  }
  add(el('line', { x1: 8, x2: 8, y1: BY, y2: BY - 48, style: 'stroke:var(--fg)', 'stroke-width': 1.5 }));
  // Bassschlüssel: Töne werden eine Oktave tiefer notiert als im Violinschlüssel, damit sie im System liegen (Vorzeichen zwei Stufen tiefer)
  const clef = el('g', { style: 'cursor:pointer' });
  clef.appendChild(el('title', {}, 'Tippen: zwischen Violin- und Bassschlüssel wechseln'));
  clef.appendChild(el('rect', { x: 0, y: BY - 62, width: compact ? 44 : 56, height: 72, fill: 'transparent' }));
  clef.appendChild(el('text', bass
    ? { x: compact ? 10 : 14, y: BY - 36 + (compact ? 24 : 34), 'font-size': compact ? 44 : 62, style: 'fill:var(--fg);pointer-events:none', 'font-family': font }
    : { x: compact ? 10 : 14, y: compact ? BY - 3 : BY - 6, 'font-size': compact ? 58 : 84, style: 'fill:var(--fg);pointer-events:none', 'font-family': font },
    bass ? '𝄢' : '𝄞'));
  clef.onclick = () => setClef(bass ? 'treble' : 'bass');
  add(clef);
  const cb = document.getElementById('clefBtn');
  cb.textContent = bass ? 'Violin' : 'Bass';
  const mid = ((BY - 24) / VH * 100).toFixed(1) + '%';          // Pfeile mittig auf Höhe der mittleren Notenlinie
  document.getElementById('stDown').style.top = document.getElementById('stUp').style.top = cp.style.top = mid;
  cb.style.top = ((BY + 10) / VH * 100).toFixed(1) + '%';       // direkt unter dem Schlüssel, am Anfang der Notenzeile
  cb.title = bass ? 'Zum Violinschlüssel wechseln' : 'Zum Bassschlüssel wechseln';

  // Vorzeichen der Tonart
  const sig = st.idx <= 6 ? st.idx : st.idx - 12;
  const sigAlt = [0, 0, 0, 0, 0, 0, 0];
  let x = sx0;
  for (let k = 0; k < Math.abs(sig); k++) {
    const sharp = sig > 0, l = (sharp ? SH : FL)[k], s = (sharp ? SHS : FLS)[k];
    sigAlt[l] = sharp ? 1 : -1;
    add(el('text', { x, y: yOf(s - (bass ? 2 : 0)) + (sharp ? 7 : 5), 'font-size': 26, style: 'fill:var(--fg)', 'font-family': font }, sharp ? '♯' : '♭'));
    x += sdx;
  }

  // Die 8 Töne gleichmäßig über die restliche Breite verteilen
  const half = [];

  notes.forEach((n, i) => {
    const s = (n.oct * 7 + n.l) - (bass ? 18 : 30);           // Position: 0 = untere Linie (E4)
    const cx = x0 + i * sp, cy = yOf(s);
    const role = roleOf(n);
    const col = role ? css(role) : 'var(--fg)';

    // 1) Kasten mit Stufe und Notenname – exakt über der Note
    add(el('rect', {
      class: 'nbox', 'data-i': i,
      x: cx - BW / 2, y: BOX_Y, width: BW, height: BOX_H, rx: 9,
      style: `fill:var(--card);stroke:${role ? col : 'var(--line)'}`, 'stroke-width': 2.5,
    }));
    add(el('text', { x: cx, y: BOX_Y + 14, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:var(--muted)' }, n.lbl || n.deg));
    add(el('text', {
      x: cx, y: BOX_Y + 35, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700,
      style: 'fill:' + (role ? col : 'var(--fg)'),
    }, name(n.l, n.a, false)));

    if (n.oct !== 4) add(el('text', { x: cx + BW / 2 - 5, y: BOX_Y + BOX_H - 5, 'text-anchor': 'end', 'font-size': 10, style: 'fill:var(--muted)' }, octLabel(n.oct)));   // die „1“ (eingestrichene Oktave, Normalfall) bleibt weg   // Oktave nach deutscher Zählung: c¹ (= C4, eingestrichen) → 1, c² → 2 …; kleine/große Oktave: kl/gr

    // 2) feine Führungslinie vom Kasten zur Note
    add(el('line', {
      x1: cx, x2: cx, y1: BOX_Y + BOX_H + 2, y2: cy - 10,
      style: 'stroke:var(--line)', 'stroke-dasharray': '2 3', 'stroke-width': 1.2,
    }));

    // 3) Hilfslinien, Hals, Notenkopf, ggf. Versetzungszeichen
    const ledger = ls => add(el('line', { x1: cx - 12, x2: cx + 12, y1: yOf(ls), y2: yOf(ls), style: 'stroke:var(--fg)', 'stroke-width': 1.2 }));
    for (let ls = -2; ls >= s; ls -= 2) ledger(ls);
    for (let ls = 10; ls <= s; ls += 2) ledger(ls);

    const up = s < 4;
    add(el('line', {
      x1: up ? cx + 6.5 : cx - 6.5, x2: up ? cx + 6.5 : cx - 6.5,
      y1: cy, y2: up ? cy - 34 : cy + 34, style: 'stroke:' + col, 'stroke-width': 1.6,
    }));
    add(el('ellipse', { cx, cy, rx: 7.5, ry: 5.5, transform: `rotate(-20 ${cx} ${cy})`, style: 'fill:' + col }));

    if (n.a !== sigAlt[n.l]) {
      const g = n.a === 0 ? '♮' : n.a === 1 ? '♯' : n.a === -1 ? '♭' : n.a === 2 ? '𝄪' : '𝄫';
      add(el('text', { x: cx - 24, y: cy + 7, 'font-size': 24, style: 'fill:' + col, 'font-family': font }, g));
    }

    // 4) Schrittmarkierung zwischen zwei Tönen: Halbton hervorgehoben
    if (i > 0) {
      const d = n.semi - notes[i - 1].semi, mx = cx - sp / 2;
      const lab = d === 1 ? '½' : (Math.floor(d / 2) + (d % 2 ? '½' : ''));   // Abstand in Ganztönen
      add(el('path', {
        d: `M${cx - sp + 14} ${arcY} q${sp / 2 - 14} 11 ${sp - 28} 0`, fill: 'none',
        style: 'stroke:' + (d === 1 ? 'var(--acc)' : 'var(--line)'), 'stroke-width': d === 1 ? 2.4 : 1.6,
      }));
      add(el('text', {
        x: mx, y: labY, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': d === 1 ? 700 : 400,
        style: 'fill:' + (d === 1 ? 'var(--acc)' : 'var(--muted)'),
      }, lab));
      if (d === 1) half.push(`${i}→${i + 1}`);
    }
  });
  return half;
}

// Breite des Bereichs ändert sich (Drehen, Fenstergröße): zwischen normaler und kompakter Notenzeile umschalten
if ('ResizeObserver' in window) {
  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('stDown').onclick = () => shiftStaff(-1);
    document.getElementById('stUp').onclick = () => shiftStaff(1);
    document.getElementById('clefBtn').onclick = () => setClef(staffClef === 'bass' ? 'treble' : 'bass');
    const box = document.getElementById('staff').parentElement;
    new ResizeObserver(() => {
      if (lastStaffNotes && ((box.clientWidth || 700) - STAFF_PAD < 600) !== lastStaffCompact) drawStaff(lastStaffNotes);
    }).observe(box);
  });
}
