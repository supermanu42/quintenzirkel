'use strict';

/*
 * Griffbrett für Saiteninstrumente (Gitarre, Bass, Cello) – immer quer, über die volle Breite, maximierbar.
 *
 * Grundidee: Jede Saite hat eine Stimmung als MIDI-Nummer. Der Ton an Bund f ist
 *     midi = Leersaite + f
 * Gehört (midi mod 12) zur Tonleiter, wird dort ein Punkt gezeichnet –
 * dieselbe Tonhöhenklassen-Prüfung wie bei der Klaviatur.
 *
 * Gezeichnet wird in der tatsächlichen Pixelbreite des Bereichs (ResizeObserver):
 * je breiter, desto größer Punkte und Saitenabstand. Im maximierten Zustand wird zusätzlich
 * die Höhe berücksichtigt und das Griffbrett so groß wie möglich dargestellt.
 *
 * Neue Instrumente: einfach einen Eintrag in INSTRUMENTS ergänzen.
 */

const INSTRUMENTS = {
  gitarre: {
    label: 'Gitarre',
    strings: [40, 45, 50, 55, 59, 64],                 // tief → hoch
    names:   ['E2', 'A2', 'D3', 'G3', 'H3', 'E4'],
    frets: 15, fretted: true, marks: [3, 5, 7, 9, 12, 15],
    spH: 28,                                            // Saitenabstand in Pixeln (Grundwert, wird mitskaliert)
    note: 'Quarten – nur zwischen G und H eine große Terz. Im Quintenzirkel ist jede Quarte ein Feld gegen den Uhrzeigersinn (E → A → D → G).',
    hint: 'Zahlen = Bund, leere Saiten vor dem Sattel.',
    clef: 'treble',
  },
  bass: {
    label: 'Bass',
    strings: [28, 33, 38, 43],
    names:   ['E1', 'A1', 'D2', 'G2'],
    frets: 15, fretted: true, marks: [3, 5, 7, 9, 12, 15],
    spH: 34, clef: 'bass',
    note: 'Durchgehend Quarten (E → A → D → G) – im Quintenzirkel je ein Feld gegen den Uhrzeigersinn.',
    hint: 'Zahlen = Bund, leere Saiten vor dem Sattel.',
  },
  cello: {
    label: 'Cello',
    strings: [36, 43, 50, 57],
    names:   ['C2', 'G2', 'D3', 'A3'],
    frets: 12, fretted: false, marks: [],
    // Lagen am Cello: Halbtöne über der leeren Saite, an denen der 1. Finger steht (Zählung nach der Dur-Tonleiter der leeren Saite,
    // dazwischen die „halben“ Lagen): ½ = 1, 1 = 2, 1½ = 3, 2 = 4, 3 = 5, 3½ = 6, 4 = 7 (E auf der A-Saite – hier endet der Hals am Korpus,
    // der Daumen kommt nicht mehr mit), danach höhere Lagen bis zur 7. Lage (Oktave, = 12). Jede Lage umfasst vier Halbtöne.
    lagen: [['½', 1], ['1', 2], ['1½', 3], ['2', 4], ['3', 5], ['3½', 6], ['4', 7],
            ['4½', 8, true], ['5', 9, true], ['5½', 10, true], ['6', 11, true], ['7', 12, true]],
    knick: 7, defaultLage: 1,
    spH: 34, clef: 'bass',
    note: 'Durchgehend Quinten (C → G → D → A) – im Quintenzirkel je ein Feld im Uhrzeigersinn.',
    hint: 'Zahlen = Halbtonschritte ab der leeren Saite (das Cello hat keine Bünde).',
  },
};

const FB_GREY = css('dotgrey'), FB_GREY_LINE = '#8d887c', FB_GREY_TEXT = '#2b2926';

// Zustand: gewähltes Instrument, Beschriftung (Ton/Stufe), maximiert ja/nein
const fb = { pc: 0, minor: false, inst: 'gitarre', label: 'ton', max: false, shapes: false, lagen: false, lage: 0, lageId: '', fingers: false, more: false };   // lageId: Gitarre/Bass – gewählte Position (Stufe des Zeigefinger-Tons auf der tiefsten Saite, 'h' = Oktave höher)   // lagen: Lagen-Ansicht an/aus, lage: Nummer in der Lagen-Liste des Instruments
let fbShapeExtra = 0;   // wie viele weitere Griffbilder „+“ einblenden würde
let fbNotes = [], fbKey = '', fbScrollX = null, fbScrollKey = '';   // fbScrollX: linker Rand der gewählten Position (für das Scrollen auf Handys)

/** Tonhöhenklasse (0–11) → Ton der Tonleiter (Stufen 1–7, ohne die Oktave) */
function scaleByPitchClass(notes) {
  const map = {};
  notes.slice(0, 7).forEach(n => { map[((midiOf(n) % 12) + 12) % 12] = n; });
  return map;
}

/**
 * Koordinaten des Griffbretts für die Breite availW (Pixel).
 * availH > 0 heißt „maximiert“: dann so groß, wie Breite UND Höhe erlauben, und senkrecht zentriert.
 */
function neckGeometry(inst, availW, availH, th, bot) {
  th = th || 0; bot = bot || 0;                                  // bot: Platz unter den Bundnummern (Positions-Leiste)                                                  // Höhe der Nummern-Reiter über dem Griffbrett (nur bei Blöcken)
  const n = inst.strings.length, F = inst.frets;
  const W = Math.max(380, availW);
  const fw0 = (W - 70) / F;                                     // ungefähre Bundbreite
  let s = Math.min(Math.max(fw0 / 50, 1), 1.35);                // normal: wächst etwas mit der Breite mit
  if (availH) s = Math.max(1, Math.min((availH - 50 - th - bot) / (n * inst.spH), fw0 * 1.07 / inst.spH));
  const sp = inst.spH * s;                                       // Saitenabstand
  const r = Math.min(sp, fw0) * 0.42;                            // Punktradius: passt in Bund und zwischen die Saiten
  const XO = r + 6, X0 = XO + r + 12, X1 = W - 6;               // leere Saite, Sattel, Ende
  const fw = (X1 - X0) / F, bh = n * sp;
  const numSize = Math.max(11, Math.min(18, r * 0.9));
  const TOP = th + (availH ? Math.max(10, (availH - bh - numSize - 14 - th - bot) / 2) : 10);
  return {
    s, r, numSize,
    W, H: availH || TOP + bh + numSize + 14 + bot,
    board:  { x: X0, y: TOP, w: X1 - X0, h: bh },
    dot:    (si, f)  => [f === 0 ? XO : X0 + (f - 0.5) * fw, TOP + sp / 2 + (n - 1 - si) * sp],
    string: si       => { const y = TOP + sp / 2 + (n - 1 - si) * sp; return [X0, y, X1, y]; },
    fret:   k        => [X0 + k * fw, TOP, X0 + k * fw, TOP + bh],
    span:   (s, e)   => [s === 0 ? XO - r - 4 : X0 + (s - 1) * fw + 2, X0 + e * fw - 2],   // x-Bereich der Bünde s…e
    inlay:  (f, off) => [X0 + (f - 0.5) * fw, TOP + bh / 2 + off * bh],
    num:    f        => ({ x: X0 + (f - 0.5) * fw, y: TOP + bh + numSize + 2 }),
  };
}

function fbDot(svg, x, y, r, n, op) {
  const role = roleOf(n);
  svg.appendChild(el('circle', {
    cx: x, cy: y, r, 'stroke-width': 1.2, opacity: op,
    style: `fill:${role ? css(role) : FB_GREY};stroke:${role ? 'none' : FB_GREY_LINE}`,
  }));
  const byDegree = fb.label === 'stufe';
  svg.appendChild(el('text', {
    x, y: y + r * 0.33, 'text-anchor': 'middle', 'font-size': r * (byDegree ? 1.0 : 0.88), 'font-weight': 700, opacity: op < 1 ? 0.9 : 1,
    style: 'fill:' + (op < 1 ? 'var(--fg)' : role ? 'var(--onrole)' : FB_GREY_TEXT),
  }, byDegree ? (n.lbl || n.deg) : name(n.l, n.a, false)));
}

/**
 * Lagen eines Instruments als Liste. Gitarre/Bass: n. Lage = Bünde n bis n+3 (Lage 1 zusätzlich mit leeren Saiten).
 * Cello: feste Liste (siehe INSTRUMENTS.cello), da es keine Bünde gibt und die Zählung anders beginnt.
 */
function lagenOf(inst) {
  if (fb.shapes && fb.inst === 'gitarre') return shapesOf(inst);      // Ansicht „Akkord“: Griffbilder statt Positionen
  if (inst.lagen) {
    return inst.lagen.map(([lbl, from, thumb]) => ({
      lbl, from, lo: from, hi: Math.min(from + 3, inst.frets), thumb: !!thumb, free: true,   // thumb = höhere Lage jenseits des Knicks
      name: lbl === '½' ? 'Halbe Lage' : `${lbl}. Lage`,
      info: `Halbtöne ${from}–${Math.min(from + 3, inst.frets)} über der leeren Saite${thumb ? ' · höhere Lage (jenseits des Halsknicks)' : ''}`,
    }));
  }
  // Gitarre/Bass: „Positionen“ – benannt nach dem Bund, auf dem der Zeigefinger liegt (Bund s bis s+3, ein Finger je Bund; ein Bund davor/dahinter
  // ist mit Dehnung erreichbar). Im Standard-Stimmung enthält jede dieser Vierbund-Positionen alle sieben Töne der Tonleiter.
  // Empfohlen wird die Position nach recommendStart().
  // Jedes Vierbund-Fenster 0…F-3 ist wählbar (‹ ›). Hervorgehoben („main“, Balken in der Leiste) werden: die empfohlene Position, die Reihe
  // „Mittelfinger auf jedem Tonleiterton der A-Saite“ (Zeigefinger einen Bund davor) und die Positionen mit dem Zeigefinger auf dem Grundton
  // der E- bzw. A-Saite. So rutscht man Schritt für Schritt das Griffbrett hinauf; benachbarte Positionen überlappen sich.
  const rec = fbNotes.length ? recommendStart(inst, pcOf(fbNotes[0])) : 0, main = new Set([rec]);
  if (fbNotes.length) {
    const pcs = new Set(fbNotes.map(pcOf)), rootPc = pcOf(fbNotes[0]);
    for (let f = 0; f <= inst.frets; f++) {
      if (pcs.has((inst.strings[1] + f) % 12)) main.add(Math.max(0, f - 1));
      if (f > 0 && [0, 1].some(i => (inst.strings[i] + f) % 12 === rootPc)) main.add(f);      // Zeigefinger auf dem Grundton
    }
  }
  const out = [];
  for (let s = 0; s <= inst.frets - 3; s++) out.push({
    id: String(s), from: s, lo: s, hi: s + 3, root: s === rec, main: main.has(s), lbl: String(s),
    name: s === 0 ? 'Offene Position' : `ab Bund ${s}`,
    info: `Bund ${s}–${s + 3}${s === 0 ? ' mit leeren Saiten' : ''} · Zeigefinger auf Bund ${s}, kleiner Finger auf Bund ${s + 3}${s === rec ? ' · empfohlen (Grundton unter dem Mittelfinger bzw. leer)' : ''}` });
  return out;
}

/**
 * Empfohlene Startposition (Bund des Zeigefingers) für den Grundton:
 * Der Grundton soll auf einer der tiefen Saiten (E, A) mit dem Mittelfinger gegriffen werden – der Zeigefinger liegt dann einen Bund davor
 * und kann auch einen Bund zurückgreifen – oder als leere Saite (E, A, D) erklingen (dann: offene Position). Von mehreren Möglichkeiten
 * gewinnt die tiefste. Beispiele: C-Dur → Bund 2 (C = Bund 3 auf der A-Saite), G-Dur → Bund 2, e-Moll/E-Dur → offen, F-Dur → offen.
 */
function recommendStart(inst, rootPc) {
  const cands = [];
  [0, 1, 2].forEach(i => {
    if (i >= inst.strings.length) return;
    const r = ((rootPc - inst.strings[i]) % 12 + 12) % 12;
    if (r === 0) cands.push(0);                          // leere Saite
    else if (i < 2) cands.push(r >= 2 ? r - 1 : 0);      // E-/A-Saite: Mittelfinger auf dem Grundton
  });
  return Math.min(Math.max(0, Math.min(...cands)), inst.frets - 3);
}

/** Gewählte Lage (Gitarre/Bass über die Stufe, damit sie beim Tonartwechsel sinnvoll bleibt). */
function syncLage(inst, lagen) {
  if (!inst.lagen && lagen.length) {
    const i = lagen.findIndex(l => l.id === fb.lageId);
    fb.lage = i >= 0 ? i : Math.max(0, lagen.findIndex(l => l.root));
    fb.lageId = lagen[fb.lage].id;
  } else fb.lage = Math.max(0, Math.min(lagen.length - 1, fb.lage));
}

function drawNeck(svg, inst, pcMap, availW, availH) {
  const th = fb.lagen && inst.lagen ? 22 : 0;       // Platz für Nummern-Reiter (beim Cello zusätzlich für die Knick-Beschriftung)
  const lagen = lagenOf(inst);
  syncLage(inst, lagen);
  const bot = 0;
  const g = neckGeometry(inst, availW, availH, th, bot), n = inst.strings.length, F = inst.frets;
  svg.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`);
  svg.innerHTML = '';
  const add = e => svg.appendChild(e);
  const line = (a, style, w, extra) =>
    add(el('line', Object.assign({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], style, 'stroke-width': w }, extra || {})));
  const k = Math.min(g.s, 1.8);                                  // Linienstärken wachsen nur mäßig mit

  // Griffbrett
  add(el('rect', { x: g.board.x, y: g.board.y, width: g.board.w, height: g.board.h, rx: 5,
    style: 'fill:var(--seg);stroke:var(--line)', 'stroke-width': 1.5 }));

  // Einlagen (Punkte bei Bund 3, 5, 7, 9, 12 doppelt, 15)
  inst.marks.forEach(f => {
    (f % 12 === 0 ? [-0.2, 0.2] : [0]).forEach(o => {
      const [x, y] = g.inlay(f, o);
      add(el('circle', { cx: x, cy: y, r: g.r * 0.45, style: 'fill:var(--line);opacity:.7' }));
    });
  });

  // Bundstäbchen (beim Cello nur gestrichelte Hilfslinien für die Halbtonschritte) und Sattel
  for (let i = 1; i <= F; i++) {
    line(g.fret(i), 'stroke:' + (inst.fretted ? 'var(--muted)' : 'var(--line)'), (inst.fretted ? 1.6 : 1.2) * k,
      inst.fretted ? {} : { 'stroke-dasharray': '4 4' });
  }
  line(g.fret(0), 'stroke:var(--fg)', 5 * k);

  // Saiten: tiefe dick, hohe dünn
  for (let si = 0; si < n; si++) line(g.string(si), 'stroke:var(--muted)', (1 + 1.6 * (1 - si / (n - 1))) * k);

  // Ansicht „Akkord“ (Gitarre): Griffbild des Akkords (offen oder Barré) statt der Töne der Tonleiter
  if (fb.shapes && fb.inst === 'gitarre') {
    syncLage(inst, lagen);
    const V = lagen[fb.lage];
    if (V) {
      drawShape(add, g, inst, pcMap, V);
      fbScrollX = g.span(V.lo, V.hi)[0];
    } else {
      add(el('text', { x: g.board.x + 14, y: g.board.y + g.board.h / 2, 'font-size': 15, style: 'fill:var(--muted)' }, 'Für diesen Akkord sind noch keine Griffbilder hinterlegt.'));
    }
    for (let f = 1; f <= F; f++) {
      const p = g.num(f);
      add(el('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'font-size': g.numSize, style: 'fill:var(--muted)' }, f));
    }
    return;
  }

  // Lagen: Der Rahmen zeigt die gewählte Lage, alle übrigen Töne werden abgeblendet.
  // Die Nummern über den Bünden sind anklickbar. Beim Cello gibt es zusätzlich eine Markierung für den Knick des Halses.
  syncLage(inst, lagen);
  const L = lagen[fb.lage] || { lo: 0, hi: 0 }, lo = L.lo, hi = L.hi, fretted = !inst.lagen;
  if (fb.lagen || fretted) fbScrollX = g.span(lo, hi)[0];
  if (fb.lagen) {
    const [x1, x2] = g.span(lo, hi);
    add(el('rect', { x: x1, y: g.board.y - 2, width: x2 - x1, height: g.board.h + 4, rx: 8, 'stroke-width': 2.6,
      style: 'fill:var(--accbg);stroke:var(--acc);opacity:.5;pointer-events:none' }));
  }
  // Ganzes Griffbrett (Gitarre/Bass): dezenter gestrichelter Rahmen an der gewählten Lage (Standard: Zeigefinger auf dem Grundton)
  if (!fb.lagen && fretted && lagen.length) {
    const [x1, x2] = g.span(lo, hi);
    const frame = el('rect', { x: x1, y: g.board.y - 2, width: x2 - x1, height: g.board.h + 4, rx: 8, 'stroke-width': 1.8, 'stroke-dasharray': '6 4',
      style: 'fill:none;stroke:var(--acc);opacity:.7;pointer-events:none' });
    frame.appendChild(el('title', {}, `Hier lässt sich die Tonleiter mit vier Fingern greifen: ${L.info}`));
    add(frame);
    // Dasselbe Muster wiederholt sich im Abstand einer Oktave (12 Bünde): hellerer Rahmen, am Griffbrettende abgeschnitten
    [lo + 12, lo - 12].forEach(f0 => {
      if (f0 < 0 || f0 > F) return;
      const [y1, y2] = g.span(f0, Math.min(f0 + 3, F));
      const echo = el('rect', { x: y1, y: g.board.y - 2, width: y2 - y1, height: g.board.h + 4, rx: 8, 'stroke-width': 1.4, 'stroke-dasharray': '4 5',
        style: 'fill:none;stroke:var(--acc);opacity:.4;pointer-events:none' });
      echo.appendChild(el('title', {}, `Gleiches Fingermuster eine Oktave höher/tiefer (Bund ${f0}–${f0 + 3})`));
      add(echo);
    });
  }
  // Dehnung: ein Halbton vor/hinter der Lage. Cello: nur rückwärts (1. Finger streckt nach unten) und nie bis zur leeren Saite
  const stretch = f => fretted ? (f > 0 && (f === lo - 1 || f === hi + 1)) : (f >= 1 && f === lo - 1);
  const inLage = f => !fb.lagen || (f >= lo && f <= hi) || (f === 0 && (!!inst.lagen || lo <= 1)) || stretch(f);   // leere Saiten sind beim Cello immer erreichbar

  // Töne der Tonleiter; leere Saiten, die nicht dazugehören, als gestrichelter Ring mit Saitenname
  for (let si = 0; si < n; si++) {
    for (let f = 0; f <= F; f++) {
      const [x, y] = g.dot(si, f), note = pcMap[(inst.strings[si] + f) % 12];
      if (note) {
        const on = inLage(f);
        fbDot(svg, x, y, g.r, note, on ? 1 : 0.35);
        if (fb.lagen && on) {
          if (stretch(f)) add(el('circle', { cx: x, cy: y, r: g.r + 2.5, 'stroke-width': 1.4, 'stroke-dasharray': '3 2', style: 'fill:none;stroke:var(--acc)' }));
          if (fb.fingers && f > 0) {                      // Fingernummer: Zeigefinger = 1. Bund der Lage … kleiner Finger = 4.
            const fr = g.r * (f === lo - 1 || f === hi + 1 ? 0.5 : 0.42), fx = x + g.r * 0.72, fy = y + g.r * 0.72, fin = Math.max(1, Math.min(4, f - Math.max(lo, 1) + 1)), lab = f === lo - 1 ? '−1' : f === hi + 1 ? '+4' : fin;   // −1: Zeigefinger streckt einen Halbton nach unten, +4: kleiner Finger nach oben
            add(el('circle', { cx: fx, cy: fy, r: fr, 'stroke-width': 1, style: 'fill:var(--card);stroke:var(--fg)' }));
            add(el('text', { x: fx, y: fy + fr * 0.36, 'text-anchor': 'middle', 'font-size': fr * (String(lab).length > 1 ? 1.0 : 1.2), 'font-weight': 700, style: 'fill:var(--fg);pointer-events:none' }, lab));
          }
        }
      }
      else if (f === 0) {
        add(el('circle', { cx: x, cy: y, r: g.r, 'stroke-width': 1.4, 'stroke-dasharray': '3 3', style: 'fill:none;stroke:var(--muted)' }));
        add(el('text', { x, y: y + g.r * 0.33, 'text-anchor': 'middle', 'font-size': g.r * 0.8, style: 'fill:var(--muted)' },
          inst.names[si].replace(/\d/g, '')));
      }
    }
  }

  // Nummern-Reiter der Lagen (Cello)
  if (fb.lagen && inst.lagen) {
    lagen.forEach((l, i) => {
      const [x1, x2] = g.span(l.from, l.from), w = Math.min(fretted ? 32 : 26, x2 - x1), on = i === fb.lage;
      const tab = el('g', { style: 'cursor:pointer' });
      const knick = inst.knick && l.from === inst.knick;       // Knick des Halses (4. Lage): dezent orange umrandet mit Strich darüber
      tab.appendChild(el('title', {}, knick ? 'Knick des Halses (4. Lage) – darüber kommt der Daumen nicht mehr mit' : l.name));
      tab.appendChild(el('rect', { x: (x1 + x2) / 2 - w / 2, y: g.board.y - 22, width: w, height: 17, rx: 5, 'stroke-width': knick ? 2 : 1.2,
        'stroke-dasharray': l.thumb ? '3 2' : '', style: `fill:${on ? 'var(--acc)' : 'var(--card)'};stroke:${knick ? 'var(--root)' : on ? 'var(--acc)' : 'var(--muted)'}` }));
      if (knick) tab.appendChild(el('line', { x1: (x1 + x2) / 2 - w / 2, x2: (x1 + x2) / 2 + w / 2, y1: g.board.y - 26, y2: g.board.y - 26, 'stroke-width': 2.4,
        style: 'stroke:var(--root)' }));
      tab.appendChild(el('text', { x: (x1 + x2) / 2, y: g.board.y - 9, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700,
        style: `fill:${on ? '#fff' : 'var(--fg)'};pointer-events:none` }, l.lbl + (fretted && l.root ? '★' : '')));
      tab.onclick = () => selectLage(i);
      svg.appendChild(tab);
    });
  }

  // Bundnummern
  for (let f = 1; f <= F; f++) {
    const p = g.num(f);
    add(el('text', { x: p.x, y: p.y, 'text-anchor': 'middle', 'font-size': g.numSize, style: 'fill:var(--muted)' }, f));
  }
}

/* ---- Bedienung ---- */
function initFretboard() {
  const savedInst = store.get('inst', null);
  fb.inst = INSTRUMENTS[savedInst] ? savedInst : 'gitarre';
  setClef('treble', false);                       // nach dem Laden immer Violinschlüssel; beim Wechsel des Instruments passt er sich an
  fb.label = store.get('label', 'ton') === 'stufe' ? 'stufe' : 'ton';
  fb.lage = INSTRUMENTS[fb.inst].defaultLage || 0;

  // Instrument-Auswahl in der Kopfzeile des Griffbretts
  const makeButtons = (container) => {
    Object.keys(INSTRUMENTS).forEach(id => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = INSTRUMENTS[id].label;
      b.dataset.inst = id;
      b.onclick = () => setInstrument(id);
      container.appendChild(b);
    });
  };
  makeButtons(document.getElementById('fbInst'));

  document.querySelectorAll('#fbLabel button').forEach(b => {
    b.onclick = () => { fb.label = b.dataset.l; store.set('label', fb.label); renderFretboard(); };
  });
  // Ansicht: ganzes Griffbrett oder Lagen (gewählt wird per Knopf oder über die Nummern am Griffbrett)
  fb.lagen = store.get('lagenmode', false) === true;
  const setLagen = on => {
    fb.shapes = on === 'chord';                    // „Akkord“: Griffbilder (nur Gitarre); sonst Griffbrett/Positionen
    if (!fb.shapes) { fb.lagen = on; store.set('lagenmode', on); }
    fb.lageId = '';
    renderFretboard();
  };
  const bm = document.getElementById('fbMode');
  [['Griffbrett', false], ['Lagen', true], ['Akkord', 'chord']].forEach(([txt, v]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = txt;
    b.dataset.mode = v;
    b.onclick = () => setLagen(v);
    bm.appendChild(b);
  });
  fb.fingers = true;                               // Fingerzahlen stehen in Positionen/Akkord immer da (im ganzen Griffbrett gibt es keine)
  const dm = document.getElementById('fbDM');      // Dur/Moll direkt am Griffbrett (Moll = Paralleltonart, wie oben)
  [['Dur', 'dur'], ['Moll', 'moll']].forEach(([txt, k]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = txt; b.dataset.k = k;
    b.onclick = () => { fb.minor = k === 'moll'; syncTriadChord(fb.minor); drawFretboard(); };
    dm.appendChild(b);
  });
  document.getElementById('lagePrev').onclick = () => selectLage(fb.lage - 1);
  document.getElementById('lageNext').onclick = () => selectLage(fb.lage + 1);
  document.getElementById('shapeMore').onclick = () => { fb.more = !fb.more; fb.lage = 0; fb.lageId = ''; drawFretboard(); };

  document.getElementById('fbMax').onclick = () => setMax(!fb.max);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && fb.max) setMax(false); });

  // Bei Größenänderung (Fenster drehen, Quintenzirkel größer/kleiner, Bereiche ein-/ausklappen) neu zeichnen
  if ('ResizeObserver' in window) {
    const wrap = document.getElementById('fbWrap');
    let last = { w: 0, h: 0 };
    new ResizeObserver(() => {
      const w = Math.round(wrap.clientWidth), h = fb.max ? Math.round(wrap.clientHeight) : 0;
      if (w !== last.w || h !== last.h) { last = { w, h }; if (w > 0) renderFretboard(); }
    }).observe(wrap);
  }
}

function selectLage(i) {
  const inst = INSTRUMENTS[fb.inst], lagen = lagenOf(inst);
  fb.lage = Math.max(0, Math.min(lagen.length - 1, i));
  if (!inst.lagen && lagen[fb.lage]) fb.lageId = lagen[fb.lage].id;
  renderFretboard();
}

function renderLagenControls() {
  const curMode = fb.shapes ? 'chord' : String(fb.lagen);
  document.querySelectorAll('#fbMode button').forEach(b => {
    b.classList.toggle('on', b.dataset.mode === curMode);
    if (b.dataset.mode === 'chord') b.hidden = fb.inst !== 'gitarre';       // Griffbilder gibt es nur für die Gitarre
  });
  const inst = INSTRUMENTS[fb.inst], ctl = document.getElementById('lagenCtl'), lagen = lagenOf(inst);
  ctl.hidden = !(fb.lagen || !inst.lagen);
  syncLage(inst, lagen);
  const L = lagen[fb.lage], lbl = document.getElementById('lageLbl');
  lbl.textContent = L ? L.name : '–';
  const mb = document.querySelector('#fbMode button[data-mode="true"]');
  if (mb) mb.textContent = inst.lagen ? 'Lagen' : 'Positionen';
  lbl.title = L ? L.info : '';
  const more = document.getElementById('shapeMore');          // „+“: weitere Griffbilder (nur im Akkord-Modus, wenn es welche gibt)
  more.hidden = !(fb.shapes && (fbShapeExtra > 0 || fb.more));
  more.textContent = fb.more ? '−' : '+';
  more.title = fb.more ? 'Nur die einfachen Griffe zeigen' : `Weitere Griffbilder anzeigen (+${fbShapeExtra})`;
  more.setAttribute('aria-pressed', String(fb.more));
  document.getElementById('lagePrev').disabled = fb.lage <= 0;
  document.getElementById('lageNext').disabled = fb.lage >= lagen.length - 1;
  document.querySelectorAll('#fbDM button').forEach(b => b.classList.toggle('on', (b.dataset.k === 'dur') === !fb.minor));
}

function setInstrument(id) {
  fb.inst = id;
  if (id !== 'gitarre') fb.shapes = false;
  fb.lage = INSTRUMENTS[id].defaultLage || 0;           // Cello: 1. Lage (nach der halben Lage); Gitarre/Bass: Lage mit dem Grundton
  fb.lageId = '';
  store.set('inst', id);
  if (typeof setClef === 'function') setClef(INSTRUMENTS[id].clef);       // Bass/Cello → Bassschlüssel, Gitarre → Violinschlüssel
  renderFretboard();
}

/** Maximieren: Griffbrett füllt den ganzen Bildschirm (Esc oder Knopf beenden). */
function setMax(on) {
  fb.max = on;
  document.getElementById('fbPanel').classList.toggle('max', on);
  document.body.classList.toggle('fb-max', on);
  const btn = document.getElementById('fbMax');
  btn.textContent = on ? '⤡' : '⤢';
  btn.title = on ? 'Griffbrett verkleinern (Esc)' : 'Griffbrett maximieren (Esc beendet)';
  btn.setAttribute('aria-pressed', String(on));
  renderFretboard();
  btn.focus();
}

/**
 * Das Griffbrett hat eine eigene Tonart (Grundton + Dur/Moll), unabhängig vom Quintenzirkel:
 * render() setzt sie bei jeder Änderung oben (fbSetKey); ein Tastendruck auf der Klaviatur oder der Dur/Moll-Schalter am Griffbrett ändert nur das Griffbrett.
 * Dur/Moll am Griffbrett heißt: gleicher Grundton (G-Dur ↔ g-Moll), nicht die Paralleltonart.
 */
/** Ist der einfache Dur-/Moll-Dreiklang gewählt, folgt er dem Dur/Moll-Schalter (sonst bliebe bei „Moll“ der Dur-Akkord stehen). Das Griffbrett behält dabei seinen Grundton. */
function syncTriadChord(minor) {
  if (st.chord !== 'dur' && st.chord !== 'moll') return;
  const want = minor ? 'moll' : 'dur';
  if (st.chord === want) return;
  const pc = fb.pc;
  st.chord = want;
  render();                                   // Notenzeile, Kreis und Info oben zeigen nun den passenden Dreiklang
  fb.pc = pc; fb.minor = minor;
}

function fbSetKey(l, a, isMin) {
  fb.pc = (PC[l] + a + 12) % 12;
  fb.minor = !!isMin;
  drawFretboard();
}

function drawFretboard() {
  const tab = fb.minor ? MIN : MAJ;
  const [l, a] = tab.find(([ll, aa]) => (PC[ll] + aa + 12) % 12 === fb.pc);        // übliche Schreibweise (Des-Dur, aber cis-Moll)
  const keyTitle = st.chord ? chordLabel(name(l, a, false), CHORD_BY_KEY[st.chord][2]) : `${name(l, a, fb.minor)}-${fb.minor ? 'Moll' : 'Dur'}`;
  if (keyTitle !== fbKey) fb.lageId = '';        // neue Tonart/Tonleiter: wieder mit der Position am Grundton beginnen (E-Moll: offen)
  fbNotes = st.chord ? chordNotes(l, a, st.chord) : scale(l, a, fb.minor ? 'moll' : 'dur');
  fbKey = keyTitle;
  renderFretboard();
}

function renderFretboard() {
  const inst = INSTRUMENTS[fb.inst];
  document.querySelectorAll('[data-inst]').forEach(b => {
    const on = b.dataset.inst === fb.inst;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  document.querySelectorAll('#fbLabel button').forEach(b => b.classList.toggle('on', b.dataset.l === fb.label));
  document.getElementById('fbTitle').textContent = fbKey.split('-')[0];      // nur Grundton (oder Akkordname), Dur/Moll daneben
  renderLagenControls();

  const svg = document.getElementById('fretboard');
  svg.setAttribute('aria-label', `Griffbrett ${inst.label}, ${fbKey}`);
  const wrap = document.getElementById('fbWrap');
  const w = wrap.clientWidth || 900;
  const h = fb.max ? wrap.clientHeight : 0;
  // Schmale Anzeige (Handy hochkant): Griffbrett nicht auf die Bildschirmbreite quetschen, sondern ~6 Bünde gleichzeitig zeigen und seitlich wischen lassen
  const narrow = !fb.max && w < 640;
  const wantW = narrow ? Math.round(70 + inst.frets * Math.max(56, w / 6.2)) : w;
  svg.style.width = narrow ? wantW + 'px' : '';
  fbScrollX = null;
  drawNeck(svg, inst, scaleByPitchClass(fbNotes), narrow ? wantW : w, h);
  wrap.style.overflowX = narrow ? 'auto' : '';
  const key = [fb.inst, fb.lagen, fb.shapes, fb.lageId, fb.lage, fbKey].join('|');
  if (narrow && fbScrollX !== null && key !== fbScrollKey) wrap.scrollLeft = Math.max(0, fbScrollX - 36);
  fbScrollKey = narrow ? key : '';
}


/* ---------- Griffbilder: Akkorde offen oder als Barré (nur Gitarre, Standardstimmung) ---------- */
// Saiten tief → hoch (E A D G H E). Werte: Bund (0 = leer, null = nicht gespielt). Fingerzahlen: 0 = leer/nicht gegriffen.
// Offene Akkorde: Schlüssel „Qualität:Tonhöhenklasse des Grundtons“.
const OPEN_SHAPES = {
  'dur:0':  [[null, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0]],   'dur:2':  [[null, null, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2]],
  'dur:4':  [[0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0]],      'dur:7':  [[3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3]],
  'dur:9':  [[null, 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0]],
  'moll:9': [[null, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0]],   'moll:2': [[null, null, 0, 2, 3, 1], [0, 0, 0, 2, 3, 1]],
  'moll:4': [[0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0]],
  'dom7:0': [[null, 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0]],   'dom7:2': [[null, null, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]],
  'dom7:4': [[0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0]],      'dom7:7': [[3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1]],
  'dom7:9': [[null, 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0]],   'dom7:11': [[null, 2, 1, 2, 0, 2], [0, 2, 1, 3, 0, 4]],
  'm7:9':   [[null, 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0]],   'm7:2':   [[null, null, 0, 2, 1, 1], [0, 0, 0, 2, 1, 1]],
  'm7:4':   [[0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0]],
  'maj7:0': [[null, 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0]],   'maj7:2': [[null, null, 0, 2, 2, 2], [0, 0, 0, 1, 1, 1]],
  'maj7:7': [[3, 2, 0, 0, 0, 2], [3, 2, 0, 0, 0, 1]],      'maj7:9': [[null, 0, 2, 1, 2, 0], [0, 0, 2, 1, 3, 0]],
  'maj7:4': [[0, 2, 1, 1, 0, 0], [0, 3, 1, 2, 0, 0]],      'maj7:5': [[null, null, 3, 2, 1, 0], [0, 0, 3, 2, 1, 0]],
  'sus2:9': [[null, 0, 2, 2, 0, 0], [0, 0, 1, 2, 0, 0]],   'sus2:2': [[null, null, 0, 2, 3, 0], [0, 0, 0, 1, 2, 0]],
  'sus4:9': [[null, 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0]],   'sus4:2': [[null, null, 0, 2, 3, 3], [0, 0, 0, 1, 2, 3]],
  'sus4:4': [[0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]],
  '7sus4:9': [[null, 0, 2, 0, 3, 0], [0, 0, 2, 0, 3, 0]], '7sus4:2': [[null, null, 0, 2, 1, 3], [0, 0, 0, 2, 1, 3]],
  '7sus4:4': [[0, 2, 0, 2, 0, 0], [0, 2, 0, 3, 0, 0]],
  'add9:0': [[null, 3, 2, 0, 3, 0], [0, 2, 1, 0, 3, 0]], 'add9:7': [[3, 2, 0, 2, 0, 3], [2, 1, 0, 3, 0, 4]],
  'add9:4': [[0, 2, 2, 1, 0, 2], [0, 2, 3, 1, 0, 4]],  'add9:9': [[null, 0, 2, 4, 2, 0], [0, 0, 1, 4, 2, 0]],
  '6:0': [[null, 3, 2, 2, 1, 0], [0, 4, 2, 3, 1, 0]],  '6:9': [[null, 0, 2, 2, 2, 2], [0, 0, 1, 1, 1, 1]],
  '6:4': [[0, 2, 2, 1, 2, 0], [0, 2, 3, 1, 4, 0]],     '6:7': [[3, 2, 0, 0, 0, 0], [2, 1, 0, 0, 0, 0]],
  '6:2': [[null, null, 0, 2, 0, 2], [0, 0, 0, 1, 0, 2]],
  'm6:9': [[null, 0, 2, 2, 1, 2], [0, 0, 2, 3, 1, 4]], 'm6:4': [[0, 2, 2, 0, 2, 0], [0, 2, 3, 0, 4, 0]],
  'm6:2': [[null, null, 0, 2, 0, 1], [0, 0, 0, 2, 0, 1]],
  'dom9:4': [[0, 2, 0, 1, 0, 2], [0, 2, 0, 1, 0, 3]],  
  'maj9:0': [[null, 3, 0, 0, 0, 0], [0, 3, 0, 0, 0, 0]], 
  'aug:0': [[null, 3, 2, 1, 1, 0], [0, 4, 3, 1, 2, 0]], 'aug:4': [[0, 3, 2, 1, 1, 0], [0, 4, 3, 1, 2, 0]],
  'aug:7': [[3, 2, 1, 0, 0, 3], [3, 2, 1, 0, 0, 4]],
  'mmaj7:9': [[null, 0, 2, 1, 1, 0], [0, 0, 3, 1, 2, 0]], 'mmaj7:4': [[0, 2, 1, 0, 0, 0], [0, 3, 1, 0, 0, 0]],
};
// Barré-Formen: Bund-Versatz zum Barré-Bund und Fingerzahlen; E-Form = Grundton auf der tiefen E-Saite, A-Form = Grundton auf der A-Saite.
const BARRE_SHAPES = {
  E: { root: 4, str: 0, q: {
    dur:  [[0, 2, 2, 1, 0, 0], [1, 3, 4, 2, 1, 1]],   moll: [[0, 2, 2, 0, 0, 0], [1, 3, 4, 1, 1, 1]],
    dom7: [[0, 2, 0, 1, 0, 0], [1, 3, 1, 2, 1, 1]],   m7:   [[0, 2, 0, 0, 0, 0], [1, 3, 1, 1, 1, 1]],
    maj7: [[0, 2, 1, 1, 0, 0], [1, 4, 2, 3, 1, 1]],   sus4: [[0, 2, 2, 2, 0, 0], [1, 3, 4, 4, 1, 1]],
    '7sus4': [[0, 2, 0, 2, 0, 0], [1, 3, 1, 4, 1, 1]],
    mmaj7: [[0, 2, 1, 0, 0, 0], [1, 4, 3, 1, 1, 1]],
    // Jazz-Griffe mit Grundton auf der tiefen E-Saite (A-Saite leer/gedämpft; Zeigefinger bleibt frei für Bund −1)
    '6':   [[0, null, -1, 1, 0, null], [2, 0, 1, 4, 3, 0]],   m6:  [[0, null, -1, 0, 0, null], [2, 0, 1, 3, 4, 0]],
    m7b5:  [[0, null, 0, 0, -1, null], [2, 0, 3, 4, 1, 0]],
    aug:   [[0, 3, 2, 1, 1, 0], [1, 4, 3, 2, 2, 1]] } },
  A: { root: 9, str: 1, q: {
    dur:  [[null, 0, 2, 2, 2, 0], [0, 1, 3, 3, 3, 1]], moll: [[null, 0, 2, 2, 1, 0], [0, 1, 3, 4, 2, 1]],
    dom7: [[null, 0, 2, 0, 2, 0], [0, 1, 3, 1, 4, 1]], m7:   [[null, 0, 2, 0, 1, 0], [0, 1, 3, 1, 2, 1]],
    maj7: [[null, 0, 2, 1, 2, 0], [0, 1, 3, 2, 4, 1]], sus4: [[null, 0, 2, 2, 3, 0], [0, 1, 3, 4, 4, 1]],
    sus2: [[null, 0, 2, 2, 0, 0], [0, 1, 3, 4, 1, 1]],
    mmaj7: [[null, 0, 2, 1, 1, 0], [0, 1, 4, 2, 3, 1]],
    dim:   [[null, 0, 1, 2, 1, null], [0, 1, 2, 4, 3, 0]], dim7: [[null, 0, 1, -1, 1, null], [0, 2, 3, 1, 4, 0]],
    dom9:  [[null, 0, -1, 0, 0, null], [0, 2, 1, 3, 4, 0]], maj9: [[null, 0, -1, 1, 0, null], [0, 2, 1, 4, 3, 0]],
    m9:    [[null, 0, -2, 0, 0, null], [0, 2, 1, 3, 4, 0]] } },
  // D-Form: Grundton auf der D-Saite, nur die vier hohen Saiten (ohne Balken) – gut für den Bereich um den 10.–12. Bund
  D: { root: 2, str: 2, bar: false, extra: true, q: {
    dur:  [[null, null, 0, 2, 3, 2], [0, 0, 1, 2, 4, 3]], moll: [[null, null, 0, 2, 3, 1], [0, 0, 1, 3, 4, 2]],
    // Vierklänge auf den hohen Saiten (z. B. Dm7 = xx0211, am 5. Bund: x x 7 7 6 6 … ohne Balken)
    dom7: [[null, null, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3]], m7: [[null, null, 0, 2, 1, 1], [0, 0, 0, 3, 1, 2]],
    maj7: [[null, null, 0, 2, 2, 2], [0, 0, 0, 1, 2, 3]], m7b5: [[null, null, 0, 1, 1, 1], [0, 0, 0, 1, 2, 3]],
    mmaj7: [[null, null, 0, 2, 2, 1], [0, 0, 0, 2, 3, 1]], sus2: [[null, null, 0, 2, 3, 0], [0, 0, 0, 1, 3, 0]],
    sus4: [[null, null, 0, 2, 3, 3], [0, 0, 0, 1, 3, 4]], '6': [[null, null, 0, 2, 0, 2], [0, 0, 0, 1, 0, 2]],
    m6: [[null, null, 0, 2, 0, 1], [0, 0, 0, 2, 0, 1]], dim7: [[null, null, 0, 1, 0, 1], [0, 0, 0, 1, 0, 2]],
    aug: [[null, null, 0, 3, 3, 2], [0, 0, 0, 2, 3, 1]] } },
  // A-Form mit kleinem Finger: z. B. Am7 = x02213 (Grundton auf der A-Saite, hohe e-Saite mit dem kleinen Finger)
  A2: { root: 9, str: 1, extra: true, q: { m7: [[null, 0, 2, 2, 1, 3], [0, 0, 2, 3, 1, 4]] } },
  // C-Form: Grundton auf der A-Saite mit dem Ringfinger/kleinen Finger (C = x32010, verschoben z. B. D = x54232)
  C: { root: 0, str: 1, bar: false, extra: true, q: {
    dur: [[null, 3, 2, 0, 1, null], [0, 4, 3, 1, 2, 0]], dom7: [[null, 3, 2, 3, 1, null], [0, 3, 2, 4, 1, 0]],
    m7: [[null, 3, 5, 3, 4, null], [0, 1, 3, 1, 2, 0]] } },
};
const SHAPE_Q = { dur: 'dur', moll: 'moll', dim: 'dim', aug: 'aug', sus2: 'sus2', sus4: 'sus4', '7sus4': '7sus4', maj7: 'maj7', dom7: 'dom7', m7: 'm7', mmaj7: 'mmaj7',
  m7b5: 'm7b5', dim7: 'dim7', add9: 'add9', '6': '6', m6: 'm6', dom9: 'dom9', maj9: 'maj9', m9: 'm9' };

/** Griffbilder des gewählten Akkords (ohne Akkord: Dreiklang der Tonika) – als Liste wie die Lagen: erst offen, dann Barré von unten nach oben. */
function shapesOf(inst) {
  if (!fbNotes.length) return [];
  const rootPc = pcOf(fbNotes[0]), minorKey = fb.minor, qk = st.chord || (minorKey ? 'moll' : 'dur'), q = SHAPE_Q[qk];
  if (!q) return [];
  const rn = name(fbNotes[0].l, fbNotes[0].a, false), sym = st.chord ? CHORD_BY_KEY[st.chord][2] : (minorKey ? 'm' : '');
  const chordName = chordLabel(rn, sym), out = [];
  const mk = (id, lbl, nm, info, frets, fingers, bar) => {
    const used = frets.filter(f => f !== null && f > 0), lo = used.length ? Math.min(...used) : 0;
    const isOpen = id === 'open';        // offene Griffbilder: Sicht ab dem Sattel (leere Saiten gehören dazu)
    out.push({ id, lbl, name: nm, info, frets, fingers, bar, from: lo, lo: isOpen ? 0 : lo, hi: isOpen ? 4 : lo + 3, root: out.length === 0 });
  };
  const open = OPEN_SHAPES[`${q}:${rootPc}`];
  if (open) mk('open', 'offen', `${chordName} offen`, `${chordName} in offener Lage – ○ = leere Saite, × = nicht anschlagen`, open[0], open[1], null);
  ['E', 'A', 'A2', 'C', 'D'].forEach(k => {
    const B = BARRE_SHAPES[k], t = B.q[q], kn = k === 'A2' ? 'A, Variante' : k;
    if (!t) return;
    const b0 = ((rootPc - B.root) % 12 + 12) % 12, strName = ['tiefen E-', 'A-', 'D-'][B.str];
    [b0, b0 + 12].forEach(b => {                                  // dieselbe Form auch eine Oktave höher (um den 12. Bund), wenn sie noch aufs Griffbrett passt
      const vs = t[0].filter(v => v !== null);
      if (b === 0 || b + Math.max(...vs) > inst.frets || b + Math.min(...vs) < 1) return;       // Bund 0 wäre der offene Akkord
      const frets = t[0].map(v => v === null ? null : b + v);
      const ones = t[1].map((f, i) => f === 1 && frets[i] ? i : -1).filter(i => i >= 0);        // Barré nur, wenn der Zeigefinger mehrere Saiten greift
      const bar = B.bar !== false && ones.length > 1;
      const lowF = Math.min(...frets.filter(f => f > 0));                 // tiefster gegriffener Bund (für die Beschriftung ohne Barré)
      mk(`${k}${b}`, bar ? `Barré ${b}` : `Bund ${lowF}`, bar ? `Barré ${b}. Bund (${kn}-Form)` : `ab ${lowF}. Bund (${kn}-Form)`,
        bar ? `${chordName} als Barré: Zeigefinger über alle Saiten ab der ${strName}Saite auf Bund ${b} – ${k}-Form (Grundton auf der ${strName}Saite)`
            : `${chordName}, Grundton auf der ${strName}Saite – ${kn}-Form`,
        frets, t[1], bar ? { fret: frets[ones[0]], from: ones[0] } : null);
      out[out.length - 1].lvl = B.extra || b !== b0 ? 2 : 1;       // Stufe 1 = einfache Griffe; Stufe 2 erscheint über „+“
    });
  });
  out.sort((a, b) => (a.id === 'open' ? -1 : b.id === 'open' ? 1 : a.lo - b.lo));
  const easy = out.filter(v => (v.lvl || 1) === 1);
  const list = fb.more || !easy.length ? out : easy;           // am Anfang nur die einfachen Griffe; „+“ blendet weitere ein
  fbShapeExtra = out.length - easy.length;
  list.forEach((v, i) => { v.root = i === 0; });
  return list;
}

/** Griffbild zeichnen: Barré-Balken, Punkte (Rollenfarben wie überall), Fingerzahlen, × für nicht gespielte Saiten. */
function drawShape(add, g, inst, pcMap, V) {
  if (V.bar) {                                                     // Barré: abgerundeter Balken über die Saiten
    const [cx, y0] = g.dot(5, V.bar.fret), y1 = g.dot(V.bar.from, V.bar.fret)[1], w = g.r * 1.1;
    add(el('rect', { x: cx - w / 2, y: y0 - g.r * 0.6, width: w, height: y1 - y0 + g.r * 1.2, rx: w / 2, 'stroke-width': 1.6,
      style: 'fill:var(--accbg);stroke:var(--acc);opacity:.9' }));
  }
  V.frets.forEach((f, si) => {
    const [x, y] = g.dot(si, f === null ? 0 : f);
    if (f === null) {                                              // nicht anschlagen
      add(el('text', { x, y: y + g.r * 0.4, 'text-anchor': 'middle', 'font-size': g.r * 1.3, 'font-weight': 700, style: 'fill:var(--muted)' }, '×'));
      return;
    }
    const note = pcMap[(inst.strings[si] + f) % 12];
    if (note) fbDot(g.svgRef || document.getElementById('fretboard'), x, y, g.r, note, 1);
    if (fb.fingers && f > 0 && V.fingers[si]) {
      const fr = g.r * 0.42, fx = x + g.r * 0.72, fy = y + g.r * 0.72;
      add(el('circle', { cx: fx, cy: fy, r: fr, 'stroke-width': 1, style: 'fill:var(--card);stroke:var(--fg)' }));
      add(el('text', { x: fx, y: fy + fr * 0.36, 'text-anchor': 'middle', 'font-size': fr * 1.2, 'font-weight': 700, style: 'fill:var(--fg);pointer-events:none' }, V.fingers[si]));
    }
  });
}
