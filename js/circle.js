'use strict';

/*
 * Quintenzirkel: drehbarer Ring + fester Rahmen + Pfeiltasten in der Mitte.
 *
 * Aufbau im SVG (siehe index.html):
 *   #circRing   Ring der Tonarten – wird bei jeder Änderung neu gebaut und dann nur noch gedreht
 *   #circFixed  Rahmen, Tonartname und Pfeiltasten – werden einmal gebaut und stehen still
 */

function sector(r1, r2, a0, a1) {
  const p = (r, a) => [r * Math.cos(a), r * Math.sin(a)].map(v => v.toFixed(2)).join(' ');
  return `M${p(r2, a0)}A${r2} ${r2} 0 0 1 ${p(r2, a1)}L${p(r1, a1)}A${r1} ${r1} 0 0 0 ${p(r1, a0)}Z`;
}

let circleMarks = [];          // Tonhöhenklassen, die gestrichelt umrandet werden
let circTexts = [];            // Beschriftungen, die beim Drehen waagrecht bleiben müssen

/** Ring der Tonarten bauen (nur bei Änderung von Tonart/Modus, nicht bei jedem Animationsbild). */
function buildCircle() {
  const ring = document.getElementById('circRing');
  ring.innerHTML = '';
  circTexts = [];
  const g = el('g', { id: 'circRot' });
  ring.appendChild(g);
  const upright = t => { circTexts.push(t); return t; };
  const isMin = st.type !== 'dur';

  for (let i = 0; i < 12; i++) {
    const a0 = (i * 30 - 105) * Math.PI / 180, a1 = (i * 30 - 75) * Math.PI / 180, am = (i * 30 - 90) * Math.PI / 180;
    const sig = i <= 6 ? i : i - 12;
    const sigTxt = sig === 0 ? '' : Math.abs(sig) + (sig > 0 ? '♯' : '♭');

    [['dur', MAJ[i], 200, 135, 168], ['moll', MIN[i], 135, 85, 110]].forEach(([ring, [l, a], r2, r1, rt]) => {
      const sel = st.idx === i && ((ring === 'dur') === !isMin);
      const rel = st.idx === i && !sel;
      const dist = (i - st.idx + 12) % 12;
      const sameRing = (ring === 'dur') === !isMin;
      let tag = '';
      if (sameRing && dist === 1) tag = 'D';
      if (sameRing && dist === 11) tag = 'S';

      const p = el('path', {
        d: sector(r1, r2, a0, a1),
        fill: sel ? css('acc') : rel ? css('accbg') : tag ? css('seg2') : css('seg'),
      });
      p.addEventListener('click', () => {
        const dl = ((i - st.idx + 6) % 12 + 12) % 12 - 6;   // kürzester Drehweg
        st.turn += dl;
        st.idx = i;
        st.type = ring === 'dur' ? 'dur' : (st.type === 'dur' ? 'moll' : st.type);
        render();
        playChord(currentNotes);      // angeklickte Tonart kurz anspielen
      });
      g.appendChild(p);

      let nm = name(l, a, ring === 'moll');
      if (ring === 'dur' && i === 6) nm = 'Fis/Ges';
      const t = el('text', {
        x: (rt * Math.cos(am)).toFixed(1),
        y: (rt * Math.sin(am) + (tag ? -2 : 5)).toFixed(1),
        'text-anchor': 'middle',
        'font-size': ring === 'dur' ? (i === 6 ? 13 : 19) : 15,
        'font-weight': sel ? 700 : 500,
      }, nm);
      if (sel) t.style.fill = '#fff';
      g.appendChild(upright(t));

      if (tag) {
        g.appendChild(upright(el('text', {
          x: (rt * Math.cos(am)).toFixed(1),
          y: (rt * Math.sin(am) + (ring === 'dur' ? 17 : 14)).toFixed(1),
          'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, style: 'fill:var(--acc)',
        }, tag)));
      }
    });

    const ra = 215;
    g.appendChild(upright(el('text', {
      x: (ra * Math.cos(am)).toFixed(1), y: (ra * Math.sin(am) + 4).toFixed(1),
      'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--muted)',
    }, sigTxt)));
  }

  // Dezent gestrichelt: Töne der Tonleiter bzw. des Akkords, die NICHT im festen Rahmen liegen.
  // Der Rahmen deckt je drei Felder der Dur- und der Moll-Reihe ab (Subdominante, Tonika, Dominante).
  // Fehlende Töne (z. B. das H bei C-Dur) stehen in der inneren Reihe direkt neben dem Rahmen bzw. an ihrer Stelle.
  const covered = new Set();
  [-1, 0, 1].forEach(k => {
    const j = (st.idx + k + 12) % 12;
    covered.add((PC[MAJ[j][0]] + MAJ[j][1] + 12) % 12);
    covered.add((PC[MIN[j][0]] + MIN[j][1] + 12) % 12);
  });
  new Set(circleMarks).forEach(pc => {
    if (covered.has(pc)) return;
    const i = MIN.findIndex(([l, a]) => (PC[l] + a + 12) % 12 === pc);
    if (i < 0) return;
    const a0 = (i * 30 - 105) * Math.PI / 180, a1 = (i * 30 - 75) * Math.PI / 180;
    g.appendChild(el('path', {
      d: sector(89, 131, a0 + 0.04, a1 - 0.04), fill: 'none', 'stroke-width': 2.2, 'stroke-dasharray': '5 4',
      style: 'stroke:var(--acc);pointer-events:none', opacity: 0.9,
    }));
  });
  drawDegreeBadges(g, upright);
}

/**
 * Akkorde: Nur die dazukommenden Töne (7, 9, 11, 13, 6, 4, 2 … – alles außer Grundton, Terz, Quinte) bekommen im äußeren Ring
 * eine kleine, dezente Plakette mit der Zahl (ohne Vorzeichen; das genaue Intervall steht im Tooltip). Tonleitern: keine Plaketten.
 */
/** Felder des festen Rahmens: Subdominante, Tonika, Dominante – in beiden Ringen. */
function frameIdx() { return [-1, 0, 1].map(k => (st.idx + k + 12) % 12); }

/**
 * Wo im Kreis liegt ein Ton? Zuerst im Rahmen (äußerer, dann innerer Ring), sonst im äußeren Ring, zuletzt im inneren.
 * outside = true: bevorzugt ein Feld AUSSERHALB des Rahmens (für „+9“ oder „−7“).
 * Ergebnis: { ring: 'out' | 'in', i }  oder null.
 */
function locatePc(pc, outside) {
  const fr = frameIdx(), at = (arr, i) => (PC[arr[i][0]] + arr[i][1] + 12) % 12 === pc;
  const out = [...Array(12).keys()].filter(i => at(MAJ, i)), inn = [...Array(12).keys()].filter(i => at(MIN, i));
  if (outside) {
    const o = out.find(i => !fr.includes(i)); if (o !== undefined) return { ring: 'out', i: o };
    const n = inn.find(i => !fr.includes(i)); if (n !== undefined) return { ring: 'in', i: n };
  } else {
    const o = out.find(i => fr.includes(i)); if (o !== undefined) return { ring: 'out', i: o };
    const n = inn.find(i => fr.includes(i)); if (n !== undefined) return { ring: 'in', i: n };
  }
  if (out.length) return { ring: 'out', i: out[0] };
  if (inn.length) return { ring: 'in', i: inn[0] };
  return null;
}

/** Position eines Rings (Mittelpunkt für Plaketten und Kleinschrift). */
function fieldPos(loc, rOut, rIn) {
  const am = (loc.i * 30 - 90) * Math.PI / 180, r = loc.ring === 'out' ? rOut : rIn;
  return [r * Math.cos(am), r * Math.sin(am)];
}

function drawDegreeBadges(g, upright) {
  if (!currentNotes.isChord) return;
  const root = currentNotes[0], rl = locatePc(pcOf(root), false);
  if (rl) {                                  // Grundton: roter Rahmen am Feld im Rahmen (z. B. cis in cis-Moll)
    const a0 = (rl.i * 30 - 105) * Math.PI / 180, a1 = (rl.i * 30 - 75) * Math.PI / 180, o = rl.ring === 'out';
    g.appendChild(el('path', { d: o ? sector(137, 198, a0 + 0.03, a1 - 0.03) : sector(87, 133, a0 + 0.03, a1 - 0.03),
      fill: 'none', 'stroke-width': 3, style: `stroke:${css(roleOf(root) || 'root')};pointer-events:none` }));
  }
  // Plakette: Grundton/Terz/Quinte/Zahlen im Rahmen als Zahl, Hinzugefügtes („+9“) und Weggelassenes („−7“) im übrigen Kreis
  const pill = (loc, lab, tip, col, fill, dashed) => {
    if (!loc) return;
    const [x, y] = fieldPos(loc, 190, 95), w = lab.length > 1 ? 30 : 18;
    const c = el('rect', { x: (x - w / 2).toFixed(1), y: (y - 9).toFixed(1), width: w, height: 18, rx: 9, 'stroke-width': 2,
      'stroke-dasharray': dashed ? '3 2' : '',
      style: `fill:${fill ? `color-mix(in srgb, ${fill} 32%, var(--card))` : 'var(--card)'};stroke:${col};pointer-events:none` });
    c.appendChild(el('title', {}, tip));
    c.dataset.cx = x.toFixed(1); c.dataset.cy = y.toFixed(1);
    g.appendChild(upright(c));             // Plakette bleibt beim Drehen waagrecht
    g.appendChild(upright(el('text', { x: x.toFixed(1), y: (y + 4).toFixed(1), 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
      style: 'fill:var(--fg);pointer-events:none' }, lab)));
  };
  currentNotes.forEach(n => {
    const core = [1, 3, 5].includes(n.deg), lab = String(n.lbl || n.deg).replace(/[♭♯𝄫]/g, '');
    if (core) {                       // Grundton orange, Terz blau, Quinte grün – wie in Notenzeile und Klaviatur, nur pastellig gefüllt
      const col = css(roleOf(n) || 'root');
      pill(locatePc(pcOf(n), false), lab, String(n.lbl || n.deg), col, col);
    } else if (n.deg === 2 || n.deg === 4) {    // ersetzt in Sus-Akkorden die Terz: einfache Zahl
      pill(locatePc(pcOf(n), false), lab, `${n.lbl || n.deg}: ${n.ivn}`, '#2f9e44', null);
    } else {                          // dazukommender Ton: grüner Rand mit Plus, im übrigen Kreis
      pill(locatePc(pcOf(n), true), '+' + lab, `${n.lbl || n.deg}: dazukommender Ton des Akkords`, '#2f9e44', null);
    }
  });
  // Genaue Schreibweise (nur in der Ansicht „Korrekt“): kleiner kursiver Name im Feld, wenn der Kreis einen anderen Namen trägt
  if (!spellSimple) currentNotes.forEach(n => {
    const loc = locatePc(pcOf(n), false);
    if (!loc) return;
    const spelled = name(n.l, n.a, false), f = loc.ring === 'out' ? MAJ[loc.i] : MIN[loc.i];
    const field = loc.ring === 'out' ? name(f[0], f[1], false) : name(f[0], f[1], true);
    if (field.toLowerCase() === spelled.toLowerCase() || (loc.ring === 'out' && loc.i === 6 && /Fis|Ges/.test(spelled))) return;
    const [x, y] = fieldPos(loc, 148, 124);
    g.appendChild(upright(el('text', { x: x.toFixed(1), y: (y + 3).toFixed(1), 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, 'font-style': 'italic',
      style: `fill:${css(roleOf(n) || 'root')};pointer-events:none` }, spelled)));
  });
  // Sus-Akkord ohne Terz: die ersetzte Terz als „−3“ andeuten (in Moll-Tonarten die kleine, sonst die große Terz)
  const ghost = (pc, lab, tip) => pill(locatePc(pc, true), lab, tip, '#e03131', null, true);
  if (!currentNotes.some(n => n.deg === 3)) ghost((pcOf(root) + (st.type !== 'dur' ? 3 : 4)) % 12, '−3', 'ohne Terz: dieser Ton (Terz der Tonart) wird nicht gespielt – er ist ersetzt');
  // Neunerakkord ohne Septime: die fehlende Septime als roter, gestrichelter „−7“-Rand andeuten
  if (currentNotes.some(n => n.deg >= 9) && !currentNotes.some(n => n.deg === 7)) ghost((pcOf(root) + 10) % 12, '−7', 'ohne Septime: dieser Ton (kleine Septime) wird nicht gespielt');
}

/** Beim Spielen leuchtet kurz das Feld des Grundtons (Tonleiter: Tonika; Akkord: Akkord-Grundton im Rahmen). */
function flashRoot(notes) {
  const g = document.getElementById('circRot');
  if (!g || !notes || !notes.length) return;
  const loc = locatePc(pcOf(notes[0]), false);
  if (!loc) return;
  const a0 = (loc.i * 30 - 105) * Math.PI / 180, a1 = (loc.i * 30 - 75) * Math.PI / 180;
  const path = el('path', { d: loc.ring === 'in' ? sector(85, 135, a0, a1) : sector(135, 200, a0, a1), class: 'rootflash' });
  g.appendChild(path);
  setTimeout(() => path.remove(), 1500);
}

/** Ring um ang Grad drehen; alle Texte um denselben Winkel zurückdrehen, damit sie lesbar bleiben. */
function setCircleAngle(ang) {
  const g = document.getElementById('circRot');
  if (!g) return;
  g.setAttribute('transform', `rotate(${ang})`);
  circTexts.forEach(t => t.setAttribute('transform', `rotate(${-ang} ${t.dataset.cx || t.getAttribute('x')} ${t.dataset.cy || t.getAttribute('y')})`));
}

let shown = 0, raf;
function animCircle() {
  buildCircle();
  updateCircleCenter();
  const target = -st.turn * 30, from = shown, t0 = performance.now();
  cancelAnimationFrame(raf);
  setCircleAngle(from);
  const step = now => {
    const p = Math.min(1, (now - t0) / 300), e = 1 - Math.pow(1 - p, 3);   // ease-out
    shown = from + (target - from) * e;
    setCircleAngle(shown);
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

/** Feste Teile einmal bauen: Rahmen, Tonartname und die vier Pfeiltasten in der Mitte. */
function initCircle() {
  const fixed = document.getElementById('circFixed');
  fixed.appendChild(el('path', {
    d: sector(85, 205, -135 * Math.PI / 180, -45 * Math.PI / 180),
    style: 'fill:none;stroke:var(--acc);stroke-width:3.5;stroke-linejoin:round;pointer-events:none',
  }));
  fixed.appendChild(el('text', { id: 'circTitle', x: 0, y: -46, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700 }));
  fixed.appendChild(el('text', { id: 'circSig', x: 0, y: -29, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--muted)' }));

  const button = (action, cx, cy, glyph, label) => {
    const g = el('g', { class: 'cbtn', role: 'button', tabindex: 0, 'aria-label': label });
    g.appendChild(el('title', {}, label));
    g.appendChild(el('rect', { x: cx - 17, y: cy - 15, width: 34, height: 30, rx: 8 }));
    g.appendChild(el('text', { x: cx, y: cy + 6, 'text-anchor': 'middle', 'font-size': 18 }, glyph));
    const fire = () => { go[action](); render(); };
    g.addEventListener('click', fire);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
    fixed.appendChild(g);
  };
  button('up',    0,  -2, '↑', 'Dur');
  button('left', -38, 32, '←', 'Quinte abwärts');
  button('down',   0, 32, '↓', 'Paralleltonart Moll');
  button('right', 38, 32, '→', 'Quinte aufwärts');
}

function updateCircleCenter() {
  const isMin = st.type !== 'dur';
  const [l, a] = (isMin ? MIN : MAJ)[st.idx];
  const sig = st.idx <= 6 ? st.idx : st.idx - 12;
  const title = name(l, a, isMin) + (isMin ? '-Moll' : '-Dur');
  document.getElementById('circTitle').textContent = title;
  document.getElementById('circSig').textContent = sig === 0 ? 'keine Vorzeichen' : Math.abs(sig) + (sig > 0 ? ' ♯' : ' ♭');
  document.getElementById('circKey').textContent = title;
  const sw = document.getElementById('spellSw');              // Schalter Einfach/Korrekt nur mit gewähltem Akkord
  if (sw) { sw.hidden = !st.chord; sw.querySelectorAll('button').forEach(b => b.classList.toggle('on', (b.dataset.spell === 'einfach') === spellSimple)); }
  const cc = document.getElementById('circChord');            // gewählter Akkord groß links oben im Quintenzirkel
  if (st.chord) {
    const short = s => s.replace('reine ', '').replace('große', 'gr.').replace('kleine', 'kl.').replace('verminderte', 'verm.').replace('übermäßige', 'übermäß.');
    const ivs = currentNotes.isChord ? currentNotes.map(n => short(n.ivn)).join(' · ') : '';
    cc.innerHTML = '';
    cc.appendChild(document.createTextNode(chordLabel(name(l, a, false), CHORD_BY_KEY[st.chord][2])));
    if (ivs) { const s = document.createElement('small'); s.textContent = ivs; cc.appendChild(s); }
  } else cc.textContent = title;     // ohne Akkord: die Tonart, sonst der Akkord       // Tonart steht auch in der Kopfzeile (wichtig, wenn eingeklappt)
}
