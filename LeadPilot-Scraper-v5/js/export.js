import { formatTimestamp } from "./utils/helpers.js";

const headers = [
  "Firmenname",
  "Kategorie",
  "Adresse",
  "Ort",
  "Telefon",
  "Website",
  "E-Mail",
  "Rating",
  "Bewertungen",
  "Google Maps",
  "Kartenlink",
  "Quelle",
  "Score",
  "Priorität",
  "Status",
  "Tags",
  "Notizen",
  "Exportzeitpunkt"
];

export function buildCsv(leads) {
  const exportedAt = formatTimestamp();
  const rows = [
    headers,
    ...leads.map((lead) => [
      lead.company,
      lead.category,
      lead.address,
      lead.city,
      lead.phone,
      lead.website,
      lead.email,
      lead.rating,
      lead.userRatingsTotal,
      lead.googleMapsUri,
      lead.mapsLink,
      lead.source,
      lead.score,
      lead.priority,
      lead.status,
      (lead.tags || []).join(", "),
      lead.notes,
      exportedAt
    ])
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\n")}`;
}

export function buildJsonPayload(leads, searchParams) {
  return {
    exportedAt: formatTimestamp(),
    workflow: "LeadPilot API-first Export für LLM-Auswertung",
    searchParams: {
      ...searchParams,
      apiKey: searchParams.apiKey ? "[local-only]" : ""
    },
    leads
  };
}

export function buildLlmPrompt(leads, searchParams) {
  const publicParams = {
    keyword: searchParams.keyword,
    state: searchParams.state,
    region: searchParams.region,
    city: searchParams.city,
    limit: searchParams.limit,
    sourceMode: searchParams.sourceMode
  };

  return [
    "Bewerte und priorisiere diese Leads für ein SaaS-Unternehmen im Bereich Landwirtschaft, Maschinenmanagement und digitale Betriebsorganisation.",
    "",
    "Ziele:",
    "- Sortiere die Leads nach Relevanz und Abschlusswahrscheinlichkeit.",
    "- Markiere die besten 10 Kontakte.",
    "- Gib pro Lead eine kurze Begründung und einen nächsten Akquise-Schritt.",
    "- Erkenne Dubletten oder unvollständige Datensätze.",
    "",
    "Suchparameter:",
    JSON.stringify(publicParams, null, 2),
    "",
    "Lead-Daten:",
    JSON.stringify(leads, null, 2)
  ].join("\n");
}

export function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
