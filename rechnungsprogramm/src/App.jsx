import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Euro,
  Fuel,
  Mail,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserPlus,
  Wrench,
} from "lucide-react";
import { clearAppState, loadAppState, saveAppState } from "./storage/indexedDb.js";

const LEGACY_STORAGE_KEY = "rechnungsprogramm-data-v7";
const BACKUP_VERSION = 1;

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyItem = () => ({
  id: createId(),
  serviceId: "",
  description: "",
  hours: 1,
  unitPrice: 0,
  fuelPerHour: 0,
});

const emptyCustomer = () => ({
  id: createId(),
  name: "",
  address: "",
  email: "",
});

const emptyService = () => ({
  id: createId(),
  name: "",
  pricePerHour: 0,
  fuelPerHour: 0,
});

const createDefaultInvoice = () => ({
  companyName: "Meine Firma GmbH",
  companyAddress: "Musterstraße 1\n12345 Musterstadt",
  companyEmail: "info@meinefirma.de",
  companyPhone: "+49 123 456789",
  customerId: "",
  customerName: "",
  customerAddress: "",
  customerEmail: "",
  invoiceNumber: `RE-${new Date().getFullYear()}-001`,
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  taxRate: 19,
  notes: "Vielen Dank für Ihren Auftrag.",
  items: [emptyItem()],
});

const createDefaultCustomers = () => [
  {
    id: createId(),
    name: "Max Mustermann GmbH",
    address: "Hauptstraße 10\n12345 Berlin",
    email: "info@mustermann.de",
  },
];

const createDefaultServices = () => [
  { id: createId(), name: "Baggerarbeiten", pricePerHour: 85, fuelPerHour: 6.5 },
  { id: createId(), name: "Transport", pricePerHour: 72, fuelPerHour: 4.2 },
];

function createAppState(overrides = {}) {
  return {
    invoice: createDefaultInvoice(),
    invoices: [],
    customers: createDefaultCustomers(),
    services: createDefaultServices(),
    serviceHours: {},
    ...overrides,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAppState(raw) {
  if (!isPlainObject(raw)) return createAppState();

  const invoice = isPlainObject(raw.invoice) ? raw.invoice : createDefaultInvoice();
  const customers = Array.isArray(raw.customers) ? raw.customers : createDefaultCustomers();
  const services = Array.isArray(raw.services) ? raw.services : createDefaultServices();
  const serviceHours = isPlainObject(raw.serviceHours) ? raw.serviceHours : {};
  const invoices = Array.isArray(raw.invoices)
    ? raw.invoices.filter((entry) => isPlainObject(entry?.invoice))
    : [];

  return createAppState({
    invoice,
    invoices,
    customers,
    services,
    serviceHours,
  });
}

function createInvoiceSnapshot(invoice) {
  const id = invoice.id || createId();
  return {
    id,
    invoiceNumber: invoice.invoiceNumber || "Ohne Nummer",
    customerName: invoice.customerName || "Ohne Kunde",
    invoiceDate: invoice.invoiceDate || new Date().toISOString().slice(0, 10),
    savedAt: new Date().toISOString(),
    invoice: {
      ...invoice,
      id,
    },
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatFuel(value) {
  return `${Number(value || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} l`;
}

function createInvoiceItemFromService(service, hours = 1) {
  return {
    id: createId(),
    serviceId: service?.id || "",
    description: service?.name || "",
    hours: Number(hours || 1),
    unitPrice: Number(service?.pricePerHour || 0),
    fuelPerHour: Number(service?.fuelPerHour || 0),
  };
}

function buildInvoiceHtml(invoice, subtotal, totalFuel, taxAmount, total) {
  const rows = invoice.items
    .map((item) => {
      const lineTotal = Number(item.hours || 0) * Number(item.unitPrice || 0);
      return `<tr>
        <td>${escapeHtml(item.description || "–")}</td>
        <td>${escapeHtml(item.hours)}</td>
        <td>${currency(item.unitPrice)}</td>
        <td>${formatFuel(item.fuelPerHour)}</td>
        <td style="text-align:right">${currency(lineTotal)}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rechnung ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111827; padding: 32px; margin: 0; }
    .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
    .muted { color: #475569; white-space: pre-line; }
    .table-wrap { width: 100%; overflow-x: auto; }
    table { width: 100%; min-width: 680px; border-collapse: collapse; margin: 24px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .summary { width: 340px; max-width: 100%; margin-left: auto; border: 1px solid #cbd5e1; padding: 16px; }
    .row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
    .total { border-top: 1px solid #cbd5e1; padding-top: 8px; font-weight: bold; }
    h1, h2, h3, p { margin: 0 0 8px 0; }
    .section { margin-top: 28px; }
    @media (max-width: 700px) {
      body { padding: 16px; }
      .top { flex-direction: column; }
      .top > div:last-child { text-align: left !important; }
      h1 { font-size: 28px; }
      h2 { font-size: 22px; }
    }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <h2>${escapeHtml(invoice.companyName || "Firmenname")}</h2>
      <div class="muted">${escapeHtml(invoice.companyAddress || "")}</div>
      <div class="muted">${escapeHtml(invoice.companyEmail || "")}</div>
      <div class="muted">${escapeHtml(invoice.companyPhone || "")}</div>
    </div>
    <div style="text-align:right">
      <h1>RECHNUNG</h1>
      <p><strong>Nr.:</strong> ${escapeHtml(invoice.invoiceNumber)}</p>
      <p><strong>Datum:</strong> ${escapeHtml(invoice.invoiceDate)}</p>
      <p><strong>Fällig:</strong> ${escapeHtml(invoice.dueDate)}</p>
    </div>
  </div>

  <div class="section">
    <p style="font-size:12px; letter-spacing:0.2em; color:#64748b; text-transform:uppercase;">Rechnung an</p>
    <h3>${escapeHtml(invoice.customerName || "Kundenname")}</h3>
    <div class="muted">${escapeHtml(invoice.customerAddress || "Kundenadresse")}</div>
    <div class="muted">${escapeHtml(invoice.customerEmail || "Keine E-Mail-Adresse")}</div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Beschreibung</th>
          <th>Stunden</th>
          <th>Preis/Stunde</th>
          <th>Diesel/Stunde</th>
          <th style="text-align:right">Betrag</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="summary">
    <div class="row"><span>Zwischensumme</span><span>${currency(subtotal)}</span></div>
    <div class="row"><span>Gesamt Dieselverbrauch</span><span>${formatFuel(totalFuel)}</span></div>
    <div class="row"><span>MwSt. (${escapeHtml(invoice.taxRate)}%)</span><span>${currency(taxAmount)}</span></div>
    <div class="row total"><span>Gesamt</span><span>${currency(total)}</span></div>
  </div>

  <div class="section">
    <p style="font-size:12px; letter-spacing:0.2em; color:#64748b; text-transform:uppercase;">Hinweis</p>
    <div class="muted">${escapeHtml(invoice.notes || "")}</div>
  </div>
</body>
</html>`;
}

function runInlineTests() {
  console.assert(currency(85) === "85,00 €", "currency() sollte Euro im deutschen Format ausgeben");
  console.assert(formatFuel(6.5) === "6,5 l", "formatFuel() sollte Liter korrekt formatieren");
  console.assert(createDefaultInvoice().companyAddress.includes("\n"), "companyAddress sollte einen Zeilenumbruch enthalten");

  const testService = { id: "1", name: "Test", pricePerHour: 99, fuelPerHour: 3.5 };
  const newItem = createInvoiceItemFromService(testService, 2.5);
  console.assert(newItem.description === "Test", "Dienstleistung sollte die Beschreibung übernehmen");
  console.assert(newItem.unitPrice === 99, "Dienstleistung sollte den Stundenpreis übernehmen");
  console.assert(newItem.fuelPerHour === 3.5, "Dienstleistung sollte den Dieselverbrauch übernehmen");
  console.assert(newItem.hours === 2.5, "Neue Rechnungsposition sollte die gewählte Stundenzahl übernehmen");

  const testInvoice = createDefaultInvoice();
  const html = buildInvoiceHtml(testInvoice, 100, 4, 19, 119);
  console.assert(html.includes("RECHNUNG"), "PDF-HTML sollte die Überschrift enthalten");
  console.assert(html.includes(testInvoice.invoiceNumber), "PDF-HTML sollte die Rechnungsnummer enthalten");
  console.assert(html.includes("<tbody>"), "PDF-HTML sollte tbody öffnen");
  console.assert(html.includes("</tbody>"), "PDF-HTML sollte tbody schließen");
  console.assert(html.includes("</style>"), "PDF-HTML sollte den Style-Block korrekt schließen");
  console.assert(html.includes("</html>"), "PDF-HTML sollte vollständig geschlossen sein");
}

runInlineTests();

const Field = ({ label, children }) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    {children}
  </div>
);

const SummaryRow = ({ label, value, strong = false }) => (
  <div className={`flex justify-between gap-4 ${strong ? "border-t pt-2 text-base font-bold" : ""}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

export default function Rechnungsprogramm() {
  const [invoice, setInvoice] = useState(() => createDefaultInvoice());
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState(() => createDefaultCustomers());
  const [services, setServices] = useState(() => createDefaultServices());
  const [newCustomer, setNewCustomer] = useState(() => emptyCustomer());
  const [newService, setNewService] = useState(() => emptyService());
  const [serviceHours, setServiceHours] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const fileInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  const showSaveMessage = (message) => {
    setSaveMessage(message);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveMessage(""), 2500);
  };

  useEffect(() => {
    let active = true;

    async function restoreData() {
      try {
        const indexedDbState = await loadAppState();
        let restored = indexedDbState;

        if (!restored) {
          const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
          restored = legacy ? JSON.parse(legacy) : null;
        }

        if (!active) return;

        if (restored) {
          const next = normalizeAppState(restored);
          setInvoice(next.invoice);
          setInvoices(next.invoices);
          setCustomers(next.customers.length ? next.customers : createDefaultCustomers());
          setServices(next.services.length ? next.services : createDefaultServices());
          setServiceHours(next.serviceHours);
        }
      } catch (error) {
        console.error("Gespeicherte Daten konnten nicht geladen werden.", error);
        showSaveMessage("Gespeicherte Daten konnten nicht geladen werden.");
      } finally {
        if (active) setStorageReady(true);
      }
    }

    restoreData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveAppState({ invoice, invoices, customers, services, serviceHours }).catch((error) => {
        console.error("Automatisches Speichern fehlgeschlagen", error);
        showSaveMessage("Automatisches Speichern fehlgeschlagen.");
      });
    }, 350);
  }, [storageReady, invoice, invoices, customers, services, serviceHours]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const subtotal = useMemo(
    () => invoice.items.reduce((sum, item) => sum + Number(item.hours || 0) * Number(item.unitPrice || 0), 0),
    [invoice.items]
  );

  const totalFuel = useMemo(
    () => invoice.items.reduce((sum, item) => sum + Number(item.hours || 0) * Number(item.fuelPerHour || 0), 0),
    [invoice.items]
  );

  const taxAmount = useMemo(() => subtotal * (Number(invoice.taxRate || 0) / 100), [subtotal, invoice.taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const updateField = (field, value) => setInvoice((prev) => ({ ...prev, [field]: value }));

  const updateItem = (id, field, value) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const applyCustomerToInvoice = (customerId) => {
    const customer = customers.find((entry) => entry.id === customerId);
    if (!customer) {
      setInvoice((prev) => ({ ...prev, customerId: "", customerName: "", customerAddress: "", customerEmail: "" }));
      return;
    }
    setInvoice((prev) => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: customer.address,
      customerEmail: customer.email,
    }));
  };

  const applyServiceToItem = (itemId, serviceId) => {
    const service = services.find((entry) => entry.id === serviceId);
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        if (!service) return { ...item, serviceId: "" };
        return {
          ...item,
          serviceId: service.id,
          description: service.name,
          unitPrice: service.pricePerHour,
          fuelPerHour: service.fuelPerHour,
        };
      }),
    }));
  };

  const addServiceToInvoice = (serviceId) => {
    const service = services.find((entry) => entry.id === serviceId);
    if (!service) return;
    const selectedHours = Number(serviceHours[serviceId] || 1);
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, createInvoiceItemFromService(service, selectedHours)],
    }));
  };

  const addItem = () => setInvoice((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const removeItem = (id) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));
  };

  const clearInvoiceItems = () => setInvoice((prev) => ({ ...prev, items: [emptyItem()] }));

  const addCustomer = () => {
    if (!newCustomer.name.trim()) return;
    const customer = {
      ...newCustomer,
      name: newCustomer.name.trim(),
      address: newCustomer.address.trim(),
      email: newCustomer.email.trim(),
    };
    setCustomers((prev) => [...prev, customer]);
    setNewCustomer(emptyCustomer());
  };

  const removeCustomer = (id) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    setInvoice((prev) =>
      prev.customerId === id ? { ...prev, customerId: "", customerName: "", customerAddress: "", customerEmail: "" } : prev
    );
  };

  const addService = () => {
    if (!newService.name.trim()) return;
    const service = {
      ...newService,
      name: newService.name.trim(),
      pricePerHour: Number(newService.pricePerHour || 0),
      fuelPerHour: Number(newService.fuelPerHour || 0),
    };
    setServices((prev) => [...prev, service]);
    setServiceHours((prev) => ({ ...prev, [service.id]: 1 }));
    setNewService(emptyService());
  };

  const removeService = (id) => {
    setServices((prev) => prev.filter((service) => service.id !== id));
    setServiceHours((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.serviceId === id ? { ...item, serviceId: "" } : item)),
    }));
  };

  const saveData = async () => {
    try {
      await saveAppState({ invoice, invoices, customers, services, serviceHours });
      showSaveMessage("Daten lokal in IndexedDB gespeichert.");
    } catch (error) {
      console.error("Speichern fehlgeschlagen", error);
      showSaveMessage("Speichern fehlgeschlagen.");
    }
  };

  const saveCurrentInvoice = () => {
    const snapshot = createInvoiceSnapshot(invoice);
    setInvoice(snapshot.invoice);
    setInvoices((prev) => {
      const withoutCurrent = prev.filter((entry) => entry.id !== snapshot.id);
      return [snapshot, ...withoutCurrent].slice(0, 100);
    });
    showSaveMessage("Rechnung gespeichert.");
  };

  const openSavedInvoice = (entry) => {
    setInvoice(entry.invoice);
    showSaveMessage("Rechnung geöffnet.");
  };

  const removeSavedInvoice = (id) => {
    setInvoices((prev) => prev.filter((entry) => entry.id !== id));
    showSaveMessage("Gespeicherte Rechnung entfernt.");
  };

  const exportDataFile = () => {
    try {
      const payload = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        invoice,
        invoices,
        customers,
        services,
        serviceHours,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rechnungsprogramm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSaveMessage("Datei wurde heruntergeladen.");
    } catch (error) {
      console.error("Datei-Export fehlgeschlagen", error);
      showSaveMessage("Datei-Export fehlgeschlagen.");
    }
  };

  const triggerImportFile = () => fileInputRef.current?.click();

  const importDataFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      "Die importierte JSON-Datei ersetzt die aktuellen lokalen Daten. Vorher am besten ein Backup exportieren. Fortfahren?"
    );
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isPlainObject(parsed) || (!parsed.invoice && !Array.isArray(parsed.customers) && !Array.isArray(parsed.services))) {
        throw new Error("Ungültiges Backup-Format.");
      }

      const imported = normalizeAppState(parsed);
      setInvoice(imported.invoice);
      setInvoices(imported.invoices);
      setCustomers(imported.customers.length ? imported.customers : createDefaultCustomers());
      setServices(imported.services.length ? imported.services : createDefaultServices());
      setServiceHours(imported.serviceHours);
      await saveAppState(imported);
      showSaveMessage("Backup wurde importiert.");
    } catch (error) {
      console.error("Datei-Import fehlgeschlagen", error);
      showSaveMessage("Datei konnte nicht geladen werden.");
    } finally {
      event.target.value = "";
    }
  };

  const printInvoice = () => {
    try {
      const printWindow = window.open("", "_blank", "width=900,height=1200");
      if (!printWindow) {
        showSaveMessage("Pop-up blockiert. Bitte Pop-ups erlauben.");
        return;
      }
      printWindow.document.open();
      printWindow.document.write(buildInvoiceHtml(invoice, subtotal, totalFuel, taxAmount, total));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    } catch (error) {
      console.error("PDF/Druck fehlgeschlagen", error);
      showSaveMessage("PDF/Druck fehlgeschlagen.");
    }
  };

  const resetAll = async () => {
    try {
      await clearAppState();
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.error("Zurücksetzen fehlgeschlagen", error);
    }
    setInvoice(createDefaultInvoice());
    setInvoices([]);
    setCustomers(createDefaultCustomers());
    setServices(createDefaultServices());
    setServiceHours({});
    setNewCustomer(emptyCustomer());
    setNewService(emptyService());
    showSaveMessage("Alle Daten wurden zurückgesetzt.");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 p-3 sm:p-4 md:p-8 print:bg-white">
      <div className="mx-auto grid w-full max-w-[1800px] gap-4 md:gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(560px,0.75fr)]">
        <div className="grid gap-6 print:hidden">
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
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importDataFile} />
              <Button className="w-full 2xl:w-auto" variant="outline" onClick={clearInvoiceItems}>
                <RotateCcw className="mr-2 h-4 w-4" /> Positionen leeren
              </Button>
              <Button className="w-full 2xl:w-auto" variant="outline" onClick={resetAll}>
                <RotateCcw className="mr-2 h-4 w-4" /> Alles zurücksetzen
              </Button>
              <Button className="w-full 2xl:w-auto" variant="outline" onClick={saveData}>
                <Save className="mr-2 h-4 w-4" /> Lokal speichern
              </Button>
              <Button className="w-full 2xl:w-auto" variant="outline" onClick={saveCurrentInvoice}>
                <Receipt className="mr-2 h-4 w-4" /> Rechnung speichern
              </Button>
              <Button className="w-full 2xl:w-auto" variant="outline" onClick={exportDataFile}>
                <Download className="mr-2 h-4 w-4" /> Daten exportieren
              </Button>
              <Button className="w-full 2xl:w-auto" variant="outline" onClick={triggerImportFile}>
                <Upload className="mr-2 h-4 w-4" /> Daten importieren
              </Button>
              <Button className="w-full 2xl:w-auto" onClick={printInvoice}>
                <Printer className="mr-2 h-4 w-4" /> PDF / Drucken
              </Button>
            </div>
          </div>

          {saveMessage ? (
            <div className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              {saveMessage.toLowerCase().includes("fehl") || saveMessage.toLowerCase().includes("block") ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{saveMessage}</span>
            </div>
          ) : null}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            Daten werden nur lokal auf diesem Gerät in IndexedDB gespeichert. Bitte regelmäßig ein Backup exportieren.
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <Euro className="h-5 w-5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Zwischensumme</p>
                  <p className="text-xl font-bold">{currency(subtotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <Fuel className="h-5 w-5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Diesel gesamt</p>
                  <p className="text-xl font-bold">{formatFuel(totalFuel)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <Receipt className="h-5 w-5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Rechnungsbetrag</p>
                  <p className="text-xl font-bold">{currency(total)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Gespeicherte Rechnungen</CardTitle>
                <Button className="w-full sm:w-auto" variant="outline" onClick={saveCurrentInvoice}>
                  <Save className="mr-2 h-4 w-4" /> Aktuelle Rechnung sichern
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {invoices.length ? (
                invoices.map((entry) => (
                  <div key={entry.id} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{entry.invoiceNumber}</p>
                      <p className="break-words text-sm text-slate-600">
                        {entry.customerName} · {entry.invoiceDate}
                      </p>
                      <p className="text-xs text-slate-500">Gespeichert: {new Date(entry.savedAt).toLocaleString("de-DE")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => openSavedInvoice(entry)}>Öffnen</Button>
                      <Button variant="ghost" size="icon" onClick={() => removeSavedInvoice(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">
                  Noch keine Rechnung gespeichert. Nutze „Rechnung speichern“, um diese Rechnung später wieder zu öffnen.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Eigene Firmendaten</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Firmenname"><Input value={invoice.companyName} onChange={(e) => updateField("companyName", e.target.value)} /></Field>
              <Field label="E-Mail"><Input value={invoice.companyEmail} onChange={(e) => updateField("companyEmail", e.target.value)} /></Field>
              <Field label="Telefon"><Input value={invoice.companyPhone} onChange={(e) => updateField("companyPhone", e.target.value)} /></Field>
              <div className="grid gap-2 md:col-span-2">
                <Label>Adresse</Label>
                <Textarea value={invoice.companyAddress} onChange={(e) => updateField("companyAddress", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2"><UserPlus className="h-5 w-5" /><CardTitle>Kundenspeicher</CardTitle></div>
                <span className="text-xs text-slate-500">Karte anklicken = übernehmen</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2">
                <Field label="Kundenname"><Input value={newCustomer.name} onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))} /></Field>
                <Field label="E-Mail-Adresse"><Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))} /></Field>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Adresse</Label>
                  <Textarea value={newCustomer.address} onChange={(e) => setNewCustomer((prev) => ({ ...prev, address: e.target.value }))} rows={3} />
                </div>
                <Button className="w-full sm:w-auto" onClick={addCustomer}><Plus className="mr-2 h-4 w-4" /> Kunde speichern</Button>
              </div>

              <div className="grid gap-3">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => applyCustomerToInvoice(customer.id)}
                    className={`flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition hover:border-slate-400 hover:bg-slate-50 sm:flex-row sm:justify-between ${invoice.customerId === customer.id ? "border-slate-900 bg-slate-100" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold">{customer.name}</p>
                      <p className="whitespace-pre-line break-words text-sm text-slate-600">{customer.address || "Keine Adresse"}</p>
                      <p className="mt-1 flex items-center gap-2 break-words text-sm text-slate-600"><Mail className="h-4 w-4" />{customer.email || "Keine E-Mail"}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomer(customer.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2"><Wrench className="h-5 w-5" /><CardTitle>Dienstleistungen</CardTitle></div>
                <span className="text-xs text-slate-500">Erst Stunden wählen, dann hinzufügen</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 rounded-2xl border p-4 md:grid-cols-3">
                <Field label="Name der Dienstleistung"><Input value={newService.name} onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))} /></Field>
                <Field label="Preis pro Stunde (€)"><Input type="number" min="0" step="0.01" value={newService.pricePerHour} onChange={(e) => setNewService((prev) => ({ ...prev, pricePerHour: e.target.value }))} /></Field>
                <Field label="Dieselverbrauch pro Stunde (l)"><Input type="number" min="0" step="0.01" value={newService.fuelPerHour} onChange={(e) => setNewService((prev) => ({ ...prev, fuelPerHour: e.target.value }))} /></Field>
                <Button className="w-full sm:w-auto" onClick={addService}><Plus className="mr-2 h-4 w-4" /> Dienstleistung speichern</Button>
              </div>

              <div className="grid gap-3">
                {services.map((service) => {
                  const selectedHours = serviceHours[service.id] ?? 1;
                  const previewAmount = Number(selectedHours || 0) * Number(service.pricePerHour || 0);
                  const previewFuel = Number(selectedHours || 0) * Number(service.fuelPerHour || 0);
                  return (
                    <div key={service.id} className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{service.name}</p>
                        <p className="text-sm text-slate-600">Preis pro Stunde: {currency(service.pricePerHour)}</p>
                        <p className="text-sm text-slate-600">Dieselverbrauch pro Stunde: {formatFuel(service.fuelPerHour)}</p>
                        <p className="mt-2 break-words text-sm font-medium text-slate-700">Vorschau: {currency(previewAmount)} · Diesel: {formatFuel(previewFuel)}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[140px_auto_auto] sm:items-end">
                        <Field label="Stunden"><Input type="number" min="0.25" step="0.25" value={selectedHours} onChange={(e) => setServiceHours((prev) => ({ ...prev, [service.id]: e.target.value }))} /></Field>
                        <Button onClick={() => addServiceToInvoice(service.id)}><Plus className="mr-2 h-4 w-4" /> Zur Rechnung</Button>
                        <Button variant="ghost" size="icon" onClick={() => removeService(service.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Kundendaten & Rechnung</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label>Gespeicherten Kunden auswählen</Label>
                <select className="h-10 rounded-md border bg-white px-3 text-sm" value={invoice.customerId} onChange={(e) => applyCustomerToInvoice(e.target.value)}>
                  <option value="">Bitte auswählen</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </div>
              <Field label="Kundenname"><Input value={invoice.customerName} onChange={(e) => updateField("customerName", e.target.value)} /></Field>
              <Field label="E-Mail-Adresse Kunde"><Input type="email" value={invoice.customerEmail} onChange={(e) => updateField("customerEmail", e.target.value)} /></Field>
              <Field label="Rechnungsnummer"><Input value={invoice.invoiceNumber} onChange={(e) => updateField("invoiceNumber", e.target.value)} /></Field>
              <Field label="Rechnungsdatum"><Input type="date" value={invoice.invoiceDate} onChange={(e) => updateField("invoiceDate", e.target.value)} /></Field>
              <Field label="Fällig am"><Input type="date" value={invoice.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} /></Field>
              <div className="grid gap-2 md:col-span-2">
                <Label>Kundenadresse</Label>
                <Textarea value={invoice.customerAddress} onChange={(e) => updateField("customerAddress", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Positionen der aktuellen Rechnung</CardTitle>
                <Button className="w-full sm:w-auto" variant="outline" onClick={addItem}><Plus className="mr-2 h-4 w-4" /> Position hinzufügen</Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {invoice.items.map((item, index) => (
                <div key={item.id} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.1fr_100px_120px_120px_110px_48px] xl:items-end">
                  <div className="grid gap-2">
                    <Label>Dienstleistung {index + 1}</Label>
                    <select className="h-10 rounded-md border bg-white px-3 text-sm" value={item.serviceId} onChange={(e) => applyServiceToItem(item.id, e.target.value)}>
                      <option value="">Bitte auswählen</option>
                      {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                  </div>
                  <Field label="Beschreibung"><Input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} /></Field>
                  <Field label="Stunden"><Input type="number" min="0" step="0.25" value={item.hours} onChange={(e) => updateItem(item.id, "hours", e.target.value)} /></Field>
                  <Field label="Preis/Stunde (€)"><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)} /></Field>
                  <Field label="Diesel/Stunde (l)"><Input type="number" min="0" step="0.01" value={item.fuelPerHour} onChange={(e) => updateItem(item.id, "fuelPerHour", e.target.value)} /></Field>
                  <div className="grid gap-2">
                    <Label>Gesamt</Label>
                    <div className="h-10 rounded-md border bg-slate-50 px-3 py-2 text-sm">{currency(Number(item.hours || 0) * Number(item.unitPrice || 0))}</div>
                  </div>
                  <Button className="w-full sm:col-span-2 xl:col-span-1 xl:w-auto" variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Zusatzinfos</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[180px_1fr]">
              <Field label="MwSt. (%)"><Input type="number" min="0" step="0.1" value={invoice.taxRate} onChange={(e) => updateField("taxRate", e.target.value)} /></Field>
              <div className="grid gap-2">
                <Label>Hinweis</Label>
                <Textarea value={invoice.notes} onChange={(e) => updateField("notes", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 2xl:sticky 2xl:top-6 2xl:self-start">
          <Card className="overflow-hidden rounded-2xl shadow-sm print:border-0 print:shadow-none">
            <CardHeader className="border-b print:border-b"><CardTitle className="text-xl sm:text-2xl">Rechnungsvorschau</CardTitle></CardHeader>
            <CardContent className="p-4 sm:p-6 md:p-8">
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

                <div className="overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3">Beschreibung</th>
                        <th className="px-4 py-3">Stunden</th>
                        <th className="px-4 py-3">Preis/Stunde</th>
                        <th className="px-4 py-3">Diesel/Stunde</th>
                        <th className="px-4 py-3 text-right">Betrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="border-t align-top">
                          <td className="px-4 py-3 break-words">{item.description || "–"}</td>
                          <td className="px-4 py-3">{item.hours}</td>
                          <td className="px-4 py-3">{currency(item.unitPrice)}</td>
                          <td className="px-4 py-3">{formatFuel(item.fuelPerHour)}</td>
                          <td className="px-4 py-3 text-right">{currency(Number(item.hours || 0) * Number(item.unitPrice || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ml-auto w-full max-w-sm space-y-2 rounded-2xl border p-4">
                  <SummaryRow label="Zwischensumme" value={currency(subtotal)} />
                  <SummaryRow label="Gesamt Dieselverbrauch" value={formatFuel(totalFuel)} />
                  <SummaryRow label={`MwSt. (${invoice.taxRate}%)`} value={currency(taxAmount)} />
                  <SummaryRow label="Gesamt" value={currency(total)} strong />
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Hinweis</p>
                  <p className="whitespace-pre-line break-words text-slate-700">{invoice.notes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
