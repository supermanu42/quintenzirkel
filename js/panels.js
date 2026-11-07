'use strict';

/*
 * Bereiche (Panels) einklappen, Legenden ein-/ausblenden, Größe des Quintenzirkels wählen.
 *
 * Jeder Bereich ist ein <section class="panel" data-panel="…"> mit
 *   .phead  Kopfzeile (Titel-Knopf; der Pfeil zum Einklappen wird hier automatisch ergänzt)
 *   .pbody  Inhalt – wird beim Einklappen versteckt
 * Legenden sind <div class="lg"> mit Knopf (.ltoggle) und Inhalt (.lgbody), standardmäßig zu.
 * Alles, was gemerkt werden soll, liegt im Browser (store in util.js).
 */

const PANELS = ['circle', 'scale', 'keys', 'fret'];
const CIRCLE_SCALES = [0.6, 0.8, 1, 1.2];                // Größenstufen des Quintenzirkels
const panelState = { collapsed: {}, circle: 2, iv: false };   // Intervall-Tabelle ist standardmäßig zu

const panelEl = id => document.querySelector(`.panel[data-panel="${id}"]`);

function initPanels() {
  // gemerkten Zustand laden und prüfen (Schlüssel „collapsed3“, damit alte Einstellungen die neuen Standardwerte nicht überdecken)
  const c = store.get('collapsed3', null);
  if (c && typeof c === 'object') PANELS.forEach(id => { panelState.collapsed[id] = c[id] === true; });
  const s = store.get('circleScale', 2);
  panelState.circle = Number.isInteger(s) && s >= 0 && s < CIRCLE_SCALES.length ? s : 2;

  // Pfeil zum Ein-/Ausklappen in jede Kopfzeile einsetzen
  document.querySelectorAll('.panel').forEach(p => {
    const id = p.dataset.panel, head = p.querySelector('.phead');
    const chev = document.createElement('button');
    chev.type = 'button';
    chev.className = 'pchev';
    chev.setAttribute('aria-label', 'Ein- oder ausklappen');
    chev.innerHTML = '<span class="chev" aria-hidden="true"></span>';
    head.appendChild(chev);
    head.querySelectorAll('.ptoggle, .pchev').forEach(b => { b.onclick = () => toggleCollapsed(id); });
  });

  document.getElementById('cMinus').onclick = () => setCircleScale(panelState.circle - 1);
  document.getElementById('cPlus').onclick = () => setCircleScale(panelState.circle + 1);

  // Intervall-Tabelle: kleiner Knopf in der Kopfzeile der Klaviatur
  panelState.iv = store.get('iv', false) === true;
  const ivBtn = document.getElementById('ivBtn'), ivBox = document.getElementById('ivBox');
  const showIv = () => { ivBox.hidden = !panelState.iv; ivBtn.setAttribute('aria-expanded', String(panelState.iv)); };
  ivBtn.onclick = () => { panelState.iv = !panelState.iv; store.set('iv', panelState.iv); showIv(); };
  showIv();
  window.openIntervals = () => { panelState.iv = true; showIv(); };   // z. B. beim Wählen eines Akkords (wird nicht gemerkt)

  refreshPanels();
  applyCircleScale();
  initLegends();
}

function toggleCollapsed(id) {
  panelState.collapsed[id] = !panelState.collapsed[id];
  store.set('collapsed3', panelState.collapsed);
  refreshPanels();
}

/** Zustand auf die Seite übertragen. */
function refreshPanels() {
  document.querySelectorAll('.panel').forEach(p => {
    const collapsed = !!panelState.collapsed[p.dataset.panel];
    p.classList.toggle('collapsed', collapsed);
    const body = p.querySelector('.pbody');
    if (body) body.hidden = collapsed;
    p.querySelectorAll('.ptoggle, .pchev').forEach(b => b.setAttribute('aria-expanded', String(!collapsed)));
  });
  document.getElementById('board').classList.toggle('circ-collapsed', !!panelState.collapsed.circle);
}

/** Dezente „Legende“-Knöpfe: Erklärungen sind standardmäßig zu und lassen sich einzeln aufklappen. */
function initLegends() {
  const saved = store.get('legends', {}) || {};
  document.querySelectorAll('.lg').forEach(box => {
    const id = box.dataset.legend, btn = box.querySelector('.ltoggle'), body = box.querySelector('.lgbody');
    const set = open => { body.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    set(saved[id] === true);
    btn.onclick = () => {
      const open = body.hidden;
      set(open);
      saved[id] = open;
      store.set('legends', saved);
      box.dispatchEvent(new CustomEvent('legendchange', { detail: open }));
    };
  });
}

function setCircleScale(i) {
  panelState.circle = Math.max(0, Math.min(CIRCLE_SCALES.length - 1, i));
  store.set('circleScale', panelState.circle);
  applyCircleScale();
}

function applyCircleScale() {
  const left = panelEl('circle'), v = CIRCLE_SCALES[panelState.circle];
  left.style.setProperty('--cs', v);
  left.classList.toggle('big', v > 1);                   // große Ansicht ist höher als der Bildschirm → nicht festkleben
  document.getElementById('cMinus').disabled = panelState.circle === 0;
  document.getElementById('cPlus').disabled = panelState.circle === CIRCLE_SCALES.length - 1;
}
