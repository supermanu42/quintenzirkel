# Lerntagebuch – Quintenzirkel-App

Dieses Dokument erklärt, **was hinter der App steckt**, **wie sie funktioniert**, **warum JavaScript** gewählt wurde und **wie man daraus mit Android Studio eine Android-App macht**. Am Ende steht eine Vorlage, mit der du das Tagebuch selbst weiterführen kannst.

---

## 1. Überblick: Was ist die App?

Eine Web-App aus drei Sprachen, die jeder Browser versteht:

| Sprache | Aufgabe in der App | Vergleich |
|---|---|---|
| **HTML** | Struktur: Welche Bereiche gibt es (Kreis, Notenzeile, Klaviatur, Tabelle)? | Das Gerüst / die Bauteileliste |
| **CSS** | Aussehen und Layout: Farben, Abstände, Tablet-quer/hoch, Dark Mode | Die Lackierung und die Anordnung |
| **JavaScript** | Verhalten: rechnet Tonleitern aus, zeichnet alles, reagiert auf Tasten und Klicks | Das Steuerprogramm |

Dazu kommen zwei Zusatzdateien, die aus der Webseite eine installierbare App machen: `manifest.webmanifest` (Name, Icon, Farben) und `sw.js` (Offline-Cache).

---

## 2. Die Technik im Einzelnen

### 2.1 SVG – alles Sichtbare ist Vektorgrafik
Quintenzirkel, Notenzeile und Klaviatur sind keine Bilder, sondern **SVG** (Scalable Vector Graphics). Das sind Formen wie `<rect>`, `<line>`, `<ellipse>`, `<path>`, `<text>`, die per JavaScript erzeugt werden.

- Sie bleiben auf jedem Display scharf (Tablet, Handy, 4K).
- Jedes Element lässt sich ansprechen, einfärben und mit einem Klick-Ereignis versehen.
- `viewBox="0 0 640 226"` legt ein eigenes Koordinatensystem fest; der Browser skaliert es auf die verfügbare Breite. Dadurch passt sich die Notenzeile jeder Bildschirmgröße an, ohne dass man Pixel umrechnen muss.

Die Hilfsfunktion `el('rect', {x:10, y:5, …})` in `js/util.js` erzeugt ein SVG-Element und setzt die Attribute. Sie wird überall benutzt.

### 2.2 DOM und Ereignisse
Das **DOM** (Document Object Model) ist der „Objektbaum“ der Webseite. JavaScript kann ihn lesen und verändern, z. B. `document.getElementById('staff')`. Reaktionen auf den Nutzer laufen über **Ereignisse** (Events):

```js
document.addEventListener('keydown', e => { … });   // Pfeiltasten
button.onclick = () => { … };                        // Schaltflächen
path.addEventListener('click', () => { … });         // Klick auf ein Kreissegment
```

### 2.3 Web Audio API
Der Ton kommt ohne Sounddateien aus: Ein **Oszillator** erzeugt eine Schwingung (Dreieckwelle), ein **Gain-Knoten** formt die Lautstärke (kurzes Anschwellen, dann Ausklingen). Die Frequenz berechnet sich aus der MIDI-Nummer `m`:

```
f = 440 · 2^((m − 69) / 12)
```
Der Kammerton A4 hat MIDI-Nummer 69 und 440 Hz; jeder Halbton entspricht dem Faktor 2^(1/12).

### 2.4 PWA: Manifest + Service Worker
Eine **Progressive Web App** ist eine normale Webseite, die sich wie eine App verhält:

- **`manifest.webmanifest`** sagt dem Browser: Name, Icons, Startseite, Vollbild (`display: standalone`), Farben. Daraus entsteht der Eintrag „App installieren“.
- **`sw.js` (Service Worker)** ist ein Hintergrundskript. Beim ersten Besuch legt er alle Dateien in den Cache (`install`-Ereignis). Danach beantwortet er Anfragen aus dem Cache (`fetch`-Ereignis) – die App läuft **offline**.
- Service Worker funktionieren nur über **HTTPS** oder `localhost`, nicht über `file://`. Deshalb prüft `app.js` vorher `location.protocol`.
- Nach Änderungen an Dateien muss in `sw.js` die Versionsnummer `CACHE` erhöht werden, sonst liefert der Cache weiter die alte Version.

---

## 3. Wie die App funktioniert

### 3.1 Ein Zustand, eine Zeichenfunktion
Der gesamte Zustand steckt in einem kleinen Objekt (`js/app.js`):

```js
let st = { idx: 0, type: 'dur', turn: 0 };
```

- `idx` – Position im Quintenzirkel (0 = C-Dur/a-Moll, 1 = G-Dur/e-Moll …)
- `type` – `'dur'`, `'moll'` oder `'harm'`
- `turn` – wie viele Schritte der Kreis insgesamt gedreht wurde (für die Animation)

Jede Eingabe ändert nur diesen Zustand und ruft danach **`render()`** auf. `render()` berechnet die Tonleiter neu und ruft nacheinander `animCircle`, `drawStaff`, `drawKeys`, `drawFretboard`, `drawTable` auf. Es gibt keine versteckten Zwischenzustände – wer den Zustand kennt, kennt das Bild.

```
Taste / Klick  →  Zustand ändern  →  render()  →  alles neu zeichnen
```

> **Vergleich SPS (TwinCAT):** Dort läuft ein Programm zyklisch (Eingänge lesen → Programm → Ausgänge schreiben), z. B. alle 10 ms. Im Browser läuft nichts von allein: Der Code wartet, bis ein **Ereignis** eintritt (Taste, Klick), reagiert und gibt die Kontrolle zurück. Man nennt das *ereignisgesteuert* (Event Loop). Der „Zustand → render()“-Ansatz ähnelt dem SPS-Prozessabbild: Ausgabe ist immer eine Funktion des aktuellen Zustands.

### 3.2 Die Musiktheorie (`js/theory.js`)
Die Datei hat **keinen Zugriff auf das DOM** und ließe sich deshalb auch ohne Browser testen.

**Notennamen als Zahlen.** Jeder Ton wird durch zwei Zahlen beschrieben:
- `l` = Stammton-Index (C=0, D=1, E=2, F=3, G=4, A=5, H=6)
- `a` = Vorzeichen (+1 = ♯, −1 = ♭, 0 = keins)

**Quintenzirkel als Tabelle.** `MAJ` und `MIN` sind Listen mit 12 Einträgen im Uhrzeigersinn: C, G, D, A, E, H, Fis, Des, As, Es, B, F (Dur) – jeweils die Parallel-Moll-Tonart steht innen. Die Anzahl der Vorzeichen folgt direkt aus der Position: Index 1 = 1 ♯, Index 2 = 2 ♯ … Index 11 = 1 ♭.

**Tonleiter berechnen.** Der Aufbau einer Tonleiter ist festgelegt durch Halbtonabstände zum Grundton:

| Art | Halbtonabstände (Stufe 1–7) | Schrittfolge |
|---|---|---|
| Dur | 0 2 4 5 7 9 11 | G G H G G G H |
| Moll natürlich | 0 2 3 5 7 8 10 | G H G G H G G |
| Moll harmonisch | 0 2 3 5 7 8 11 | G H G G H 1½ H |

(G = Ganzton, H = Halbton)

Der Trick: Die Buchstaben der Töne laufen **immer der Reihe nach** (G-Dur = G A H C D E F, nie zwei gleiche Buchstaben). Das nötige Vorzeichen ergibt sich aus der Differenz zwischen dem Halbtonwert, den der Buchstabe „von Natur aus“ hat, und dem Halbtonwert, den die Tonleiter verlangt.

**Beispiel G-Dur, 7. Stufe:**
1. Grundton G hat Halbtonwert 7. Die 7. Stufe liegt 11 Halbtöne darüber → (7 + 11) mod 12 = **6**.
2. Der Buchstabe der 7. Stufe ist F (Stammton-Index 3), und F hat „von Natur aus“ den Wert 5.
3. Differenz 6 − 5 = **+1** → ein ♯ → **Fis**.

So entstehen Namen wie Fis, Es, Eis oder Heses von selbst, ohne dass man eine Tabelle pro Tonart pflegen muss. Die deutsche Benennung (H statt B, „Es“, „As“, „-is“, „-es“) steckt in der Funktion `name()`.

### 3.3 Der Quintenzirkel (`js/circle.js`)
- Jedes Segment ist ein SVG-`<path>`, berechnet aus Radien und Winkeln (Kreisbogen außen, Kreisbogen innen, zwei Verbindungslinien) – siehe `sector()`.
- **Drehen:** Alle Segmente liegen in einer Gruppe `<g transform="rotate(…)">`. Der Rahmen oben liegt **außerhalb** dieser Gruppe und bleibt deshalb stehen.
- **Animation:** `requestAnimationFrame` ruft pro Bildschirmbild eine Funktion auf, die den Winkel von alt nach neu verschiebt. Die Kurve `1 − (1 − p)³` bremst am Ende sanft ab (ease-out).
- **Lesbare Schrift:** Weil sich die Gruppe dreht, würden die Buchstaben mitkippen. `keepUpright()` dreht jeden Text um denselben Winkel zurück.
- **Kürzester Weg:** Beim Klick auf ein Segment wird die Drehrichtung so gewählt, dass höchstens 6 Schritte nötig sind: `((i − idx + 6) mod 12) − 6`.

### 3.4 Die Notenzeile (`js/staff.js`)
- Die Höhe jeder Note ergibt sich aus einer einzigen Zahl: `s = Oktave · 7 + Stammton-Index − 30`. Dabei ist `s = 0` die unterste Linie (E4), jede Stufe nach oben ist ein halber Linienabstand (Linie → Zwischenraum → Linie …).
- Die y-Koordinate ist dann `y = BY − s · HG`.
- **Hilfslinien** werden in Schleifen gezeichnet, solange die Note außerhalb des Systems liegt.
- **Hals** der Note: nach oben, wenn die Note in der unteren Hälfte liegt, sonst nach unten.
- **Vorzeichen der Tonart** (♯ oder ♭ am Zeilenanfang) werden in der festen Reihenfolge gesetzt: ♯ = F C G D A E H, ♭ = H E A D G C F. Ein Versetzungszeichen vor der Note erscheint nur, wenn es von der Vorzeichnung **abweicht** (z. B. der erhöhte 7. Ton bei Moll harmonisch).
- **Ausrichtung:** Jede Note bekommt eine x-Position `cx`. Kasten, gepunktete Führungslinie, Note und Schrittmarkierung benutzen alle dasselbe `cx` – dadurch stehen sie garantiert senkrecht untereinander. (Vorher gab es Kästen als HTML-Zeile und Noten als SVG; zwei getrennte Layouts passen nie zuverlässig zusammen.)

### 3.5 Klaviatur und Tabelle
- **Klaviatur:** Jeder Ton wird in eine MIDI-Nummer umgerechnet (`midiOf`, C4 = 60). Damit lässt sich jeder Ton einer Taste zuordnen, egal ob er als „Fis“ oder „Ges“ geschrieben wird. Weiße Tasten haben die Halbtonwerte 0 2 4 5 7 9 11, schwarze 1 3 6 8 10 – sie werden darüber gezeichnet und zwischen den weißen Tasten positioniert.
- **Farblogik:** `roleOf()` in `util.js` liefert für Stufe 1/8 `root`, Stufe 3 `third`, Stufe 5 `fifth`, sonst `null`. Alle Dateien nutzen dieselbe Funktion, daher sind die Farben überall gleich. Alle übrigen Stufen sind grau, damit die wichtigen Intervalle herausstechen.
- **Tabelle:** Ein HTML-`<table>`, per Template-String zusammengesetzt (`row('Ton', n => name(…))`).

### 3.6 Layout für Tablet (`css/style.css`)
- **Flexbox** ordnet die Bereiche an.
- Eine **Media Query** `@media (orientation: landscape) and (min-width: 760px)` schaltet im Querformat auf zwei Spalten um: links der Kreis (`position: sticky`, bleibt beim Scrollen stehen), rechts der Rest. Im Hochformat steht alles untereinander.
- Die Breite des Kreises richtet sich nach der Bildschirmhöhe (`calc(100vh − 150px)`), damit er mit den Pfeiltasten auf den Schirm passt.
- **CSS-Variablen** (`--root`, `--third`, `--fifth`, `--acc`) halten alle Farben an einer Stelle; für den Dark Mode werden sie in `@media (prefers-color-scheme: dark)` einfach überschrieben.

### 3.7 Das Griffbrett (`js/fretboard.js`)
- **Grundformel:** Jede Saite hat eine Stimmung als MIDI-Nummer. Der Ton an Bund `f` ist `midi = Leersaite + f`. Gehört `midi mod 12` zur Tonleiter, wird ein Punkt gezeichnet. Beispiel: A-Saite der Gitarre (45), Bund 2 → 47 → 47 mod 12 = 11 = H.
- **Warum „mod 12“?** Ein Ton klingt in jeder Oktave gleich, nur die Tonhöhenklasse (0–11) zählt. Dieselbe Prüfung nutzt die Klaviatur, deshalb gibt es dafür eine gemeinsame Hilfsfunktion `midiOf()`.
- **Stimmung und Quintenzirkel:** Die Stimmintervalle in Halbtönen: Quarte = 5 (E2 = 40 → A2 = 45), große Terz = 4 (G3 = 55 → H3 = 59), Quinte = 7 (C2 = 36 → G2 = 43 beim Cello). Weil 5 + 7 = 12 ist, gilt: **eine Quarte aufwärts = eine Quinte abwärts**. Im Quintenzirkel ist das ein Feld **gegen** den Uhrzeigersinn (Gitarre/Bass: E → A → D → G), eine Quinte aufwärts ein Feld **im** Uhrzeigersinn (Cello: C → G → D → A).
- **Nur quer, dafür skaliert:** `neckGeometry(inst, availW, availH)` liefert Koordinaten-Funktionen (`dot`, `string`, `fret`, `num` …) und einen Skalierungsfaktor `s`. Ein `ResizeObserver` zeichnet neu, wenn sich die Breite ändert. Die Hochformat-Variante wurde wieder entfernt – alles quer ist übersichtlicher.
- **Gleichmäßige Bundabstände:** Echte Bünde werden mit jedem Bund um den Faktor 2^(−1/12) enger. Dann überlappen die Punkte bei hohen Bünden. Wie in Lehrbuch-Diagrammen sind die Abstände deshalb gleich groß.
- **Cello:** Es hat keine Bünde. Die gestrichelten Linien markieren nur die Halbtonschritte ab der leeren Saite.
- **Datengetrieben:** Alles Instrumentenspezifische steht im Objekt `INSTRUMENTS` (Stimmung, Bundzahl, Abstände, Text). Die Reiter werden daraus erzeugt – ein neues Instrument ist ein neuer Eintrag.

### 3.8 Ein- und Ausklappen
- **Alle Bereiche:** Zuerst war die Intervall-Tabelle ein `<details>`-Element (klappt ohne JavaScript auf und zu). Weil Knöpfe in einem `<summary>` unpraktisch sind, gibt es eine kleine eigene Komponente in `panels.js`: Jeder Bereich hat Kopfzeile (`.phead`) und Inhalt (`.pbody`), der beim Einklappen das Attribut `hidden` bekommt. Der Pfeil rechts ist reines CSS: Ein Quadrat mit zwei sichtbaren Rändern, das um 45° bzw. −135° gedreht wird.
- **Griffbrett:** Immer vorhanden und einklappbar. Instrument, Ton/Stufe, Maximieren und Einklappen stehen gemeinsam in der Kopfzeile (`.fbhead`); die doppelte Instrument-Auswahl unter dem Quintenzirkel wurde wieder entfernt.
- **Zustand merken:** `store.get/set` in `util.js` nutzt `localStorage` (pro Browser und Adresse). Das kann im privaten Modus fehlen, darum steht alles in `try/catch` mit Standardwerten.
- **Reihenfolge der Skripte:** `initFretboard()` und das Setzen des gemerkten Zustands laufen erst am Ende von `app.js`. Vorher existiert `currentNotes` noch nicht – ein Zugriff darauf würde mit einer Fehlermeldung abbrechen („temporal dead zone“ bei `let`).

### 3.9 Pfeiltasten im Kreis, Größe und Anordnung
- **Bewegtes und Festes trennen:** `#circRing` (der Ring) wird bei jeder Änderung gebaut und danach nur noch gedreht (`setCircleAngle`). `#circFixed` (Rahmen, Tonartname, Pfeiltasten) wird einmal gebaut und steht still. Vorher wurde der ganze Kreis in jedem Animationsbild neu erzeugt: Ein Tipp zwischen Drücken und Loslassen ging verloren, weil das Element in der Zwischenzeit ausgetauscht wurde. **Merke:** Bedienelemente nie in einem Bereich bauen, der ständig neu gezeichnet wird.
- **Schaltflächen im SVG:** Eine Gruppe `<g>` aus `<rect>` und Pfeilzeichen, dazu `role="button"`, `tabindex="0"` und Enter/Leertaste – so sind sie auch ohne Maus bedienbar.
- **Größe des Quintenzirkels:** Eine CSS-Variable `--cs` (0,6 bis 1,2) wird per `calc(var(--cs) * clamp(…))` als Faktor in die Breite eingerechnet. `panels.js` setzt nur die Variable, das Layout rechnet der Browser.
- **Feste Anordnung:** Erst gab es ein CSS-Grid mit `auto-fit`; es wurde wieder entfernt. Lehre: Nicht jede Flexibilität ist ein Gewinn – Tonleiter, Klaviatur darunter, Griffbrett ganz unten ist übersichtlicher.
- **Maximieren:** `position: fixed; inset: 0` legt das Panel über die Seite, das SVG liegt absolut darin und wird über `clientWidth/clientHeight` vermessen. Esc beendet.
- **Legenden:** `.lg` mit Knopf `.ltoggle` und Inhalt `.lgbody`, standardmäßig zu, Zustand im Browser gemerkt.
- **Griffbrett passt sich an:** Ein `ResizeObserver` meldet die tatsächliche Breite des Bereichs. Gezeichnet wird in dieser Pixelbreite (`viewBox` = Breite), damit die Punkte immer gleich groß bleiben und sich nur die Bundabstände ändern. Eine feste `viewBox` würde alles samt Punkten schrumpfen lassen.

---

## 4. Warum JavaScript?

**Kurze Antwort:** Weil die App im Browser laufen soll – und im Browser ist JavaScript die einzige Sprache, die direkt ausgeführt wird. Alles andere müsste erst in JavaScript (oder WebAssembly) übersetzt werden.

**Die Gründe für diese App im Einzelnen:**

1. **Läuft überall mit einem Code.** Tablet, Handy, Windows, Mac, Linux – ein Browser genügt. Für native Apps bräuchte man Android (Kotlin/Java), iOS (Swift) und Desktop getrennt.
2. **Keine Installation, kein Store.** Ein Link reicht. Updates sind sofort für alle da (Datei hochladen, fertig).
3. **Grafik und Bedienung sind eingebaut.** SVG, Animation, Touch, Tastatur und Audio gehören zum Browser. Für dieselbe Funktion in Java bräuchte man ein GUI-Framework und Zusatzbibliotheken.
4. **Sehr kurzer Entwicklungszyklus.** Datei speichern → Browser neu laden → Ergebnis sehen. Kein Compiler, kein Build-Schritt, keine Abhängigkeiten.
5. **Einfach zu verteilen und zu teilen.** GitHub Pages, eigene Domain oder nur eine HTML-Datei per Mail.
6. **Später erweiterbar.** Dieselbe Web-App lässt sich ohne Neuschreiben in eine Android-App verpacken (siehe Kapitel 5).

**Die Nachteile – ehrlich betrachtet:**

- **Dynamische Typisierung:** Fehler (z. B. Tippfehler im Variablennamen) fallen erst zur Laufzeit auf, nicht beim Kompilieren wie in Java. Abhilfe: **TypeScript** (JavaScript mit Typen, wird zu JS übersetzt) oder `'use strict'` – letzteres ist in allen Dateien aktiviert.
- **Weniger Zugriff auf Gerätefunktionen** als eine native App (Hintergrunddienste, manche Sensoren, Dateisystem). Für diese App irrelevant.
- **Performance:** Für Rechen- oder Grafiklastiges (3D-Spiele, Bildbearbeitung) ist native Code schneller. Eine Tonleiter-App hat damit kein Problem.

**Vergleich mit dem, was du kennst:**

| | Java | JavaScript |
|---|---|---|
| Typen | statisch (`int x`) | dynamisch (`let x`) |
| Ausführung | kompiliert → Bytecode → JVM | direkt im Browser (JIT) |
| Aufbau | Klassen und Objekte | Funktionen und Objekte, Klassen optional |
| Lambdas | `x -> x * 2` | `x => x * 2` |
| Parallelität | Threads | ein Thread + Event Loop |
| Typische Umgebung | Server, Android, Desktop | Browser, Server (Node.js) |

Die Grundlagen (Schleifen, Bedingungen, Arrays, Funktionen) sind fast identisch; wer Java-Grundlagen hat, kommt schnell hinein.

**Warum keine Frameworks (React, Vue …)?** Bewusst weggelassen: Für den Lernzweck ist es wertvoller, einmal alles selbst zu sehen (Zustand → `render()` → DOM). Frameworks automatisieren genau das, was hier von Hand gemacht wird – ihr Nutzen wird verständlicher, wenn man das Prinzip schon kennt.

**Warum klassische `<script>`-Dateien statt ES-Module?** Module (`import`/`export`) werden beim Öffnen per Doppelklick (`file://`) vom Browser blockiert. Mit normalen Skripten funktioniert die App auch so. Für größere Projekte wären Module die bessere Wahl.

---

## 5. Als Android-App mit Android Studio

Es gibt vier Wege. Für diese App sind Weg A und B am sinnvollsten.

| Weg | Idee | Aufwand | Wann sinnvoll |
|---|---|---|---|
| **PWA** (schon vorhanden) | Chrome → „App installieren“ | keiner | zum Testen, ohne Store |
| **A: WebView-App** | Eigene Android-App mit eingebautem Browser, der die lokalen Dateien anzeigt | gering | zum Lernen, volle Kontrolle |
| **B: Capacitor** | Werkzeug, das den Web-Ordner automatisch in ein Android-Studio-Projekt verpackt | gering | Standardweg für Web-Apps im Store |
| **C: Nativ (Kotlin)** | App komplett neu in Kotlin/Jetpack Compose | hoch | wenn Gerätefunktionen oder Performance wichtig werden |

### Vorbereitung
1. **Android Studio** installieren (kostenlos).
2. Beim ersten Start das **Android SDK** mitinstallieren lassen.
3. Zum Testen entweder einen **Emulator** anlegen (Tools → Device Manager) oder ein echtes Gerät per USB anschließen (Entwickleroptionen und USB-Debugging am Gerät aktivieren).

### Weg A: WebView von Hand
1. **New Project → Empty Views Activity** (Sprache: Kotlin). Je nach Version von Android Studio heißen die Vorlagen etwas anders; wichtig ist eine Activity mit klassischem Layout, nicht Compose.
2. Den Web-Ordner kopieren: Inhalt von `quintenzirkel/` nach `app/src/main/assets/` (Ordner `assets` ggf. anlegen: Rechtsklick auf `main` → New → Directory). `index.html` muss direkt darin liegen.
3. In `res/layout/activity_main.xml` eine WebView einsetzen:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <WebView xmlns:android="http://schemas.android.com/apk/res/android"
       android:id="@+id/webView"
       android:layout_width="match_parent"
       android:layout_height="match_parent" />
   ```
4. In `MainActivity.kt`:
   ```kotlin
   import android.os.Bundle
   import android.webkit.WebView
   import androidx.appcompat.app.AppCompatActivity

   class MainActivity : AppCompatActivity() {
       override fun onCreate(savedInstanceState: Bundle?) {
           super.onCreate(savedInstanceState)
           setContentView(R.layout.activity_main)

           val webView = findViewById<WebView>(R.id.webView)
           webView.settings.javaScriptEnabled = true
           webView.loadUrl("file:///android_asset/index.html")
       }
   }
   ```
5. Auf **Run ▶** klicken, Emulator oder Gerät wählen.

Hinweise: Das Sandkastenprinzip von Android gilt – die Seite darf nur Dateien aus `assets` sehen. Die App braucht keine Internet-Berechtigung, da alles lokal liegt. Der Service Worker wird unter `file://` nicht benötigt, weil die Dateien ohnehin in der App stecken. Wird später auf Android-Seite die Zurück-Taste oder Bildschirmdrehung wichtig, kommen weitere Zeilen hinzu (z. B. `onBackPressed` behandeln).

### Weg B: Capacitor
Voraussetzung: **Node.js** installiert.
```bash
cd quintenzirkel
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init Quintenzirkel de.beispiel.quintenzirkel --web-dir=www
mkdir www
# index.html, css/, js/, icons/ nach www/ kopieren
npx cap add android
npx cap sync
npx cap open android      # öffnet das fertige Projekt in Android Studio
```
In Android Studio dann **Run ▶**. Nach jeder Änderung an den Webdateien: Dateien nach `www/` kopieren und `npx cap sync` ausführen. Der Unterschied zu Weg A: Capacitor erzeugt das Android-Projekt samt WebView und Brücke zu Gerätefunktionen (Kamera, Dateien …) selbst – man schreibt gar keinen Kotlin-Code.

### Von der Test-App zur Veröffentlichung
1. **App-ID** festlegen (`applicationId`, z. B. `de.deinname.quintenzirkel`) – sie lässt sich nach der Veröffentlichung nicht mehr ändern.
2. **Icon** setzen (Rechtsklick `res` → New → Image Asset).
3. **Signieren:** Build → Generate Signed App Bundle / APK. Der Schlüssel (Keystore) muss sicher aufbewahrt werden; ohne ihn sind keine Updates möglich.
4. **Play Console:** Entwicklerkonto (einmalig 25 US-$), App anlegen, `.aab` hochladen, Store-Eintrag mit Screenshots und Datenschutzangaben ausfüllen. Neue private Entwicklerkonten müssen vor der Veröffentlichung eine Testphase durchlaufen – die aktuellen Anforderungen stehen in der Play Console.
5. Alternativ: die **APK direkt weitergeben** (z. B. Link) – dann muss der Nutzer „Installation aus unbekannten Quellen“ erlauben.

### Weg C: Nativ in Kotlin (für später)
Bedeutet: Dieselbe Logik (Theorie, Zeichnen, Audio) in Kotlin mit Jetpack Compose neu schreiben. `theory.js` lässt sich dabei fast 1:1 übersetzen (reine Rechenlogik), das Zeichnen übernimmt dann `Canvas`, der Ton `AudioTrack`. Sinnvoll, wenn die App ein eigenes Projekt für den Store werden soll oder Gerätefunktionen braucht.

---

## 6. Stolpersteine, die beim Bauen aufgetreten sind

| Problem | Ursache | Lösung |
|---|---|---|
| Kästen und Noten standen nicht untereinander | Kästen als HTML-Zeile, Noten als SVG – zwei getrennte Layouts | Kästen in dieselbe SVG zeichnen, gemeinsames `cx` |
| Buchstaben im drehenden Kreis standen schief | Text dreht mit der Gruppe mit | `keepUpright()` dreht jeden Text zurück |
| Kreis drehte beim Klick den „langen Weg“ | Differenz der Indizes nicht auf ±6 begrenzt | `((i − idx + 6) mod 12) − 6` |
| Fis-Dur und Ges-Dur fallen zusammen | Beide klingen gleich (enharmonisch), stehen aber an derselben Kreisposition | Ein Feld „Fis/Ges“; Ges-Dur ist als eigene Auswahl noch offen |
| Lila Markierung auf der Klaviatur verwirrte | Zu viele Signalfarben | Nur Grundton/Terz/Quinte farbig, Rest grau |
| Service Worker startet nicht beim Öffnen per Doppelklick | Service Worker brauchen HTTPS oder localhost | Lokalen Server nutzen (`python3 -m http.server`) |
| Neue Version erscheint nicht in installierter App | Alte Dateien im Cache | `CACHE`-Version in `sw.js` erhöhen (neue Dateien wie `fretboard.js` dort auch eintragen) |
| Punkte auf hohen Bünden überlappten | Realistische Bundabstände werden immer enger | Gleichmäßige Bundabstände wie in Lehrbuch-Diagrammen |
| Kreis, Pfeile und Reiter passten im Querformat nicht auf den Bildschirm | Feste Kreisbreite, Höhe nicht berücksichtigt | Breite aus der Bildschirmhöhe berechnen: `clamp(340px, 100vh − 230px, 47vw)` mal Größenfaktor; „sticky“ nur bei genug Höhe |
| Tipp auf die Pfeiltasten im Kreis ging während der Animation verloren | Der Kreis wurde in jedem Animationsbild neu gebaut, das angetippte Element war schon ersetzt | Ring einmal bauen und nur drehen; feste Bedienelemente in eine eigene Gruppe |
| Quer liegendes Griffbrett wirkte in einer schmalen Spalte winzig | Feste `viewBox`-Breite wird samt Punkten verkleinert | Tatsächliche Breite messen (`ResizeObserver`) und in Pixeln zeichnen |

---

## 7. Ideen zum Weiterlernen

Kleine Aufgaben, aufsteigend nach Schwierigkeit:

1. **Farben ändern:** In `css/style.css` die Variablen `--root`, `--third`, `--fifth` anpassen und beobachten, was sich ändert.
2. **Klaviatur anklickbar machen:** In `keyboard.js` auf jede Taste einen `click`-Handler setzen, der mit `midiOf` und der Formel aus 2.3 einen einzelnen Ton spielt.
3. **Leuchtende Tasten beim Abspielen:** In `audio.js` per `setTimeout` die passende Taste zum Zeitpunkt des Tons hervorheben.
4. **Ges-Dur separat auswählbar machen:** In `MAJ`/`MIN` Alternativen für die enharmonischen Tonarten (Fis/Ges, Cis/Des, H/Ces) hinterlegen und per Schalter wählen.
5. **Kirchentonarten ergänzen:** In `TYPES` weitere Halbtonfolgen eintragen (Dorisch: 0 2 3 5 7 9 10, Mixolydisch: 0 2 4 5 7 9 10 …).
6. **Theorie testen:** `theory.js` so anpassen, dass sie in Node laufen kann (`module.exports`), und mit `node --test` prüfen, ob z. B. alle 12 Dur-Tonarten die richtigen Vorzeichen haben.
7. **TypeScript:** Das Projekt auf TypeScript umstellen und beobachten, welche Fehler der Compiler findet.
8. **Android:** Weg A oder B aus Kapitel 5 durchspielen und die App auf einem Gerät starten.
9. **Instrument ergänzen:** In `INSTRUMENTS` einen Eintrag für die Geige anlegen (Saiten G3 D4 A4 E5 = 55, 62, 69, 76; durchgehend Quinten, `fretted: false`) und prüfen, dass ein neuer Reiter erscheint.

---

## 8. Glossar

| Begriff | Bedeutung |
|---|---|
| **Quintenzirkel** | Anordnung der 12 Tonarten im Abstand einer Quinte (7 Halbtöne) |
| **Paralleltonart** | Dur- und Moll-Tonart mit denselben Vorzeichen (C-Dur ↔ a-Moll) |
| **Tonika / Dominante / Subdominante** | Stufe 1 / Stufe 5 / Stufe 4 einer Tonart |
| **Enharmonische Verwechslung** | Zwei Schreibweisen für denselben Ton (Fis = Ges) |
| **Leitton** | Der erhöhte 7. Ton in Moll harmonisch, der zur Tonika „hinführt“ |
| **MIDI-Nummer** | Zahl für jeden Ton (C4 = 60, A4 = 69) |
| **Quarte / Quinte** | 5 bzw. 7 Halbtöne; zusammen eine Oktave (5 + 7 = 12) |
| **Bund** | Metallstäbchen auf dem Griffbrett; jeder Bund ist ein Halbton |
| **Sattel** | Kerbe am oberen Ende des Griffbretts, an der die leere Saite beginnt |
| **Tonhöhenklasse** | Ton ohne Oktave (0–11, C = 0); entsteht mit `midi mod 12` |
| **CSS Grid** | Layout in Zeilen und Spalten; `auto-fit` + `minmax` lässt die Spaltenzahl von der Breite abhängen |
| **ResizeObserver** | Browser-Funktion, die meldet, wenn ein Element seine Größe ändert |
| **Repository** | Projektordner samt Verlauf aller Änderungen (Commits) |
| **Commit / Push** | Änderungen festhalten bzw. zu GitHub hochladen |
| **DOM** | Objektbaum einer Webseite, den JavaScript lesen und ändern kann |
| **SVG** | Vektorgrafik-Format, in der Webseite als Elemente vorhanden |
| **Event Loop** | JavaScripts Ablauf: warten auf Ereignisse, reagieren, weiter warten |
| **PWA** | Webseite, die sich als installierbare, offlinefähige App verhält |
| **Service Worker** | Hintergrundskript des Browsers; hier für den Offline-Cache |
| **WebView** | Android-Komponente, die eine Webseite innerhalb einer App anzeigt |
| **Capacitor** | Werkzeug, das Web-Apps in native Android-/iOS-Projekte verpackt |

---

## 9. Tagebuch

### 2026-11-07 – Start des Projekts
**Gebaut:** Quintenzirkel-App mit Tonleitern, Notenzeile, Klaviatur und Intervall-Tabelle; Layout für Tablet; Aufteilung in einen Projektordner; PWA-Dateien.

**Gelernt:**
- Eine Tonleiter lässt sich komplett aus den Halbtonabständen und der Regel „Buchstaben immer der Reihe nach“ berechnen.
- Ein einziger Zustand und eine `render()`-Funktion machen den Ablauf übersichtlich.
- Gemeinsame Koordinaten (`cx`) sind der Schlüssel, damit Dinge in einer Grafik ausgerichtet bleiben.

**Offen / Fragen:**
- Ges-Dur separat darstellen?
- Android-Weg wählen (A oder B)?

---

### 2026-11-07 (später) – Griffbrett, Einklappen, größerer Kreis
**Ziel:** Gitarre, Bass und Cello sichtbar machen (Quarten vs. Quinten), dabei Layout für Tablet quer und hoch beibehalten.

**Gebaut / geändert:**
- Neues Griffbrett-Panel (`js/fretboard.js`) mit Reitern unter den Pfeiltasten; Gitarre und Bass standardmäßig quer, Cello hoch, jeweils umschaltbar; Beschriftung Ton oder Stufe.
- Intervall-Tabelle mit Pfeil rechts ein- und ausklappbar (`<details>`).
- Quintenzirkel größer; im Querformat passen Kreis, Pfeile und Reiter zusammen auf den Bildschirm.
- Einstellungen werden im Browser gemerkt (`store` in `util.js`).

**Gelernt:**
- Ein Griffbrett ist dieselbe Rechnung wie die Klaviatur: MIDI-Nummer plus Bund, dann `mod 12` und Vergleich mit der Tonleiter.
- Quarte aufwärts = Quinte abwärts (5 + 7 = 12) – deshalb stehen die Gitarren-Saiten im Quintenzirkel gegen den Uhrzeigersinn, die Cello-Saiten im Uhrzeigersinn.
- Wenn ein Bild in zwei Ausrichtungen erscheinen soll, lohnt sich eine Geometrie-Funktion, die nur Koordinaten liefert; der Zeichencode bleibt gleich.

**Probleme und Lösung:** siehe Tabelle „Stolpersteine“ (Punkt-Überlappung, Kreisgröße im Querformat).

**Offen / nächster Schritt:** Geige als weiteres Instrument (Übung 9); Ges-Dur separat wählbar machen.

---

### 2026-11-07 (Vormittag) – Pfeiltasten im Kreis, einklappbare Bereiche, Git
**Ziel:** Tablet-tauglicher Arbeitsplatz: Bereiche einzeln ein- und ausklappen, Quintenzirkel in der Größe ändern; Projekt als Git-Repository vorbereiten.

**Gebaut / geändert:**
- Pfeiltasten sitzen jetzt in der Mitte des Quintenzirkels, daneben steht der Tonartname.
- Neue Datei `js/panels.js`: Alle Bereiche einklappbar, vier Größenstufen für den Quintenzirkel; Zustand wird im Browser gemerkt.
- Eingeklappter Quintenzirkel: schmale Leiste mit Tonart, kleinen Pfeilen und den Griffbrett-Reitern; der Rest bekommt die volle Breite.
- Griffbrett flacher und breitenabhängig (`ResizeObserver`).
- `docs/GIT-ANLEITUNG.md` mit den Schritten von `git init` bis GitHub Pages.

**Gelernt:**
- Bewegtes (drehender Ring) und Festes (Bedienelemente) in getrennten Gruppen halten.
- CSS Grid und `order` ausprobiert und wieder verworfen: feste Anordnung ist klarer.
- Eine einzige kleine Komponente (`.panel` mit `.phead` und `.pbody`) ersetzt viele Einzellösungen.

**Probleme und Lösung:** siehe Tabelle „Stolpersteine“ (verlorene Klicks, winziges Griffbrett in schmaler Spalte).

**Offen / nächster Schritt:** Repository anlegen und auf GitHub Pages veröffentlichen; danach Android-Weg wählen.

---

### Vorlage für neue Einträge

```
### JJJJ-MM-TT – Titel
**Ziel heute:**
**Gebaut / geändert:**
**Gelernt:**
**Probleme und Lösung:**
**Offen / nächster Schritt:**
```

### 2026-11-07 (Mittag) – Legenden, Griffbrett maximieren

**Ziel:** Klaviatur fest unter der Notenzeile, Intervalle zu, Legenden dezent, Griffbrett unten groß und maximierbar.

- Legenden einklappbar („Legende“ + kleiner Pfeil), Intervalle standardmäßig zu.
- Griffbrett nur quer, volle Breite, Maximieren-Modus (Esc), Instrumentwahl auch im Griffbrett.
- ▲▼-Umsortieren entfernt, weil die Anordnung jetzt fest ist.

### 2026-11-07 (Mittag, später) – Kopfzeilen, Akkord hören

- Griffbrett-Bedienung in eine Zeile; Intervall-Tabelle als kleiner Knopf in der Kopfzeile der Klaviatur (Zustand unter `iv` gemerkt).
- `playChord()` in `audio.js`: Grundton, Terz und Quinte gleichzeitig als drei Oszillatoren. Beim Wechsel Dur/Moll hört man so den Unterschied (große vs. kleine Terz).
- Der Speicher-Schlüssel für eingeklappte Bereiche heißt jetzt `collapsed3`, damit alte Werte die neuen Standardwerte nicht überdecken.

### 2026-11-07 (Nachmittag) – Tonart finden, Blöcke

- **Kreis anklicken spielt an:** `playChord(currentNotes)` nach dem Klick; `playMidis()` ist die gemeinsame Funktion für alle Klänge.
- **Tonart aus Akkorden (`finder.js`):** Ein Akkord ist eine Zahl `Grundton * 2 + Art`. Für jede der 12 Dur-Tonarten werden die Dreiklänge aus der Tonleiter berechnet (Terz 4 Halbtöne = Dur, 3 = Moll). Eine Tonart passt, wenn *alle* gewählten Akkorde darin vorkommen – das ist eine Teilmengen-Prüfung (`every` + `Set.has`). Dur und Parallel-Moll haben dieselben Akkorde, daher „C-Dur / a-Moll“; der erste angeklickte Akkord gilt als Tonika.
- **Blöcke am Griffbrett:** Ein Block ist ein Fenster von fünf Bünden, das bei einer Stufe der Tonleiter auf der tiefsten Saite beginnt (`fbBlocks`). Gewählter Block: kräftiger Rahmen, übrige Töne mit `opacity` abgeblendet. Der Zusatzplatz für die Nummern-Reiter geht als Parameter `th` in `neckGeometry`.
- Neues Ereignis `legendchange`, damit das Griffbrett merkt, wenn die Blöcke-Box auf- oder zugeklappt wird.

### 2026-11-07 (später Nachmittag) – Blöcke am Griffbrett-Rand, Ansicht wählbar

- `fbBlocks()` liefert jetzt auch Blöcke, die hinter dem Sattel beginnen (Start `s - 12`) und nur angeschnitten sichtbar sind (`part`, fein gepunktet).
- Umschalter „Ganzes Griffbrett“ / „Blöcke“ (gemerkt unter `blockmode`).
- Tonart-Finder: Dur und Moll als zwei Gruppen nebeneinander (`flex-wrap` + CSS Grid mit 6 Spalten); bei wenig Platz rutscht Moll darunter.

### 2026-11-07 (Abend) – Akkorde über dem Grundton (`chords.js`)

- Auswahlliste „Akkord über dem Grundton“ (Dreiklänge, Sus, Septakkorde, Erweiterungen wie maj7, sus2, 9) mit kurzer Erklärung.
- Ein Akkord ist eine Tabelle von Tönen: Buchstaben-Schritte + Halbtöne (`maj7` = 0/0, 2/4, 4/7, 6/11). Der Notenname entsteht wie bei Tonleitern aus Buchstabe und Halbtonabstand – dadurch stimmt die Schreibweise (Heses, Gis …).
- Weil Notenzeile, Klaviatur, Griffbrett und Tabelle nur eine Liste von Tönen zeichnen, zeigen sie den Akkord ohne Umbau; nur die Beschriftung (`lbl`, z. B. ♭7) und die Abstands-Bögen wurden verallgemeinert.
- Die Info-Zeile zeigt Akkordtöne, Abstände in Halbtönen und welche Töne nicht zur Tonleiter gehören.

### 2026-11-07 (Abend, später) – Akkord-Knöpfe, Markierung im Quintenzirkel

- Akkord-Auswahl neben „Moll harmonisch“; zusätzlich Knöpfe unter dem Quintenzirkel. Dort gibt es zwei Reiter (Akkorde / Tonart finden), von denen höchstens einer offen ist – gemerkt unter `below`.
- Im Quintenzirkel werden die 7. Stufe (Leitton, bei C-Dur das H) bzw. die Akkordtöne gestrichelt umrandet. Dafür wird die Tonhöhenklasse (`pcOf`) auf die äußere Dur-Reihe abgebildet (`circleMarks`).
- Lehre: Eine Farbe pro Zustand genügt nicht – `button.on` (weiße Schrift) und `.btab.on` (Akzentfarbe) überlagerten sich, die Schrift war unsichtbar. Beim Test aufgefallen.

### 2026-11-07 (Abend, Korrektur) – Was gehört in den Rahmen?

- Erste Version markierte Töne zu großzügig (Dur-Reihe, auch Töne, die ohnehin im Rahmen liegen). Besser: Der Rahmen deckt sechs Töne ab (je drei in Dur- und Moll-Reihe); nur die **übrigen Töne** der Tonleiter (und des Akkords) werden gestrichelt umrandet – in der inneren Reihe, z. B. h bei C-Dur, d bei c-Moll.
- Ein Moll-Akkord wählt jetzt auch die Moll-Tonart über demselben Grundton (Cm → c-Moll), ein Dur-Akkord die Dur-Tonart. Sus-Akkorde lassen die Tonart unverändert.
- Lehre: Erst die Vorstellung des Nutzers genau klären (welche Töne? welche Reihe?) – das Zurückfragen per Screenshot war hier der schnellste Weg.

### 2026-11-07 (Abend, später) – Lagen statt Blöcke

- Die „Blöcke ab Stufe“ waren schwer zu verstehen (fünf Bünde, die an einer Tonleiterstufe beginnen, mit überlappenden Rahmen). Ersetzt durch **Lagen**, wie Gitarristen sie kennen: n. Lage = Bund n bis n+3, Lage 1 mit den leeren Saiten. Es gibt nur noch einen Rahmen (die gewählte Lage), daher kein Durcheinander mehr.
- Die Lage-Nummern stehen über den Bünden und sind anklickbar; zusätzlich ‹ › . Beim Einschalten ist Lage 1 gewählt – dort kann man direkt losspielen.
- Abgeblendete Töne: Kreis blass, aber Notenname in voller Schriftfarbe, damit er lesbar bleibt.
- Bei Sonderakkorden klappt die Intervall-Tabelle von selbst auf (`openIntervals`, wird nicht gespeichert).

### 2026-11-07 (Nachmittag) – Tonleiter-Bereich kompakter

- Dur/Moll, Akkord-Auswahl und ▶ stehen in der Kopfzeile des Bereichs; die Zeile `.toprow` entfällt.
- Bei Akkorden hat die Notenzeile nur 3–5 Töne. `drawStaff` berechnet daraus die Breite (`viewBox`) und `flex-basis`; die Erklärung steht daneben (`flex-wrap`, fällt bei wenig Platz unter die Notenzeile).
- Offen: Lagen am Cello (Halbe Lage, 1. Lage beginnt anders als bei der Gitarre; keine Bünde) – Nutzer recherchiert noch. Die Lagen sind bisher an Gitarrenbünden orientiert.

### 2026-11-07 (Nachmittag, später) – Lagen am Cello

- Das Cello hat keine Bünde und zählt die Lagen anders: Die **halbe Lage** beginnt einen Halbton über der leeren Saite, die **1. Lage** zwei Halbtöne darüber, dann 1½ (3), 2. Lage (4), 3. Lage (5), 3½ (6), 4. Lage (7).
- Im Code: `lagenOf(inst)` liefert pro Instrument eine Liste von Lagen (`lbl`, `from`, `lo`, `hi`). Gitarre und Bass werden berechnet, das Cello steht als feste Liste in `INSTRUMENTS.cello.lagen`. `knick: 7` zeichnet die gestrichelte Linie mit Beschriftung.
- Leere Saiten werden beim Cello nie abgeblendet – sie sind in jeder Lage erreichbar.

### 2026-11-07 (Nachmittag, Korrektur) – Cello-Lagen nachgeschlagen

- Quelle: Romberg-Violoncellschule (Online-Ausgabe, uidaho.pressbooks.pub) und Wikipedia „Thumb position“.
- **Zählung:** Die Lagen richten sich nach der Dur-Tonleiter der leeren Saite (auf der A-Saite: B = 1. Lage, C♯ = 2., D = 3., E = 4.). Dazwischen liegen die halben Lagen. In Halbtönen über der leeren Saite: ½=1, 1=2, 1½=3, 2=4, 3=5, 3½=6, **4=7**, 4½=8, 5=9, 5½=10, 6=11, 7=12.
- Frühere Version hatte „2. Lage = 3“ – falsch, das ist die 1½. Lage. Korrigiert.
- **4. Lage = Quinte (7 Halbtöne), nicht Oktave:** Dort endet der Halsbereich, in dem der Daumen hinter dem Hals bleibt. Die Oktave (12) ist die 7. Lage; die eigentliche Daumenlage beginnt am Flageolett der halben Saitenlänge, also an der Oktave.
- Irrtum im Gespräch (4. Lage = Oktave wie 12. Bund bei der Gitarre) ist in der Tabelle klar getrennt: Die Gitarre wiederholt sich nach 12 Bünden, beim Cello liegt der Knick bei 7 Halbtönen.

### 2026-11-07 (Nachmittag, Layout) – Akkord-Karte in voller Breite

- Die Karte „Akkorde / Tonart finden“ liegt jetzt in voller Breite unter Quintenzirkel und Klaviatur; die Akkord-Gruppen stehen nebeneinander (`flex-wrap`) statt untereinander.
- Klaviatur niedriger (`KEY_H` 112 statt 150, viewBox 560×116).
- Kopfzeile Tonleiter: kurze Beschriftungen (Dur, Moll, Harmonisch), Auswahlliste dehnt sich (`flex: 1 1 70px`), ▶ steht rechts neben dem Einklapp-Pfeil.
- Cello: 4. Lage am Halsknick bestätigt (Daumen kommt darüber nicht mehr mit) – so ist es umgesetzt.

## Gitarre: Rahmen am Startpunkt, Akkord-Karte unter der Klaviatur
- Beim ganzen Griffbrett (Gitarre/Bass) zeigt ein dezenter gestrichelter Rahmen, wo die Tonleiter auf dem Grundton der tiefsten Saite beginnen kann (C-Dur: Bund 8–12).
- „Akkorde über dem Grundton" / „Tonart aus Akkorden finden" stehen wieder in der rechten Spalte unter der Klaviatur; die Notenzeile ist niedriger, damit keine Lücke bleibt.
- Das Akkord-Dropdown sitzt in der Kopfzeile direkt neben dem Play-Knopf.
- Service-Worker-Cache: v17.


## Griffbrett: alles in einer Zeile
- Kopfzeile: Instrument, Ton/Stufe, dann abgesetzt „Griffbrett | Lagen" mit ‹ n. Lage › und „⤢ Max". Die untere Zeile entfällt, das Griffbrett bekommt mehr Platz.
- Service-Worker-Cache: v18.

## Gitarre/Bass: sieben Lagen passend zur Tonart, mit Fingersatz
- Jede Lage beginnt mit dem Zeigefinger auf einem Ton der Tonleiter auf der tiefsten Saite und umfasst vier Bünde (ein Finger je Bund). C-Dur: Bund 1, 3, 5, 7, 8, 10, 12.
- Ein Bund vor/hinter der Lage ist mit Dehnung erreichbar (gestrichelter Kreis).
- Knopf „Finger" zeigt die Fingernummern 1–4 an den Tönen.
- Im ganzen Griffbrett zeigt der gestrichelte Rahmen die gewählte Lage (Standard: die mit dem Grundton).
- Die Kopfzeile des Griffbretts ist luftiger gruppiert. Cache: v19.

## Gitarre/Bass: „Positionen" statt „Lagen", mit offener Position
- Bei Gitarre und Bass heißt die Ansicht „Positionen" (der Begriff „Lage" bleibt dem Cello vorbehalten, das auch die halbe Lage hat).
- Liegt ein Tonleiterton auf der leeren tiefen Saite (z. B. E bei E-Dur), gibt es die **offene Position** (Bund 0–3 mit leeren Saiten) und die Oktave darüber (Bund 12–15) – statt nur ab Bund 12.
- Jede Position beginnt mit dem Zeigefinger auf einem Tonleiterton der tiefsten Saite: E-Dur z. B. offen, ab Bund 2, 4, 5, 7, 9, 11 und 12. Die Tabs darüber zeigen Ton bzw. Stufe. Cache: v20.

## Position folgt der Tonart
- Beim Wechsel der Tonart/Tonleiter springt die Gitarren-/Bass-Position wieder auf die am Grundton (e-Moll: offene Position, Bund 0–3 – die ganze Tonleiter mit vier Fingern). Cache: v21.

## Optimale Startposition für vier Finger (Gitarre/Bass)
- Recherche: Gitarristen benennen Positionen nach dem Bund des Zeigefingers (Fender: C-Dur „Open", „4th" = Bünde 5–8, „7th" = 7–10, „12th" = 12–15). Die CAGED-Muster sind dazu die Variante mit Akkordformen.
- Erkenntnis: In Standardstimmung enthält **jedes** Vierbund-Fenster alle sieben Töne einer Dur-/Moll-Tonleiter. „Optimal" ist also eine Frage der Handhaltung, nicht der Vollständigkeit.
- Darum gibt es jetzt Positionen für jeden Startbund 0–12 (‹ ›, Tabs über dem Griffbrett) und eine **empfohlene** Position (★), die beim Tonartwechsel automatisch gewählt wird.
- Algorithmus `recommendStart`: Der Grundton soll auf der tiefen E- oder A-Saite mit dem **Mittelfinger** gegriffen werden (Zeigefinger = Bund davor) oder als **leere Saite** (E, A, D) erklingen → offene Position; bei mehreren Möglichkeiten gewinnt die tiefste. C-Dur → Bund 2–5, G-Dur → 2–5, e-Moll/E-Dur/A-Dur/D-Dur → offen, As-Dur → 3–6.
- Cache: v22.

## Oktav-Wiederholung des Vierfingerfensters
- Im ganzen Griffbrett zeigt ein blasserer gestrichelter Rahmen dasselbe Fingermuster eine Oktave höher (C-Dur: Bund 14–15, abgeschnitten am Griffbrettende; offene Position: Bund 12–15). Cache: v23.

## Positions-Leiste: das Griffbrett hinauf- und hinunterrutschen
- Beobachtung: Mit „empfohlene Position + Oktave" landet man immer bei den ersten Bünden und ab Bund 12. Dazwischen fehlte der Weg.
- Jetzt gibt es eine Reihe zusammenhängender Positionen: Der Mittelfinger liegt der Reihe nach auf jedem Tonleiterton der A-Saite (Zeigefinger einen Bund davor), dazu die empfohlene Startposition. C-Dur: Bund 1, 2★, 4, 6, 7, 9, 11, 12.
- Unter dem Griffbrett zeigt eine Leiste jede Position als Balken; überlappende Positionen liegen in versetzten Reihen. Klick auf einen Balken oder ‹ › wechselt die Position (auch in der Ansicht „Griffbrett"). Die Nummern-Tabs über den Bünden gibt es nur noch beim Cello. Cache: v24.

## d-Moll: Bund 5 fehlte – jetzt sind alle Fenster wählbar
- Ursache: Die Reihe richtete sich nach dem Mittelfinger auf der A-Saite (d-Moll: D = Bund 5 → Zeigefinger Bund 4). Ein Fenster ab Bund 5 gehört nicht dazu – am fehlenden E lag es nicht, jedes Vierbund-Fenster enthält alle sieben Töne.
- Jetzt lassen sich mit ‹ › alle Startbünde 0–12 wählen. In der Leiste hervorgehoben sind: die empfohlene Position, die Mittelfinger-Reihe und die Positionen mit dem Zeigefinger auf dem Grundton der E-/A-Saite (d-Moll: Bund 5 und 10). Die gewählte Position erscheint immer als Balken. Cache: v25.

## Positions-Leiste wieder entfernt
- Die Balken unter dem Griffbrett waren irreführend und sind weg (kann später ergänzt werden). Positionen wählt man mit ‹ › (alle Startbünde 0–12). Die Anzeige beginnt immer mit der empfohlenen Position (früher: Stern). Cache: v26.

## Handy quer
- Auf niedrigen Bildschirmen im Querformat (Höhe ≤ 520 px) ist der Quintenzirkel so hoch wie der Bildschirm, Tonleiter und Klaviatur stehen daneben; Titel und Einleitung sind ausgeblendet. Die Karte „Akkorde / Tonart finden“ ist dort standardmäßig zugeklappt (nur die schmale Tab-Zeile). Cache: v27.

## Handy quer, zweiter Schritt
- Tonleiter und Klaviatur sind kleiner und enden auf der Höhe des Quintenzirkels; die Karte „Akkorde / Tonart finden“ liegt in voller Breite darunter (per Skript umgesetzt, wenn Handy quer erkannt wird). Das Akkord-Dropdown im Kopf der Tonleiter ist dort ausgeblendet (die Akkorde stehen in der Karte). Cache: v28.

## Notenzeile komplett sichtbar, Quintenzirkel größer (Handy)
- Hochformat: Die Notenzeile wechselt bei schmaler Breite (< 600 px) in eine kompakte Darstellung – kleinerer, nur angedeuteter Schlüssel, engere Töne – und passt ohne Seitwärtswischen auf den Bildschirm. Die Schrift unter der Notenzeile ist etwas kleiner. Die Klaviatur bleibt unverändert.
- Handy quer: Der Quintenzirkel ist etwas höher als der Bildschirm (die Seite scrollt ein Stück), die Notenzeile nutzt die ganze Breite ihrer Spalte. Cache: v29.

## Vereinfacht: kein „Harmonisch", kein Dropdown; Handy quer ohne Klaviatur-Kopfzeile
- Der Knopf „Harmonisch" (kaum hörbarer Unterschied) und das Akkord-Dropdown in der Kopfzeile der Tonleiter sind entfernt. Akkorde wählt man über die Knöpfe in der Karte „Akkorde über dem Grundton".
- Handy quer: „Intervalle" sitzt in der Kopfzeile der Tonleiter, die Klaviatur hat keine eigene Kopfzeile mehr und bekommt den Platz. Cache: v30.

## Aufgeräumt: Notenzeile ohne Textzeile, Griffbrett im Hochformat
- Die Zeile „Dreiklang / Paralleltonart / Halbtonschritte" unter der Notenzeile ist weg (steht schon in Notenzeile und Quintenzirkel). Bei Akkorden bleibt die Erklärung.
- Hochformat (schmal): Das Griffbrett zeigt nur etwa 6 Bünde gleichzeitig, dafür größer, und lässt sich seitlich wischen. Beim Wechsel von Position oder Tonart scrollt es automatisch zur gewählten Position. Die Kopfzeile ist kleiner und in wenigen Zeilen angeordnet (Titel + Max, Instrument + Ton/Stufe, Griffbrett/Positionen + ‹ › + Finger). Cache: v31.

## Bassschlüssel
- Tippen auf den Notenschlüssel wechselt zwischen Violin- und Bassschlüssel (gemerkt im Browser).
- Beim Wechsel des Instruments unten stellt sich der Schlüssel automatisch um: Bass/Cello → Bassschlüssel, Gitarre → Violinschlüssel.
- Im Bassschlüssel werden die Töne eine Oktave tiefer notiert als im Violinschlüssel (dann liegen sie im System, statt über vielen Hilfslinien); die Vorzeichen sitzen zwei Stufen tiefer. Klaviatur und Griffbrett ändern sich dadurch nicht.
- Korrektur: Schlüssel sitzt jetzt auf der F-Linie (Punkte um die 4. Linie), und die Tonleiter beginnt zwei Oktaven unter dem Violin-Bezugston (C-Dur: C2 auf Hilfslinien unter dem System). Dafür ist die Notenzeile im Bassschlüssel etwas höher. Cache: v33.

## Fingernummern in der offenen Position
- Fehler: In der offenen Position (Bund 0–3) stand im 1. Bund der 2. Finger. Jetzt zählt der Finger ab Bund 1 (Bund 1 = Zeigefinger, 2 = Mittelfinger, 3 = Ringfinger, Dehnung auf Bund 4 = kleiner Finger). Cache: v34.

## Schlüssel-Knopf, Violinschlüssel als Standard
- Nach dem Laden der Seite ist immer der Violinschlüssel eingestellt (nichts wird mehr gemerkt). Beim Wechsel des Instruments unten passt er sich weiter an (Bass/Cello → Bass, Gitarre → Violin).
- Neben dem Notenschlüssel steht ein kleiner Knopf: „Bass" im Violinschlüssel, „Violin" im Bassschlüssel. Er (oder ein Tipp auf den Schlüssel selbst) wechselt hin und her. Cache: v35.

## Schlüssel-Knopf unter den Schlüssel
- Der Knopf „Bass“/„Violin“ sitzt jetzt direkt unter dem Notenschlüssel am Anfang der Notenzeile (vorher oben links); die erste Note im Hochformat ist etwas nach rechts gerückt, damit nichts überlappt. Cache: v36.

## Tonleiter hinaufklettern: Pfeile links und rechts der Notenzeile
- Zwei kleine Pfeile (‹ ›) links und rechts der Notenzeile verschieben die angezeigte Tonleiter stufenweise nach unten/oben (bis ±7 Stufen). Die Tonleiter wird oktavweise fortgesetzt; Stufennummern und Farben (Grundton rot, Terz blau, Quinte grün) laufen mit.
- Bei einem Wechsel von Tonart, Dur/Moll oder Akkord beginnt die Anzeige wieder bei der Grundtonleiter. Bei Akkorden sind die Pfeile ausgeblendet. Klaviatur, Griffbrett und das Abspielen bleiben unverändert. Cache: v37.

## Pfeile: eine ganze Oktave, größer
- Die Pfeile links/rechts der Notenzeile sind größer (mittig neben dem System) und verschieben die Tonleiter jetzt genau um eine Oktave (bis ±2 Oktaven) statt um eine Stufe. Stufenzählung 1–7 und 8 bleibt erhalten. Cache: v38.

## Große Pfeile, dezenter Knick am Cello
- Die Oktav-Pfeile neben der Notenzeile sind jetzt groß (etwa zwei Drittel der Notenzeilen-Höhe, mittig auf der mittleren Notenlinie, als Winkelsymbol).
- Cello: Die orange Beschriftung „Knick des Halses …" und die gestrichelte Linie sind entfernt. Der Knick (4. Lage) ist nur noch an der Nummer „4" erkennbar: orange umrandet mit einem Strich darüber; der Hinweistext steht als Tooltip. Cache: v39.

## Akkorde lassen den Quintenzirkel in Ruhe
- Ein Akkord (z. B. C7, Cm) ist keine Tonart: Der Quintenzirkel ändert sich nicht mehr (kein Wechsel zu c-Moll, keine zusätzlichen gestrichelten Markierungen für Akkordtöne). Der Akkord erscheint in Notenzeile, Klaviatur, Intervall-Tabelle und Griffbrett. Gestrichelt bleibt nur der 7. Schritt der Tonleiter.
- Das „Wackeln" beim Durchklicken kam von zwei Dingen: dem Tonartwechsel (Dreh-Animation) und der wechselnden Höhe der Tonleiter-Karte (Erklärungstexte unterschiedlich lang), wodurch die Knöpfe unter dem Finger wegrutschten. Im Akkord-Modus hat die Karte jetzt eine feste Mindesthöhe. Cache: v40.

## Oktavzahlen, Abspielen passend zur Notenzeile, Klavierklang
- Der Play-Knopf spielt jetzt genau das, was in der Notenzeile steht: nach den Oktav-Pfeilen also höher oder tiefer. Im Bassschlüssel stehen die Töne in echter Tonhöhe (C-Dur beginnt bei C2, MIDI 36 bzw. eine Oktave höher nach Pfeil) und werden auch so gespielt.
- In jedem Kasten über der Note steht unten rechts klein die Oktave (C4 = eingestrichenes C, wie auf der Klaviatur; C2/C3 im Bass).
- Neuer Klang: statt Dreieck-Oszillator ein Klavier-ähnlicher Ton (Web Audio, keine Samples): 9 Obertöne, leicht gestreckt, höhere klingen schneller ab, tiefe Töne länger, kurzer Hammer-Anschlag, weicher Tiefpass; Akkorde werden minimal versetzt angeschlagen. Es bleibt eine Synthese – kein echtes Klavier-Sample (das wäre eine große Datei und bräuchte eine Quelle mit passender Lizenz). Cache: v41.

## Deutsche Oktavzahlen, kürzerer Nachhall, Stufen im Quintenzirkel
- Oktavzahl in den Notenkästen jetzt nach deutscher Zählung: c¹ (eingestrichen, bisher „4") steht als **1**, c² als 2 usw.; darunter „kl" (kleine), „gr" (große), „K" (Kontra-), „S" (Subkontra-Oktave).
- Klavierklang klingt deutlich kürzer aus (kürzerer Grundton-Ausklang, Obertöne schneller weg, Oszillatoren früher gestoppt). Ob es jetzt gut klingt, muss man mit dem Ohr prüfen – ich kann es nicht hören.
- Quintenzirkel: Jeder Ton der Tonleiter bzw. des gewählten Akkords bekommt im äußeren Ring eine kleine Plakette mit seiner Stufe (C=1, D=2, E=3 …; bei C7 z. B. 1, 3, 5, ♭7). Grundton rot, Terz blau, Quinte grün, übrige grau. Cache: v42.

## Quintenzirkel: Grundton-Blitz und nur dazukommende Töne
- Die Stufen-Plaketten für alle Töne sind wieder weg (zu unruhig, und die Vorzeichen wie „♭7“ waren verwirrend).
- Stattdessen: Beim Spielen (Play, Akkord-Chip) leuchtet kurz das Feld des Grundtons auf – bei Tonleitern die Tonika, bei Akkorden der Akkord-Grundton (Moll-Akkord im inneren Ring).
- Bei Akkorden bekommt nur der dazukommende Ton (alles außer Grundton, Terz, Quinte, z. B. die 7 bei Em7) eine kleine Plakette mit der Zahl, ohne Vorzeichen. Der genaue Name (♭7 …) steht im Tooltip. Cache: v43.

## Akkord im Quintenzirkel: Grundton-Rahmen und „+9“
- Bei einem Akkord bleibt das Feld des Akkord-Grundtons (z. B. A bei A-add9) mit rotem Rahmen markiert, zusätzlich blitzt es beim Spielen etwas länger auf. Die Tonart des Kreises ändert sich dabei bewusst nicht.
- Der dazukommende Ton steht als Plakette mit Plus (z. B. „+9“ am H bei A-add9 – der Akkord hat die 9, aber keine Septime). Cache: v44.

## Akkorde: alle beteiligten Töne mit Nummer, „−7“ bei fehlender Septime
- Im Quintenzirkel tragen jetzt alle Akkordtöne eine kleine graue Zahl (1, 3, 5, ohne Vorzeichen), dazukommende Töne eine violette Plakette mit Plus (+7, +9 …).
- Hat ein Akkord eine 9, aber keine Septime (add9), zeigt eine gestrichelte „−7“-Plakette, welcher Ton fehlt (die kleine Septime). Cache: v45.

## Wackeln beim Durchklicken der Akkorde (Ursachen gefunden)
- Gemessen: Für alle 19 Akkorde bei vier Bildschirmgrößen die Position und Höhe von Tonleiter-Karte, Notenzeile, Erklärung, Klaviatur, Akkord-Chips und die Seitenhöhe verglichen.
- Ursache 1: Die Erklärung stand je nach Akkord (Länge des Textes, Breite der Notenzeile) mal neben, mal unter der Notenzeile; das schob Inhalte um bis zu 330 px. Jetzt steht sie immer in einer eigenen Zeile darunter.
- Ursache 2: Im Handy-Querformat war die Mindesthöhe der Karte zu klein (240 px, gebraucht bis 266 px), daher wuchs sie bei manchen Akkorden (z. B. 7sus4). Jetzt konstant.
- Ursache 3: In der Intervall-Tabelle brachen Namen wie „verminderte Septime“ um und machten die Tabelle 16 px höher; die Chips darunter rutschten. Jetzt kein Umbruch. Cache: v46.

## Akkordname im Quintenzirkel, Griffbrett-Kopf aufgeräumt, Finger standardmäßig an
- In der Kopfzeile des Quintenzirkels steht bei gewähltem Akkord hinter der Tonart der Akkord (z. B. „C-Dur · Cmaj7“).
- Griffbrett-Kopf: Der Finger-Schalter („Finger 1–4“) sitzt jetzt für sich links neben „Max“ am rechten Rand (im Hochformat rechtsbündig in eigener Zeile). Instrument-, Beschriftungs- und Ansichts-Gruppe haben einen farbig abgesetzten Hintergrund.
- Fingernummern sind standardmäßig an (Schalter blendet sie aus; die Wahl wird gemerkt).
- Handy quer: Die Pfeile der Positionsauswahl sitzen näher am Text („ab Bund 2“). Cache: v47.

## Akkord groß im Quintenzirkel, Intervalle bleiben zu
- Der gewählte Akkord steht jetzt groß (violett, fett) links oben in der leeren Ecke des Quintenzirkels, direkt unter der Überschrift – nicht mehr neben „C-Dur“. Die Schriftgröße wächst mit dem Quintenzirkel.
- Die Intervall-Tabelle klappt beim Wählen eines Akkords nicht mehr von selbst auf (alles Wichtige steht ja im Quintenzirkel, in der Notenzeile und auf der Klaviatur).
- Tablet quer: Der Quintenzirkel ist etwas größer (Höhe minus 185 statt 230 px, bis 50 % der Breite). Cache: v48.

## Quintenzirkel größer, Akkord-Erklärung an die Seite, farbige Plaketten
- Breiter Bildschirm (Browser/Tablet quer ab 1100 px): Die Akkord-Erklärung (Akkord, Abstände, „Nicht in …“, Beschreibung) steht rechts neben der Notenzeile statt darunter; die Tonleiter-Karte ist dadurch rund 110 px niedriger und bleibt beim Durchklicken konstant hoch. Der Quintenzirkel wird größer (Höhe minus 150 px, bis 53 % der Breite; z. B. 603 px bei 1180×800). Hochformat und Handy bleiben unverändert (Erklärung darunter).
- Akkordname links oben im Quintenzirkel kleiner (etwa so breit wie „Quintenzirkel C-Dur“).
- Plaketten: Grundton (orange), Terz (blau), Quinte (grün) pastellig gefüllt wie in Notenzeile und Klaviatur; dazukommende Töne („+7“, „+9“) mit grünem Rand; die fehlende Septime „−7“ mit rotem, gestricheltem Rand. Cache: v49.

## Akkord-Play-Knopf, Tonleiter nacheinander, Töne pulsieren
- Bei gewähltem Akkord steht links von den Noten ein runder Play-Knopf („Akkord anhören“): spielt den Akkord zusammen. Der Play-Knopf oben in der Tonleiter-Karte spielt dagegen immer nacheinander (Tonleiter bzw. die einzelnen Akkordtöne).
- Jeder Ton pulsiert beim Erklingen kurz (Kasten in der Notenzeile wird größer und bekommt eine helle Füllung; die passende Taste der Klaviatur leuchtet auf). Beim Akkord pulsieren alle Töne gleichzeitig, bei der Tonleiter einer nach dem anderen im Takt des Klangs (Zeitpunkt über setTimeout – grob synchron, nicht sample-genau). Cache: v50.

## Sus-Akkorde: „−3“, Grundton-Rahmen in Moll
- Sus2/Sus4 ersetzen die Terz: Im Quintenzirkel erscheint an der Stelle der Terz eine rote, gestrichelte „−3“-Plakette (in Moll-Tonarten die kleine Terz, sonst die große).
- Fehler behoben: In einer Moll-Tonart (z. B. Csus4 → Moll = Asus4) lag der rote Grundton-Rahmen im äußeren Dur-Ring (A-Dur), nicht im Moll-Feld „a“. Der Ring richtet sich jetzt nach der Terz des Akkords; ohne Terz (sus) nach der gewählten Tonart.
- Wichtig zum Verständnis: „Moll“ wechselt die Tonart zur Paralleltonart (C-Dur → a-Moll); der Akkord wird dann auf dem neuen Grundton gebaut (Csus4 → Asus4). Er wird nicht zum Moll-Akkord – dafür gibt es den Akkord „Cm“. Das Pulsieren der Noten wurde automatisch für alle 19 Akkorde in Dur und Moll getestet (Notenzeile und Klaviatur, kein Fehler). Cache: v51.

## Klaviatur folgt den Oktaven der Notenzeile
- Die Klaviatur zeigt jetzt denselben Oktavbereich wie die Notenzeile: Wandert man mit den Pfeilen eine Oktave hoch oder runter (oder wechselt in den Bassschlüssel), wandert die Klaviatur mit (zwei Oktaven ab dem C unter dem ersten Ton).
- Jedes C trägt klein die deutsche Oktavzahl wie in der Notenzeile (C2, C3 …; kl, gr, K, S darunter). Das normale eingestrichene C (Zahl 1) bleibt unbeschriftet. Statt „C4/C5“ steht also nichts bzw. „C2“.
- Technik: drawKeys wird aus drawStaff mit den tatsächlich angezeigten Tönen aufgerufen. Cache: v52.

## Play-Knopf in die Notenzeile, Einklapp-Pfeil ganz rechts
- Der Play-Knopf der Tonleiter-Karte steht jetzt als runder Knopf oben links in der Notenzeile (vor den Notennamen, frei neben dem Schlüssel) und nicht mehr neben Dur/Moll. Er spielt Tonleiter bzw. Akkordtöne nacheinander. Bei Akkorden bleibt zusätzlich der gefüllte Knopf links in der Mitte (Akkord zusammen).
- Der Einklapp-Pfeil der Karte sitzt ganz rechts oben. Cache: v53.

## Play-Knopf mittig zu den Notenkästen, keine „1“ im Kasten
- Der Play-Knopf sitzt jetzt senkrecht genau in der Mitte der Notenkästen (wird nach der tatsächlichen Größe der Notenzeile berechnet).
- Die kleine Oktavzahl unten rechts im Kasten erscheint nur noch, wenn sie nicht „1“ ist (das normale eingestrichene C braucht keine Zahl); das höhere C zeigt weiter „2“. Cache: v54.

## Cello: Fingernummern und Rückwärts-Strecken
- Recherche: Am Cello rückt die Hand pro Lage einen Halbton weiter (halbe Lage, 1., 1½., 2., 3., 3½., 4. Lage). Der 1. Finger steht auf der A-Saite in der halben Lage auf B♭, 1. Lage auf H, 1½. Lage auf C, 2. Lage auf Cis/Des, 3. auf D, 3½. auf Es/Dis, 4. auf E. Die App-Zählung stimmte also (C auf der A-Saite = 1½. Lage). Quellen: Violoncell-Schule (uidaho.pressbooks.pub), cellofun.eu.
- Neu im Cello-Griffbrett (Ansicht „Lagen“): Der Schalter „Finger 1–4“ gilt jetzt auch fürs Cello. Pro Lage liegen die vier Finger auf vier aufeinanderfolgenden Halbtönen (1. Finger = Rahmenanfang). Töne einen Halbton unterhalb des Rahmens (Zeigefinger streckt nach unten) sind gestrichelt umrandet und mit „−1“ beschriftet; bei Gitarre/Bass außerdem „+4“ für die Dehnung des kleinen Fingers nach oben. In der halben Lage gibt es keine solche Dehnung (darunter liegt nur die leere Saite). Cache: v55.

## Griffbilder: Akkorde offen und als Barré (Gitarre)
- Neue Ansicht „Akkord“ im Griffbrett-Kopf (nur Gitarre): zeigt den gewählten Akkord (ohne Akkord: den Dreiklang der Tonika, Dur oder Moll) als Griffbild. Mit ‹ › blättert man durch die Varianten: zuerst offen (falls es einen Standard-Griff gibt, z. B. Em, Am, C, G, D, E7, Cmaj7), dann Barré-Formen von unten nach oben (E-Form: Grundton auf der tiefen E-Saite; A-Form: Grundton auf der A-Saite).
- Darstellung: Punkte in den Rollenfarben (Grundton orange, Terz blau, Quinte grün), Barré als Balken, × bei nicht angeschlagenen Saiten, leere Saiten als Ton am Sattel, Fingerzahlen (Schalter „Finger 1–4“ gilt auch hier).
- Hinterlegte Akkordarten: Dur, Moll, Sus2, Sus4, 7sus4, maj7, 7, m7 (offen und/oder Barré). Für übrige Akkorde (dim, aug, 9 …) erscheint ein Hinweis; dann bitte Griffbrett/Positionen nutzen.
- Test: alle 182 erzeugten Griffbilder (12 Grundtöne × 8 Akkordarten) enthalten nur Akkordtöne, haben den Grundton als tiefsten Ton und bleiben innerhalb der 15 Bünde. Der Header bricht bei mittlerer Breite um, damit der Titel nicht abgeschnitten wird. Cache: v56.

## Griffbrett-Kopf aufgeräumt, Dur/Moll am Griffbrett
- Fingerzahlen stehen in den Ansichten „Positionen“ und „Akkord“ immer da (im ganzen Griffbrett gibt es keine); der Schalter „Finger 1–4“ ist weg.
- Kopfzeile: links „Griffbrett C-Dur“ und direkt daneben die Auswahl Gitarre/Bass/Cello (der Instrumentenname steht nicht mehr doppelt im Titel). Der Einklapp-Pfeil ist entfernt (Titel antippen klappt weiterhin ein), „Max“ ist nur noch das Symbol ⤢ ganz rechts.
- Neu: Dur/Moll-Umschalter direkt am Griffbrett (Moll = Paralleltonart, wie oben bei Dur/Moll; Akkord und Griffbilder passen sich an). Cache: v57.

## Griffbilder weiter oben am Hals (D-Form, Oktave höher)
- Fingersatz E-Form-Barré bestätigt: 1-3-4-2-1-1 (tiefe E-Saite: Zeigefinger/Barré, A-Saite: Ringfinger, D-Saite: kleiner Finger, G-Saite: Mittelfinger, H/e: Zeigefinger).
- Neu: D-Form (Grundton auf der D-Saite, vier hohe Saiten, ohne Barré) für Dur und Moll – für C-Dur z. B. Bund 10–13. Außerdem wird jede Form, wenn sie noch aufs Griffbrett passt (bis Bund 15), auch eine Oktave höher angeboten (z. B. E-/F-/A-Akkorde um den 12. Bund). Alle 233 Griffbilder wieder automatisch geprüft (nur Akkordtöne, Grundton tiefster Ton, innerhalb Bund 15). Cache: v58.

## Layout: Überschrift weg, Tonart groß, nur Grundton in den Kartenköpfen
- Die Seitenüberschrift „Quintenzirkel & Tonleitern“ ist entfernt.
- Quintenzirkel: Die Tonart (z. B. „C-Dur“) steht groß unter dem Titel, an derselben Stelle wie der gewählte Akkord (bei Akkord erscheint der Akkord stattdessen). Eingeklappt steht die Tonart wieder in der Kopfzeile.
- Tonleiter: Kopfzeile „Tonleiter C“ (nur der Grundton, groß) mit Dur/Moll direkt daneben.
- Griffbrett: „Griffbrett C“ (bzw. Akkordname) – danach Dur/Moll, dann erst Gitarre/Bass/Cello, Ton/Stufe und Griffbrett/Positionen/Akkord; ⤢ ganz rechts. Auf dem Handy hochkant steht Dur/Moll direkt neben dem Titel. Cache: v59.

## Eigene Tonart am Griffbrett, Klaviatur stellt das Griffbrett um
- Das Griffbrett hat jetzt eine eigene Tonart (Grundton + Dur/Moll). Der Dur/Moll-Schalter am Griffbrett wechselt auf denselben Grundton (G-Dur ↔ g-Moll), nicht auf die Paralleltonart wie oben.
- Ein Klick auf eine Taste der Klaviatur spielt den Ton und stellt das Griffbrett auf diesen Grundton in Dur (D → D-Dur; dort direkt auf d-Moll umschaltbar, auch Griffbilder und Positionen). Der Quintenzirkel oben bleibt dabei unverändert. Ändert man oben die Tonart/den Akkord/Dur-Moll, übernimmt das Griffbrett wieder diese Tonart.
- Schreibweise am Griffbrett: Dur mit Kreuz-/B-Namen des Quintenzirkels (Des-Dur), Moll mit den Moll-Namen (cis-Moll).
- Layout: Tonart oben links im Quintenzirkel kleiner, Kreis etwas größer (Tablet quer 637 px statt 603 px bei 1180×800), Play-Knopf der Tonleiter jetzt gemessen exakt auf der Mitte der Notenkästen (Abweichung unter 1 px). Cache: v60.

## Griffbilder für alle Akkordtypen an der Gitarre
- Vorher stand bei dim, aug, mmaj7, m7♭5, dim7, add9, 6, m6, 9, maj9 und m9 „noch keine Griffbilder“. Jetzt gibt es für alle 19 Akkordtypen Griffe (400 Griffbilder über alle 12 Grundtöne).
- Recherche: classicalguitar.org „Moveable chord shapes“ (Fingersätze für maj7, m7♭5, dim auf der 6./5./4. Saite) und nextlevelguitar (Dur/Moll/7 als Ausgangsformen); die restlichen Formen sind klassische Standardgriffe (z. B. Cadd9 x32030, C6 x32210), die ich per Programm geprüft habe.
- Jazz-Griffe nutzen Bund −1 relativ zum Grundton (Zeigefinger bleibt frei). Bei 9er-Akkorden und 6/m6 darf die Quinte fehlen (üblich), Grundton, Terz und Septime/None müssen vorkommen.
- Automatischer Test: nur Akkordtöne, Grundton tiefster Ton, Spannweite ≤ 4 Bünde, höchstens Bund 15, Terz nie weggelassen. Barré-Balken wird nur gezeichnet, wenn der Zeigefinger mehrere Saiten greift. Cache: v61.

## Richtige Schreibweise der Akkorde, kleine Namen im Kreis, Intervalle, Theorie-Themen
- Zurückgenommen: die vereinfachten Namen (F statt Eis). Akkordtöne werden wieder nach Terzenschichtung geschrieben (Cis-maj7 = Cis – Eis – Gis – His), wie es die Musiktheorie verlangt. Ebenso zurück: der Grundton eines Dur-Akkords leuchtet im äußeren Ring (Des).
- Im Quintenzirkel steht in dem Feld, dessen Name vom Akkordton abweicht, klein und kursiv der richtige Name (im Feld „Des“ klein „Cis“, im Feld „F“ „Eis“ usw.), in der Farbe der Rolle (Grundton/Terz/Quinte).
- Unter dem Akkordnamen oben links im Kreis stehen klein die beteiligten Intervalle (Prim · gr. Terz · Quinte · gr. Septime).
- Im Infobereich neben der Notenzeile gibt es eingeklappt „Theorie: warum so geschrieben?“ mit Themen: Terzenschichtung, Enharmonik (mit den Paaren des gewählten Akkords), Vorzeichen/Auflösezeichen, Grundton im Kreis. Cache: v64.

## Schalter „Einfach / Korrekt“, Töne im Rahmen leuchten mit Zahl
- Neu unten rechts im Quintenzirkel (sichtbar mit gewähltem Akkord): „Einfach“ (Standard) schreibt Akkordtöne mit den bekannten Namen (F statt Eis, C statt His), „Korrekt“ nach Terzenschichtung und zeigt im Kreis klein den genauen Namen. Die Wahl wird gemerkt.
- Töne, die im Rahmen liegen (Tonika, Subdominante, Dominante + Parallelen), leuchten dort mit ihrer Zahl (1, 3, 5): Cis-maj7 in cis-Moll leuchtet am Feld „cis“ als 1, Gis als 5. Hinzugefügte Töne (+7, +9) und weggelassene (−3, −7) stehen im übrigen Kreis, nicht im Rahmen. Auch das Aufleuchten des Grundtons beim Abspielen folgt dieser Regel.
- Fehler behoben: Plaketten wurden beim Drehen des Kreises mitgedreht (schief); sie bleiben jetzt waagrecht. Cache: v65.

## Tonleiter: Schalter nennen beide Paralleltonarten
- In der Karte „Tonleiter“ stehen statt „Dur | Moll“ jetzt die Tonarten selbst, z. B. „E-Dur | cis-Moll“. Ein Klick wechselt direkt zwischen den Parallelen (gleiche Vorzeichen, anderer Grundton). Der Titel wiederholt die Tonart nicht mehr; eingeklappt steht sie weiter in der Kopfzeile. Cache: v66.

## „Akkord“ statt „Tonleiter“, lesbare Akkordnamen
- Ist ein Akkord gewählt, heißt die Karte oben „Akkord“ (statt „Tonleiter“) und nennt daneben den Akkord, z. B. „Akkord Cis aug“. Der Tooltip nennt den vollen Namen (Übermäßig, Major 7 …).
- Akkordnamen sind lesbarer geschrieben: „A aug“ statt „Aaug“, „Cis m7“ statt „Cism7“, „Cis maj7“; kurze wie „C7“, „Am“ bleiben eng. Gilt im Kreis, in der Karte, bei den Akkordknöpfen, im Info-Text und am Griffbrett. Cache: v67.

## Intervall-Kürzel (KT, GT …) mit Legende
- Die Intervall-Tabelle unter der Klaviatur schreibt die Namen abgekürzt, damit sich nichts überschneidet (Handy hochkant): RP reine Prim, KT kleine Terz, GT große Terz, RQn reine Quinte, KSp/GSp kleine/große Septime, GN große None usw. Antippen/Hovern zeigt den vollen Namen.
- Unter der Tabelle gibt es eine einklappbare „Legende“ (standardmäßig zu), die alle Abkürzungen erklärt: R/K/G/V/Ü und P/S/T/Qt/Qn/Sx/Sp/N/O/HT. Cache: v68.

## Mehr Griffbilder: „+“ blendet weitere Griffe ein
- Am Anfang zeigt die Ansicht „Akkord“ nur die einfachen Griffe (offen + Barré-Formen E/A im unteren Bereich). Ein kleines „+“ rechts neben den Pfeilen blendet weitere ein (Tooltip nennt die Anzahl), „−“ geht zurück. Das „+“ erscheint nur, wenn es weitere gibt.
- Neue Griffe (alle Standardformen, automatisch geprüft: nur Akkordtöne, Grundton tiefster Ton, ≤ 4 Bünde Spannweite, ≤ Bund 15, 588 Griffbilder): Vierklänge auf den hohen Saiten (D-Form, z. B. Dm7 = xx0211) für 7, m7, maj7, m7♭5, m(maj7), sus2/4, 6, m6, dim7, aug; Am7 mit dem kleinen Finger (A-Form-Variante x02213 → Dm7 x57768); C-Form mit der Grundtonsaite A (Dur, 7, m7, z. B. D = x54232); eine Oktave höher liegende Wiederholungen ebenfalls unter „+“.
- Hinweis: Diese Formen stammen aus gängigem Griffwissen, nicht aus einer neuen Quelle; die Nachricht war am Ende abgeschnitten. Cache: v69.
