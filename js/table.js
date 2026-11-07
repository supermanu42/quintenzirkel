'use strict';

/* Intervall-Tabelle: eine Spalte pro Stufe, die wichtigen Intervalle farbig markiert. */

function drawTable(notes) {
  const t = document.getElementById('tbl');
  const td = (n, txt) => {
    const r = roleOf(n);
    return `<td${r ? ` class="imp" style="border-top:3px solid ${css(r)}"` : ''}>${txt}</td>`;
  };
  const row = (head, f) => `<tr><th>${head}</th>${notes.map(n => td(n, f(n))).join('')}</tr>`;
  const ivName = n => n.ivn || IVN[n.semi] || (n.semi === 6 ? 'Tritonus' : n.semi + ' HT');
  const ivCell = n => { const full = ivName(n), ab = ivAbbr(full); return ab === full ? full : `<abbr title="${full}">${ab}</abbr>`; };

  t.innerHTML =
    row('Stufe',    n => n.lbl || DEGN[n.deg - 1]) +
    row('Ton',      n => name(n.l, n.a, false)) +
    row('Intervall', ivCell) +
    row('Halbtöne', n => n.semi);
}
