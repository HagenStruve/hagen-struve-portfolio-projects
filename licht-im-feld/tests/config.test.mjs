import { validateJourneyConfig, chapters, backgroundImages } from "../src/journeyData.js";

const result = validateJourneyConfig();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(result.hasSixChapters, "Die Reise sollte genau 6 Kapitel haben.");
assert(result.hasUniqueIds, "Alle Kapitel brauchen eindeutige IDs.");
assert(result.hasSeoTitle, "SEO-Titel fehlt oder ist zu kurz.");
assert(result.hasSeoDescription, "SEO-Beschreibung fehlt oder ist zu kurz.");
assert(result.everyChapterHasImage, "Jedes Kapitel braucht ein Hintergrundbild.");
assert(result.everyChapterHasVerse, "Jedes Kapitel braucht Bibelvers und Referenz.");

for (const chapter of chapters) {
  assert(backgroundImages[chapter.id].startsWith("/images/"), `Bildpfad für ${chapter.id} muss in /images/ liegen.`);
}

console.log("Alle Konfigurations-Tests bestanden.");
