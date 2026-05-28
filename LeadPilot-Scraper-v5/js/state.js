import { normalizeText } from "./utils/helpers.js";

export const leadStatuses = ["Neu", "Prüfen", "Kontaktieren", "Interessant", "Kunde", "Nicht relevant"];

const defaultSearchParams = {
  keyword: "Landtechnik",
  state: "Schleswig-Holstein",
  region: "Steinburg",
  city: "Itzehoe",
  limit: 12,
  sourceMode: "osm",
  apiKey: ""
};

const defaultFilters = {
  search: "",
  category: "",
  city: "",
  websiteOnly: false,
  emailOnly: false,
  minScore: 0,
  sortByScore: true
};

export function createInitialState(savedState) {
  return {
    searchParams: {
      ...defaultSearchParams,
      ...(savedState?.searchParams || {})
    },
    filters: {
      ...defaultFilters,
      ...(savedState?.filters || {})
    },
    leads: Array.isArray(savedState?.leads) ? savedState.leads : []
  };
}

export function updateLead(state, leadId, patch) {
  return {
    ...state,
    leads: state.leads.map((lead) => lead.id === leadId ? { ...lead, ...patch } : lead)
  };
}

export function getFilteredLeads(state) {
  const filters = state.filters;
  const search = normalizeText(filters.search);
  const city = normalizeText(filters.city);
  const category = normalizeText(filters.category);
  const minScore = Number(filters.minScore) || 0;

  const result = state.leads.filter((lead) => {
    const haystack = normalizeText([
      lead.company,
      lead.category,
      lead.address,
      lead.city,
      lead.website,
      lead.email,
      lead.notes,
      lead.status
    ].join(" "));

    if (search && !haystack.includes(search)) return false;
    if (category && normalizeText(lead.category) !== category) return false;
    if (city && !normalizeText(lead.city).includes(city)) return false;
    if (filters.websiteOnly && !lead.website) return false;
    if (filters.emailOnly && !lead.email) return false;
    if ((lead.score || 0) < minScore) return false;
    return true;
  });

  if (filters.sortByScore) {
    return [...result].sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  return result;
}

export function getCategories(leads) {
  return [...new Set(leads.map((lead) => lead.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
