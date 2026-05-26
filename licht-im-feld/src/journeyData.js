export const seoData = {
  title: "Licht im Feld – Eine stille Reise zu Jesus",
  description:
    "Eine ruhige interaktive Erlebniswebseite über Jesus, Hoffnung, Vergebung und Frieden – erzählt durch Felder, Dunkelheit, Licht und Neuanfang.",
  keywords: [
    "Jesus",
    "Glaube",
    "Hoffnung",
    "Vergebung",
    "Frieden",
    "christliche Erlebniswebseite",
    "Licht im Feld",
    "Jesus online erleben",
    "interaktive Reise",
    "Sinnsuche",
    "Gott kennenlernen",
  ],
};

export const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: seoData.title,
  alternateName: "Licht im Feld",
  description: seoData.description,
  inLanguage: "de-DE",
  about: ["Jesus Christus", "Hoffnung", "Glaube", "Vergebung", "Frieden"],
  audience: {
    "@type": "Audience",
    audienceType: "Menschen auf der Suche nach Hoffnung, Sinn, Glauben und innerem Frieden",
  },
};

export const chapters = [
  {
    id: "ruhe",
    iconKey: "moon",
    kicker: "Kapitel 1 · Die Stille",
    title: "Du musst nicht erst leisten, um geliebt zu sein.",
    text:
      "Manche Wege sind dunkel. Manche Herzen sind müde. Diese Reise beginnt nicht mit Druck. Sie beginnt mit Ruhe.",
    verse: "Kommt her zu mir, alle, die ihr mühselig und beladen seid; ich will euch erquicken.",
    ref: "Matthäus 11,28",
    cta: "Weiter in die Dunkelheit",
    mood: "linear-gradient(135deg, #020617, #111827 40%, #000 100%)",
    glow: "rgba(129,140,248,.42)",
    visual: "stars",
  },
  {
    id: "verloren",
    iconKey: "waves",
    kicker: "Kapitel 2 · Der Weg",
    title: "Manchmal merkt man im Stillstand, dass man sich verlaufen hat.",
    text:
      "Nicht jeder verlorene Mensch sieht verloren aus. Manche funktionieren. Und doch fehlt innen etwas, das kein Erfolg füllen kann.",
    verse: "Der Menschensohn ist gekommen, zu suchen und selig zu machen, was verloren ist.",
    ref: "Lukas 19,10",
    cta: "Dem Licht folgen",
    mood: "linear-gradient(135deg, #020617, #083344 50%, #064e3b 100%)",
    glow: "rgba(103,232,249,.35)",
    visual: "path",
  },
  {
    id: "schuld",
    iconKey: "leaf",
    kicker: "Kapitel 3 · Die Last",
    title: "Vergebung wird nicht verdient. Sie wird empfangen.",
    text:
      "Schuld kann schwer werden. Jesus begegnete Menschen nicht mit kalter Verachtung, sondern mit Wahrheit, die frei macht.",
    verse: "Deine Sünden sind dir vergeben.",
    ref: "Lukas 7,48",
    cta: "Die Last loslassen",
    mood: "linear-gradient(135deg, #0c0a09, #18181b 45%, #451a03 100%)",
    glow: "rgba(252,211,77,.32)",
    visual: "burden",
  },
  {
    id: "kreuz",
    iconKey: "cross",
    kicker: "Kapitel 4 · Das Kreuz",
    title: "Gottes Liebe wurde sichtbar.",
    text:
      "Am Kreuz bleibt Gott nicht fern vom Schmerz der Welt. Er kommt hinein. Er trägt. Er vergibt. Er öffnet einen Weg.",
    verse: "So sehr hat Gott die Welt geliebt, dass er seinen eingeborenen Sohn gab.",
    ref: "Johannes 3,16",
    cta: "In den Morgen gehen",
    mood: "linear-gradient(135deg, #000, #4c0519 55%, #7c2d12 100%)",
    glow: "rgba(253,164,175,.35)",
    visual: "cross",
  },
  {
    id: "neu",
    iconKey: "sun",
    kicker: "Kapitel 5 · Der Morgen",
    title: "Glaube kann ein neuer Anfang sein.",
    text:
      "Jesus ruft nicht zuerst in ein System, sondern in Beziehung: Folge mir. Schritt für Schritt. Mit Hoffnung.",
    verse: "Ich bin das Licht der Welt. Wer mir nachfolgt, wird nicht wandeln in der Finsternis.",
    ref: "Johannes 8,12",
    cta: "Antwort geben",
    mood: "linear-gradient(135deg, #431407, #075985 50%, #065f46 100%)",
    glow: "rgba(254,240,138,.45)",
    visual: "sunrise",
  },
  {
    id: "antwort",
    iconKey: "heart",
    kicker: "Deine Antwort",
    title: "Du musst nicht alles verstehen, um ehrlich zu Gott zu kommen.",
    text:
      "Vielleicht reicht für heute ein ehrliches Gebet: Jesus, wenn du da bist, zeig dich mir. Führe mich. Ich möchte dich kennenlernen.",
    verse: "Wer zu mir kommt, den werde ich nicht hinausstoßen.",
    ref: "Johannes 6,37",
    cta: "Reise neu starten",
    mood: "linear-gradient(135deg, #064e3b, #0f172a 50%, #312e81 100%)",
    glow: "rgba(110,231,183,.35)",
    visual: "home",
  },
];

export const sceneThemes = {
  ruhe: { overlay: "rgba(99,102,241,.12)" },
  verloren: { overlay: "rgba(34,211,238,.12)" },
  schuld: { overlay: "rgba(251,191,36,.10)" },
  kreuz: { overlay: "rgba(244,63,94,.12)" },
  neu: { overlay: "rgba(253,224,71,.12)" },
  antwort: { overlay: "rgba(16,185,129,.12)" },
};

export const backgroundImages = {
  ruhe: "/images/stille.webp",
  verloren: "/images/weg.webp",
  schuld: "/images/schuld.webp",
  kreuz: "/images/kreuz.webp",
  neu: "/images/neu.webp",
  antwort: "/images/antwort.webp",
};

export function validateJourneyConfig() {
  const ids = chapters.map((chapter) => chapter.id);
  const uniqueIds = new Set(ids);

  return {
    hasSixChapters: chapters.length === 6,
    hasUniqueIds: uniqueIds.size === chapters.length,
    hasSeoTitle: typeof seoData.title === "string" && seoData.title.length > 10,
    hasSeoDescription:
      typeof seoData.description === "string" && seoData.description.length > 40,
    everyChapterHasImage: chapters.every((chapter) => Boolean(backgroundImages[chapter.id])),
    everyChapterHasVerse: chapters.every((chapter) => Boolean(chapter.verse && chapter.ref)),
  };
}
