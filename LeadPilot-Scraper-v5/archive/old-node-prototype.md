# Alter Node-Prototyp

Dieser Ordner archiviert den ursprünglichen Node/Express-Prototyp von LeadPilot.

Er bleibt aus Dokumentationsgründen erhalten, ist aber nicht die aktive Portfolio-Version.

Falls der alte Prototyp lokal geprüft werden muss, kann er aus diesem `archive`-Ordner heraus separat gestartet werden. Dafür ist Node.js nötig; die statische Portfolio-App benötigt das nicht.

Aktive statische App:

- `../index.html`
- `../style.css`
- `../app.js`
- `../js/`

Wichtige Abgrenzung:

- Die aktive MVP-Version ist API-first aufgebaut.
- Es wird keine aggressive Scraping-Logik weiterentwickelt.
- Google Places/Maps darf später nur über offizielle API-Nutzung oder einen sicheren Proxy angebunden werden.
- API-Keys dürfen niemals hardcoded oder committet werden.
