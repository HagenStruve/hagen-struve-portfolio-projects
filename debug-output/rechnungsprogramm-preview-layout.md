# Diagnose: Rechnungsprogramm Preview Layout

## 1. Problem

Die Rechnungsvorschau im Projekt `rechnungsprogramm` ueberlappt auf Desktop weiterhin den linken Formularbereich bzw. wirkt nicht wie eine sauber reservierte rechte Spalte.

Zielzustand:
- Desktop: Rechnungsvorschau als echte rechte Sticky-Spalte.
- Desktop: keine Ueberlagerung der Formularspalte.
- Desktop: Preview soll intern vertikal scrollen, falls sie hoeher als der Viewport ist.
- Mobile/Tablet: Der Button `Rechnung ansehen` und das Modal funktionieren bereits und sollen erhalten bleiben.

## 2. Relevante Dateipfade

- Hauptkomponente: `rechnungsprogramm/src/App.jsx`
- InvoicePreview-Logik: aktuell als Funktion `renderInvoicePreview` in `rechnungsprogramm/src/App.jsx`
- Globale CSS/Tailwind-Datei: `rechnungsprogramm/src/index.css`
- Tailwind-Konfiguration: `rechnungsprogramm/tailwind.config.js`
- Vite-Konfiguration: `rechnungsprogramm/vite.config.js`

## 3. Relevanter JSX/React-Code

### InvoicePreview-Funktion

Quelle: `rechnungsprogramm/src/App.jsx`, ungefaehr Zeile 1060.

```jsx
const renderInvoicePreview = () => (
  <Card className="w-full max-w-full overflow-hidden rounded-2xl shadow-sm print:border-0 print:shadow-none">
    <CardHeader className="border-b print:border-b"><CardTitle className="text-xl sm:text-2xl">Rechnungsvorschau</CardTitle></CardHeader>
    <CardContent className="min-w-0 p-4 sm:p-5 md:p-6">
      <div className="space-y-8 text-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold sm:text-2xl">{invoice.companyName || "Firmenname"}</h2>
            <p className="whitespace-pre-line break-words text-slate-600">{invoice.companyAddress}</p>
            <p className="break-words text-slate-600">{invoice.companyEmail}</p>
            <p className="break-words text-slate-600">{invoice.companyPhone}</p>
          </div>
          <div className="text-left sm:text-right">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">RECHNUNG</h3>
            <p><span className="font-medium">Nr.:</span> {invoice.invoiceNumber}</p>
            <p><span className="font-medium">Datum:</span> {invoice.invoiceDate}</p>
            <p><span className="font-medium">Fällig:</span> {invoice.dueDate}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Rechnung an</p>
          <p className="break-words text-base font-semibold">{invoice.customerName || "Kundenname"}</p>
          <p className="whitespace-pre-line break-words text-slate-600">{invoice.customerAddress || "Kundenadresse"}</p>
          <p className="break-words text-slate-600">{invoice.customerEmail || "Keine E-Mail-Adresse"}</p>
        </div>

        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full table-fixed text-left text-[11px] sm:text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="w-[30%] px-2 py-2">Beschreibung</th>
                <th className="w-[11%] px-2 py-2">Menge</th>
                <th className="w-[10%] px-2 py-2">Einheit</th>
                <th className="w-[18%] px-2 py-2">Einzelpreis</th>
                <th className="w-[13%] px-2 py-2">Diesel</th>
                <th className="w-[18%] px-2 py-2 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="break-words px-2 py-2">{item.description || "-"}</td>
                  <td className="break-words px-2 py-2">{item.quantity ?? item.hours}</td>
                  <td className="break-words px-2 py-2">{item.unit || ""}</td>
                  <td className="break-words px-2 py-2">
                    {currency(item.unitPrice)}
                    <span className="block break-words text-[10px] leading-tight text-slate-500">
                      {normalizePriceMode(item.priceMode) === "gross" ? "brutto vereinbart" : "netto"}
                    </span>
                  </td>
                  <td className="break-words px-2 py-2">{getLineFuel(item) > 0 ? formatFuel(getLineFuel(item)) : "-"}</td>
                  <td className="break-words px-2 py-2 text-right">{currency(getLineNetTotal(item, invoice.taxRate))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto w-full max-w-sm space-y-2 rounded-2xl border p-4">
          <SummaryRow label="Zwischensumme Netto" value={currency(subtotal)} />
          <SummaryRow label="Gesamt Dieselverbrauch" value={formatFuel(totalFuel)} />
          <SummaryRow label={`MwSt. (${invoice.taxRate}%)`} value={currency(taxAmount)} />
          <SummaryRow label="Gesamt Brutto" value={currency(total)} strong />
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Hinweis</p>
          <p className="whitespace-pre-line break-words text-slate-700">{invoice.notes}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);
```

### Oberster Layout-Container

Quelle: `rechnungsprogramm/src/App.jsx`, ungefaehr Zeile 1133.

```jsx
return (
  <div className="min-h-screen overflow-x-hidden bg-slate-50 p-3 pb-24 sm:p-4 sm:pb-24 md:p-8 md:pb-28 xl:pb-8 print:bg-white">
    <main className="invoice-app-shell mx-auto grid w-full max-w-[1800px] grid-cols-1 items-start gap-4 md:gap-6">
      <section className="invoice-form-column grid min-w-0 gap-6 print:hidden">
        {/* alle Formulare und Controls */}
      </section>

      <aside className="invoice-preview-column hidden min-w-0 xl:block">
        {renderInvoicePreview()}
      </aside>
    </main>
  </div>
);
```

### Anfang der linken Formularspalte

Quelle: `rechnungsprogramm/src/App.jsx`, ungefaehr Zeile 1136.

```jsx
<section className="invoice-form-column grid min-w-0 gap-6 print:hidden">
  <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
    <div className="flex items-start gap-3 sm:items-center">
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <Receipt className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rechnungsprogramm</h1>
        <p className="text-sm text-slate-600">Mit Kundenspeicher, Dienstleistungsliste und Stundenauswahl.</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:flex 2xl:flex-wrap 2xl:justify-end">
      {/* Toolbar Buttons */}
    </div>
  </div>

  {/* weitere Cards: Einstellungen, Firmenprofile, Kunden, Leistungen, Rechnung, Zusatzinfos */}
</section>
```

### Rechte Desktop-Preview-Spalte

Quelle: `rechnungsprogramm/src/App.jsx`, ungefaehr Zeile 1570.

```jsx
<aside className="invoice-preview-column hidden min-w-0 xl:block">
  {renderInvoicePreview()}
</aside>
```

### Mobile Preview Button und Modal

Quelle: `rechnungsprogramm/src/App.jsx`, ungefaehr Zeile 1576.

```jsx
<Button
  className="fixed bottom-4 right-4 z-30 shadow-lg xl:hidden"
  onClick={() => setPreviewOpen(true)}
>
  <Receipt className="mr-2 h-4 w-4" /> Rechnung ansehen
</Button>

{previewOpen ? (
  <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-3 sm:items-center sm:p-6 xl:hidden" role="dialog" aria-modal="true" aria-label="Rechnungsvorschau">
    <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl sm:mx-auto sm:max-w-4xl">
      <Button
        className="absolute right-3 top-3 z-10"
        variant="outline"
        size="icon"
        onClick={() => setPreviewOpen(false)}
        aria-label="Rechnungsvorschau schliessen"
      >
        <X className="h-4 w-4" />
      </Button>
      <div className="pt-12 sm:pt-10">
        {renderInvoicePreview()}
      </div>
    </div>
  </div>
) : null}
```

## 4. Relevante CSS/Tailwind-Stellen

Quelle: `rechnungsprogramm/src/index.css`.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  min-height: 100%;
}

body {
  margin: 0;
}

.invoice-app-shell,
.invoice-form-column,
.invoice-preview-column {
  box-sizing: border-box;
}

.invoice-form-column,
.invoice-preview-column {
  min-width: 0;
  max-width: 100%;
}

@media (min-width: 1280px) {
  .invoice-app-shell {
    grid-template-columns: minmax(0, 1fr) minmax(520px, 680px);
  }

  .invoice-preview-column {
    position: sticky;
    top: 24px;
    align-self: start;
    width: 100%;
    max-height: calc(100dvh - 48px);
    overflow-y: auto;
    overflow-x: hidden;
  }
}

@media (min-width: 1536px) {
  .invoice-app-shell {
    grid-template-columns: minmax(0, 1fr) minmax(560px, 720px);
  }
}
```

Weitere relevante Tailwind-Klassen:

```txt
Root:
min-h-screen overflow-x-hidden bg-slate-50 p-3 pb-24 sm:p-4 sm:pb-24 md:p-8 md:pb-28 xl:pb-8 print:bg-white

Main:
invoice-app-shell mx-auto grid w-full max-w-[1800px] grid-cols-1 items-start gap-4 md:gap-6

Formularspalte:
invoice-form-column grid min-w-0 gap-6 print:hidden

Desktop Preview:
invoice-preview-column hidden min-w-0 xl:block

Preview Card:
w-full max-w-full overflow-hidden rounded-2xl shadow-sm print:border-0 print:shadow-none

Preview Table:
w-full table-fixed text-left text-[11px] sm:text-xs

Mobile Button:
fixed bottom-4 right-4 z-30 shadow-lg xl:hidden

Mobile Modal Backdrop:
fixed inset-0 z-50 flex items-end bg-slate-950/70 p-3 sm:items-center sm:p-6 xl:hidden
```

## 5. Aktuelle Vermutung

Aktuelle Struktur:
- Die Preview ist inzwischen als `aside` direkter Grid-Sibling der linken `section`.
- Das `main` Element hat `display: grid`.
- Ab `1280px` setzt CSS `grid-template-columns: minmax(0, 1fr) minmax(520px, 680px)`.
- Die Preview-Spalte ist `position: sticky`, nicht `fixed` oder `absolute`.
- Mobile Button/Modal ist separat und unter `xl` aktiv.

Trotzdem kann es weiter ueberlappen oder so wirken, wenn:
- Tailwind-Basisstyles oder Komponentenstyles fuer `Card`/`CardContent` eine Breite oder ein Verhalten erzwingen.
- Ein innerer Formular-Container in der linken Spalte trotz `min-width: 0` horizontal breiter wird und in die rechte Spalte hineinragt.
- Der Viewport zwischen `1280px` und ca. `1440px` fuer `minmax(520px, 680px)` plus linke Inhalte zu eng ist.
- Ein Browser-DevTools-Zoom oder eine andere Skalierung die effektive Breite reduziert.
- Die Preview optisch ueberlappt, obwohl technisch das Grid Platz reserviert, weil die linke Spalte selbst ueber ihre Grid-Zelle hinausragt.

Nicht mehr vorhanden:
- Keine alte doppelte Desktop-Preview-Kopie im JSX.
- Keine `min-w-[680px]` in der sichtbaren Preview-Tabelle.
- Keine Desktop-Preview mit `fixed` oder `absolute`.

## Nicht veraendern

- Keine Rechnungslogik.
- Keine Speicherlogik.
- Keine Berechnungen.
- Keine PDF/Druck-Logik.
- Keine Kundendaten oder echten Rechnungsdaten.
- Keine `dist`-Dateien in Diagnose-Outputs kopieren.
