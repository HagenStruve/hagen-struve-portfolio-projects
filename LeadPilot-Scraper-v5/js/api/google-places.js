import { createId } from "../utils/helpers.js";

const placesTextSearchUrl = "https://places.googleapis.com/v1/places:searchText";
const fieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.businessStatus"
].join(",");

export async function searchGooglePlaces(params) {
  if (!params.apiKey) {
    return {
      leads: [],
      message: "Für Google Places wird ein API-Key benötigt. Alternativ kann OpenStreetMap kostenlos genutzt werden.",
      usedApi: false
    };
  }

  const requestBody = {
    textQuery: buildPlacesQuery(params),
    languageCode: "de",
    regionCode: "DE",
    maxResultCount: Math.min(Math.max(Number(params.limit) || 10, 1), 20)
  };

  try {
    const response = await fetch(placesTextSearchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": params.apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw await createGooglePlacesError(response);
    }

    const payload = await response.json();
    const places = Array.isArray(payload.places) ? payload.places : [];

    if (!places.length) {
      return {
        leads: [],
        message: "Google Places hat keine passenden Unternehmen gefunden.",
        usedApi: true
      };
    }

    return {
      leads: places.map((place) => mapGooglePlaceToLead(place, params)),
      message: `${places.length} echte Google-Places-Leads geladen.`,
      usedApi: true
    };
  } catch (error) {
    return {
      leads: [],
      message: getReadableApiError(error),
      usedApi: true,
      error
    };
  }
}

export function buildPlacesQuery(params) {
  return [
    params.keyword,
    params.city,
    params.region,
    params.state,
    "Deutschland"
  ].filter(Boolean).join(" ");
}

export function mapGooglePlaceToLead(place, params = {}) {
  const displayName = place.displayName?.text || "Unbekanntes Unternehmen";
  const category = place.primaryTypeDisplayName?.text || normalizePlaceType(place.primaryType) || params.keyword || "Unternehmen";
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";
  const rating = Number(place.rating) || 0;
  const userRatingsTotal = Number(place.userRatingCount) || 0;
  const city = extractCity(place.formattedAddress) || params.city || params.region || "";

  return {
    id: createId("google"),
    company: displayName,
    category,
    address: place.formattedAddress || "",
    city,
    state: params.state || "",
    phone,
    website: place.websiteUri || "",
    email: "",
    rating,
    userRatingsTotal,
    reviews: userRatingsTotal,
    googleMapsUri: place.googleMapsUri || "",
    mapsLink: place.googleMapsUri || "",
    googlePlaceId: place.id || "",
    businessStatus: place.businessStatus || "",
    source: "Google Places",
    status: "Neu",
    tags: [params.keyword, category, city, "Google Places"].filter(Boolean),
    notes: `Google Places Treffer für "${buildPlacesQuery(params)}". Rating: ${rating || "-"}, Bewertungen: ${userRatingsTotal || 0}.`
  };
}

async function createGooglePlacesError(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const status = payload?.error?.status || response.status;
  const message = payload?.error?.message || response.statusText || "Unbekannter Google-Places-Fehler";
  const error = new Error(message);
  error.googleStatus = status;
  error.httpStatus = response.status;
  return error;
}

function getReadableApiError(error) {
  if (error.googleStatus === "API_KEY_INVALID" || error.googleStatus === "PERMISSION_DENIED" || error.httpStatus === 403) {
    return "Google Places konnte nicht laden: API-Key ungültig, eingeschränkt oder Places API nicht freigeschaltet.";
  }

  if (error.googleStatus === "RESOURCE_EXHAUSTED" || error.httpStatus === 429) {
    return "Google Places Quota erreicht oder Rate Limit überschritten.";
  }

  if (error instanceof TypeError) {
    return "Google Places Anfrage wurde blockiert oder ist fehlgeschlagen. Prüfe CORS, Netzwerk und API-Key-Einschränkungen. Für Produktion kann ein sicherer Backend-Proxy nötig sein.";
  }

  return `Google Places Fehler: ${error.message || "Unbekannter Fehler"}`;
}

function normalizePlaceType(type) {
  return String(type || "").replaceAll("_", " ").trim();
}

function extractCity(formattedAddress = "") {
  const parts = formattedAddress.split(",").map((part) => part.trim()).filter(Boolean);
  const postalCity = parts.find((part) => /\b\d{5}\b/.test(part));
  if (!postalCity) return "";
  return postalCity.replace(/\b\d{5}\b/, "").trim();
}
