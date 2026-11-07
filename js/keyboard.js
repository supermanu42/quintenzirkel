'use strict';

/*
 * Klaviatur über zwei Oktaven (C4–H5).
 * Grundton/Oktave, Terz und Quinte in Signalfarben, alle übrigen Stufen dezent grau.
 */

const KEY_W = 40, KEY_H = 112, BLACK_H = 70, BLACK_W = 24;
const GREY_WHITE = '#c9c5ba', GREY_BLACK = '#7d7a72';   // „gedämpfte“ Töne

/** Taste angeklickt: Ton anspielen und das Griffbrett auf diesen Grundton (Dur) stellen – dort lässt sich direkt auf Moll umschalten. */
function keyClicked(m) {
  playMidis([m]);
  const pc = ((m % 12) + 12) % 12, [l, a] = MAJ.find(([ll, aa]) => (PC[ll] + aa + 12) % 12 === pc);
  fbSetKey(l, a, false);
}

function drawKeys(notes) {
  const svg = document.getElementById('keys');
  svg.innerHTML = '';
  svg.onclick = e => { const k = e.target.closest && e.target.closest('.kk'); if (k) keyClicked(+k.dataset.m); };
  const byMidi = {};
  notes.forEach(n => { byMidi[midiOf(n)] = n; });

  const keyFill = (n, grey) => {
    const r = roleOf(n);
    return r ? css(r) : grey;
  };
  const labelStyle = n => 'fill:' + (roleOf(n) ? 'var(--onrole)' : '#2b2926');

  // Zwei Oktaven ab dem C unterhalb des ersten Tons – folgt den Oktav-Pfeilen und dem Schlüssel der Notenzeile
  const M0 = 12 * (notes[0].oct + 1), M1 = M0 + 23;
  const cLbl = (m, style) => {          // Oktavbezeichnung an jedem C (deutsch: das eingestrichene C = „1“ bleibt unbeschriftet)
    const o = Math.floor(m / 12) - 1;
    return o === 4 ? null : 'C' + octLabel(o);
  };
  const whites = [];
  for (let m = M0; m <= M1; m++) if ([0, 2, 4, 5, 7, 9, 11].includes(m % 12)) whites.push(m);

  whites.forEach((m, i) => {
    const n = byMidi[m], cx = i * KEY_W + KEY_W / 2;
    svg.appendChild(el('rect', {
      class: 'kk', 'data-m': m, 'data-hl': n ? 1 : 0,
      x: i * KEY_W + 1, y: 1, width: KEY_W - 2, height: KEY_H, rx: 4,
      style: 'fill:' + (n ? keyFill(n, GREY_WHITE) : '#fff') + ';stroke:#333', 'stroke-width': 1.2,
    }));
    if (n) {
      svg.appendChild(el('text', { x: cx, y: KEY_H - 38, 'text-anchor': 'middle', 'font-size': 12, style: labelStyle(n) + ';opacity:.85' }, n.lbl || n.deg));
      svg.appendChild(el('text', { x: cx, y: KEY_H - 16, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, style: labelStyle(n) }, name(n.l, n.a, false)));
    }
    if (m % 12 === 0 && cLbl(m)) {
      svg.appendChild(el('text', { x: cx, y: KEY_H - 4, 'text-anchor': 'middle', 'font-size': 10, style: 'fill:' + (n ? 'var(--onrole)' : '#888') + ';opacity:.9' }, cLbl(m)));
    }
  });

  for (let m = M0; m <= M1; m++) {
    if (![1, 3, 6, 8, 10].includes(m % 12)) continue;
    const i = whites.indexOf(m - 1), x = i * KEY_W + KEY_W - 12, n = byMidi[m];
    svg.appendChild(el('rect', {
      class: 'kk', 'data-m': m, 'data-hl': n ? 1 : 0,
      x, y: 1, width: BLACK_W, height: BLACK_H, rx: 3,
      style: 'fill:' + (n ? keyFill(n, GREY_BLACK) : '#222') + ';stroke:#000', 'stroke-width': 1.2,
    }));
    if (n) {
      const white = roleOf(n) ? 'fill:var(--onrole)' : 'fill:#fff';
      svg.appendChild(el('text', { x: x + 12, y: 38, 'text-anchor': 'middle', 'font-size': 11, style: white + ';opacity:.85' }, n.lbl || n.deg));
      svg.appendChild(el('text', { x: x + 12, y: 55, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, style: white }, name(n.l, n.a, false)));
    }
  }
}
