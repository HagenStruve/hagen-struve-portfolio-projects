import { createId, normalizeText } from "../utils/helpers.js";

const overpassUrl = "https://overpass-api.de/api/interpreter";
const overpassTimeoutSeconds = 20;

const INDUSTRY_PROFILES = {
  landtechnik: {
    label: "Landtechnik",
    triggers: ["landtechnik", "landmaschinen", "agrartechnik", "traktor", "trecker", "lohnunternehmen", "agrarservice"],
    direct: [
      "landtechnik",
      "landmaschinen",
      "agrartechnik",
      "agrar",
      "agrarservice",
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
      "agricultural_machinery",
      "farm_equipment"
    ],
    related: [
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
    ],
    blocked: ["pharmacy", "restaurant", "cafe", "school", "kindergarten", "supermarket", "bakery", "hairdresser", "dentist", "doctor", "fast_food", "bank", "clothes", "hotel", "tourism", "leisure", "mobile_phone", "bicycle", "pet"]
  },
  kosmetik: {
    label: "Kosmetik / Nagelstudio",
    triggers: ["nagellack", "nagelstudio", "kosmetik", "kosmetiker", "beauty"],
    direct: ["nagelstudio", "nagellack", "nails", "nail", "manicure", "maniküre", "kosmetik", "kosmetikstudio", "beauty"],
    related: ["spa", "wellness", "salon", "beauty_salon", "pedicure", "pediküre", "massage", "makeup", "skin_care", "friseur", "hairdresser"],
    blocked: ["pharmacy", "restaurant", "school", "kindergarten", "supermarket", "bakery", "dentist", "doctor", "fast_food", "bank", "hotel", "tourism", "bicycle", "mobile_phone", "car_repair"]
  },
  friseur: {
    label: "Friseur",
    triggers: ["friseur", "friseursalon", "hairdresser", "barber"],
    direct: ["friseur", "friseursalon", "hairdresser", "barber", "haarsalon", "salon", "hair"],
    related: ["beauty", "kosmetik", "wellness", "styling", "makeup"],
    blocked: ["pharmacy", "restaurant", "school", "kindergarten", "supermarket", "bakery", "dentist", "doctor", "fast_food", "bank", "hotel", "tourism", "bicycle", "mobile_phone", "car_repair"]
  },
  gastronomie: {
    label: "Gastronomie",
    triggers: ["restaurant", "gastronomie", "cafe", "bar", "imbiss", "bistro", "hotel"],
    direct: ["restaurant", "gastronomie", "cafe", "bar", "pub", "bistro", "fast_food", "imbiss", "hotel", "biergarten", "catering"],
    related: ["bakery", "konditorei", "food", "takeaway", "kitchen", "eventlocation"],
    blocked: ["pharmacy", "school", "kindergarten", "dentist", "doctor", "bank", "bicycle", "mobile_phone", "car_repair"]
  },
  handwerk: {
    label: "Handwerk",
    triggers: ["handwerk", "maler", "sanitär", "sanitaer", "elektriker", "installateur", "tischler", "zimmerei", "bau"],
    direct: ["handwerk", "craft", "maler", "painter", "sanitär", "sanitaer", "plumber", "elektriker", "electrician", "installateur", "tischler", "carpenter", "zimmerei", "construction"],
    related: ["bauunternehmen", "contractor", "building", "renovierung", "repair", "maintenance", "hardware", "trade"],
    blocked: ["pharmacy", "restaurant", "cafe", "school", "kindergarten", "supermarket", "bakery", "hairdresser", "dentist", "doctor", "fast_food", "bank", "hotel", "tourism", "bicycle", "mobile_phone"]
  },
  dachdecker: {
    label: "Handwerk / Dachdecker",
    triggers: ["dachdecker", "roofing", "roofer"],
    direct: ["dachdecker", "roofing", "roofer", "dachbau", "bedachung", "dachsanierung"],
    related: ["zimmerei", "carpenter", "construction", "bauunternehmen", "spengler", "klempner", "solar", "photovoltaik"],
    blocked: ["pharmacy", "restaurant", "cafe", "school", "kindergarten", "supermarket", "bakery", "hairdresser", "dentist", "doctor", "fast_food", "bank", "hotel", "tourism", "bicycle", "mobile_phone"]
  },
  solar: {
    label: "Solar / Photovoltaik",
    triggers: ["solar", "photovoltaik", "pv", "solarteur", "energie"],
    direct: ["solar", "photovoltaik", "photovoltaic", "pv", "solarteur", "solar_energy", "solaranlage", "energieberatung", "renewable"],
    related: ["elektriker", "electrician", "energy", "roofing", "dachdecker", "engineering", "installation", "building_services"],
    blocked: ["pharmacy", "restaurant", "cafe", "school", "kindergarten", "supermarket", "bakery", "hairdresser", "dentist", "doctor", "fast_food", "bank", "hotel", "tourism", "bicycle", "mobile_phone"]
  },
  immobilien: {
    label: "Immobilien",
    triggers: ["immobilien", "makler", "hausverwaltung", "real estate", "property"],
    direct: ["immobilien", "makler", "immobilienmakler", "real_estate", "real estate", "estate_agent", "property", "hausverwaltung", "property_management"],
    related: ["versicherung", "finance", "bank", "notar", "construction", "building", "architecture"],
    blocked: ["pharmacy", "restaurant", "cafe", "school", "kindergarten", "supermarket", "bakery", "hairdresser", "dentist", "doctor", "fast_food", "hotel", "tourism", "bicycle", "mobile_phone"]
  },
  werkstatt: {
    label: "Werkstatt / KFZ",
    triggers: ["werkstatt", "kfz", "autohaus", "autoreparatur", "reifen", "mechanic"],
    direct: ["werkstatt", "kfz", "autohaus", "autoreparatur", "car_repair", "mechanic", "garage", "reifen", "tyres", "autoservice"],
    related: ["motor", "service", "maintenance", "repair", "trade", "parts", "spare_parts"],
    blocked: ["pharmacy", "restaurant", "cafe", "school", "kindergarten", "supermarket", "bakery", "hairdresser", "dentist", "doctor", "fast_food", "bank", "hotel", "tourism", "bicycle", "mobile_phone"]
  }
};

const fallbackSynonyms = {
  "bäckerei": ["bäckerei", "baeckerei", "bakery", "konditorei", "backshop"],
  "baeckerei": ["baeckerei", "bäckerei", "bakery", "konditorei", "backshop"],
  "friseur": ["friseur", "friseursalon", "hairdresser", "barber", "salon"],
  "dachdecker": INDUSTRY_PROFILES.handwerk.direct,
  "solar": INDUSTRY_PROFILES.solar.direct,
  "immobilien": INDUSTRY_PROFILES.immobilien.direct
};

const genericTagValues = [
  ["shop", "trade"],
  ["shop", "hardware"],
  ["shop", "beauty"],
  ["shop", "hairdresser"],
  ["shop", "agrarian"],
  ["craft", "mechanic"],
  ["craft", "metal_construction"],
  ["craft", "electrician"],
  ["craft", "roofer"],
  ["craft", "painter"],
  ["office", "company"],
  ["office", "estate_agent"],
  ["industrial", "factory"],
  ["industrial", "machinery"],
  ["amenity", "restaurant"],
  ["amenity", "cafe"],
  ["landuse", "farmyard"]
];

export async function searchOverpassLeads(params) {
  const profile = getSearchProfile(params.keyword);
  const terms = getSearchTerms(params.keyword);
  const query = buildOverpassQuery(params);

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
    const keywordControls = buildKeywordControls(profile, terms, leads, blockedLeads);

    if (!leads.length) {
      return {
        leads: [],
        keywordControls,
        message: "Keine passenden OSM-Treffer gefunden. OSM ist je nach Branche unvollständig. Versuche andere Begriffe oder nutze Google Places.",
        usedApi: true
      };
    }

    const relevanceMessage = highCount
      ? `${highCount} direkte Treffer und ${relatedCount} verwandte Betriebe geladen.`
      : `Keine direkten ${profile.label}-Treffer gefunden. Es werden verwandte Betriebe angezeigt, die du prüfen kannst.`;

    return {
      leads,
      keywordControls,
      message: `${relevanceMessage} ${keywordControls.removedCount} blockierte OSM-Treffer entfernt. Aktives Profil: ${profile.label}.`,
      usedApi: true
    };
  } catch (error) {
    return {
      leads: [],
      keywordControls: buildKeywordControls(profile, terms, [], []),
      message: `OpenStreetMap/Overpass konnte nicht laden: ${error.message || "Netzwerk- oder API-Fehler"}. Bitte später erneut versuchen oder Suchparameter anpassen.`,
      usedApi: true,
      error
    };
  }
}

export function buildOverpassQuery(params) {
  const areaName = escapeOverpassValue(params.city || params.region || params.state || "Deutschland");
  const terms = getSearchTerms(params.keyword);
  const regex = terms.map((term) => escapeOverpassRegex(term)).join("|") || escapeOverpassRegex(params.keyword || "Firma");
  const limit = Math.max(getLimit(params) * 6, 30);

  return `
[out:json][timeout:${overpassTimeoutSeconds}];
area["name"="${areaName}"]["boundary"="administrative"]->.searchArea;
(
  nwr["name"~"${regex}",i](area.searchArea);
  nwr["brand"~"${regex}",i](area.searchArea);
  nwr["operator"~"${regex}",i](area.searchArea);
  nwr["description"~"${regex}",i](area.searchArea);
  nwr["shop"~"${regex}",i](area.searchArea);
  nwr["craft"~"${regex}",i](area.searchArea);
  nwr["office"~"${regex}",i](area.searchArea);
  nwr["amenity"~"${regex}",i](area.searchArea);
  nwr["industrial"~"${regex}",i](area.searchArea);
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
  const blockedMatches = findTermMatches(tags, lead, profile.blocked);

  if (blockedMatches.length) {
    lead.matchedTerms = mergeTerms(lead.matchedTerms, blockedMatches);
    return withRelevance(lead, "blocked", "blocked-category");
  }

  const directMatches = findTermMatches(tags, lead, profile.direct);
  if (directMatches.length) {
    lead.matchedTerms = mergeTerms(lead.matchedTerms, directMatches);
    return withRelevance(lead, "high");
  }

  const relatedMatches = findTermMatches(tags, lead, profile.related);
  if (relatedMatches.length) {
    lead.matchedTerms = mergeTerms(lead.matchedTerms, relatedMatches);
    return withRelevance(lead, "related", "", "Prüfen");
  }

  if (profile.id === "default" && lead.matchedTerms?.length) {
    return withRelevance(lead, "high");
  }

  if (profile.id === "default" && hasGenericRelevantTag(tags)) {
    return withRelevance(lead, "related", "", "Prüfen");
  }

  return withRelevance(lead, "unmatched", "no-profile-match", "Prüfen");
}

export function getSearchTerms(keyword = "") {
  const profile = getSearchProfile(keyword);
  const rawTerms = profile.id === "default"
    ? buildFallbackDirectTerms(keyword)
    : [...profile.direct, ...profile.related, keyword];

  return uniqueTerms(rawTerms);
}

export function getSearchProfile(keyword = "") {
  const normalized = normalizeText(keyword);
  const match = Object.entries(INDUSTRY_PROFILES).find(([, profile]) => (
    profile.triggers.some((trigger) => normalized.includes(normalizeText(trigger)))
  ));

  if (match) {
    const [id, profile] = match;
    return {
      id,
      label: profile.label,
      direct: uniqueTerms(profile.direct),
      related: uniqueTerms(profile.related),
      blocked: uniqueTerms(profile.blocked)
    };
  }

  return {
    id: "default",
    label: "Allgemeines Profil",
    direct: buildFallbackDirectTerms(keyword),
    related: [],
    blocked: []
  };
}

function buildFallbackDirectTerms(keyword = "") {
  const normalized = normalizeText(keyword);
  const known = fallbackSynonyms[normalized];

  return uniqueTerms(known || [keyword]);
}

function findTermMatches(tags, lead, terms = []) {
  const searchable = normalizeText([
    lead.company,
    lead.category,
    tags.description,
    tags.shop,
    tags.craft,
    tags.office,
    tags.amenity,
    tags.industrial,
    tags.tourism,
    tags.leisure,
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

function hasGenericRelevantTag(tags) {
  return genericTagValues.some(([key, value]) => normalizeText(tags[key]) === normalizeText(value));
}

function getMatchedTerms(tags, company, category, terms) {
  return findTermMatches(tags, { company, category }, terms);
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
  return uniqueTerms([...currentTerms, ...newTerms]);
}

function uniqueTerms(terms = []) {
  const seen = new Set();
  return terms.filter((term) => {
    const normalized = normalizeText(term);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function getOsmCategory(tags, fallback = "Unternehmen") {
  return tags.shop || tags.craft || tags.office || tags.industrial || tags.amenity || tags.tourism || tags.leisure || tags.landuse || tags.name || fallback;
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

function buildKeywordControls(profile, terms, leads, blockedLeads = []) {
  const blocked = Array.isArray(blockedLeads) ? blockedLeads : [];
  const directTerms = new Set(profile.direct.map((term) => normalizeText(term)));
  const relatedTerms = new Set(profile.related.map((term) => normalizeText(term)));

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    terms: terms.map((term) => ({
      term,
      type: relatedTerms.has(normalizeText(term)) ? "related" : "direct",
      active: true,
      count: leads.filter((lead) => (lead.matchedTerms || []).some((matched) => normalizeText(matched) === normalizeText(term))).length
    })).concat(profile.blocked.map((term) => ({
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
    directTerms: directTerms.size
  };
}

function escapeOverpassValue(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeOverpassRegex(value) {
  return escapeOverpassValue(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
