'use strict';

/*
 * „Tonart finden“: Man klickt die Akkorde an, die man gerade spielt (z. B. beim Komponieren),
 * und die App sucht die Tonart(en), in denen alle diese Akkorde vorkommen.
 *
 * Ein Akkord wird als Zahl gespeichert: Grundton-Tonhöhenklasse * 2 + Art (0 = Dur, 1 = Moll).
 * Die Dreiklänge einer Dur-Tonart (I ii iii IV V vi vii°) ergeben sich aus ihrer Tonleiter:
 * Abstand Grundton→Terz 4 Halbtöne = Dur, 3 = Moll (das verminderte vii° wird ausgelassen).
 * Die Moll-Parallele hat genau dieselben Akkorde – deshalb steht in der Antwort „C-Dur / a-Moll“.
 */

const FD_DUR  = ['C', 'Des', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H'];
const FD_MOLL = ['c', 'cis', 'd', 'es', 'e', 'f', 'fis', 'g', 'gis', 'a', 'b', 'h'];
const finder = { chords: [] };

const pcOf = n => ((midiOf(n) % 12) + 12) % 12;

/** Akkord-Zahlen aller Dreiklänge der Dur-Tonart Nr. idx (Stelle im Quintenzirkel) */
function keyChords(idx) {
  const [l, a] = MAJ[idx], n = scale(l, a, 'dur'), set = new Set();
  for (let d = 0; d < 7; d++) {
    const r = pcOf(n[d]), third = (pcOf(n[(d + 2) % 7]) - r + 12) % 12, fifth = (pcOf(n[(d + 4) % 7]) - r + 12) % 12;
    if (fifth === 7 && third === 4) set.add(r * 2);
    if (fifth === 7 && third === 3) set.add(r * 2 + 1);
  }
  return set;
}

function finderCandidates() {
  const out = [];
  for (let i = 0; i < 12; i++) {
    const kc = keyChords(i);
    if (finder.chords.every(c => kc.has(c))) out.push(i);
  }
  return out;
}

function chordMidis(id) {
  const r = 60 + (id >> 1), third = id & 1 ? 3 : 4;
  return [r, r + third, r + 7];
}

/** Tonart wählen (Quintenzirkel dreht sich über den kürzesten Weg dorthin) */
function setKey(i, type) {
  st.turn += ((i - st.idx + 6) % 12 + 12) % 12 - 6;
  st.idx = i;
  st.type = type;
  render();
}

function initFinder() {
  const box = document.getElementById('finder');
  const row = (label, names, q) => {
    const grp = document.createElement('div');
    grp.className = 'fgroup';
    grp.innerHTML = `<div class="fglbl">${label}</div>`;
    const r = document.createElement('div');
    r.className = 'chipgrid';
    names.forEach((nm, pc) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = nm;
      b.dataset.id = pc * 2 + q;
      b.setAttribute('aria-pressed', 'false');
      b.onclick = () => toggleChord(pc * 2 + q);
      r.appendChild(b);
    });
    grp.appendChild(r);
    box.appendChild(grp);
  };
  row('Dur', FD_DUR, 0);
  row('Moll', FD_MOLL, 1);
  const res = document.createElement('div');
  res.className = 'fdres';
  res.id = 'fdRes';
  box.appendChild(res);
  updateFinder();
}

function toggleChord(id) {
  const i = finder.chords.indexOf(id);
  if (i >= 0) finder.chords.splice(i, 1);
  else { finder.chords.push(id); playMidis(chordMidis(id)); }
  const c = finderCandidates();
  // genau eine Tonart passt → gleich auswählen; der erste Akkord gilt als Tonika
  if (finder.chords.length && c.length === 1) {
    const k = c[0], first = finder.chords[0];
    const majPc = (PC[MAJ[k][0]] + MAJ[k][1] + 12) % 12, minPc = (PC[MIN[k][0]] + MIN[k][1] + 12) % 12;
    let type = st.type;
    if (first === majPc * 2) type = 'dur';
    else if (first === minPc * 2 + 1 && type === 'dur') type = 'moll';
    setKey(k, type);
  } else updateFinder();
}

/** Anzeige aktualisieren (wird auch von render() aufgerufen) */
function updateFinder() {
  const box = document.getElementById('finder');
  if (!box) return;
  const kc = keyChords(st.idx);
  box.querySelectorAll('.chip').forEach(b => {
    const id = +b.dataset.id, on = finder.chords.includes(id);
    b.classList.toggle('sel', on);
    b.classList.toggle('diat', kc.has(id));         // gestrichelt = gehört zur aktuellen Tonart
    b.setAttribute('aria-pressed', String(on));
  });
  const res = document.getElementById('fdRes');
  res.innerHTML = '';
  const msg = document.createElement('span');
  if (!finder.chords.length) {
    msg.textContent = 'Akkorde antippen (Klang inklusive) – gestrichelt = gehört zur aktuellen Tonart.';
    res.appendChild(msg);
    return;
  }
  const c = finderCandidates();
  msg.textContent = c.length ? 'Passt zu: ' : 'Keine Tonart enthält alle diese Akkorde.';
  res.appendChild(msg);
  c.forEach(i => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cand' + (i === st.idx ? ' on' : '');
    b.textContent = `${name(MAJ[i][0], MAJ[i][1], false)}-Dur / ${name(MIN[i][0], MIN[i][1], true)}-Moll`;
    b.onclick = () => setKey(i, st.type);
    res.appendChild(b);
  });
  const clr = document.createElement('button');
  clr.type = 'button';
  clr.className = 'cand';
  clr.textContent = 'Zurücksetzen';
  clr.onclick = () => { finder.chords = []; updateFinder(); };
  res.appendChild(clr);
}
