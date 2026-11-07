# Git-Anleitung: Projekt als Repository auf GitHub

Schritt für Schritt in der richtigen Reihenfolge. Die Befehle laufen im Terminal (Windows: Git Bash oder PowerShell, macOS/Linux: Terminal).

## Einmalig vorbereiten

1. **Git installieren** und prüfen:
   ```bash
   git --version
   ```
2. **Name und E-Mail setzen** (erscheinen in jedem Commit):
   ```bash
   git config --global user.name  "Dein Name"
   git config --global user.email "du@beispiel.de"
   ```
3. **Anmeldung bei GitHub** einrichten – eine der drei Möglichkeiten:
   - **GitHub CLI** (am einfachsten): `gh auth login`
   - **SSH-Schlüssel**: `ssh-keygen -t ed25519`, den öffentlichen Schlüssel (`.pub`) unter GitHub → Settings → SSH keys eintragen
   - **Personal Access Token** als Passwort beim ersten `git push` über HTTPS

## Das Projekt zum Repository machen

4. **ZIP entpacken.** Der Ordner `quintenzirkel` muss direkt `index.html` enthalten (nicht noch einmal verschachtelt). Er darf nicht innerhalb eines anderen Git-Projekts liegen.
5. **In den Ordner wechseln und das lokale Repository anlegen:**
   ```bash
   cd quintenzirkel
   git init -b main
   ```
6. **Prüfen, was aufgenommen wird** (die `.gitignore` ist bereits dabei und schließt z. B. `*.zip` und `node_modules/` aus):
   ```bash
   git status
   ```
7. **Ersten Commit erstellen:**
   ```bash
   git add .
   git commit -m "Quintenzirkel-App: erste Version"
   ```

## Variante: mit Git Extensions (grafisch)

Git Extensions ist eine Windows-Oberfläche für dieselben Schritte. Git selbst muss installiert sein (Schritt 1–3 oben bleiben gleich).

1. **Repository anlegen:** Git Extensions starten → *Repository erstellen* → den entpackten Ordner `quintenzirkel` wählen (er muss direkt `index.html` enthalten) → Repository-Typ *Persönlich* → *Erstellen*.
2. **Ersten Commit:** Fenster *Commit* öffnen (Strg + K). Links stehen die geänderten Dateien: *Alle stagen*, Nachricht eintragen („Quintenzirkel-App: erste Version“), *Commit*. Prüfen, dass keine `.zip`-Datei dabei ist (die `.gitignore` filtert sie).
3. **Branch prüfen:** Er sollte `main` heißen (unten/oben in der Titelzeile). Sonst: Rechtsklick auf den Branch → *Umbenennen*.
4. **Auf GitHub ein leeres Repository anlegen** (ohne README, `.gitignore`, Lizenz).
5. **Remote eintragen:** *Remote* → *Remote-Repositories verwalten* → *Neu*: Name `origin`, URL `https://github.com/<NUTZER>/quintenzirkel.git` → *Speichern*.
6. **Hochladen:** *Push* (Strg + Umschalt + ↑) → Remote `origin`, Branch `main` → *Push*. Anmeldung per Browser-Fenster (Git Credential Manager) oder Token.
7. **GitHub Pages** wie in Schritt 10 unten einschalten.
8. **Alltag:** Änderung → *Commit* (stagen, Nachricht) → *Push*. In `sw.js` nicht vergessen, `CACHE` hochzuzählen.

## Empfohlene Ordnerstruktur im Repository

```
quintenzirkel/              ← Wurzel des Repositorys, hier liegt .git
├── index.html              Startseite (GitHub Pages liefert sie aus)
├── manifest.webmanifest    PWA-Beschreibung
├── sw.js                   Service Worker (Offline)
├── README.md               Beschreibung, wird auf GitHub angezeigt
├── .gitignore
├── css/style.css
├── js/                     util, theory, circle, staff, keyboard, fretboard, table, audio, panels, app
├── icons/                  icon-192.png, icon-512.png
└── docs/                   LERNTAGEBUCH.md, GIT-ANLEITUNG.md
```

## Auf GitHub veröffentlichen

8. **Leeres Repository auf github.com anlegen** (New repository, Name z. B. `quintenzirkel`). Wichtig: **ohne** README, `.gitignore` und Lizenz anlegen, sonst gibt es beim ersten Hochladen einen Konflikt.
9. **Lokales und Remote-Repository verbinden und hochladen:**
   ```bash
   git remote add origin https://github.com/<NUTZER>/quintenzirkel.git
   git push -u origin main
   ```
   Mit der GitHub CLI geht Schritt 8 und 9 in einem Befehl:
   ```bash
   gh repo create quintenzirkel --public --source=. --remote=origin --push
   ```
10. **GitHub Pages einschalten:** Repository → Settings → Pages → *Deploy from a branch* → Branch `main`, Ordner `/ (root)` → Save. Nach ein bis zwei Minuten ist die App erreichbar unter
    `https://<NUTZER>.github.io/quintenzirkel/`
11. **Testen:** Adresse öffnen, auf dem Handy oder Tablet in Chrome „App installieren“ wählen.

## Alltag: Änderung → Test → Commit → Push

12. **Lokal testen** (nötig für Offline-Modus und Installation; ein Doppelklick auf `index.html` geht auch):
    ```bash
    python3 -m http.server 8000      # dann http://localhost:8000 öffnen
    ```
13. **Sichten, festhalten, hochladen:**
    ```bash
    git status                        # was hat sich geändert?
    git diff                          # optional: Änderungen ansehen
    git add -A
    git commit -m "Griffbrett: Geige ergänzt"
    git push
    ```
14. **Nicht vergessen:** Wurden App-Dateien geändert, in `sw.js` die Nummer bei `CACHE` hochzählen (`quintenzirkel-v69` → `v70`). Kommt eine neue Datei dazu, auch in die Liste `FILES` eintragen. Sonst sehen installierte Apps weiter die alte Version.

## Gute Gewohnheiten

- **Kleine Commits** mit kurzer Nachricht in der Befehlsform („Quintenzirkel: Größe wählbar“).
- **Lerntagebuch mit committen:** Nach größeren Schritten einen Eintrag in `docs/LERNTAGEBUCH.md` schreiben und zusammen mit dem Code committen.
- **Version markieren:** `git tag v1.0` und `git push --tags`.
- **Experimente in einem Branch:** `git switch -c android` – gefällt es nicht, wechselt man mit `git switch main` zurück.
- **Eigene Domain:** Settings → Pages → *Custom domain* eintragen; beim Domain-Anbieter einen `CNAME`-Eintrag auf `<NUTZER>.github.io` setzen.
- **Android später:** Capacitor-Projekt in einen Unterordner (z. B. `android/`) oder ein eigenes Repository legen. `node_modules/` ist schon in der `.gitignore`.

## Wenn etwas hakt

| Meldung / Problem | Ursache | Lösung |
|---|---|---|
| `rejected … (fetch first)` beim ersten Push | Auf GitHub wurde schon eine README o. Ä. angelegt | `git pull --rebase origin main`, dann `git push` |
| `Authentication failed` | Falsches Passwort / kein Token | Anmeldung wie in Schritt 3 einrichten (`gh auth login`) |
| Pages zeigt 404 | Falscher Branch oder Ordner, oder `index.html` nicht im Hauptverzeichnis | Settings → Pages prüfen; Ordnerstruktur kontrollieren |
| Nach dem Push sieht man die alte Version | Cache oder Service Worker | `CACHE` in `sw.js` erhöhen, Seite hart neu laden (Strg + Umschalt + R) |
| Versehentlich eine große Datei committet | `.gitignore` greift nur für noch nicht verfolgte Dateien | `git rm --cached <Datei>`, Eintrag in `.gitignore`, neu committen |
