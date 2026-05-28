import { getCategories, leadStatuses } from "./state.js";
import { clamp, debounce, escapeAttribute, escapeHtml } from "./utils/helpers.js";

const elements = {
  form: document.querySelector("#leadForm"),
  csvButton: document.querySelector("#csvBtn"),
  jsonButton: document.querySelector("#jsonBtn"),
  promptButton: document.querySelector("#promptBtn"),
  copyPromptButton: document.querySelector("#copyPromptBtn"),
  rows: document.querySelector("#leadRows"),
  leadCount: document.querySelector("#leadCount"),
  sourceLabel: document.querySelector("#sourceLabel"),
  statusLine: document.querySelector("#statusLine"),
  apiModeStatus: document.querySelector("#apiModeStatus"),
  keywordPanel: document.querySelector("#keywordPanel"),
  keywordControls: document.querySelector("#keywordControls"),
  keywordSummary: document.querySelector("#keywordSummary"),
  activeFilterSummary: document.querySelector("#activeFilterSummary"),
  promptPanel: document.querySelector("#promptPanel"),
  promptOutput: document.querySelector("#promptOutput"),
  stats: {
    total: document.querySelector("#statTotal"),
    high: document.querySelector("#statHigh"),
    website: document.querySelector("#statWebsite"),
    email: document.querySelector("#statEmail")
  },
  fields: {
    keyword: document.querySelector("#keyword"),
    state: document.querySelector("#state"),
    region: document.querySelector("#region"),
    city: document.querySelector("#city"),
    limit: document.querySelector("#limit"),
    sourceMode: document.querySelector("#sourceMode"),
    apiKey: document.querySelector("#apiKey")
  },
  filters: {
    search: document.querySelector("#searchFilter"),
    category: document.querySelector("#categoryFilter"),
    city: document.querySelector("#cityFilter"),
    websiteOnly: document.querySelector("#websiteFilter"),
    emailOnly: document.querySelector("#emailFilter"),
    minScore: document.querySelector("#minScoreFilter"),
    sortByScore: document.querySelector("#sortScoreFilter")
  }
};

let callbacks = null;

export function bindUi(handlers) {
  callbacks = handlers;

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    callbacks.onSearch();
  });

  elements.csvButton.addEventListener("click", callbacks.onExportCsv);
  elements.jsonButton.addEventListener("click", callbacks.onExportJson);
  elements.promptButton.addEventListener("click", callbacks.onBuildPrompt);
  elements.copyPromptButton.addEventListener("click", copyPrompt);

  const syncParams = debounce(() => callbacks.onParamsChange(getFormParams()));
  Object.values(elements.fields).forEach((field) => {
    field.addEventListener("input", syncParams);
    field.addEventListener("change", syncParams);
  });

  const syncFilters = () => callbacks.onFiltersChange(getFilters());
  Object.values(elements.filters).forEach((field) => field.addEventListener("input", syncFilters));
  elements.filters.category.addEventListener("change", syncFilters);
  elements.filters.websiteOnly.addEventListener("change", syncFilters);
  elements.filters.emailOnly.addEventListener("change", syncFilters);
  elements.filters.sortByScore.addEventListener("change", syncFilters);

  elements.rows.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-status]")) {
      callbacks.onLeadStatusChange(target.dataset.status, target.value);
    }
  });

  elements.rows.addEventListener("input", debounce((event) => {
    const target = event.target;
    if (target.matches("[data-notes]")) {
      callbacks.onLeadNotesChange(target.dataset.notes, target.value);
    }
  }, 220));

  elements.keywordControls.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-keyword-term]")) {
      callbacks.onKeywordToggle(target.dataset.keywordTerm, target.checked);
    }
  });
}

export function hydrateForm(state) {
  setFieldValues(elements.fields, state.searchParams);
  setFilterValues(state.filters);
}

export function getFormParams() {
  return {
    sourceMode: elements.fields.sourceMode.value || "osm",
    keyword: elements.fields.keyword.value.trim() || "Lead",
    state: elements.fields.state.value.trim() || "Bundesland",
    region: elements.fields.region.value.trim() || "Region",
    city: elements.fields.city.value.trim() || "Stadt",
    limit: clamp(Number(elements.fields.limit.value), 3, 50),
    apiKey: elements.fields.apiKey.value.trim()
  };
}

export function renderApp(state, visibleLeads, promptText = "") {
  renderStats(state.leads);
  renderApiMode(state.searchParams);
  renderCategories(state.leads, state.filters.category);
  renderKeywordControls(state, visibleLeads);
  renderRows(visibleLeads);

  elements.leadCount.textContent = String(visibleLeads.length);
  elements.sourceLabel.textContent = state.leads[0]?.source ? `Quelle: ${state.leads[0].source}` : "Quelle: OpenStreetMap / Google Places";

  if (promptText) {
    elements.promptPanel.hidden = false;
    elements.promptOutput.value = promptText;
    elements.promptPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function setStatus(message) {
  elements.statusLine.textContent = message;
}

function setFieldValues(fields, values) {
  Object.entries(fields).forEach(([key, field]) => {
    field.value = values[key] ?? "";
  });
}

function setFilterValues(filters) {
  elements.filters.search.value = filters.search || "";
  elements.filters.category.value = filters.category || "";
  elements.filters.city.value = filters.city || "";
  elements.filters.websiteOnly.checked = Boolean(filters.websiteOnly);
  elements.filters.emailOnly.checked = Boolean(filters.emailOnly);
  elements.filters.minScore.value = filters.minScore ?? 0;
  elements.filters.sortByScore.checked = Boolean(filters.sortByScore);
}

function getFilters() {
  return {
    search: elements.filters.search.value.trim(),
    category: elements.filters.category.value,
    city: elements.filters.city.value.trim(),
    websiteOnly: elements.filters.websiteOnly.checked,
    emailOnly: elements.filters.emailOnly.checked,
    minScore: clamp(Number(elements.filters.minScore.value), 0, 100),
    sortByScore: elements.filters.sortByScore.checked
  };
}

function renderStats(leads) {
  elements.stats.total.textContent = String(leads.length);
  elements.stats.high.textContent = String(leads.filter((lead) => lead.priority === "high").length);
  elements.stats.website.textContent = String(leads.filter((lead) => lead.website).length);
  elements.stats.email.textContent = String(leads.filter((lead) => lead.email).length);
}

function renderApiMode(searchParams) {
  const mode = searchParams.sourceMode || "osm";
  const hasKey = Boolean(String(searchParams.apiKey || "").trim());
  elements.apiModeStatus.classList.remove("api", "osm", "warning");

  if (mode === "osm") {
    elements.apiModeStatus.textContent = "OpenStreetMap aktiv";
    elements.apiModeStatus.classList.add("osm");
    return;
  }

  if (mode === "google") {
    elements.apiModeStatus.textContent = hasKey ? "Google Places aktiv" : "Google API-Key fehlt";
    elements.apiModeStatus.classList.add(hasKey ? "api" : "warning");
    return;
  }

  elements.apiModeStatus.textContent = "OpenStreetMap aktiv";
  elements.apiModeStatus.classList.add("osm");
}

function renderCategories(leads, activeCategory) {
  const options = [`<option value="">Alle Kategorien</option>`]
    .concat(getCategories(leads).map((category) => {
      const selected = category === activeCategory ? " selected" : "";
      return `<option value="${escapeAttribute(category)}"${selected}>${escapeHtml(category)}</option>`;
    }));
  elements.filters.category.innerHTML = options.join("");
}

function renderRows(leads) {
  if (!leads.length) {
    elements.rows.innerHTML = `<tr><td colspan="7" class="empty">Keine passenden Leads. Suche starten oder Filter lockern.</td></tr>`;
    return;
  }

  elements.rows.innerHTML = leads.map((lead) => `
    <tr>
      <td>
        <div class="score-badge ${escapeAttribute(lead.priority)}">
          <strong>${escapeHtml(lead.score)}</strong>
          <span>${escapeHtml(lead.priority)}</span>
        </div>
      </td>
      <td>
        <strong>${escapeHtml(lead.company)}</strong>
        <div class="subline">${renderTags(lead.tags)}</div>
      </td>
      <td>${escapeHtml(lead.category)}</td>
      <td>
        ${escapeHtml(lead.address)}<br>
        <span class="subline">${escapeHtml(lead.city)}, ${escapeHtml(lead.state)}</span>
      </td>
      <td>
        ${lead.phone ? `<div>${escapeHtml(lead.phone)}</div>` : `<span class="muted">Keine Telefonnummer</span>`}
        ${lead.website ? `<a href="${escapeAttribute(lead.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : `<span class="muted">Keine Website</span>`}
        ${lead.googleMapsUri ? `<a href="${escapeAttribute(lead.googleMapsUri)}" target="_blank" rel="noopener noreferrer">Google Maps</a>` : ""}
        ${lead.mapsLink && !lead.googleMapsUri ? `<a href="${escapeAttribute(lead.mapsLink)}" target="_blank" rel="noopener noreferrer">Karte</a>` : ""}
        ${lead.email ? `<div>${escapeHtml(lead.email)}</div>` : `<span class="muted">Keine E-Mail</span>`}
        ${renderRating(lead)}
      </td>
      <td>
        <select class="status-select" data-status="${escapeAttribute(lead.id)}">
          ${leadStatuses.map((status) => `<option value="${escapeAttribute(status)}"${status === lead.status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
      </td>
      <td>
        <textarea class="notes-input" data-notes="${escapeAttribute(lead.id)}" rows="3">${escapeHtml(lead.notes)}</textarea>
      </td>
    </tr>
  `).join("");
}

function renderKeywordControls(state, visibleLeads) {
  const keywordControls = state.keywordControls || {};
  const terms = Array.isArray(keywordControls.terms) ? keywordControls.terms : [];
  const isOsm = (state.searchParams.sourceMode || "osm") === "osm";

  if (!isOsm || !terms.length) {
    elements.keywordPanel.hidden = true;
    elements.keywordControls.innerHTML = "";
    elements.keywordSummary.textContent = "";
    elements.activeFilterSummary.innerHTML = "";
    return;
  }

  elements.keywordPanel.hidden = false;
  elements.keywordControls.innerHTML = terms.map((entry) => `
    <label class="keyword-chip ${entry.active ? "active" : ""}">
      <input type="checkbox" data-keyword-term="${escapeAttribute(entry.term)}"${entry.active ? " checked" : ""}>
      <span>${escapeHtml(entry.term)}</span>
      <strong>${escapeHtml(entry.count)}</strong>
    </label>
  `).join("");

  const activeTerms = terms.filter((entry) => entry.active).map((entry) => entry.term);
  elements.activeFilterSummary.innerHTML = [
    `Datenquelle: ${state.searchParams.sourceMode === "osm" ? "OpenStreetMap" : "Google Places"}`,
    `Keyword: ${state.searchParams.keyword || "-"}`,
    state.searchParams.city ? `Ort: ${state.searchParams.city}` : "",
    activeTerms.length ? `Aktiv: ${activeTerms.join(", ")}` : "Keine Keyword-Filter aktiv"
  ].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join("");

  elements.keywordSummary.textContent = `${visibleLeads.length} Leads sichtbar. ${keywordControls.removedCount || 0} irrelevante OSM-Treffer wurden entfernt. ${keywordControls.rawCount || 0} Roh-Treffer geprüft.`;
}

function renderTags(tags = []) {
  return tags.slice(0, 4).map((tag) => `<span class="mini-tag">${escapeHtml(tag)}</span>`).join("");
}

function renderRating(lead) {
  if (!lead.rating && !lead.userRatingsTotal) return "";
  return `<div class="subline">Rating: ${escapeHtml(lead.rating || "-")} (${escapeHtml(lead.userRatingsTotal || 0)} Bewertungen)</div>`;
}

async function copyPrompt() {
  if (!elements.promptOutput.value.trim()) return;
  try {
    await navigator.clipboard.writeText(elements.promptOutput.value);
    setStatus("LLM-Prompt wurde in die Zwischenablage kopiert.");
  } catch {
    elements.promptOutput.select();
    setStatus("Prompt konnte nicht automatisch kopiert werden. Text ist markiert.");
  }
}
