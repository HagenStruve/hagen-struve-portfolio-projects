export async function fetchGooglePlacesLeads(params) {
  // Placeholder for a later Google Places/Maps API adapter.
  // Intentionally no scraping and no protective-mechanism bypassing.
  // A production version should map official API responses into the internal lead model.
  // The API key must stay local or be handled by a secure backend proxy, never hardcoded.
  return {
    enabled: false,
    leads: [],
    message: params.apiKey
      ? "Google Places API ist architektonisch vorbereitet. In dieser statischen MVP-Version wird keine externe Anfrage gesendet."
      : "Kein API-Key gesetzt. Demo-Modus bleibt aktiv."
  };
}
