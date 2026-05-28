import { searchGooglePlaces } from "./js/api/google-places.js";
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

    if (state.searchParams.apiKey) {
      setStatus("Google Places Suche läuft...");
      const result = await searchGooglePlaces(state.searchParams);
      setStatus(result.message);

      if (result.leads.length) {
        state.leads = result.leads.map((lead) => applyScore(lead));
        saveAndRender();
      } else if (!result.error) {
        state.leads = [];
        saveAndRender();
      }

      return;
    } else {
      setStatus("Kein API-Key gesetzt. Demo-Modus aktiv.");
    }

    state.leads = createDemoScoredLeads(true);
    saveAndRender();
  },
  onDemo: () => {
    state.searchParams = getFormParams();
    state.leads = createDemoScoredLeads(false);
    setStatus("Demo-Leads wurden lokal erzeugt und bewertet.");
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
