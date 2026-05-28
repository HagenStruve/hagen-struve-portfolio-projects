import { createId, normalizeText } from "../utils/helpers.js";

const overpassUrl = "https://overpass-api.de/api/interpreter";
const overpassTimeoutSeconds = 20;

const blockedCategoriesForAgriSearch = new Set([
  "bicycle",
  "mobile_phone",
  "restaurant",
  "pharmacy",
  "school",
  "kindergarten",
  "pet",
  "supermarket",
  "cafe",
  "bakery",
  "hairdresser",
  "dentist",
  "doctor",
  "fast_food",
  "bank",
  "hotel",
  "tourism",
  "leisure",
  "clothes",
  "electronics"
]);

const branchProfiles = [
  {
    id: "landtechnik",
    strictAgriculture: true,
    triggers: ["landtechnik", "landmaschinen", "agrartechnik"],
    terms: [
      "landtechnik",
      "landmaschinen",
      "agrartechnik",
      "agrar",
      "traktoren",
      "tractor",
      "trecker",
      "landmaschinenhandel",
      "landmaschinenwerkstatt",
      "hoftechnik",
      "guelletechnik",
      "gülletechnik",
      "erntetechnik",
      "melktechnik",
      "lohnunternehmen",
      "agrarservice",
      "agricultural_machinery",
      "farm_equipment"
    ],
    relatedTerms: [
      "maschinenbau",
      "metallbau",
      "werkstatt",
      "mechanic",
      "motorgeraete",
      "motorgeräte",
      "handel",
      "trade",
      "hardware",
      "construction",
      "engineering",
      "metal_construction"
    ]
  },
  {
    id: "lohnunternehmen",
    strictAgriculture: true,
    triggers: ["lohnunternehmen", "agrarservice"],
    terms: [
      "lohnunternehmen",
      "agrarservice",
      "landwirtschaftlicher dienstleister",
      "maschinenring",
      "haeckseln",
      "häckseln",
      "guelle",
      "gülle",
      "silage",
      "ernte"
    ]
  },
  {
    id: "werkstatt",
    strictAgriculture: false,
    triggers: ["werkstatt"],
    terms: [
      "werkstatt",
      "reparatur",
      "landmaschinenwerkstatt",
      "motorgeraete",
      "motorgeräte",
      "service",
      "technik"
    ]
  }
];

const broadTermsThatNeedAgriculture = new Set([
  "werkstatt",
  "metal_construction",
  "bicycle",
  "mobile_phone",
  "hardware",
  "trade",
  "mechanic",
  "company"
]);

const strictAgriculturalTagTerms = [
  "agricultural",
  "farm",
  "agrarian",
  "tractor",
  "machinery",
  "agricultural_machinery",
  "farm_equipment"
];

const relatedTagTerms = [
  "maschinenbau",
  "metallbau",
  "werkstatt",
  "mechanic",
  "motorgeraete",
  "motorgeräte",
  "handel",
  "trade",
  "hardware",
  "construction",
  "engineering",
  "metal_construction"
];

const genericRelevantTagValues = [
  ["shop", "trade"],
  ["shop", "hardware"],
  ["shop", "agrarian"],
  ["craft", "agricultural_engines"],
  ["craft", "mechanic"],
  ["craft", "metal_construction"],
  ["craft", "electronics_repair"],
  ["office", "company"],
  ["industrial", "factory"],
  ["industrial", "machinery"],
  ["landuse", "farmyard"]
];

export async function searchOverpassLeads(params) {
  const query = buildOverpassQuery(params);
  const terms = getSearchTerms(params.keyword);
  const profile = getSearchProfile(params.keyword);

  try {
    const response = await fetch(overpassUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: new URLSearchParams({ data: query })
    });

    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }

    const payload = await response.json();
    const elements = Array.isArray(payload.elements) ? payload.elements : [];
    const mappedLeads = elements
      .map((element) => mapOsmElementToLead(element, params, terms))
      .filter(Boolean);
    const classifiedLeads = mappedLeads.map((lead) => classifyOsmLead(lead, terms, profile));
    const blockedLeads = classifiedLeads.filter((lead) => lead.relevance === "blocked");
    const leads = classifiedLeads
      .filter((lead) => lead.relevance !== "blocked")
      .slice(0, getLimit(params));
    const highCount = leads.filter((lead) => lead.relevance === "high").length;
    const relatedCount = leads.filter((lead) => lead.relevance === "related").length;
    const keywordControls = buildKeywordControls(terms, leads, blockedLeads);

    if (!leads.length) {
      return {
        leads: [],
        keywordControls,
        message: "Keine passenden OSM-Treffer gefunden. OSM-Daten sind je nach Branche unvollständig. Versuche andere Begriffe wie Landmaschinen, Agrartechnik, Agrarservice oder nutze Google Places.",
        usedApi: true
      };
    }

    const relevanceMessage = highCount
      ? `${highCount} direkte Treffer und ${relatedCount} verwandte Betriebe geladen.`
      : "Keine direkten Landtechnik-Treffer gefunden. Es werden verwandte Betriebe angezeigt, die du prüfen kannst.";

    return {
      leads,
      keywordControls,
      message: `${relevanceMessage} ${keywordControls.removedCount} blockierte OSM-Treffer entfernt. Kostenlose OSM-Daten. Telefonnummern/Websites können fehlen.`,
      usedApi: true
    };
  } catch (error) {
    return {
      leads: [],
      keywordControls: buildKeywordControls(terms, [], 0),
      message: `OpenStreetMap/Overpass konnte nicht laden: ${error.message || "Netzwerk- oder API-Fehler"}. Bitte später erneut versuchen oder Suchparameter anpassen.`,
      usedApi: true,
      error
    };
  }
}

export function buildOverpassQuery(params) {
  const areaName = escapeOverpassValue(params.city || params.region || params.state || "Deutschland");
  const terms = getSearchTerms(params.keyword);
  const regex = terms.map((term) => escapeOverpassRegex(term)).join("|");
  const limit = Math.max(getLimit(params) * 5, 25);

  return `
[out:json][timeout:${overpassTimeoutSeconds}];
area["name"="${areaName}"]["boundary"="administrative"]->.searchArea;
(
  nwr["name"~"${regex}",i](area.searchArea);
  nwr["brand"~"${regex}",i](area.searchArea);
  nwr["operator"~"${regex}",i](area.searchArea);
  nwr["description"~"${regex}",i](area.searchArea);
  nwr["shop"~"^(agrarian|trade|hardware)$",i](area.searchArea);
  nwr["craft"~"^(agricultural_engines|mechanic|metal_construction)$",i](area.searchArea);
  nwr["industrial"~"^(machinery|factory)$",i](area.searchArea);
  nwr["office"="company"]["name"~"${regex}",i](area.searchArea);
  nwr["landuse"="farmyard"]["name"~"${regex}",i](area.searchArea);
);
out tags center ${limit};
`;
}

export function mapOsmElementToLead(element, params = {}, terms = getSearchTerms(params.keyword)) {
  const tags = element.tags || {};
  const company = tags.name || tags.operator || tags.brand;

  if (!company) return null;

  const category = getOsmCategory(tags);
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const mapsLink = lat && lon ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}` : "";
  const address = buildAddress(tags);
  const city = tags["addr:city"] || params.city || params.region || "";
  const phone = tags.phone || tags["contact:phone"] || "";
  const website = tags.website || tags["contact:website"] || "";
  const email = tags.email || tags["contact:email"] || "";
  const matchedTerms = getMatchedTerms(tags, company, category, terms);

  return {
    id: createId("osm"),
    company,
    category,
    address,
    city,
    state: params.state || "",
    phone,
    website,
    email,
    rating: "",
    userRatingsTotal: "",
    reviews: 0,
    mapsLink,
    googleMapsUri: "",
    osmType: element.type,
    osmId: element.id,
    osmTags: tags,
    matchedTerms,
    relevance: "unmatched",
    source: "OpenStreetMap",
    status: "Neu",
    tags: [category, city, "OpenStreetMap"].filter(Boolean),
    notes: `OSM/Overpass Treffer. Öffentliche Daten können unvollständig sein. ${matchedTerms.length ? `Match: ${matchedTerms.join(", ")}.` : ""} ${mapsLink ? "OSM-Karte vorhanden." : ""}`.trim()
  };
}

export function isRelevantOsmLead(lead, terms = [], profile = getSearchProfile("")) {
  return classifyOsmLead({ ...lead }, terms, profile).relevance !== "blocked";
}

export function classifyOsmLead(lead, terms = [], profile = getSearchProfile("")) {
  const tags = lead.osmTags || {};
  const strictAgriculture = Boolean(profile.strictAgriculture);

  if (strictAgriculture && hasBlockedCategory(tags)) {
    return withRelevance(lead, "blocked", "blocked-category");
  }

  if (strictAgriculture) {
    const strictMatches = (lead.matchedTerms || []).filter((term) => !isRelatedOnlyTerm(term));
    const agriculturalTagMatches = getStrongAgriculturalMatches(tags);
    if (strictMatches.length || agriculturalTagMatches.length) {
      lead.matchedTerms = mergeTerms(lead.matchedTerms, agriculturalTagMatches);
      return withRelevance(lead, "high");
    }

    const relatedMatches = getRelatedMatches(tags, lead);
    if (relatedMatches.length) {
      lead.matchedTerms = mergeTerms(lead.matchedTerms, relatedMatches);
      return withRelevance(lead, "related", "", "Prüfen");
    }

    return withRelevance(lead, "unmatched", "no-direct-or-related-match", "Prüfen");
  }

  if (lead.matchedTerms?.length) return withRelevance(lead, "high");
  if (hasGenericRelevantTag(tags)) return withRelevance(lead, "related", "", "Prüfen");

  const searchable = normalizeText([
    lead.company,
    lead.category,
    tags.description,
    tags["contact:website"],
    tags.website
  ].join(" "));
  const termHit = terms.some((term) => searchable.includes(normalizeText(term)));

  return termHit
    ? withRelevance(lead, "high")
    : withRelevance(lead, "unmatched", "no-keyword-or-profile-match", "Prüfen");
}

export function getSearchTerms(keyword = "") {
  const profile = getSearchProfile(keyword);
  const rawTerms = profile.id === "default"
    ? [keyword]
    : [...profile.terms, ...(profile.relatedTerms || []), keyword];
  const seen = new Set();

  return rawTerms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm || seen.has(normalizedTerm)) return false;
    seen.add(normalizedTerm);
    return true;
  });
}

export function getSearchProfile(keyword = "") {
  const normalized = normalizeText(keyword);
  return branchProfiles.find((profile) => profile.triggers.some((trigger) => normalized.includes(normalizeText(trigger))))
    || { id: "default", strictAgriculture: false, terms: [] };
}

function hasBlockedCategory(tags) {
  return ["amenity", "shop", "craft", "tourism", "leisure", "office"].some((key) => {
    const value = normalizeText(tags[key]);
    return blockedCategoriesForAgriSearch.has(value);
  });
}

function getStrongAgriculturalMatches(tags) {
  const values = normalizeText(Object.values(tags).join(" "));
  return strictAgriculturalTagTerms.filter((term) => values.includes(normalizeText(term)));
}

function getRelatedMatches(tags, lead) {
  const searchable = normalizeText([
    lead.company,
    lead.category,
    tags.description,
    tags.shop,
    tags.craft,
    tags.office,
    tags.industrial,
    tags.operator,
    tags.brand
  ].join(" "));

  return relatedTagTerms.filter((term) => searchable.includes(normalizeText(term)));
}

function isRelatedOnlyTerm(term) {
  return broadTermsThatNeedAgriculture.has(normalizeText(term)) || relatedTagTerms.some((relatedTerm) => normalizeText(relatedTerm) === normalizeText(term));
}

function withRelevance(lead, relevance, filteredReason = "", status = lead.status || "Neu") {
  return {
    ...lead,
    relevance,
    filteredReason,
    status,
    tags: [relevance === "related" ? "Prüfen" : "", ...(lead.tags || [])].filter(Boolean)
  };
}

function mergeTerms(currentTerms = [], newTerms = []) {
  const seen = new Set();
  return [...currentTerms, ...newTerms].filter((term) => {
    const normalized = normalizeText(term);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function hasGenericRelevantTag(tags) {
  return genericRelevantTagValues.some(([key, value]) => normalizeText(tags[key]) === normalizeText(value));
}

function getMatchedTerms(tags, company, category, terms) {
  const searchable = normalizeText([
    company,
    category,
    tags.description,
    tags.shop,
    tags.craft,
    tags.office,
    tags.industrial,
    tags.operator,
    tags.brand,
    tags.website,
    tags["contact:website"]
  ].join(" "));

  return terms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm && searchable.includes(normalizedTerm);
  });
}

function getOsmCategory(tags, fallback = "Unternehmen") {
  return tags.shop || tags.craft || tags.office || tags.industrial || tags.amenity || tags.landuse || tags.name || fallback;
}

function buildAddress(tags) {
  return [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
    [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ")
  ].filter(Boolean).join(", ");
}

function getLimit(params) {
  return Math.min(Math.max(Number(params.limit) || 10, 1), 50);
}

function buildKeywordControls(terms, leads, blockedLeads = []) {
  const blocked = Array.isArray(blockedLeads) ? blockedLeads : [];
  const profileTerms = new Set(strictAgriculturalTagTerms.map((term) => normalizeText(term)));
  const relatedTerms = new Set(relatedTagTerms.map((term) => normalizeText(term)));

  return {
    terms: terms.map((term) => ({
      term,
      type: relatedTerms.has(normalizeText(term)) ? "related" : "direct",
      active: true,
      count: leads.filter((lead) => (lead.matchedTerms || []).some((matched) => normalizeText(matched) === normalizeText(term))).length
    })).concat([...blockedCategoriesForAgriSearch].map((term) => ({
      term,
      type: "blocked",
      active: false,
      count: blocked.filter((lead) => normalizeText(Object.values(lead.osmTags || {}).join(" ")).includes(normalizeText(term))).length
    }))),
    removedCount: blocked.length,
    rawCount: leads.length + blocked.length,
    relevantCount: leads.filter((lead) => lead.relevance === "high").length,
    relatedCount: leads.filter((lead) => lead.relevance === "related").length,
    unfilteredCount: leads.filter((lead) => lead.relevance === "unmatched").length,
    directTerms: profileTerms.size
  };
}

function escapeOverpassValue(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeOverpassRegex(value) {
  return escapeOverpassValue(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
