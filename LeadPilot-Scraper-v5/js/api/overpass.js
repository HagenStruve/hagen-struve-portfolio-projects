import { createId, normalizeText } from "../utils/helpers.js";

const overpassUrl = "https://overpass-api.de/api/interpreter";
const overpassTimeoutSeconds = 20;

const blockedCategoriesForAgriSearch = new Set([
  "bicycle",
  "mobile_phone",
  "metal_construction",
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
      "trecker",
      "landmaschinenhandel",
      "landmaschinenwerkstatt",
      "hoftechnik",
      "guelletechnik",
      "gülletechnik",
      "erntetechnik",
      "melktechnik",
      "lohnunternehmen",
      "agrarservice"
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
    const relevantLeads = mappedLeads.filter((lead) => isRelevantOsmLead(lead, terms, profile));
    const leads = relevantLeads.slice(0, getLimit(params));
    const keywordControls = buildKeywordControls(terms, relevantLeads, mappedLeads.length - relevantLeads.length);

    if (!leads.length) {
      return {
        leads: [],
        keywordControls,
        message: "Keine passenden OSM-Treffer gefunden. OSM-Daten sind je nach Branche unvollständig. Versuche andere Begriffe wie Landmaschinen, Agrartechnik, Agrarservice oder nutze Google Places.",
        usedApi: true
      };
    }

    return {
      leads,
      keywordControls,
      message: `${leads.length} relevante OpenStreetMap-Leads geladen. ${keywordControls.removedCount} irrelevante Treffer entfernt. Kostenlose OSM-Daten. Telefonnummern/Websites können fehlen.`,
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
  nwr["craft"~"^(agricultural_engines|mechanic)$",i](area.searchArea);
  nwr["industrial"~"^(machinery)$",i](area.searchArea);
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
    source: "OpenStreetMap",
    status: "Neu",
    tags: [category, city, "OpenStreetMap"].filter(Boolean),
    notes: `OSM/Overpass Treffer. Öffentliche Daten können unvollständig sein. ${matchedTerms.length ? `Match: ${matchedTerms.join(", ")}.` : ""} ${mapsLink ? "OSM-Karte vorhanden." : ""}`.trim()
  };
}

export function isRelevantOsmLead(lead, terms = [], profile = getSearchProfile("")) {
  const tags = lead.osmTags || {};
  const strictAgriculture = Boolean(profile.strictAgriculture);

  if (strictAgriculture && hasBlockedCategory(tags)) {
    lead.filteredReason = "blocked-category";
    return false;
  }

  if (strictAgriculture) {
    const strictMatches = (lead.matchedTerms || []).filter((term) => !broadTermsThatNeedAgriculture.has(normalizeText(term)));
    if (strictMatches.length) return true;

    if (hasStrongAgriculturalTag(tags)) return true;

    lead.filteredReason = "no-agricultural-match";
    return false;
  }

  if (lead.matchedTerms?.length) return true;
  if (hasGenericRelevantTag(tags)) return true;

  const searchable = normalizeText([
    lead.company,
    lead.category,
    tags.description,
    tags["contact:website"],
    tags.website
  ].join(" "));
  const termHit = terms.some((term) => searchable.includes(normalizeText(term)));

  if (!termHit) lead.filteredReason = "no-keyword-or-profile-match";
  return termHit;
}

export function getSearchTerms(keyword = "") {
  const profile = getSearchProfile(keyword);
  const rawTerms = profile.id === "default"
    ? [keyword]
    : [...profile.terms, keyword];
  const seen = new Set();

  return rawTerms.filter((term) => {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm || seen.has(normalizedTerm)) return false;
    if (profile.id === "landtechnik" && broadTermsThatNeedAgriculture.has(normalizedTerm)) return false;

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

function hasStrongAgriculturalTag(tags) {
  const values = normalizeText(Object.values(tags).join(" "));
  return strictAgriculturalTagTerms.some((term) => values.includes(normalizeText(term)));
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

function buildKeywordControls(terms, leads, removedCount) {
  return {
    terms: terms.map((term) => ({
      term,
      active: true,
      count: leads.filter((lead) => (lead.matchedTerms || []).some((matched) => normalizeText(matched) === normalizeText(term))).length
    })),
    removedCount: Math.max(removedCount, 0),
    rawCount: leads.length + Math.max(removedCount, 0),
    relevantCount: leads.length
  };
}

function escapeOverpassValue(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeOverpassRegex(value) {
  return escapeOverpassValue(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
