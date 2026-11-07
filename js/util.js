'use strict';

/* Kleine Hilfsfunktionen, die alle anderen Dateien nutzen. */

/** CSS-Variable als Farbwert: css('root') -> 'var(--root)' */
const css = v => `var(--${v})`;

/** SVG-Element erzeugen: el('rect', {x:1, y:2}, 'optionaler Text') */
const el = (tag, attrs, txt) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (txt !== undefined) e.textContent = txt;
  return e;
};

/** Farbrolle einer Stufe: Grundton/Oktave, Terz, Quinte – sonst null. */
const roleOf = n =>
  (n.deg === 1 || n.deg === 8) ? 'root' :
  n.deg === 3 ? 'third' :
  n.deg === 5 ? 'fifth' : null;

/** Einstellungen merken (localStorage). Kann im privaten Modus fehlen – darum try/catch. */
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('qz.' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('qz.' + key, JSON.stringify(value)); } catch (e) { /* ignorieren */ }
  },
};
