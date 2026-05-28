# LeadPilot

LeadPilot ist eine statische Portfolio- und MVP-Version für strukturierte Leadgenerierung, Lead-Bewertung und Datenexport.

Die aktive App läuft direkt im Browser:

```text
LeadPilot-Scraper-v5/index.html
```

Es gibt keinen Build-Prozess, kein Framework und keinen Backend-Zwang.

## Projektidee

LeadPilot soll Nutzer dabei unterstützen, Suchparameter für potenzielle Leads zu definieren, Ergebnisse strukturiert zu bewerten und anschließend für weitere Auswertung zu exportieren.

Typischer Workflow:

1. Branche, Keyword und Region eingeben.
2. Demo-Leads erzeugen oder später offizielle Google-Places-/Maps-Daten nutzen.
3. Leads nach Score, Kontaktqualität und Status filtern.
4. CSV, JSON oder LLM-Prompt exportieren.
5. Leads extern priorisieren, clustern und bewerten.

## API-first Ansatz

Die App ist bewusst API-first vorbereitet:

- keine aggressive Scraping-Logik
- keine Umgehung von Google-/Maps-Schutzmechanismen
- Google Places/Maps API als getrennter Adapter vorbereitet
- API-Key bleibt lokal im Browser
- keine API-Keys im Repository

Die vorbereitete API-Schicht liegt hier:

```text
js/api/google-places.js
```

Aktuell sendet diese Datei noch keine produktiven externen Requests.

## Demo-Modus

Der Demo-Modus erzeugt realistische Beispieldaten lokal im Browser. Er dient als sichere Portfolio-Demo und als Basis für die spätere API-Anbindung.

## Lokale Speicherung

LeadPilot nutzt `localStorage` für:

- Suchparameter
- API-Key optional
- Leads
- Lead-Status
- Lead-Notizen
- Filterzustände

Die Daten bleiben lokal auf dem jeweiligen Gerät.

## Architektur

Die statische MVP-App ist in kleine Module getrennt:

- `app.js`: App-Koordination und Event-Fluss
- `js/state.js`: State, Filterung, Statuswerte
- `js/storage.js`: localStorage-Persistenz
- `js/demo-data.js`: sichere Demo-Leadgenerierung
- `js/scoring.js`: Lead-Scoring und Priorität
- `js/export.js`: CSV, JSON und LLM-Prompt
- `js/ui.js`: DOM-Rendering und UI-Events
- `js/api/google-places.js`: vorbereiteter API-Adapter
- `js/utils/helpers.js`: kleine Hilfsfunktionen

## Lead-Scoring

Jeder Lead bekommt automatisch:

- `score`
- `priority`: `high`, `medium`, `low`

Bewertet werden unter anderem:

- Website vorhanden
- Telefonnummer vorhanden
- E-Mail vorhanden
- Kategorie passt zum Suchbegriff
- vorbereitete Bewertungsanzahl
- fehlende Daten

## Statussystem

Jeder Lead kann einen Status erhalten:

- Neu
- Prüfen
- Kontaktieren
- Interessant
- Kunde
- Nicht relevant

Der Status wird lokal gespeichert und in CSV/JSON exportiert.

## Export

LeadPilot unterstützt:

- CSV Export
- JSON Export
- LLM Prompt Export

Die Exporte enthalten unter anderem:

- Score
- Priorität
- Status
- Tags
- Notizen
- Exportzeitpunkt

## Archiv

Der alte Node/Express-Prototyp wurde archiviert:

```text
archive/
```

Er bleibt erhalten, ist aber nicht die aktive Portfolio-Version.

## Datenschutz-Hinweis

Die Nutzung echter API-Daten muss rechtskonform, datenschutzbewusst und nach den jeweiligen API-Nutzungsbedingungen erfolgen. Keine echten API-Keys oder privaten Leadlisten in Git committen.
