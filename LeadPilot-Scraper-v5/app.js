import { searchGooglePlaces } from "./js/api/google-places.js";
import { searchOverpassLeads } from "./js/api/overpass.js";
import { createDemoLeads } from "./js/demo-data.js";
import { buildCsv, buildJsonPayload, buildLlmPrompt, downloadFile } from "./js/export.js";
import { scoreLead } from "./js/scoring.js";
import { createInitialState, getFilteredLeads, updateLead } from "./js/state.js";
import { loadState, saveState } from "./js/storage.js";
import { bindUi, getFormParams, hydrateForm, renderApp, setStatus } from "./js/ui.js";

let state = createInitialState(loadState());
state.leads = state.leads.map((lead) => normalizeStoredLead(lead));

hydrateForm(state);
renderApp(state, getFilteredLeads(state));

bindUi({
  state,
  onParamsChange: (params) => {
    state.searchParams = params;
    saveAndRender();
  },
  onFiltersChange: (filters) => {
    state.filters = filters;
    saveAndRender();
  },
  onSearch: async () => {
    state.searchParams = getFormParams();
    const sourceMode = state.searchParams.sourceMode || "demo";

    if (sourceMode === "demo") {
      state.leads = createDemoScoredLeads(false);
      setStatus("Demo-Modus aktiv. Es wurden realistische Beispieldaten ohne externe Requests erzeugt.");
      saveAndRender();
      return;
    }

    if (sourceMode === "osm") {
      setStatus("OpenStreetMap/Overpass Suche läuft...");
      const result = await searchOverpassLeads(state.searchParams);
      setStatus(result.message);
      updateLeadsFromResult(result);
      return;
    }

    if (sourceMode === "google") {
      if (!state.searchParams.apiKey) {
        setStatus("Für Google Places wird ein API-Key benötigt.");
        saveAndRender();
        return;
      }

      setStatus("Google Places Suche läuft...");
      const result = await searchGooglePlaces(state.searchParams);
      setStatus(result.message);
      updateLeadsFromResult(result);
      return;
    }

    state.leads = createDemoScoredLeads(false);
    setStatus("Unbekannte Datenquelle. Demo-Modus aktiv.");
    saveAndRender();
  },
  onDemo: () => {
    state.searchParams = getFormParams();
    state.searchParams.sourceMode = "demo";
    state.leads = createDemoScoredLeads(false);
    setStatus("Demo-Leads wurden lokal erzeugt und bewertet.");
    hydrateForm(state);
    saveAndRender();
  },
  onLeadStatusChange: (leadId, status) => {
    state = updateLead(state, leadId, { status });
    saveAndRender();
  },
  onLeadNotesChange: (leadId, notes) => {
    state = updateLead(state, leadId, { notes });
    saveState(state);
  },
  onExportCsv: () => {
    const leads = getFilteredLeads(state);
    if (!ensureLeads(leads)) return;
    downloadFile("leadpilot-leads.csv", buildCsv(leads), "text/csv;charset=utf-8");
    setStatus("CSV-Export wurde erzeugt.");
  },
  onExportJson: () => {
    const leads = getFilteredLeads(state);
    if (!ensureLeads(leads)) return;
    const payload = buildJsonPayload(leads, state.searchParams);
    downloadFile("leadpilot-leads.json", JSON.stringify(payload, null, 2), "application/json");
    setStatus("JSON-Export wurde erzeugt.");
  },
  onBuildPrompt: () => {
    const leads = getFilteredLeads(state);
    if (!ensureLeads(leads)) return;
    renderApp(state, leads, buildLlmPrompt(leads, state.searchParams));
    setStatus("LLM-Prompt wurde erzeugt.");
  }
});

function createDemoScoredLeads(apiPreparedMode) {
  return createDemoLeads(state.searchParams, apiPreparedMode).map((lead) => applyScore(lead));
}

function applyScore(lead) {
  const scored = scoreLead(lead, state.searchParams.keyword);
  return {
    ...lead,
    ...scored,
    status: lead.status || "Neu"
  };
}

function updateLeadsFromResult(result) {
  if (result.leads.length) {
    state.leads = result.leads.map((lead) => applyScore(lead));
    saveAndRender();
  } else if (!result.error) {
    state.leads = [];
    saveAndRender();
  } else {
    saveAndRender();
  }
}

function normalizeStoredLead(lead) {
  const scored = typeof lead.score === "number" && lead.priority
    ? { score: lead.score, priority: lead.priority, scoreReasons: lead.scoreReasons || [] }
    : scoreLead(lead, state.searchParams.keyword);

  return {
    ...lead,
    id: lead.id || `lead-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
    status: lead.status || "Neu",
    tags: Array.isArray(lead.tags) ? lead.tags : [lead.category, lead.city].filter(Boolean),
    notes: lead.notes || "",
    mapsLink: lead.mapsLink || lead.googleMapsUri || "",
    ...scored
  };
}

function saveAndRender() {
  saveState(state);
  renderApp(state, getFilteredLeads(state));
}

function ensureLeads(leads) {
  if (leads.length) return true;
  setStatus("Bitte zuerst Leads erzeugen oder Filter lockern.");
  return false;
}
