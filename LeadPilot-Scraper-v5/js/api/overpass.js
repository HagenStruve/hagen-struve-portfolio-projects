import { createId, normalizeText } from "../utils/helpers.js";

const overpassUrl = "https://overpass-api.de/api/interpreter";
const overpassTimeoutSeconds = 20;
const blockedCategoriesForAgriSearch = new Set([
  "pharmacy",
  "restaurant",
  "cafe",
  "school",
  "kindergarten",
  "supermarket",
  "bakery",
  "hairdresser",
  "dentist",
  "doctor",
  "fast_food",
  "bank",
  "clothes",
  "hotel",
  "tourism",
  "leisure"
]);

const branchProfiles = [
  {
    triggers: ["landtechnik", "agrartechnik", "landmaschinen"],
    terms: [
      "landtechnik",
      "landmaschinen",
      "agrartechnik",
      "landmaschinenhandel",
      "maschinenhandel",
      "maschinenbau",
      "werkstatt",
      "traktoren",
      "trecker",
      "landwirtschaft",
      "lohnunternehmen",
      "agrar",
      "motorgeräte",
      "hoftechnik"
    ]
  },
  {
    triggers: ["lohnunternehmen"],
    terms: [
      "lohnunternehmen",
      "agrarservice",
      "landwirtschaftlicher dienstleister",
      "maschinenring",
      "häckseln",
      "gülle",
      "silage",
      "ernte"
    ]
  },
  {
    triggers: ["werkstatt"],
    terms: [
      "werkstatt",
      "reparatur",
      "landmaschinenwerkstatt",
      "motorgeräte",
      "service",
      "technik"
    ]
  }
];

const relevantTagValues = [
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
  const isStrictSearch = isAgriculturalTechnicalSearch(params.keyword);

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
    const leads = elements
      .map((element) => mapOsmElementToLead(element, params, terms))
      .filter((lead) => lead && isRelevantOsmLead(lead, terms, isStrictSearch))
      .slice(0, getLimit(params));

    if (!leads.length) {
      return {
        leads: [],
        message: "OSM-Daten liefern für diese Branche evtl. wenige Treffer. Versuche Synonyme wie Landmaschinen, Agrartechnik, Werkstatt oder nutze Google Places.",
        usedApi: true
      };
    }

    return {
      leads,
      message: `${leads.length} relevante OpenStreetMap-Leads geladen. Kostenlose OSM-Daten. Telefonnummern/Websites können fehlen.`,
      usedApi: true
    };
  } catch (error) {
    return {
      leads: [],
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
  nwr["shop"~"^(trade|hardware|agrarian)$",i](area.searchArea);
  nwr["craft"~"^(agricultural_engines|mechanic|metal_construction|electronics_repair)$",i](area.searchArea);
  nwr["industrial"~"^(factory|machinery)$",i](area.searchArea);
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

  const category = getOsmCategory(tags, params.keyword);
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
    tags: [params.keyword, category, city, "OpenStreetMap"].filter(Boolean),
    notes: `OSM/Overpass Treffer. Öffentliche Daten können unvollständig sein. ${matchedTerms.length ? `Match: ${matchedTerms.join(", ")}.` : ""} ${mapsLink ? "OSM-Karte vorhanden." : ""}`.trim()
  };
}

export function isRelevantOsmLead(lead, terms = [], strict = true) {
  const tags = lead.osmTags || {};

  if (strict && hasBlockedCategory(tags)) {
    lead.filteredReason = "blocked-category";
    return false;
  }

  if (lead.matchedTerms?.length) return true;

  if (hasRelevantTag(tags)) return true;

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
  const normalized = normalizeText(keyword);
  const terms = new Set([keyword].filter(Boolean));

  branchProfiles.forEach((profile) => {
    if (profile.triggers.some((trigger) => normalized.includes(trigger))) {
      profile.terms.forEach((term) => terms.add(term));
    }
  });

  return [...terms].filter(Boolean);
}

function isAgriculturalTechnicalSearch(keyword = "") {
  const normalized = normalizeText(keyword);
  return ["landtechnik", "lohnunternehmen", "agrartechnik", "werkstatt"].some((term) => normalized.includes(term));
}

function hasBlockedCategory(tags) {
  return ["amenity", "shop", "craft", "tourism", "leisure", "office"].some((key) => {
    const value = normalizeText(tags[key]);
    return blockedCategoriesForAgriSearch.has(value);
  });
}

function hasRelevantTag(tags) {
  return relevantTagValues.some(([key, value]) => normalizeText(tags[key]) === value);
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

  return terms.filter((term) => searchable.includes(normalizeText(term)));
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

function escapeOverpassValue(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeOverpassRegex(value) {
  return escapeOverpassValue(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
