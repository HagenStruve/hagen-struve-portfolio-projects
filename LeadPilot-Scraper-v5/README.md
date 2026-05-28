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
2. Datenquelle wählen: Demo, OpenStreetMap oder Google Places.
3. Leads nach Score, Kontaktqualität und Status filtern.
4. CSV, JSON oder LLM-Prompt exportieren.
5. Leads extern priorisieren, clustern und bewerten.

## Suchmodi

### Demo

- kostenlos
- keine externen Requests
- realistische Beispieldaten
- ideal für Portfolio, Tests und UI-Demo

### OpenStreetMap / Overpass API

- kostenlos
- echte öffentliche Daten
- kein API-Key nötig
- gute MVP-Lösung für erste echte Leadlisten
- Datenqualität kann schwanken, insbesondere bei Telefon, Website und E-Mail

Die OSM-Schicht liegt hier:

```text
js/api/overpass.js
```

### Google Places API

- optional
- benötigt API-Key
- bessere Businessdaten
- kann Kosten verursachen
- API-Key bleibt lokal im Browser

## Google Places API

Die App unterstützt einen offiziellen Google-Places-API-Flow über die statische Browser-App:

- keine aggressive Scraping-Logik
- keine Umgehung von Google-/Maps-Schutzmechanismen
- Google Places/Maps API als getrennter Adapter
- API-Key bleibt lokal im Browser
- keine API-Keys im Repository
- bei fehlendem API-Key läuft automatisch der Demo-Modus
- bei API-/CORS-/Quota-Problemen zeigt die UI eine verständliche Fehlermeldung

Die API-Schicht liegt hier:

```text
js/api/google-places.js
```

Für produktive Nutzung muss der Google Cloud API-Key korrekt auf die Places API berechtigt und sinnvoll eingeschränkt sein. Google Places API kann Kosten verursachen.

Hinweis: Je nach API-Key-Restriktionen und Browserumgebung kann eine direkte Browser-Anfrage blockiert werden. Für eine spätere SaaS-Version ist ein sicherer Backend-Proxy empfehlenswert, damit API-Keys nicht clientseitig sichtbar sind.

## Google Places API einrichten

Kurzablauf:

1. Google Cloud Projekt erstellen.
2. Places API aktivieren.
3. Billing aktivieren. Google Places API kann Kosten verursachen.
4. API-Key erstellen.
5. API-Key sinnvoll einschränken, z. B. nach Website/HTTP-Referrer und API.
6. Key lokal in LeadPilot in das Feld `Google Places API-Key optional` einfügen.

Hilfreiche Links:

- Google Places API Key: https://developers.google.com/maps/documentation/places/web-service/get-api-key
- Google Cloud Places API: https://console.cloud.google.com/apis/library/places.googleapis.com

Der API-Key bleibt lokal im Browser. Er wird nicht hardcoded, nicht in Git committet und nicht in CSV/JSON-Exports geschrieben.

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
- Rating
- Anzahl Bewertungen
- Google Maps Link
- Exportzeitpunkt

## Archiv

Der alte Node/Express-Prototyp wurde archiviert:

```text
archive/
```

Er bleibt erhalten, ist aber nicht die aktive Portfolio-Version.

## Datenschutz-Hinweis

Die Nutzung echter API-Daten muss rechtskonform, datenschutzbewusst und nach den jeweiligen API-Nutzungsbedingungen erfolgen. Keine echten API-Keys oder privaten Leadlisten in Git committen.
