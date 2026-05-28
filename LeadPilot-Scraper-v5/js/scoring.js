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

  if (keywordHit) {
    score += 20;
    reasons.push("Kategorie passt zum Suchbegriff");
  }

  if (Number(lead.reviews) >= 50) {
    score += 10;
    reasons.push("Viele Bewertungen vorbereitet");
  }

  if (hasValue(lead.email)) {
    score += 15;
    reasons.push("E-Mail vorhanden");
  } else {
    score -= 8;
    reasons.push("E-Mail fehlt");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    priority: getPriority(score),
    scoreReasons: reasons
  };
}

export function getPriority(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}
