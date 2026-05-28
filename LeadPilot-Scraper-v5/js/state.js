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
  relevanceMode: "direct-related",
  sortByScore: true
};

const defaultKeywordControls = {
  profileId: "default",
  profileLabel: "Allgemeines Profil",
  terms: [],
  removedCount: 0,
  rawCount: 0,
  relevantCount: 0
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
    keywordControls: normalizeKeywordControls(savedState?.keywordControls),
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
  const activeKeywordTerms = getActiveKeywordTerms(state);

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
    if (!matchesRelevanceMode(lead, filters.relevanceMode)) return false;
    if (activeKeywordTerms && !hasActiveKeywordMatch(lead, activeKeywordTerms)) return false;
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

export function updateKeywordTerm(state, term, active) {
  return {
    ...state,
    keywordControls: {
      ...normalizeKeywordControls(state.keywordControls),
      terms: normalizeKeywordControls(state.keywordControls).terms.map((entry) => (
        normalizeText(entry.term) === normalizeText(term) ? { ...entry, active } : entry
      ))
    }
  };
}

function normalizeKeywordControls(keywordControls) {
  const terms = Array.isArray(keywordControls?.terms) ? keywordControls.terms : [];

  return {
    ...defaultKeywordControls,
    ...(keywordControls || {}),
    terms: terms.map((entry) => ({
      term: String(entry.term || ""),
      type: entry.type || "direct",
      active: entry.active !== false,
      count: Number(entry.count) || 0
    })).filter((entry) => entry.term)
  };
}

function getActiveKeywordTerms(state) {
  if ((state.searchParams?.sourceMode || "osm") !== "osm") return null;
  if ((state.filters?.relevanceMode || "direct-related") === "all-unblocked") return null;

  const terms = normalizeKeywordControls(state.keywordControls).terms;
  if (!terms.length) return null;

  return new Set(terms.filter((entry) => entry.active).map((entry) => normalizeText(entry.term)));
}

function hasActiveKeywordMatch(lead, activeTerms) {
  const matchedTerms = Array.isArray(lead.matchedTerms) ? lead.matchedTerms : [];
  return matchedTerms.some((term) => activeTerms.has(normalizeText(term)));
}

function matchesRelevanceMode(lead, relevanceMode = "direct-related") {
  if ((lead.source || "") !== "OpenStreetMap") return true;
  if (lead.relevance === "blocked") return false;

  if (relevanceMode === "direct-only") {
    return lead.relevance === "high";
  }

  if (relevanceMode === "all-unblocked") {
    return true;
  }

  return lead.relevance === "high" || lead.relevance === "related";
}
