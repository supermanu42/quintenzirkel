'use strict';

/* Musiktheorie: Notennamen, Tonarten, Tonleitern. Keine DOM-Zugriffe. */

const L  = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];       // Stammtöne (Index 0..6)
const PC = [0, 2, 4, 5, 7, 9, 11];                      // Halbtöne über C

// Quintenzirkel im Uhrzeigersinn ab oben: [Stammton-Index, Vorzeichen (+1 = ♯, -1 = ♭)]
const MAJ = [[0,0],[4,0],[1,0],[5,0],[2,0],[6,0],[3,1],[1,-1],[5,-1],[2,-1],[6,-1],[3,0]];
const MIN = [[5,0],[2,0],[6,0],[3,1],[0,1],[4,1],[1,1],[6,-1],[3,0],[0,0],[4,0],[1,0]];

// Halbtonabstände der Stufen 1..7 zum Grundton
const TYPES = {
  dur:  [0, 2, 4, 5, 7, 9, 11],
  moll: [0, 2, 3, 5, 7, 8, 10],
  harm: [0, 2, 3, 5, 7, 8, 11],
};
const TN = { dur: 'Dur', moll: 'Moll (natürlich)', harm: 'Moll (harmonisch)' };

const IVN = {
  0: 'reine Prim', 1: 'kleine Sekunde', 2: 'große Sekunde', 3: 'kleine Terz',
  4: 'große Terz', 5: 'reine Quarte', 7: 'reine Quinte', 8: 'kleine Sexte',
  9: 'große Sexte', 13: 'kleine None', 14: 'große None', 10: 'kleine Septime', 11: 'große Septime', 12: 'reine Oktave',
};
/** Kurzform der Intervallnamen für enge Stellen: „kleine Terz“ → KT, „große Septime“ → GSp (Erklärung steht in der Legende). */
const IV_ABBR = { Prim: 'P', Sekunde: 'S', Terz: 'T', Quarte: 'Qt', Quinte: 'Qn', Sexte: 'Sx', Septime: 'Sp', None: 'N', Oktave: 'O' };
function ivAbbr(full) {
  const m = /^(reine|kleine|große|verminderte|übermäßige)\s+(\S+)$/.exec(full || '');
  return m && IV_ABBR[m[2]] ? { reine: 'R', kleine: 'K', große: 'G', verminderte: 'V', übermäßige: 'Ü' }[m[1]] + IV_ABBR[m[2]] : full;
}
const DEGN = ['Prim', 'Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime', 'Oktave'];

/** Deutscher Notenname (H/B, -is/-es). lower = true für Moll-Tonarten (a, e, fis …) */
function name(l, a, lower) {
  let n;
  const c = L[l];
  if (c === 'B') n = a === 0 ? 'H' : a === -1 ? 'B' : a === -2 ? 'Heses' : a === 1 ? 'His' : 'Hisis';
  else if (a === 0) n = c;
  else if (a > 0) n = c + (a === 1 ? 'is' : 'isis');
  else n = (c === 'E' || c === 'A') ? c + (a === -1 ? 's' : 'ses') : c + (a === -1 ? 'es' : 'eses');
  return lower ? n[0].toLowerCase() + n.slice(1) : n;
}

/** Tonleiter ab Stammton l mit Vorzeichen a → 8 Töne inkl. Oktave. */
function scale(l, a, type) {
  const tpc = (PC[l] + a + 12) % 12;
  const iv = TYPES[type].concat([12]);
  return iv.map((s, i) => {
    const ll = (l + i) % 7;
    const pc = (tpc + s) % 12;
    let d = ((pc - PC[ll]) % 12 + 12) % 12;
    if (d > 6) d -= 12;
    return { l: ll, a: d, oct: 4 + Math.floor((l + i) / 7), semi: s, deg: i + 1 };
  });
}

/** MIDI-Nummer eines Tons (C4 = 60) */
const midiOf = n => 12 * (n.oct + 1) + PC[n.l] + n.a;
