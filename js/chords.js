'use strict';

/*
 * Akkorde über dem Grundton der gewählten Tonart (Sus, Major 7, Jazz-Akkorde …).
 *
 * Ein Akkordton wird beschrieben durch
 *   steps  Buchstaben-Schritte über dem Grundton (0 = Grundton, 2 = Terz, 4 = Quinte, 6 = Septime, 8 = None)
 *   semi   Halbtöne über dem Grundton
 *   lbl    Bezeichnung (1, ♭3, ♭7 …)  – deg ist die zugehörige Stufenzahl (1, 3, 5, 7 …) für die Farben
 *   iv     Name des Intervalls
 * Der Notenname ergibt sich wie bei den Tonleitern aus Buchstabe + Halbtönen (so entsteht z. B. Fis statt Ges).
 */

/** Schreibweise der Akkordtöne: true = einfach (F statt Eis), false = korrekt (nach Terzenschichtung). */
let spellSimple = true;
try { if (localStorage.getItem('qz-spell') === 'korrekt') spellSimple = false; } catch (e) {}

const T = {
  root: [0, 0, '1', 'reine Prim'],
  k3: [2, 3, '♭3', 'kleine Terz'], g3: [2, 4, '3', 'große Terz'],
  s2: [1, 2, '2', 'große Sekunde'], q4: [3, 5, '4', 'reine Quarte'],
  d5: [4, 6, '♭5', 'verminderte Quinte'], r5: [4, 7, '5', 'reine Quinte'], a5: [4, 8, '♯5', 'übermäßige Quinte'],
  g6: [5, 9, '6', 'große Sexte'],
  d7: [6, 9, '𝄫7', 'verminderte Septime'], k7: [6, 10, '♭7', 'kleine Septime'], g7: [6, 11, '7', 'große Septime'],
  n9: [8, 14, '9', 'große None'],
};

// [Schlüssel, Gruppe, Symbolendung, Name, Töne, Erklärung]
const CHORDS = [
  ['dur',   'Dreiklänge', '',      'Dur',            ['root','g3','r5'],           'Grundton, große Terz, Quinte: hell und stabil.'],
  ['moll',  'Dreiklänge', 'm',     'Moll',           ['root','k3','r5'],           'Die kleine Terz macht ihn dunkler und wehmütiger.'],
  ['dim',   'Dreiklänge', 'dim',   'Vermindert',     ['root','k3','d5'],           'Zwei kleine Terzen übereinander: gespannt, will sich auflösen.'],
  ['aug',   'Dreiklänge', 'aug',   'Übermäßig',      ['root','g3','a5'],           'Zwei große Terzen: schwebend und unruhig.'],
  ['sus2',  'Sus-Akkorde', 'sus2', 'Sus2',           ['root','s2','r5'],           'Die Terz wird durch die Sekunde ersetzt: offen, „in der Schwebe“, weder Dur noch Moll.'],
  ['sus4',  'Sus-Akkorde', 'sus4', 'Sus4',           ['root','q4','r5'],           'Die Terz wird durch die Quarte ersetzt: drängt zurück zur Terz (Sus4 → Dur).'],
  ['7sus4', 'Sus-Akkorde', '7sus4','Sus4 mit Septime', ['root','q4','r5','k7'],    'Sus4 plus kleine Septime: schwebend, sehr beliebt in Pop und Jazz.'],
  ['maj7',  'Septakkorde', 'maj7', 'Major 7',        ['root','g3','r5','g7'],      'Dur plus große Septime: weich, verträumt – ein Klassiker in Jazz und Pop.'],
  ['dom7',  'Septakkorde', '7',    'Dominantseptakkord', ['root','g3','r5','k7'],  'Dur plus kleine Septime: Spannung, will zur Tonika (eine Quinte tiefer) auflösen. Blues-Grundlage.'],
  ['m7',    'Septakkorde', 'm7',   'Moll 7',         ['root','k3','r5','k7'],      'Moll plus kleine Septime: weich und sehr häufig (z. B. die zweite Stufe im Jazz).'],
  ['mmaj7', 'Septakkorde', 'm(maj7)', 'Moll mit großer Septime', ['root','k3','r5','g7'], 'Moll plus große Septime: geheimnisvoll, „Krimi-Klang“.'],
  ['m7b5',  'Septakkorde', 'm7♭5', 'Halbvermindert', ['root','k3','d5','k7'],      'Moll mit ♭5 und kleiner Septime: typischer zweiter-Stufe-Akkord in Moll.'],
  ['dim7',  'Septakkorde', 'dim7', 'Vermindert 7',   ['root','k3','d5','d7'],      'Vier kleine Terzen, völlig symmetrisch: sehr gespannt, vielseitig auflösbar.'],
  ['add9',  'Erweiterungen', 'add9', 'Add 9',        ['root','g3','r5','n9'],      'Dur plus None, ohne Septime: offen und modern.'],
  ['6',     'Erweiterungen', '6',  'Sexte (6)',      ['root','g3','r5','g6'],      'Dur plus große Sexte: warm, ein bisschen Swing.'],
  ['m6',    'Erweiterungen', 'm6', 'Moll 6',         ['root','k3','r5','g6'],      'Moll plus große Sexte: Bossa-Nova-Klang.'],
  ['dom9',  'Erweiterungen', '9',  'Dominantnone (9)', ['root','g3','r5','k7','n9'], 'Dominantseptakkord plus None: funky, Blues und Jazz.'],
  ['maj9',  'Erweiterungen', 'maj9', 'Major 9',      ['root','g3','r5','g7','n9'], 'Major 7 plus None: besonders weich und „teuer“ klingend.'],
  ['m9',    'Erweiterungen', 'm9', 'Moll 9',         ['root','k3','r5','k7','n9'], 'Moll 7 plus None: ruhig, soulig.'],
];
/** Akkordbezeichnung lesbar: Leerzeichen vor Buchstaben-Zusätzen („A aug“, „Cis m7“, „Cis maj7“), sonst eng („C7“, „Am“). */
function chordLabel(root, sym) { return /^[a-z]/.test(sym) && (root.length > 1 || /^[a-z]{2,}/.test(sym)) ? `${root} ${sym}` : root + sym; }
const CHORD_BY_KEY = Object.fromEntries(CHORDS.map(c => [c[0], c]));

/** Akkordtöne aufsteigend über dem Grundton (l, a) – gleiche Form wie die Töne einer Tonleiter. */
function chordNotes(l, a, key) {
  const def = CHORD_BY_KEY[key], tpc = (PC[l] + a + 12) % 12;
  const notes = def[4].map(k => {
    const [steps, semi, lbl, iv] = T[k], ll = (l + steps) % 7, pc = (tpc + semi) % 12;
    let d = ((pc - PC[ll]) % 12 + 12) % 12;
    if (d > 6) d -= 12;
    let o = 4 + Math.floor((l + steps) / 7), nl = ll, na = d;     // „Korrekt“: Schreibweise nach Terzenschichtung (Cis–Eis–Gis–His)
    if (spellSimple && (Math.abs(d) >= 2 || (d === 1 && (ll === 2 || ll === 6)) || (d === -1 && (ll === 3 || ll === 0)))) {   // „Einfach“: Eis→F, His→C, Fes→E, Ces→H, Doppelvorzeichen weg
      const midi = 12 * (o + 1) + PC[ll] + d;
      nl = (ll + (d > 0 ? 1 : -1) + 7) % 7;
      na = ((midi - PC[nl]) % 12 + 12) % 12; if (na > 6) na -= 12;
      o = Math.floor((midi - na - PC[nl]) / 12) - 1;
    }
    return { l: nl, a: na, oct: o, semi, deg: steps + 1, lbl, ivn: iv };
  });
  notes.isChord = true;
  notes.key = key;
  return notes;
}

/** Auswahlliste, nach Art gruppiert */
function initChords() {
  const sel = document.getElementById('chordSel');   // Dropdown ist entfernt; Akkorde wählt man über die Knöpfe
  if (sel) {
    let group = null, og = null;
    CHORDS.forEach(c => {
      if (c[1] !== group) { group = c[1]; og = document.createElement('optgroup'); og.label = group; sel.appendChild(og); }
      const o = document.createElement('option');
      o.value = c[0];
      o.textContent = `${c[3]}${c[2] ? ' (' + c[2] + ')' : ''}`;
      og.appendChild(o);
    });
    sel.onchange = () => chooseChord(sel.value || null);
  }

  // kleine Anklick-Knöpfe unter dem Quintenzirkel, nach Art gruppiert
  const box = document.getElementById('chordChips');
  const groups = [...new Set(CHORDS.map(c => c[1]))];
  groups.forEach(gr => {
    const row = document.createElement('div');
    row.className = 'cgrp';
    row.innerHTML = `<span class="fglbl">${gr}</span>`;
    CHORDS.filter(c => c[1] === gr).forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.key = c[0];
      b.title = `${c[3]}: ${c[5]}`;
      b.onclick = () => chooseChord(st.chord === c[0] ? null : c[0]);
      row.appendChild(b);
    });
    box.appendChild(row);
  });

  // Unter dem Quintenzirkel entweder „Akkorde“ oder „Tonart finden“ aufklappen (oder beides zu)
  // Standard: Akkord-Karte offen; auf niedrigen Bildschirmen (Handy quer) zu, damit der Quintenzirkel Platz hat
  const lowScreen = window.matchMedia && matchMedia('(orientation:landscape) and (max-height:520px)').matches;
  let open = store.get('below', lowScreen ? 'none' : 'chords');
  if (open !== 'chords' && open !== 'finder') open = null;
  const show = () => {
    document.getElementById('bpChords').hidden = open !== 'chords';
    document.getElementById('bpFinder').hidden = open !== 'finder';
    document.querySelectorAll('.btab').forEach(b => {
      const on = b.dataset.tab === open;
      b.classList.toggle('on', on);
      b.setAttribute('aria-expanded', String(on));
    });
  };
  document.querySelectorAll('.btab').forEach(b => {
    b.onclick = () => { open = open === b.dataset.tab ? null : b.dataset.tab; store.set('below', open || 'none'); show(); };
  });
  show();

  // Handy quer: Die Karte rutscht unter Quintenzirkel und rechte Spalte (volle Breite); sonst steht sie unter der Klaviatur
  const card = document.querySelector('.belowcard'), board = document.getElementById('board'), col = document.getElementById('rightCol');
  const place = () => {
    const low = matchMedia('(orientation:landscape) and (max-height:520px)').matches;
    if (low) board.after(card); else col.appendChild(card);
    // Handy quer: „Intervalle“ wandert in die Kopfzeile der Tonleiter, die Klaviatur braucht keine eigene Kopfzeile mehr
    const iv = document.getElementById('ivBtn');
    if (low) document.getElementById('play').before(iv); else document.querySelector('[data-panel=keys] .phead').appendChild(iv);
  };
  place();
  const mq = matchMedia('(orientation:landscape) and (max-height:520px)');
  if (mq.addEventListener) mq.addEventListener('change', place);
}

function chooseChord(key) {
  // Ein Akkord ändert die Tonart nicht: Quintenzirkel bleibt, wie er ist; der Akkord erscheint nur in Notenzeile, Klaviatur und Griffbrett
  st.chord = key;
  render();
  if (key) playChord(currentNotes);
}

/** Auswahlliste und Knöpfe an den Zustand anpassen (von render() aufgerufen); root = Name des Grundtons */
function updateChordUI(root) {
  const sel = document.getElementById('chordSel');
  if (sel) sel.value = st.chord || '';
  document.querySelectorAll('#chordChips .chip').forEach(b => {
    const c = CHORD_BY_KEY[b.dataset.key], on = st.chord === b.dataset.key;
    b.textContent = chordLabel(root, c[2]);
    b.classList.toggle('sel', on);
    b.setAttribute('aria-pressed', String(on));
  });
}
