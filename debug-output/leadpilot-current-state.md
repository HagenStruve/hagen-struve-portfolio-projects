# LeadPilot Current State Diagnose

## Problem / Zweck

Dieser Diagnose-Output dokumentiert den aktuellen Stand von `LeadPilot-Scraper-v5` nach der Umstellung auf eine modulare statische MVP-Version.

## Projektstatus

- Aktive App: statisches HTML/CSS/JavaScript.
- Kein React.
- Kein Vite.
- Kein Build-Prozess.
- Startdatei: `LeadPilot-Scraper-v5/index.html`
- Portfolio-Link: `./LeadPilot-Scraper-v5/index.html`
- Favicon: `../assets/brand/favicon.png`

Der alte Node/Express-Prototyp wurde archiviert:

```text
LeadPilot-Scraper-v5/archive/
```

Er bleibt erhalten, wird aber nicht aktiv verwendet.

## Betroffene Dateien

Aktive statische App:

- `LeadPilot-Scraper-v5/index.html`
- `LeadPilot-Scraper-v5/style.css`
- `LeadPilot-Scraper-v5/app.js`
- `LeadPilot-Scraper-v5/js/state.js`
- `LeadPilot-Scraper-v5/js/ui.js`
- `LeadPilot-Scraper-v5/js/export.js`
- `LeadPilot-Scraper-v5/js/scoring.js`
- `LeadPilot-Scraper-v5/js/storage.js`
- `LeadPilot-Scraper-v5/js/demo-data.js`
- `LeadPilot-Scraper-v5/js/api/google-places.js`
- `LeadPilot-Scraper-v5/js/utils/helpers.js`

Archiv:

- `LeadPilot-Scraper-v5/archive/backend/`
- `LeadPilot-Scraper-v5/archive/frontend/`
- `LeadPilot-Scraper-v5/archive/data/`
- `LeadPilot-Scraper-v5/archive/package.json`
- `LeadPilot-Scraper-v5/archive/old-node-prototype.md`

## Aktuelle Funktionen

- Suchparameter: Keyword/Branche, Bundesland, Kreis/Region, Stadt, maximale Ergebnisse.
- Optionales API-Key-Feld, lokal gespeichert.
- Demo-Leadgenerierung ohne externe Requests.
- Lead-Scoring mit `score` und `priority`.
- Statussystem pro Lead.
- Notizen pro Lead.
- Filter: Suche, Kategorie, Ort, Website, E-Mail, Mindestscore.
- Sortierung nach Score.
- Statistik-Karten.
- CSV Export.
- JSON Export.
- LLM-Prompt-Erzeugung.
- localStorage-Persistenz für Leads, Parameter, Status, Notizen und Filter.

## Relevanter Code

App-Koordination:

```js
let state = createInitialState(loadState());
state.leads = state.leads.map((lead) => normalizeStoredLead(lead));

hydrateForm(state);
renderApp(state, getFilteredLeads(state));
```

Demo-Leadmodell:

```js
return {
  id: createId("lead"),
  company: `${word} ${keyword} ${index + 1}`,
  category,
  address,
  city,
  state,
  phone,
  website,
  email,
  reviews,
  source,
  status: "Neu",
  tags: [keyword, region, source],
  notes
};
```

Scoring:

```js
if (hasValue(lead.website)) score += 20;
if (hasValue(lead.phone)) score += 15;
if (keywordHit) score += 20;
if (Number(lead.reviews) >= 50) score += 10;
if (hasValue(lead.email)) score += 15;
```

Google-API-Adapter:

```js
export async function fetchGooglePlacesLeads(params) {
  // Placeholder for a later Google Places/Maps API adapter.
  // Intentionally no scraping and no protective-mechanism bypassing.
  return {
    enabled: false,
    leads: [],
    message: "Google Places API ist architektonisch vorbereitet."
  };
}
```

## Lauffähigkeit im Portfolio

Die aktive App läuft direkt über:

```text
./LeadPilot-Scraper-v5/index.html
```

Kein `dist/` erforderlich.

## Risiken / Lücken

- Google Places/Maps API ist noch nicht produktiv integriert.
- Kein Backend-Proxy für sichere API-Key-Verwaltung.
- Keine echte Dublettenprüfung.
- Kein Import vorhandener CSV/JSON-Listen.
- Kein echtes CRM-/Pipeline-Modell über Status und Notizen hinaus.
- Keine produktive Datenschutz-/Consent-Logik für echte Leads.

## Nicht verändern

- Keine API-Keys committen.
- Keine aggressive Scraping-Logik wieder aktivieren.
- Den archivierten Node-Prototyp nicht als Portfolio-Zielseite verwenden.
