import { hasValue, normalizeText } from "./utils/helpers.js";

export function scoreLead(lead, keyword = "") {
  let score = 35;
  const reasons = [];
  const keywordHit = normalizeText(lead.category).includes(normalizeText(keyword))
    || normalizeText(lead.company).includes(normalizeText(keyword));

  if (hasValue(lead.website)) {
    score += 20;
    reasons.push("Website vorhanden");
  } else {
    score -= 15;
    reasons.push("Website fehlt");
  }

  if (hasValue(lead.phone)) {
    score += 15;
    reasons.push("Telefon vorhanden");
  } else {
    score -= 15;
    reasons.push("Telefon fehlt");
  }

  if (hasValue(lead.address)) {
    score += 10;
    reasons.push("Adresse vorhanden");
  }

  if (keywordHit) {
    score += 20;
    reasons.push("Kategorie passt zum Suchbegriff");
  }

  const ratingsCount = Number(lead.userRatingsTotal || lead.reviews || 0);
  if (ratingsCount >= 50) {
    score += 10;
    reasons.push("Viele Bewertungen vorbereitet");
  }

  if (Number(lead.rating) >= 4.3) {
    score += 8;
    reasons.push("Gutes Google Rating");
  }

  if (hasValue(lead.email)) {
    score += 15;
    reasons.push("E-Mail vorhanden");
  } else {
    score -= 8;
    reasons.push("E-Mail fehlt");
  }

  if (lead.relevance === "high") {
    score = Math.max(score + 35, 75);
    reasons.push("Direkter OSM-Branchenmatch");
  }

  if (lead.relevance === "related") {
    score = Math.max(score, 40);
    score = Math.min(score, 60);
    reasons.push("Verwandter OSM-Treffer: manuell prüfen");
  }

  if (lead.relevance === "unmatched") {
    score = Math.min(score, 45);
    reasons.push("Unsicherer OSM-Treffer");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    priority: lead.relevance === "high" ? "high" : lead.relevance === "related" ? "related" : getPriority(score),
    scoreReasons: reasons
  };
}

export function getPriority(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}
