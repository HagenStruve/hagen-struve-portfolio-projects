# Licht im Feld

Eine interaktive Erlebniswebseite über Jesus, Hoffnung, Vergebung und Frieden.

## Start in VS Code

```bash
npm install
npm run dev
```

Dann im Browser öffnen:

```txt
http://localhost:5173
```

## Produktionsbuild

```bash
npm run build
```

Danach liegt die fertige statische Webseite im Ordner:

```txt
dist/
```

Diesen `dist`-Ordner kannst du per FileZilla auf deinen Webspace hochladen.

## Bilder

Die Bilder liegen bereits in:

```txt
public/images/
```

Verwendete Dateien:

- `stille.webp`
- `weg.webp`
- `schuld.webp`
- `kreuz.webp`
- `neu.webp`
- `antwort.webp`
- `og-image.webp`

## Tests

```bash
npm test
```

Der Test prüft die Grundkonfiguration der Kapitel, SEO-Daten und Bildpfade.

## Nächste sinnvolle Schritte mit Codex

1. Mobile Performance testen und glätten.
2. Sounddesign optional ergänzen.
3. SEO/OpenGraph nach finaler Domain anpassen.
4. Optional echte Landingpage vor der Experience bauen.
5. Impressum/Datenschutz ergänzen, sobald die Seite öffentlich online geht.
