'use strict';

/* Zustand, Rendering und Bedienung (Pfeiltasten, Schaltflächen). */

// idx: Position im Quintenzirkel (0 = C/a), type: 'dur' | 'moll' | 'harm', turn: Gesamtdrehung in Schritten
let st = { idx: 0, type: 'dur', turn: 0, chord: null };   // chord: Schlüssel aus chords.js oder null
let currentNotes = [];

function render() {
  const isMin = st.type !== 'dur';
  const [l, a] = (isMin ? MIN : MAJ)[st.idx];
  const scaleNotes = scale(l, a, st.type);
  const notes = st.chord ? chordNotes(l, a, st.chord) : scaleNotes;   // mit Akkord: Akkordtöne statt Tonleiter
  currentNotes = notes;
  circleMarks = scaleNotes.slice(0, 7).map(pcOf);   // Quintenzirkel markiert davon, was außerhalb des Rahmens liegt (Tonart + gewählter Akkord)
  const keyTitle = `${name(l, a, isMin)}-${TN[st.type]}`;

  const tt = document.getElementById('title'), sct = document.getElementById('scTitle');
  tt.textContent = st.chord ? chordLabel(name(l, a, false), CHORD_BY_KEY[st.chord][2]) : keyTitle.replace(' (natürlich)', '');
  tt.classList.toggle('chordname', !!st.chord);
  tt.title = st.chord ? CHORD_BY_KEY[st.chord][3] : '';
  sct.textContent = st.chord ? 'Akkord' : 'Tonleiter';   // nur eingeklappt sichtbar; ausgeklappt zeigen die Schalter beide Tonarten      // Tonleiter-Karte: nur der Grundton (C, a, Fis …) – Dur/Moll daneben

  const modes = document.getElementById('modes');
  modes.innerHTML = '';
  // Die beiden Schalter nennen die Paralleltonarten direkt (E-Dur ⇄ cis-Moll) – gleiche Vorzeichen, anderer Grundton
  const [dl, da] = MAJ[st.idx], [ml, ma] = MIN[st.idx];
  [['dur', `${name(dl, da, false)}-Dur`, 'Dur'], ['moll', `${name(ml, ma, true)}-Moll`, 'Moll natürlich']].forEach(([k, txt, full]) => {
    const b = document.createElement('button');
    b.textContent = txt;
    b.title = full;
    if (st.type === k) b.className = 'on';
    b.onclick = () => { st.type = k; render(); playChord(currentNotes); };
    modes.appendChild(b);
  });

  animCircle();
  const half = drawStaff(notes);
  fbSetKey(l, a, isMin);              // Griffbrett folgt der Tonart oben (kann dort aber eigenständig geändert werden)
  drawTable(notes);
  updateFinder();

  const info = document.getElementById('info');
  updateChordUI(name(l, a, false));
  if (st.chord) {
    const def = CHORD_BY_KEY[st.chord], root = name(l, a, false);
    const scalePcs = new Set(scaleNotes.slice(0, 7).map(pcOf));
    const outside = notes.filter(n => !scalePcs.has(pcOf(n))).map(n => name(n.l, n.a, false));
    const gaps = notes.slice(1).map((n, i) => n.semi - notes[i].semi);
    info.innerHTML =
      `<span>Akkord: <b>${chordLabel(root, def[2])}</b> (${notes.map(n => name(n.l, n.a, false)).join(' – ')})</span>` +
      `<span>Abstände: <b>${gaps.join(' – ')}</b> Halbtöne</span>` +
      `<span>${outside.length ? `Nicht in ${keyTitle}: <b>${outside.join(', ')}</b>` : `Alle Töne gehören zu ${keyTitle}`}</span>` +
      `<span class="chexp"><b>${def[3]}:</b> ${def[5]}</span>` + theoryHtml(notes);
    return;
  }
  const triad = notes[2].semi === 4 ? 'Dur' : 'Moll';
  const rel = (isMin ? MAJ : MIN)[st.idx];
  const relTxt = name(rel[0], rel[1], !isMin) + (isMin ? '-Dur' : '-Moll');
  const tri = [0, 2, 4].map(i => name(notes[i].l, notes[i].a, false)).join(' – ');
  info.innerHTML = '';                 // Dreiklang, Paralleltonart und Halbtonschritte stehen schon in Notenzeile und Quintenzirkel
}

/* Navigation: ← → eine Quinte, ↓ Moll (Parallele), ↑ Dur */
const go = {
  right: () => { st.turn++; st.idx = (st.idx + 1) % 12; },
  left:  () => { st.turn--; st.idx = (st.idx + 11) % 12; },
  down:  () => { if (st.type === 'dur') st.type = 'moll'; },
  up:    () => { st.type = 'dur'; },
};
const keyMap = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' };

document.addEventListener('keydown', e => {
  const k = keyMap[e.key];
  if (!k) return;
  e.preventDefault();
  go[k]();
  render();
});
// kleine Pfeile in der Kopfzeile (sichtbar, wenn der Quintenzirkel eingeklappt ist)
document.querySelectorAll('[data-go]').forEach(b => {
  b.onclick = () => { go[b.dataset.go](); render(); };
});
document.getElementById('play').onclick = () => {          // gespielt wird, was in der Notenzeile steht (Oktave und Schlüssel)
  const n = (typeof staffShown !== 'undefined' && staffShown) || currentNotes;
  playScale(n);                                                // Tonleiter bzw. Akkordtöne nacheinander; der Akkord-Knopf links in der Notenzeile spielt zusammen
};

document.getElementById('chordPlay').onclick = () => playChord((typeof staffShown !== 'undefined' && staffShown) || currentNotes);

document.querySelectorAll('[data-spell]').forEach(b => {
  b.onclick = () => {
    spellSimple = b.dataset.spell === 'einfach';
    try { localStorage.setItem('qz-spell', spellSimple ? 'einfach' : 'korrekt'); } catch (e) {}
    render();
  };
});

initCircle();      // feste Teile des Quintenzirkels (Rahmen, Pfeiltasten in der Mitte)
initPanels();      // Einklappen, Reihenfolge, Größe – gemerkten Zustand laden
initFretboard();
initFinder();
initChords();
render();

/* Offline-Fähigkeit (PWA) – nur über http(s), nicht beim Öffnen per file:// */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/** Theorie-Themen zum gewählten Akkord (eingeklappt, damit es übersichtlich bleibt). */
function theoryHtml(notes) {
  const diff = notes.map(n => {
    const i = MAJ.findIndex(([l, a]) => (PC[l] + a + 12) % 12 === pcOf(n));
    const sp = name(n.l, n.a, false), f = i < 0 ? sp : name(MAJ[i][0], MAJ[i][1], false);
    return f.split('/').includes(sp) || (i === 6 && /Fis|Ges/.test(sp)) ? null : `${sp} = ${f}`;
  }).filter(Boolean);
  const root = name(notes[0].l, notes[0].a, false);
  const spelled = notes.map(n => name(n.l, n.a, false)).join(' – ');
  return '<details class="theory"><summary>Theorie: warum so geschrieben?</summary>' +
    `<p><b>Terzenschichtung:</b> Akkordtöne werden in Buchstaben-Terzen geschrieben (z. B. C – E – G – H). Die Vorzeichen ergeben sich aus den Halbtonabständen, hier: ${spelled}.</p>` +
    (diff.length ? `<p><b>Gleiche Taste, anderer Name (Enharmonik):</b> ${diff.join(', ')}. Der Quintenzirkel hat pro Position nur einen Namen. Mit dem Schalter „Einfach / Korrekt“ unten rechts im Kreis wählst du: <i>Einfach</i> zeigt die bekannten Namen (F statt Eis), <i>Korrekt</i> die genaue Schreibweise und im Kreis klein den Namen des Akkordtons.</p>` : '') +
    `<p><b>Vorzeichen und Auflösezeichen:</b> Die Vorzeichnung gilt für die Tonart. Ein Ton, der davon abweicht, bekommt ein eigenes Zeichen (♮ hebt ein Vorzeichen der Tonart auf).</p>` +
    `<p><b>Im Kreis:</b> Töne, die im Rahmen liegen (Tonika, Subdominante, Dominante und ihre Parallelen), leuchten dort mit ihrer Zahl (1, 3, 5). Hinzugefügte Töne (+7, +9) und weggelassene (−3, −7) stehen im übrigen Kreis.</p></details>`;
}
