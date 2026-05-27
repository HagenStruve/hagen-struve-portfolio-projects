const form = document.querySelector("#leadForm");
const demoButton = document.querySelector("#demoBtn");
const csvButton = document.querySelector("#csvBtn");
const jsonButton = document.querySelector("#jsonBtn");
const rows = document.querySelector("#leadRows");
const statusLine = document.querySelector("#statusLine");
const leadCount = document.querySelector("#leadCount");
const sourceLabel = document.querySelector("#sourceLabel");
const apiKeyInput = document.querySelector("#apiKey");

const storageKey = "leadpilot-api-key";
let leads = [];

apiKeyInput.value = localStorage.getItem(storageKey) || "";
apiKeyInput.addEventListener("input", () => {
  localStorage.setItem(storageKey, apiKeyInput.value.trim());
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  createDemoLeads(true);
});

demoButton.addEventListener("click", () => createDemoLeads(false));
csvButton.addEventListener("click", exportCsv);
jsonButton.addEventListener("click", exportJson);

function getParams() {
  return {
    keyword: valueOf("keyword", "Lead"),
    state: valueOf("state", "Bundesland"),
    region: valueOf("region", "Region"),
    city: valueOf("city", "Stadt"),
    limit: clamp(Number(valueOf("limit", "12")), 3, 50),
    hasApiKey: Boolean(apiKeyInput.value.trim())
  };
}

function valueOf(id, fallback) {
  const value = document.querySelector(`#${id}`).value.trim();
  return value || fallback;
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function createDemoLeads(apiPreparedMode) {
  const params = getParams();
  const categories = [
    params.keyword,
    `${params.keyword} Service`,
    `${params.keyword} Handel`,
    `${params.keyword} Beratung`,
    `${params.keyword} Technik`
  ];
  const companyWords = ["Nord", "Hof", "Feld", "Werk", "Regional", "Partner", "Digital", "Pro"];
  const streets = ["Hauptstrasse", "Industrieweg", "Am Markt", "Werkstrasse", "Dorfstrasse", "Muehlenweg"];

  leads = Array.from({ length: params.limit }, (_, index) => {
    const word = companyWords[index % companyWords.length];
    const category = categories[index % categories.length];
    const number = 12 + index * 3;
    const source = apiPreparedMode && params.hasApiKey ? "Google API vorbereitet" : "Demo";

    return {
      company: `${word} ${params.keyword} ${index + 1}`,
      category,
      address: `${streets[index % streets.length]} ${number}`,
      city: index % 3 === 0 ? params.city : params.region,
      phone: `+49 ${4300 + index} ${120000 + index * 137}`,
      website: `https://example-lead-${index + 1}.de`,
      email: index % 2 === 0 ? `kontakt@lead-${index + 1}.de` : "",
      source,
      notes: `Region: ${params.region}, ${params.state}. Für LLM-Priorisierung exportierbar.`
    };
  });

  renderLeads();
  statusLine.textContent = apiPreparedMode && params.hasApiKey
    ? "API-Workflow vorbereitet. In dieser Portfolio-Version werden sichere Demo-Leads erzeugt."
    : "Demo-Leads wurden lokal erzeugt.";
  sourceLabel.textContent = `Quelle: ${leads[0]?.source || "Demo/API vorbereitet"}`;
}

function renderLeads() {
  leadCount.textContent = String(leads.length);

  if (!leads.length) {
    rows.innerHTML = `<tr><td colspan="9" class="empty">Noch keine Leads. Starte den Demo-Modus oder eine vorbereitete Suche.</td></tr>`;
    return;
  }

  rows.innerHTML = leads.map((lead) => `
    <tr>
      <td>${escapeHtml(lead.company)}</td>
      <td>${escapeHtml(lead.category)}</td>
      <td>${escapeHtml(lead.address)}</td>
      <td>${escapeHtml(lead.city)}</td>
      <td>${escapeHtml(lead.phone)}</td>
      <td><a href="${escapeAttribute(lead.website)}" target="_blank" rel="noopener noreferrer">Website</a></td>
      <td>${escapeHtml(lead.email || "-")}</td>
      <td>${escapeHtml(lead.source)}</td>
      <td>${escapeHtml(lead.notes)}</td>
    </tr>
  `).join("");
}

function exportCsv() {
  if (!ensureLeads()) return;

  const headers = ["Firmenname", "Kategorie", "Adresse", "Ort", "Telefon", "Website", "E-Mail", "Quelle", "Notizen"];
  const csvRows = [
    headers,
    ...leads.map((lead) => [
      lead.company,
      lead.category,
      lead.address,
      lead.city,
      lead.phone,
      lead.website,
      lead.email,
      lead.source,
      lead.notes
    ])
  ];

  const csv = csvRows.map((row) => row.map(csvCell).join(";")).join("\n");
  downloadFile("leadpilot-leads.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
  statusLine.textContent = "CSV-Export wurde erzeugt.";
}

function exportJson() {
  if (!ensureLeads()) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    workflow: "LeadPilot Demo/API-first Export für LLM-Auswertung",
    leads
  };

  downloadFile("leadpilot-leads.json", JSON.stringify(payload, null, 2), "application/json");
  statusLine.textContent = "JSON-Export wurde erzeugt.";
}

function ensureLeads() {
  if (leads.length) return true;
  statusLine.textContent = "Bitte zuerst Demo-Leads erzeugen.";
  return false;
}

function downloadFile(filename, content, type) {
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
