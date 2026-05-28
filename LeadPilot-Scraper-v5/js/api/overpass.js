import { createId } from "../utils/helpers.js";

const overpassUrl = "https://overpass-api.de/api/interpreter";
const overpassTimeoutSeconds = 20;

export async function searchOverpassLeads(params) {
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
    const leads = elements
      .map((element) => mapOsmElementToLead(element, params))
      .filter(Boolean)
      .slice(0, getLimit(params));

    if (!leads.length) {
      return {
        leads: [],
        message: "OpenStreetMap hat keine passenden öffentlichen Unternehmensdaten gefunden.",
        usedApi: true
      };
    }

    return {
      leads,
      message: `${leads.length} OpenStreetMap-Leads geladen. Kostenlose OSM-Daten. Telefonnummern/Websites können fehlen.`,
      usedApi: true
    };
  } catch (error) {
    return {
      leads: [],
      message: `OpenStreetMap/Overpass konnte nicht laden: ${error.message || "Netzwerk- oder API-Fehler"}. Bitte später erneut versuchen oder Demo-Modus nutzen.`,
      usedApi: true,
      error
    };
  }
}

export function buildOverpassQuery(params) {
  const areaName = escapeOverpassValue(params.city || params.region || params.state || "Deutschland");
  const keyword = escapeOverpassRegex(params.keyword || "");
  const limit = getLimit(params);
  const keywordFilter = keyword ? `["name"~"${keyword}",i]` : "";

  return `
[out:json][timeout:${overpassTimeoutSeconds}];
area["name"="${areaName}"]["boundary"="administrative"]->.searchArea;
(
  nwr${keywordFilter}(area.searchArea);
  nwr["shop"](area.searchArea);
  nwr["craft"](area.searchArea);
  nwr["office"](area.searchArea);
  nwr["industrial"](area.searchArea);
  nwr["amenity"](area.searchArea);
);
out center tags ${limit};
`;
}

export function mapOsmElementToLead(element, params = {}) {
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
    source: "OpenStreetMap",
    status: "Neu",
    tags: [params.keyword, category, city, "OpenStreetMap"].filter(Boolean),
    notes: `OSM/Overpass Treffer. Öffentliche Daten können unvollständig sein. ${mapsLink ? "OSM-Karte vorhanden." : ""}`.trim()
  };
}

function getOsmCategory(tags, fallback = "Unternehmen") {
  return tags.shop || tags.craft || tags.office || tags.industrial || tags.amenity || tags.name || fallback;
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
