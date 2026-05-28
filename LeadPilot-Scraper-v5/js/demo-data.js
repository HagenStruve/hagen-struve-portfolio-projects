import { createId, clamp } from "./utils/helpers.js";

const companyWords = ["Nord", "Hof", "Feld", "Werk", "Regional", "Partner", "Digital", "Pro", "Agro", "Service"];
const streets = ["Hauptstrasse", "Industrieweg", "Am Markt", "Werkstrasse", "Dorfstrasse", "Muehlenweg", "Ringstrasse"];

export function createDemoLeads(params, apiPreparedMode = false) {
  const limit = clamp(Number(params.limit), 3, 50);
  const keyword = params.keyword || "Lead";
  const region = params.region || "Region";
  const state = params.state || "Bundesland";
  const city = params.city || region;
  const categories = [
    keyword,
    `${keyword} Service`,
    `${keyword} Handel`,
    `${keyword} Beratung`,
    `${keyword} Technik`
  ];

  return Array.from({ length: limit }, (_, index) => {
    const word = companyWords[index % companyWords.length];
    const category = categories[index % categories.length];
    const number = 12 + index * 3;
    const hasWebsite = index % 5 !== 3;
    const hasEmail = index % 2 === 0 || index % 7 === 0;
    const hasPhone = index % 6 !== 4;
    const source = apiPreparedMode && params.apiKey ? "Google API vorbereitet" : "Demo";

    return {
      id: createId("lead"),
      company: `${word} ${keyword} ${index + 1}`,
      category,
      address: `${streets[index % streets.length]} ${number}`,
      city: index % 3 === 0 ? city : region,
      state,
      phone: hasPhone ? `+49 ${4300 + index} ${120000 + index * 137}` : "",
      website: hasWebsite ? `https://example-lead-${index + 1}.de` : "",
      email: hasEmail ? `kontakt@lead-${index + 1}.de` : "",
      reviews: 12 + index * 11,
      source,
      status: "Neu",
      tags: [keyword, region, source],
      notes: `Region: ${region}, ${state}. Für LLM-Priorisierung exportierbar.`
    };
  });
}
