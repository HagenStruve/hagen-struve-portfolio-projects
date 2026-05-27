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
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import { clearAppState, loadAppState, saveAppState } from "./storage/indexedDb.js";

const LEGACY_STORAGE_KEY = "rechnungsprogramm-data-v7";
const BACKUP_VERSION = 1;
const ENTRY_TYPES = {
  service: "Dienstleistung pro Stunde",
  fixed: "Festpreis",
  quantity: "Ware/Menge",
};
const PRICE_MODES = {
  net: "Preis ist Netto",
  gross: "Preis ist Brutto",
};

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyItem = () => ({
  id: createId(),
  serviceId: "",
  type: "service",
  description: "",
  quantity: 1,
  unit: "h",
  hours: 1,
  unitPrice: 0,
  priceMode: "net",
  fuelPerUnit: 0,
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
  type: "service",
  name: "",
  unit: "h",
  pricePerUnit: 0,
  pricePerHour: 0,
  priceMode: "net",
  fuelPerUnit: 0,
  fuelPerHour: 0,
});

const createDefaultInvoiceSettings = () => ({
  nextInvoiceNumber: `RE-${new Date().getFullYear()}-001`,
});

const createDefaultCompanySettings = () => ({
  id: "",
  companyName: "",
  companyAddress: "",
  companyEmail: "",
  companyPhone: "",
  taxRate: 19,
});

const applyCompanySettingsToInvoice = (invoice, companySettings) => ({
  ...invoice,
  companyId: companySettings.id,
  companyName: companySettings.companyName,
  companyAddress: companySettings.companyAddress,
  companyEmail: companySettings.companyEmail,
  companyPhone: companySettings.companyPhone,
  taxRate: Number(companySettings.taxRate ?? 19),
});

const createDefaultInvoice = (companySettings = createDefaultCompanySettings(), invoiceSettings = createDefaultInvoiceSettings()) => ({
  companyId: companySettings.id,
  companyName: companySettings.companyName,
  companyAddress: companySettings.companyAddress,
  companyEmail: companySettings.companyEmail,
  companyPhone: companySettings.companyPhone,
  customerId: "",
  customerName: "",
  customerAddress: "",
  customerEmail: "",
  invoiceNumber: invoiceSettings.nextInvoiceNumber,
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  taxRate: Number(companySettings.taxRate ?? 19),
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
  { id: createId(), type: "service", name: "Baggerarbeiten", unit: "h", pricePerUnit: 85, pricePerHour: 85, fuelPerUnit: 6.5, fuelPerHour: 6.5 },
  { id: createId(), type: "service", name: "Transport", unit: "h", pricePerUnit: 72, pricePerHour: 72, fuelPerUnit: 4.2, fuelPerHour: 4.2 },
];

function createAppState(overrides = {}) {
  return {
    invoice: createDefaultInvoice(),
    invoices: [],
    customers: createDefaultCustomers(),
    services: createDefaultServices(),
    serviceHours: {},
    companySettings: createDefaultCompanySettings(),
    companyProfiles: [],
    invoiceSettings: createDefaultInvoiceSettings(),
    ...overrides,
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeAppState(raw) {
  if (!isPlainObject(raw)) return createAppState();

  const companySettings = normalizeCompanySettings(raw);
  const invoiceSettings = normalizeInvoiceSettings(raw.invoiceSettings || raw.invoice);
  const invoice = isPlainObject(raw.invoice)
    ? applyCompanySettingsToInvoice({ ...createDefaultInvoice(companySettings, invoiceSettings), ...raw.invoice }, companySettings)
    : createDefaultInvoice(companySettings, invoiceSettings);
  const customers = Array.isArray(raw.customers) ? raw.customers : createDefaultCustomers();
  const services = Array.isArray(raw.services) ? raw.services.map(normalizeServiceEntry) : createDefaultServices();
  const serviceHours = isPlainObject(raw.serviceHours) ? raw.serviceHours : {};
  const companyProfiles = normalizeCompanyProfiles(raw.companyProfiles);
  const invoices = Array.isArray(raw.invoices)
    ? raw.invoices.filter((entry) => isPlainObject(entry?.invoice)).map((entry) => ({
        ...entry,
        invoice: {
          ...entry.invoice,
          items: Array.isArray(entry.invoice.items) && entry.invoice.items.length ? entry.invoice.items.map(normalizeInvoiceItem) : [emptyItem()],
        },
      }))
    : [];
  const normalizedInvoice = {
    ...invoice,
    items: Array.isArray(invoice.items) && invoice.items.length ? invoice.items.map(normalizeInvoiceItem) : [emptyItem()],
  };

  return createAppState({
    invoice: normalizedInvoice,
    invoices,
    customers,
    services,
    serviceHours,
    companySettings,
    companyProfiles,
    invoiceSettings,
  });
}

function normalizeInvoiceSettings(value) {
  const source = isPlainObject(value) ? value : {};
  const fallback = createDefaultInvoiceSettings();

  return {
    nextInvoiceNumber:
      typeof source.nextInvoiceNumber === "string" && source.nextInvoiceNumber.trim()
        ? source.nextInvoiceNumber.trim()
        : typeof source.invoiceNumber === "string" && source.invoiceNumber.trim()
          ? source.invoiceNumber.trim()
        : fallback.nextInvoiceNumber,
  };
}

function normalizeCompanySettings(raw) {
  const source = isPlainObject(raw.companySettings)
    ? raw.companySettings
    : isPlainObject(raw.settings)
      ? raw.settings
      : isPlainObject(raw.invoice)
        ? raw.invoice
        : {};

  return {
    id: typeof source.id === "string" ? source.id : typeof source.companyId === "string" ? source.companyId : "",
    companyName: typeof source.companyName === "string" ? source.companyName : "",
    companyAddress: typeof source.companyAddress === "string" ? source.companyAddress : "",
    companyEmail: typeof source.companyEmail === "string" ? source.companyEmail : "",
    companyPhone: typeof source.companyPhone === "string" ? source.companyPhone : "",
    taxRate: Number.isFinite(Number(source.taxRate)) ? Number(source.taxRate) : 19,
  };
}

function normalizeCompanyProfiles(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isPlainObject)
    .map((entry) => ({
      ...normalizeCompanySettings(entry),
      id: typeof entry.id === "string" && entry.id ? entry.id : createId(),
    }));
}

function hasCompanySettings(settings) {
  return Boolean(
    settings.companyName.trim() ||
      settings.companyAddress.trim() ||
      settings.companyEmail.trim() ||
      settings.companyPhone.trim()
  );
}

function normalizeEntryType(type) {
  return Object.prototype.hasOwnProperty.call(ENTRY_TYPES, type) ? type : "service";
}

function normalizePriceMode(mode) {
  return Object.prototype.hasOwnProperty.call(PRICE_MODES, mode) ? mode : "net";
}

function normalizeServiceEntry(entry) {
  const type = normalizeEntryType(entry?.type);
  const unit = type === "service" ? "h" : type === "fixed" ? "Stück" : entry?.unit || "Stück";
  const pricePerUnit = Number(entry?.pricePerUnit ?? entry?.pricePerHour ?? entry?.fixedPrice ?? 0);
  const fuelPerUnit = type === "service" ? Number(entry?.fuelPerUnit ?? entry?.fuelPerHour ?? 0) : 0;

  return {
    id: entry?.id || createId(),
    type,
    name: entry?.name || "",
    unit,
    pricePerUnit,
    pricePerHour: type === "service" ? pricePerUnit : 0,
    priceMode: normalizePriceMode(entry?.priceMode),
    fuelPerUnit,
    fuelPerHour: type === "service" ? fuelPerUnit : 0,
  };
}

function normalizeInvoiceItem(item) {
  const type = normalizeEntryType(item?.type);
  const quantity = Number(item?.quantity ?? item?.hours ?? 1);
  const unit = item?.unit || (type === "service" ? "h" : type === "fixed" ? "Stück" : "");
  const unitPrice = Number(item?.unitPrice ?? item?.pricePerUnit ?? item?.pricePerHour ?? 0);
  const priceMode = normalizePriceMode(item?.priceMode);
  const fuelPerUnit = type === "service" ? Number(item?.fuelPerUnit ?? item?.fuelPerHour ?? 0) : 0;

  return {
    id: item?.id || createId(),
    serviceId: item?.serviceId || "",
    type,
    description: item?.description || "",
    quantity,
    unit,
    hours: quantity,
    unitPrice,
    priceMode,
    fuelPerUnit,
    fuelPerHour: fuelPerUnit,
  };
}

function getTaxMultiplier(taxRate) {
  return 1 + Number(taxRate || 0) / 100;
}

function getLineNetTotal(item, taxRate) {
  const rawTotal = Number(item.quantity ?? item.hours ?? 0) * Number(item.unitPrice || 0);
  return normalizePriceMode(item.priceMode) === "gross" ? rawTotal / getTaxMultiplier(taxRate) : rawTotal;
}

function getLineGrossTotal(item, taxRate) {
  const rawTotal = Number(item.quantity ?? item.hours ?? 0) * Number(item.unitPrice || 0);
  return normalizePriceMode(item.priceMode) === "gross" ? rawTotal : rawTotal * getTaxMultiplier(taxRate);
}

function getLineTotal(item) {
  return Number(item.quantity ?? item.hours ?? 0) * Number(item.unitPrice || 0);
}

function getLineFuel(item) {
  return Number(item.quantity ?? item.hours ?? 0) * Number(item.fuelPerUnit ?? item.fuelPerHour ?? 0);
}

function incrementInvoiceNumber(value) {
  const input = String(value || "").trim();
  const match = input.match(/^(.*?)(\d+)$/);
  if (!match) return input;

  const [, prefix, numberPart] = match;
  const nextNumber = String(Number(numberPart) + 1).padStart(numberPart.length, "0");
  return `${prefix}${nextNumber}`;
}

function createInvoiceSnapshot(invoice) {
  const id = invoice.id || createId();
  const normalizedInvoice = {
    ...invoice,
    items: invoice.items.map(normalizeInvoiceItem),
  };
  return {
    id,
    invoiceNumber: normalizedInvoice.invoiceNumber || "Ohne Nummer",
    customerName: normalizedInvoice.customerName || "Ohne Kunde",
    invoiceDate: normalizedInvoice.invoiceDate || new Date().toISOString().slice(0, 10),
    savedAt: new Date().toISOString(),
    invoice: {
      ...normalizedInvoice,
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
  const entry = normalizeServiceEntry(service);
  const quantity = Number(hours || 1);
  return {
    id: createId(),
    serviceId: entry.id,
    type: entry.type,
    description: entry.name,
    quantity,
    unit: entry.unit,
    hours: quantity,
    unitPrice: entry.pricePerUnit,
    priceMode: entry.priceMode,
    fuelPerUnit: entry.fuelPerUnit,
    fuelPerHour: entry.fuelPerUnit,
  };
}

function buildInvoiceHtml(invoice, subtotal, totalFuel, taxAmount, total) {
  const rows = invoice.items
    .map((item) => {
      const lineNet = getLineNetTotal(item, invoice.taxRate);
      const lineFuel = getLineFuel(item);
      const modeLabel = normalizePriceMode(item.priceMode) === "gross" ? "brutto vereinbart" : "netto";
      return `<tr>
        <td>${escapeHtml(item.description || "–")}</td>
        <td>${escapeHtml(item.quantity ?? item.hours)}</td>
        <td>${escapeHtml(item.unit || "")}</td>
        <td>${currency(item.unitPrice)}<br><span class="muted">${modeLabel}</span></td>
        <td>${lineFuel > 0 ? formatFuel(lineFuel) : "–"}</td>
        <td style="text-align:right">${currency(lineNet)}</td>
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
          <th>Menge</th>
          <th>Einheit</th>
          <th>Einzelpreis</th>
          <th>Diesel</th>
          <th style="text-align:right">Betrag</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="summary">
    <div class="row"><span>Zwischensumme Netto</span><span>${currency(subtotal)}</span></div>
    <div class="row"><span>Gesamt Dieselverbrauch</span><span>${formatFuel(totalFuel)}</span></div>
    <div class="row"><span>MwSt. (${escapeHtml(invoice.taxRate)}%)</span><span>${currency(taxAmount)}</span></div>
    <div class="row total"><span>Gesamt Brutto</span><span>${currency(total)}</span></div>
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
  console.assert(createDefaultInvoice().companyAddress === "", "Firmendaten sollten leer starten");
  console.assert(
    normalizeAppState({ companySettings: { companyName: "Testfirma", companyEmail: "test@example.test" } }).invoice.companyName === "Testfirma",
    "Firmendaten sollten in die aktuelle Rechnung übernommen werden"
  );
  console.assert(
    normalizeAppState({ companyProfiles: [{ companyName: "Profil A" }] }).companyProfiles.length === 1,
    "Firmenprofile sollten normalisiert werden"
  );

  const testService = { id: "1", name: "Test", pricePerHour: 99, fuelPerHour: 3.5 };
  const newItem = createInvoiceItemFromService(testService, 2.5);
  console.assert(newItem.description === "Test", "Dienstleistung sollte die Beschreibung übernehmen");
  console.assert(newItem.unitPrice === 99, "Dienstleistung sollte den Stundenpreis übernehmen");
  console.assert(newItem.fuelPerUnit === 3.5, "Dienstleistung sollte den Dieselverbrauch übernehmen");
  console.assert(newItem.quantity === 2.5, "Neue Rechnungsposition sollte die gewählte Menge übernehmen");
  console.assert(getLineTotal(createInvoiceItemFromService({ id: "2", type: "fixed", name: "Testartikel", pricePerUnit: 2500 }, 2)) === 5000, "Festpreisartikel sollten mit Menge abrechnen");
  console.assert(Math.round(getLineNetTotal({ quantity: 1, unitPrice: 119, priceMode: "gross" }, 19)) === 100, "119 Euro brutto sollten 100 Euro netto ergeben");
  console.assert(incrementInvoiceNumber("RE-2026-009") === "RE-2026-010", "Rechnungsnummern sollten führende Nullen behalten");
  console.assert(incrementInvoiceNumber("R-15") === "R-16", "Rechnungsnummern sollten am Ende hochzählen");

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
  const [invoiceSettings, setInvoiceSettings] = useState(() => createDefaultInvoiceSettings());
  const [invoices, setInvoices] = useState([]);
  const [companySettings, setCompanySettings] = useState(() => createDefaultCompanySettings());
  const [companyForm, setCompanyForm] = useState(() => createDefaultCompanySettings());
  const [companyProfiles, setCompanyProfiles] = useState([]);
  const [customers, setCustomers] = useState(() => createDefaultCustomers());
  const [services, setServices] = useState(() => createDefaultServices());
  const [newCustomer, setNewCustomer] = useState(() => emptyCustomer());
  const [newService, setNewService] = useState(() => emptyService());
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState("");
  const [editingServiceId, setEditingServiceId] = useState("");
  const [serviceHours, setServiceHours] = useState({});
  const [saveMessage, setSaveMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
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
          setInvoiceSettings(next.invoiceSettings);
          setInvoices(next.invoices);
          setCompanySettings(next.companySettings);
          setCompanyForm(next.companySettings);
          setCompanyProfiles(next.companyProfiles);
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
      saveAppState({ invoice, invoiceSettings, invoices, customers, services, serviceHours, companySettings, companyProfiles }).catch((error) => {
        console.error("Automatisches Speichern fehlgeschlagen", error);
        showSaveMessage("Automatisches Speichern fehlgeschlagen.");
      });
    }, 350);
  }, [storageReady, invoice, invoiceSettings, invoices, customers, services, serviceHours, companySettings, companyProfiles]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const subtotal = useMemo(
    () => invoice.items.reduce((sum, item) => sum + getLineNetTotal(item, invoice.taxRate), 0),
    [invoice.items, invoice.taxRate]
  );

  const totalFuel = useMemo(
    () => invoice.items.reduce((sum, item) => sum + getLineFuel(item), 0),
    [invoice.items]
  );

  const total = useMemo(
    () => invoice.items.reduce((sum, item) => sum + getLineGrossTotal(item, invoice.taxRate), 0),
    [invoice.items, invoice.taxRate]
  );
  const taxAmount = useMemo(() => total - subtotal, [subtotal, total]);

  const updateField = (field, value) => setInvoice((prev) => ({ ...prev, [field]: value }));

  const saveInvoiceNumberSetting = () => {
    const nextInvoiceNumber = invoiceSettings.nextInvoiceNumber.trim() || createDefaultInvoiceSettings().nextInvoiceNumber;
    setInvoiceSettings({ nextInvoiceNumber });
    setInvoice((prev) => ({ ...prev, invoiceNumber: nextInvoiceNumber }));
    showSaveMessage("Rechnungsnummer gespeichert.");
  };

  const createNextInvoice = () => {
    setInvoice(createDefaultInvoice(companySettings, invoiceSettings));
    showSaveMessage("Neue Rechnung vorbereitet.");
  };

  const updateCompanyField = (field, value) => {
    setCompanyForm((prev) => {
      const next = { ...prev, [field]: value };
      if (next.id && next.id === companySettings.id) {
        setCompanySettings(next);
        setInvoice((prevInvoice) => applyCompanySettingsToInvoice(prevInvoice, next));
      }
      return next;
    });
  };

  const saveCompanyProfile = () => {
    if (!hasCompanySettings(companyForm)) {
      showSaveMessage("Bitte zuerst Firmendaten eintragen.");
      return;
    }

    const profile = {
      ...companyForm,
      id: editingCompanyId || companyForm.id || createId(),
      companyName: companyForm.companyName.trim(),
      companyAddress: companyForm.companyAddress.trim(),
      companyEmail: companyForm.companyEmail.trim(),
      companyPhone: companyForm.companyPhone.trim(),
      taxRate: Number(companyForm.taxRate ?? 19),
    };

    const shouldActivate = !editingCompanyId || companySettings.id === profile.id;
    if (shouldActivate) {
      setCompanySettings(profile);
      setInvoice((prev) => applyCompanySettingsToInvoice(prev, profile));
    }
    setCompanyProfiles((prev) => {
      const withoutCurrent = prev.filter((entry) => entry.id !== profile.id);
      return [profile, ...withoutCurrent].slice(0, 50);
    });
    setCompanyForm(createDefaultCompanySettings());
    setEditingCompanyId("");
    showSaveMessage(editingCompanyId ? "Firmendaten aktualisiert." : "Firmendaten gespeichert.");
  };

  const applyCompanyProfile = (id) => {
    const profile = companyProfiles.find((entry) => entry.id === id);
    if (!profile) return;

    setCompanySettings(profile);
    setCompanyForm(profile);
    setEditingCompanyId("");
    setInvoice((prev) => applyCompanySettingsToInvoice(prev, profile));
    showSaveMessage("Firmendaten übernommen.");
  };

  const editCompanyProfile = (profile) => {
    setCompanyForm(profile);
    setEditingCompanyId(profile.id);
  };

  const cancelCompanyEdit = () => {
    setCompanyForm(createDefaultCompanySettings());
    setEditingCompanyId("");
  };

  const removeCompanyProfile = (id) => {
    const confirmed = window.confirm("Dieses Firmenprofil wirklich löschen?");
    if (!confirmed) return;

    setCompanyProfiles((prev) => prev.filter((entry) => entry.id !== id));
    if (companySettings.id === id) {
      const emptySettings = createDefaultCompanySettings();
      setCompanySettings(emptySettings);
      setCompanyForm(emptySettings);
      setEditingCompanyId("");
      setInvoice((prev) => applyCompanySettingsToInvoice(prev, emptySettings));
    }
    showSaveMessage("Firmenprofil gelöscht.");
  };

  const updateItem = (id, field, value) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, [field]: value };
        if (field === "quantity") next.hours = value;
        if (field === "fuelPerUnit") next.fuelPerHour = value;
        if (field === "priceMode") next.priceMode = normalizePriceMode(value);
        if (field === "type" && value !== "service") {
          next.fuelPerUnit = 0;
          next.fuelPerHour = 0;
          next.unit = value === "fixed" ? "Stück" : next.unit;
        }
        if (field === "type" && value === "service") next.unit = "h";
        return next;
      }),
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
        const entry = normalizeServiceEntry(service);
        return {
          ...item,
          serviceId: entry.id,
          type: entry.type,
          description: entry.name,
          unit: entry.unit,
          unitPrice: entry.pricePerUnit,
          priceMode: entry.priceMode,
          fuelPerUnit: entry.fuelPerUnit,
          fuelPerHour: entry.fuelPerUnit,
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
      id: editingCustomerId || newCustomer.id || createId(),
      name: newCustomer.name.trim(),
      address: newCustomer.address.trim(),
      email: newCustomer.email.trim(),
    };
    setCustomers((prev) => {
      if (!editingCustomerId) return [...prev, customer];
      return prev.map((entry) => (entry.id === editingCustomerId ? customer : entry));
    });
    if (invoice.customerId === customer.id) {
      setInvoice((prev) => ({
        ...prev,
        customerName: customer.name,
        customerAddress: customer.address,
        customerEmail: customer.email,
      }));
    }
    setNewCustomer(emptyCustomer());
    setEditingCustomerId("");
    showSaveMessage(editingCustomerId ? "Kunde aktualisiert." : "Kunde gespeichert.");
  };

  const editCustomer = (customer) => {
    setNewCustomer(customer);
    setEditingCustomerId(customer.id);
  };

  const cancelCustomerEdit = () => {
    setNewCustomer(emptyCustomer());
    setEditingCustomerId("");
  };

  const removeCustomer = (id) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    if (editingCustomerId === id) cancelCustomerEdit();
    setInvoice((prev) =>
      prev.customerId === id ? { ...prev, customerId: "", customerName: "", customerAddress: "", customerEmail: "" } : prev
    );
  };

  const addService = () => {
    if (!newService.name.trim()) return;
    const type = normalizeEntryType(newService.type);
    const service = normalizeServiceEntry({
      ...newService,
      type,
      id: editingServiceId || newService.id || createId(),
      name: newService.name.trim(),
      unit: type === "service" ? "h" : type === "fixed" ? "Stück" : newService.unit.trim() || "Stück",
      pricePerUnit: Number(newService.pricePerUnit || newService.pricePerHour || 0),
      priceMode: normalizePriceMode(newService.priceMode),
      fuelPerUnit: type === "service" ? Number(newService.fuelPerUnit || newService.fuelPerHour || 0) : 0,
    });
    setServices((prev) => {
      if (!editingServiceId) return [...prev, service];
      return prev.map((entry) => (entry.id === editingServiceId ? service : entry));
    });
    setServiceHours((prev) => ({ ...prev, [service.id]: 1 }));
    setNewService(emptyService());
    setEditingServiceId("");
    showSaveMessage(editingServiceId ? "Eintrag aktualisiert." : "Eintrag gespeichert.");
  };

  const editService = (service) => {
    setNewService(normalizeServiceEntry(service));
    setEditingServiceId(service.id);
  };

  const cancelServiceEdit = () => {
    setNewService(emptyService());
    setEditingServiceId("");
  };

  const removeService = (id) => {
    setServices((prev) => prev.filter((service) => service.id !== id));
    if (editingServiceId === id) cancelServiceEdit();
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
      await saveAppState({ invoice, invoiceSettings, invoices, customers, services, serviceHours, companySettings, companyProfiles });
      showSaveMessage("Daten lokal in IndexedDB gespeichert.");
    } catch (error) {
      console.error("Speichern fehlgeschlagen", error);
      showSaveMessage("Speichern fehlgeschlagen.");
    }
  };

  const saveCurrentInvoice = () => {
    const snapshot = createInvoiceSnapshot(invoice);
    const nextInvoiceNumber = incrementInvoiceNumber(snapshot.invoiceNumber);
    setInvoiceSettings({ nextInvoiceNumber });
    setInvoice({ ...snapshot.invoice, invoiceNumber: nextInvoiceNumber });
    setInvoices((prev) => {
      const withoutCurrent = prev.filter((entry) => entry.id !== snapshot.id);
      return [snapshot, ...withoutCurrent].slice(0, 100);
    });
    showSaveMessage("Rechnung gespeichert.");
  };

  const openSavedInvoice = (entry) => {
    const normalizedItems = Array.isArray(entry.invoice.items) && entry.invoice.items.length ? entry.invoice.items.map(normalizeInvoiceItem) : [emptyItem()];
    setInvoice(applyCompanySettingsToInvoice({ ...entry.invoice, items: normalizedItems }, companySettings));
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
        invoiceSettings,
        invoices,
        companySettings,
        companyProfiles,
        settings: companySettings,
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
      if (
        !isPlainObject(parsed) ||
        (
          !parsed.invoice &&
          !parsed.companySettings &&
          !Array.isArray(parsed.companyProfiles) &&
          !Array.isArray(parsed.customers) &&
          !Array.isArray(parsed.services)
        )
      ) {
        throw new Error("Ungültiges Backup-Format.");
      }

      const imported = normalizeAppState(parsed);
      setInvoice(imported.invoice);
      setInvoiceSettings(imported.invoiceSettings);
      setInvoices(imported.invoices);
      setCompanySettings(imported.companySettings);
      setCompanyForm(imported.companySettings);
      setCompanyProfiles(imported.companyProfiles);
      setCustomers(imported.customers.length ? imported.customers : createDefaultCustomers());
      setServices(imported.services.length ? imported.services : createDefaultServices());
      setServiceHours(imported.serviceHours);
      setEditingCompanyId("");
      setEditingCustomerId("");
      setEditingServiceId("");
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
    const defaultCompanySettings = createDefaultCompanySettings();
    const defaultInvoiceSettings = createDefaultInvoiceSettings();
    setCompanySettings(defaultCompanySettings);
    setCompanyForm(defaultCompanySettings);
    setCompanyProfiles([]);
    setInvoiceSettings(defaultInvoiceSettings);
    setInvoice(createDefaultInvoice(defaultCompanySettings, defaultInvoiceSettings));
    setInvoices([]);
    setCustomers(createDefaultCustomers());
    setServices(createDefaultServices());
    setServiceHours({});
    setNewCustomer(emptyCustomer());
    setNewService(emptyService());
    setEditingCompanyId("");
    setEditingCustomerId("");
    setEditingServiceId("");
    showSaveMessage("Alle Daten wurden zurückgesetzt.");
  };

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
                      <span className="block break-words text-[10px] leading-tight text-slate-500">{normalizePriceMode(item.priceMode) === "gross" ? "brutto vereinbart" : "netto"}</span>
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 p-3 pb-24 sm:p-4 sm:pb-24 md:p-8 md:pb-28 xl:pb-8 min-[1700px]:pr-[680px] print:bg-white">
      <main className="invoice-app-shell mx-auto grid w-full max-w-[1600px] grid-cols-1 items-start gap-4 md:gap-6">
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
                  <p className="text-xs uppercase tracking-wide text-slate-500">Netto</p>
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
                  <p className="text-xs uppercase tracking-wide text-slate-500">Brutto</p>
                  <p className="text-xl font-bold">{currency(total)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Rechnungseinstellungen</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
              <Field label="Aktuelle Rechnungsnummer">
                <Input
                  value={invoiceSettings.nextInvoiceNumber}
                  onChange={(e) => {
                    const nextInvoiceNumber = e.target.value;
                    setInvoiceSettings((prev) => ({ ...prev, nextInvoiceNumber }));
                    setInvoice((prev) => ({ ...prev, invoiceNumber: nextInvoiceNumber }));
                  }}
                />
              </Field>
              <Button className="w-full md:w-auto" variant="outline" onClick={saveInvoiceNumberSetting}>
                <Save className="mr-2 h-4 w-4" /> Speichern
              </Button>
              <Button className="w-full md:w-auto" variant="outline" onClick={createNextInvoice}>
                <Plus className="mr-2 h-4 w-4" /> Neue Rechnung
              </Button>
              <p className="text-sm text-slate-500 md:col-span-3">
                Beim Speichern einer Rechnung wird die Nummer automatisch hochgezählt, z. B. RE-2026-009 zu RE-2026-010.
              </p>
            </CardContent>
          </Card>

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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2"><Receipt className="h-5 w-5" /><CardTitle>Eigene Firmendaten</CardTitle></div>
                <span className="text-xs text-slate-500">Karte anklicken = als Absender übernehmen</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2">
                <Field label="Firmenname"><Input placeholder="z. B. MaschinenLog" value={companyForm.companyName} onChange={(e) => updateCompanyField("companyName", e.target.value)} /></Field>
                <Field label="E-Mail"><Input placeholder="name@example.de" value={companyForm.companyEmail} onChange={(e) => updateCompanyField("companyEmail", e.target.value)} /></Field>
                <Field label="Telefon"><Input placeholder="+49 ..." value={companyForm.companyPhone} onChange={(e) => updateCompanyField("companyPhone", e.target.value)} /></Field>
                <Field label="MwSt. (%)"><Input type="number" min="0" step="0.1" value={companyForm.taxRate} onChange={(e) => updateCompanyField("taxRate", e.target.value)} /></Field>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Adresse</Label>
                  <Textarea placeholder={"Straße und Hausnummer\nPLZ Ort"} value={companyForm.companyAddress} onChange={(e) => updateCompanyField("companyAddress", e.target.value)} rows={4} />
                </div>
                <Button className="w-full sm:w-auto" onClick={saveCompanyProfile}>
                  {editingCompanyId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingCompanyId ? "Änderungen speichern" : "Firmendaten speichern"}
                </Button>
                {editingCompanyId ? (
                  <Button className="w-full sm:w-auto" variant="outline" onClick={cancelCompanyEdit}><X className="mr-2 h-4 w-4" /> Abbrechen</Button>
                ) : null}
              </div>

              <div className="grid gap-3">
                {companyProfiles.length ? (
                  companyProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => applyCompanyProfile(profile.id)}
                      className={`flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition hover:border-slate-400 hover:bg-slate-50 sm:flex-row sm:justify-between ${companySettings.id === profile.id ? "border-slate-900 bg-slate-100" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{profile.companyName || "Ohne Firmenname"}</p>
                        <p className="whitespace-pre-line break-words text-sm text-slate-600">{profile.companyAddress || "Keine Adresse"}</p>
                        <p className="mt-1 flex items-center gap-2 break-words text-sm text-slate-600"><Mail className="h-4 w-4" />{profile.companyEmail || "Keine E-Mail"}</p>
                        <p className="break-words text-sm text-slate-600">{profile.companyPhone || "Keine Telefonnummer"}</p>
                        <p className="text-sm text-slate-600">MwSt.: {Number(profile.taxRate ?? 19).toLocaleString("de-DE")}%</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            editCompanyProfile(profile);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Bearbeiten
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCompanyProfile(profile.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed p-4 text-sm text-slate-500">
                    Noch kein Firmenprofil gespeichert. Lege eigene Absenderprofile an und übernimm sie per Klick in die Rechnung.
                  </p>
                )}
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
                <Button className="w-full sm:w-auto" onClick={addCustomer}>
                  {editingCustomerId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingCustomerId ? "Änderungen speichern" : "Kunde speichern"}
                </Button>
                {editingCustomerId ? (
                  <Button className="w-full sm:w-auto" variant="outline" onClick={cancelCustomerEdit}><X className="mr-2 h-4 w-4" /> Abbrechen</Button>
                ) : null}
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
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          editCustomer(customer);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Bearbeiten
                      </Button>
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
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2"><Wrench className="h-5 w-5" /><CardTitle>Leistungen & Artikel</CardTitle></div>
                <span className="text-xs text-slate-500">Menge wählen, dann zur Rechnung hinzufügen</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 rounded-2xl border p-4 md:grid-cols-3">
                <Field label="Typ">
                  <select
                    className="h-10 rounded-md border bg-white px-3 text-sm"
                    value={newService.type}
                    onChange={(e) => setNewService((prev) => ({ ...prev, type: e.target.value, unit: e.target.value === "service" ? "h" : e.target.value === "fixed" ? "Stück" : prev.unit }))}
                  >
                    {Object.entries(ENTRY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Name"><Input value={newService.name} onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))} /></Field>
                {newService.type === "quantity" ? (
                  <Field label="Einheit"><Input placeholder="m³, t, Stück, l, kg" value={newService.unit} onChange={(e) => setNewService((prev) => ({ ...prev, unit: e.target.value }))} /></Field>
                ) : null}
                <Field label="Preisangabe">
                  <select
                    className="h-10 rounded-md border bg-white px-3 text-sm"
                    value={newService.priceMode}
                    onChange={(e) => setNewService((prev) => ({ ...prev, priceMode: e.target.value }))}
                  >
                    {Object.entries(PRICE_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label={newService.type === "service" ? "Preis pro Stunde (€)" : newService.type === "fixed" ? "Festpreis (€)" : "Preis pro Einheit (€)"}>
                  <Input type="number" min="0" step="0.01" value={newService.pricePerUnit || newService.pricePerHour} onChange={(e) => setNewService((prev) => ({ ...prev, pricePerUnit: e.target.value, pricePerHour: e.target.value }))} />
                </Field>
                {newService.type === "service" ? (
                  <Field label="Dieselverbrauch pro Stunde (l)">
                    <Input type="number" min="0" step="0.01" value={newService.fuelPerUnit || newService.fuelPerHour} onChange={(e) => setNewService((prev) => ({ ...prev, fuelPerUnit: e.target.value, fuelPerHour: e.target.value }))} />
                  </Field>
                ) : null}
                <Button className="w-full sm:w-auto" onClick={addService}>
                  {editingServiceId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingServiceId ? "Änderungen speichern" : "Eintrag speichern"}
                </Button>
                {editingServiceId ? (
                  <Button className="w-full sm:w-auto" variant="outline" onClick={cancelServiceEdit}><X className="mr-2 h-4 w-4" /> Abbrechen</Button>
                ) : null}
                <p className="text-sm text-slate-500 md:col-span-3">
                  Bei Bruttopreisen wird der vereinbarte Endpreis automatisch in Netto und MwSt. umgerechnet.
                </p>
              </div>

              <div className="grid gap-3">
                {services.map((service) => {
                  const entry = normalizeServiceEntry(service);
                  const selectedHours = serviceHours[service.id] ?? 1;
                  const previewAmount = Number(selectedHours || 0) * Number(entry.pricePerUnit || 0);
                  const previewFuel = Number(selectedHours || 0) * Number(entry.fuelPerUnit || 0);
                  return (
                    <div key={service.id} className="grid gap-4 rounded-2xl border p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{entry.name}</p>
                        <p className="text-sm text-slate-600">Typ: {ENTRY_TYPES[entry.type]}</p>
                        <p className="text-sm text-slate-600">Preis: {currency(entry.pricePerUnit)} / {entry.unit} · {normalizePriceMode(entry.priceMode) === "gross" ? "brutto vereinbart" : "netto"}</p>
                        {entry.type === "service" ? <p className="text-sm text-slate-600">Dieselverbrauch pro Stunde: {formatFuel(entry.fuelPerUnit)}</p> : null}
                        <p className="mt-2 break-words text-sm font-medium text-slate-700">
                          Vorschau: {currency(previewAmount)}{previewFuel > 0 ? ` · Diesel: ${formatFuel(previewFuel)}` : ""}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[140px_auto_auto_auto] sm:items-end">
                        <Field label={entry.type === "service" ? "Stunden" : "Menge"}><Input type="number" min="0.25" step="0.25" value={selectedHours} onChange={(e) => setServiceHours((prev) => ({ ...prev, [service.id]: e.target.value }))} /></Field>
                        <Button onClick={() => addServiceToInvoice(service.id)}><Plus className="mr-2 h-4 w-4" /> Zur Rechnung</Button>
                        <Button variant="outline" onClick={() => editService(service)}><Pencil className="mr-2 h-4 w-4" /> Bearbeiten</Button>
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
                <div key={item.id} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 2xl:grid-cols-[1.05fr_1.05fr_95px_90px_115px_120px_100px_110px_48px] 2xl:items-end">
                  <div className="grid gap-2">
                    <Label>Leistung/Artikel {index + 1}</Label>
                    <select className="h-10 rounded-md border bg-white px-3 text-sm" value={item.serviceId} onChange={(e) => applyServiceToItem(item.id, e.target.value)}>
                      <option value="">Bitte auswählen</option>
                      {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                  </div>
                  <Field label="Beschreibung"><Input value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} /></Field>
                  <Field label="Menge"><Input type="number" min="0" step="0.25" value={item.quantity ?? item.hours} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} /></Field>
                  <Field label="Einheit"><Input value={item.unit || ""} onChange={(e) => updateItem(item.id, "unit", e.target.value)} /></Field>
                  <Field label="Einzelpreis (€)"><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)} /></Field>
                  <Field label="Preisangabe">
                    <select className="h-10 rounded-md border bg-white px-3 text-sm" value={normalizePriceMode(item.priceMode)} onChange={(e) => updateItem(item.id, "priceMode", e.target.value)}>
                      {Object.entries(PRICE_MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Diesel (l/Einheit)"><Input type="number" min="0" step="0.01" value={item.fuelPerUnit ?? item.fuelPerHour} onChange={(e) => updateItem(item.id, "fuelPerUnit", e.target.value)} /></Field>
                  <div className="grid gap-2">
                    <Label>Netto</Label>
                    <div className="h-10 rounded-md border bg-slate-50 px-3 py-2 text-sm">{currency(getLineNetTotal(item, invoice.taxRate))}</div>
                  </div>
                  <Button className="w-full sm:col-span-2 2xl:col-span-1 2xl:w-auto" variant="ghost" size="icon" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader><CardTitle>Zusatzinfos</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Hinweis</Label>
                <Textarea value={invoice.notes} onChange={(e) => updateField("notes", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="invoice-preview-column hidden min-[1700px]:block">
          {renderInvoicePreview()}
        </aside>

      </main>

      <Button
        className="fixed bottom-4 right-4 z-30 shadow-lg min-[1700px]:hidden"
        onClick={() => setPreviewOpen(true)}
      >
        <Receipt className="mr-2 h-4 w-4" /> Rechnung ansehen
      </Button>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-3 sm:items-center sm:p-6 min-[1700px]:hidden" role="dialog" aria-modal="true" aria-label="Rechnungsvorschau">
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
    </div>
  );
}
