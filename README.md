# Hagen Struve Portfolio

Die Hauptseite des Repositories ist jetzt die Datei im Root:

```text
index.html
```

Die neue Root-Seite basiert auf der Vorlage aus:

```text
hagen-responsive-site/
```

Der Ordner `hagen-responsive-site` bleibt als Backup/Vorlage erhalten. Der Ordner `hagen-struve-webseite` bleibt ebenfalls bestehen und kann später als Archiv der alten Portfolio-Version dienen.

## Projektordner

Diese bestehenden Projektordner bleiben unverändert:

- `ai-salvager-v1`
- `licht-im-feld`
- `rechnungsprogramm`

Die Root-Seite verlinkt nur auf diese Ordner.

## Experimente / Archiv

- `LeadPilot-Scraper-v5` - experimenteller API-first Leadgenerierungs-Prototyp, aktuell nicht im Portfolio verlinkt.

## Lokal testen

In VS Code:

1. Rechtsklick auf `index.html`
2. `Open with Live Server`

## FileZilla Upload

Das Repository bleibt statisch hochladbar. Für den Upload kann der Inhalt des Hauptordners auf den Webspace geladen werden.

Wichtig:

- `index.html` muss im Webspace-Root liegen.
- `assets/Foto.jpg` muss mit hochgeladen werden.
- Die Projektordner müssen mit hochgeladen werden, wenn die Projektlinks online funktionieren sollen.
- Es gibt keinen Build-Prozess und keine Framework-Abhängigkeit für die Root-Seite.
