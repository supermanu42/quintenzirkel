# Quintenzirkel & Tonleitern

Interaktive Web-App zum Lernen von Tonarten: Quintenzirkel zum Drehen, Tonleiter in Notenschrift, Klaviatur und Intervall-Tabelle. Reines HTML/CSS/JavaScript – kein Build-Schritt, keine Abhängigkeiten.

## Funktionen

- Quintenzirkel mit Dur (außen) und Parallel-Moll (innen); fester Rahmen zeigt Subdominante – Tonika – Dominante
- Tonleitern in Dur, natürlich Moll und harmonisch Moll mit Vorzeichen in der Notenzeile
- Grundton/Oktave (rot), Terz (blau) und Quinte (grün) farbig markiert, dazu Halb-/Ganztonschritte
- Klaviatur über zwei Oktaven, übrige Stufen dezent grau
- Ausklappbares Griffbrett für Gitarre, Bass und Cello: per Reiter unter dem Quintenzirkel, quer oder hoch, Beschriftung wahlweise als Ton oder Stufe
- Pfeiltasten in der Mitte des Quintenzirkels (neben dem Tonartnamen); der Quintenzirkel ist in vier Größen wählbar
- Alle Bereiche (Quintenzirkel, Tonleiter, Klaviatur, Griffbrett) lassen sich ein- und ausklappen. Die Klaviatur steht fest unter der Notenzeile; die Intervall-Tabelle klappt über einen kleinen Knopf „Intervalle“ in ihrer Kopfzeile auf. Legenden sind über „Legende“ einblendbar.
- Das Griffbrett (Gitarre, Bass, Cello) liegt immer unten über die volle Breite, nur quer, und lässt sich maximieren (Esc beendet). Instrument, Ton/Stufe, Maximieren und Einklappen stehen in einer Zeile.
- Ein Klick auf eine Tonart im Quintenzirkel spielt den Dreiklang an.
- „Tonart aus Akkorden finden“: Akkorde antippen (mit Klang), die App nennt die passende Tonart und wählt sie aus, wenn sie eindeutig ist.
- Griffbrett-„Lagen“: Umschalter „Ganzes Griffbrett“ / „Lagen“. In der Lagen-Ansicht (Gitarre/Bass: n. Lage = Bund n bis n+3, Lage 1 mit leeren Saiten; Cello: halbe Lage bis 7. Lage mit Markierung des Halsknicks bei der 4. Lage) bleibt der Rest abgeblendet; wählbar per ‹ › oder über die Nummern am Griffbrett.
- Akkorde über dem Grundton (Sus2/4, Major 7, Dominant 7, Moll 7, 9 …) per Auswahlliste, mit Erklärung; Notenzeile, Klaviatur und Griffbrett zeigen dann die Akkordtöne.
- Beim Wechsel zwischen Dur, Moll natürlich und Moll harmonisch erklingt der Dreiklang kurz.
- Einstellungen (Instrument, Beschriftung, eingeklappte Bereiche, Legenden, Größe) werden im Browser gemerkt
- Tonleiter abspielen (Web Audio)
- Bedienung per Pfeiltasten oder Touch: ← → Quintenzirkel drehen, ↓ Moll, ↑ Dur
- Layout für Tablet (Querformat: Kreis links, Rest rechts; Hochformat: untereinander)
- Installierbar als App (PWA), läuft offline

## Projektstruktur

```
quintenzirkel/
├── index.html              Seitenaufbau
├── manifest.webmanifest    PWA-Beschreibung (Name, Icons, Farben)
├── sw.js                   Service Worker (Offline-Cache)
├── css/
│   └── style.css           Layout, Farben, Dark Mode
├── js/
│   ├── util.js             Hilfsfunktionen (SVG, Farbrollen)
│   ├── theory.js           Musiktheorie: Notennamen, Tonleitern
│   ├── circle.js           Quintenzirkel (drehbar)
│   ├── staff.js            Notenzeile mit Kästen, Noten, Schrittmarkierung
│   ├── keyboard.js         Klaviatur
│   ├── fretboard.js        Griffbrett (Gitarre, Bass, Cello), quer, maximierbar
│   ├── chords.js           Akkorde (Sus, Major 7 …)
│   ├── finder.js           Tonart aus Akkorden finden
│   ├── panels.js           Einklappen, Legenden, Größe des Quintenzirkels
│   ├── table.js            Intervall-Tabelle
│   ├── audio.js            Tonleiter abspielen
│   └── app.js              Zustand, Rendering, Bedienung
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── docs/
    ├── LERNTAGEBUCH.md     Technik, Funktionsweise, Android-Studio-Anleitung, Lernnotizen
    └── GIT-ANLEITUNG.md    Repository anlegen, auf GitHub veröffentlichen, Alltag mit Git
```

Eine ausführliche Erklärung (Technik, „Warum JavaScript?“, Android Studio) steht im [Lerntagebuch](docs/LERNTAGEBUCH.md).

Die Skripte werden in dieser Reihenfolge geladen (siehe `index.html`); sie teilen sich globale Variablen, damit die App auch direkt per Doppelklick (`file://`) funktioniert.

## Lokal starten

Einfach `index.html` im Browser öffnen. Für den Offline-Modus und die Installation als App wird ein lokaler Server benötigt:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Veröffentlichen mit GitHub Pages

Ausführlich und in der richtigen Reihenfolge: [Git-Anleitung](docs/GIT-ANLEITUNG.md). Kurzfassung:

1. Repository anlegen und den Ordnerinhalt hochladen:
   ```bash
   git init
   git add .
   git commit -m "Quintenzirkel-App"
   git branch -M main
   git remote add origin https://github.com/<NUTZER>/<REPO>.git
   git push -u origin main
   ```
2. Auf GitHub: **Settings → Pages → Branch: main / (root)** wählen.
3. Die App ist danach unter `https://<NUTZER>.github.io/<REPO>/` erreichbar. Eine eigene Domain lässt sich unter derselben Einstellung eintragen.

Alle Pfade sind relativ, die App läuft daher auch in einem Unterordner.

## Als App installieren (Android)

Seite in Chrome öffnen → Menü → **App installieren** bzw. **Zum Startbildschirm hinzufügen**. Die App startet dann im Vollbild und funktioniert offline.

## Anpassen

- Farben: Variablen oben in `css/style.css` (`--root`, `--third`, `--fifth`, `--acc` …)
- Graue Töne der Klaviatur: `GREY_WHITE` / `GREY_BLACK` in `js/keyboard.js`
- Instrumente und Stimmungen: Objekt `INSTRUMENTS` in `js/fretboard.js` (ein Eintrag = ein Reiter)
- Nach Änderungen an Dateien in `sw.js` die Versionsnummer `CACHE` erhöhen, damit installierte Apps die neue Version laden.

- Gitarre/Bass (ganzes Griffbrett): gestrichelter Rahmen am Startpunkt der Tonleiter auf dem Grundton.

- Gitarre/Bass: sieben Lagen passend zur Tonart (4 Bünde, Zeigefinger auf Tonleiterton der tiefen Saite), optional mit Fingernummern.

