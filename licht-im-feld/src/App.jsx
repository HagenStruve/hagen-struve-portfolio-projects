import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Waves,
  Heart,
  Cross,
  Leaf,
  Home,
} from "lucide-react";
import {
  backgroundImages,
  chapters,
  jsonLd,
  sceneThemes,
  validateJourneyConfig,
} from "./journeyData.js";

const iconMap = {
  moon: Moon,
  waves: Waves,
  leaf: Leaf,
  cross: Cross,
  sun: Sun,
  heart: Heart,
};

const journeyConfigTests = validateJourneyConfig();
console.assert(journeyConfigTests.hasSixChapters, "Die Reise sollte genau 6 Kapitel haben.");
console.assert(journeyConfigTests.hasUniqueIds, "Alle Kapitel brauchen eindeutige IDs.");
console.assert(journeyConfigTests.hasSeoTitle, "SEO-Titel fehlt oder ist zu kurz.");
console.assert(journeyConfigTests.hasSeoDescription, "SEO-Beschreibung fehlt oder ist zu kurz.");
console.assert(journeyConfigTests.everyChapterHasImage, "Jedes Kapitel braucht ein Hintergrundbild.");
console.assert(journeyConfigTests.everyChapterHasVerse, "Jedes Kapitel braucht Bibelvers und Referenz.");

function BackgroundVisual({ chapter, step, transitioning }) {
  const theme = sceneThemes[chapter.id] || sceneThemes.ruhe;
  const dots = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        top: `${(i * 61) % 100}%`,
        delay: (i % 9) * 0.18,
        size: 1 + (i % 3),
      })),
    []
  );

  return (
    <div className="background-scene">
      <motion.div
        key={`${chapter.id}-gradient`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="gradient-layer"
        style={{ background: chapter.mood }}
      />

      <motion.div
        key={`${chapter.id}-image`}
        initial={{ opacity: 0, scale: 1.08, filter: "blur(12px)" }}
        animate={{ opacity: 0.64, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
        transition={{ duration: 1.6 }}
        className="image-layer"
        style={{
          backgroundImage: `url(${backgroundImages[chapter.id] || ""})`,
          transform: `scale(${1 + step * 0.015})`,
        }}
      />

      <motion.div
        className="tone-layer"
        animate={{
          background: `radial-gradient(circle at 50% 50%, transparent 0%, ${theme.overlay} 60%, rgba(0,0,0,.82) 100%)`,
        }}
        transition={{ duration: 1.2 }}
      />

      <motion.div
        className="dark-layer"
        animate={{ opacity: [0.38, 0.52, 0.38] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="static-stars" />

      <motion.div
        className="moving-stars"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        className="light-fog"
        animate={{ x: [-120, 120, -120] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {dots.map((dot) => (
        <motion.span
          key={dot.id}
          className="dot"
          style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }}
          animate={{ opacity: [0.15, 0.9, 0.15], scale: [1, 1.8, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: dot.delay }}
        />
      ))}

      <motion.div
        key={`${chapter.id}-glow`}
        className="chapter-glow"
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: 1 + step * 0.03, opacity: 0.22 }}
        transition={{ duration: 1.1 }}
        style={{ background: chapter.glow }}
      />

      {chapter.visual === "path" && (
        <motion.div
          className="path-light"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 1.1 }}
        />
      )}

      {chapter.visual === "burden" && (
        <motion.div
          className="burden-symbol"
          initial={{ y: -220, rotate: -8, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
        />
      )}

      {chapter.visual === "cross" && (
        <motion.div className="cross-symbol">
          <motion.div
            className="cross-vertical"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.9 }}
          />
          <motion.div
            className="cross-horizontal"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          />
        </motion.div>
      )}

      {chapter.visual === "sunrise" && (
        <motion.div
          className="sunrise-symbol"
          initial={{ y: 160, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2 }}
        />
      )}

      {chapter.visual === "home" && (
        <motion.div
          className="home-symbol"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1 }}
        >
          <Home size={230} strokeWidth={1} />
        </motion.div>
      )}

      <motion.div
        className="transition-sweep"
        initial={{ x: "-120%", opacity: 0 }}
        animate={{
          x: transitioning ? ["-100%", "100%"] : "-120%",
          opacity: transitioning ? [0, 0.4, 0] : 0,
        }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function JesusJourneyExperience() {
  useEffect(() => {
    Object.values(backgroundImages).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);

  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [started, setStarted] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const chapter = chapters[step];
  const Icon = iconMap[chapter.iconKey] || Sparkles;
  const progress = ((step + 1) / chapters.length) * 100;

  const goToStep = useCallback(
    (targetStep) => {
      const normalizedStep = Math.max(0, Math.min(chapters.length - 1, targetStep));

      if (normalizedStep === step || transitioning) return;

      setTransitioning(true);
      window.setTimeout(() => {
        setStep(normalizedStep);
        window.setTimeout(() => setTransitioning(false), 650);
      }, 140);
    },
    [step, transitioning]
  );

  const next = () => {
    if (!started) {
      setStarted(true);
      return;
    }

    if (step === chapters.length - 1) {
      goToStep(0);
      return;
    }

    goToStep(step + 1);
  };

  const prev = () => {
    goToStep(step - 1);
  };

  const handleWheel = (event) => {
    if (!started || transitioning) return;

    if (event.deltaY > 40 && step < chapters.length - 1) {
      goToStep(step + 1);
    }

    if (event.deltaY < -40 && step > 0) {
      goToStep(step - 1);
    }
  };

  const handleTouchStart = (event) => {
    setTouchStart(event.touches[0].clientY);
  };

  const handleTouchEnd = (event) => {
    if (!started || transitioning) return;

    const end = event.changedTouches[0].clientY;
    const diff = touchStart - end;

    if (diff > 50 && step < chapters.length - 1) {
      goToStep(step + 1);
    }

    if (diff < -50 && step > 0) {
      goToStep(step - 1);
    }
  };

  const handlePointerMove = (event) => {
    if (typeof window === "undefined") return;

    setPointer({
      x: Math.round((event.clientX / window.innerWidth) * 100),
      y: Math.round((event.clientY / window.innerHeight) * 100),
    });
  };

  return (
    <motion.main
      itemScope
      itemType="https://schema.org/WebPage"
      animate={{ filter: transitioning ? "blur(3px)" : "blur(0px)" }}
      transition={{ duration: 0.5 }}
      onPointerMove={handlePointerMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="experience"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="sr-only">
        <h1>Licht im Feld – Eine stille Reise zu Jesus</h1>
        <p>Eine interaktive christliche Reise durch Hoffnung, Vergebung und Frieden.</p>
        <p>
          Licht im Feld ist eine interaktive christliche Reise für Menschen, die nach Hoffnung,
          Ruhe, Vergebung, Sinn und einer persönlichen Begegnung mit Jesus suchen.
        </p>
      </div>

      <AnimatePresence mode="wait">
        <BackgroundVisual
          key={chapter.id}
          chapter={chapter}
          step={step}
          transitioning={transitioning}
        />
      </AnimatePresence>

      <motion.div
        className="pointer-light"
        animate={{
          opacity: transitioning ? 1 : 0.7,
          background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,.18), transparent 18%, transparent 100%)`,
        }}
        transition={{ duration: 0.35 }}
      />

      <AnimatePresence>
        {!started && (
          <motion.div
            className="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(18px)" }}
            transition={{ duration: 1.2 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 }}
              className="intro-card"
            >
              <div className="intro-icon">
                <Sparkles size={30} />
              </div>
              <p className="eyebrow">Licht im Feld</p>
              <h1>Vielleicht bist du nicht alleine.</h1>
              <p>Eine ruhige Reise durch Dunkelheit, Hoffnung und Licht.</p>
              <button type="button" onClick={() => setStarted(true)} className="primary-button">
                Reise beginnen <ArrowRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="vignette" />
      <div className="top-fade" />
      <div className="bottom-fade" />

      <header className="topbar" aria-label="Reise-Navigation">
        <div className="brand-pill">
          <Sparkles size={16} />
          <span>Licht im Feld</span>
        </div>
        <div className="chapter-count">
          {step + 1} / {chapters.length}
        </div>
      </header>

      <motion.section
        id="reise"
        itemProp="mainContentOfPage"
        aria-live="polite"
        style={{ transform: `translateY(${step * -1.5}px)` }}
        initial={{ opacity: 0.92, y: 20 }}
        animate={{ opacity: 1, y: 0, scale: transitioning ? 1.01 : 1 }}
        transition={{ duration: 1.2 }}
        className="content-shell"
      >
        <div className="content-grid">
          <AnimatePresence mode="wait">
            <motion.article
              key={`${chapter.id}-content`}
              initial={{ opacity: 0, y: 60, scale: 0.96, filter: "blur(18px)" }}
              animate={{ opacity: transitioning ? 0.4 : 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, scale: 1.03, filter: "blur(18px)" }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              whileHover={{ y: -2 }}
              className="text-card cinematic-scroll"
            >
              <div className="chapter-kicker">
                <span className="kicker-icon">
                  <Icon size={22} />
                </span>
                <span>{chapter.kicker}</span>
              </div>

              <motion.h1 animate={{ opacity: [0.92, 1, 0.92] }} transition={{ duration: 6, repeat: Infinity }}>
                {chapter.title}
              </motion.h1>

              <p className="chapter-text" itemProp="description">{chapter.text}</p>

              {chapter.id === "kreuz" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 2 }}
                  className="holy-moment"
                >
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.03, 1] }}
                    transition={{ duration: 6, repeat: Infinity }}
                    className="holy-line"
                  />
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 2, delay: 0.8 }}
                    className="holy-title"
                  >
                    Liebe bleibt.
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ duration: 2, delay: 1.6 }}
                    className="holy-subtitle"
                  >
                    Selbst mitten in Dunkelheit.
                  </motion.p>
                </motion.div>
              )}

              {chapter.id === "antwort" && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.1, delay: 0.4 }}
                  className="answer-box"
                >
                  <p>Du bist nicht alleine.</p>
                  <motion.div
                    className="answer-line"
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <span>Nicht perfekte Worte. Nur ein ehrliches Herz.</span>
                </motion.div>
              )}

              <motion.div className="verse-card" animate={{ y: [0, -4, 0] }} transition={{ duration: 7, repeat: Infinity }}>
                <p itemProp="citation">„{chapter.verse}“</p>
                <span>{chapter.ref}</span>
              </motion.div>

              <div className="actions">
                <div className="action-hint">
                  {chapter.id === "antwort" ? "Noch einmal beginnen oder in Ruhe bleiben" : "Scrolle, wische oder nutze die Navigation"}
                </div>
                <button type="button" onClick={prev} disabled={step === 0 || transitioning} className="ghost-button">
                  <ArrowLeft size={17} /> Zurück
                </button>
                <button type="button" onClick={next} disabled={transitioning} className="primary-button small">
                  {chapter.cta}
                  <ArrowRight size={17} />
                </button>
              </div>
            </motion.article>
          </AnimatePresence>

          <div className="orb-column">
            <motion.div
              key={`${chapter.id}-orb`}
              initial={{ opacity: 0, scale: 0.65, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.7 }}
              className="orb"
            >
              <motion.div
                className="orb-glow"
                animate={{ scale: [1, 1.16, 1], opacity: [0.22, 0.34, 0.22] }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{ background: chapter.glow }}
              />
              <motion.div className="orb-icon" animate={{ y: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity }}>
                <Icon size={112} strokeWidth={1.1} />
              </motion.div>
            </motion.div>

            <motion.div
              className="orb-ray"
              animate={{ height: [80, 130, 80], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
          </div>
        </div>
      </motion.section>

      <nav aria-label="Kapitel der Reise" className="chapter-nav">
        <div className="progress-track">
          <motion.div className="progress-bar" animate={{ width: `${progress}%` }} transition={{ duration: 0.45 }} />
        </div>
        <div className="chapter-buttons">
          {chapters.map((item, index) => {
            const MiniIcon = iconMap[item.iconKey] || Sparkles;
            const active = index === step;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => goToStep(index)}
                disabled={transitioning}
                aria-label={item.kicker}
                className={active ? "chapter-button active" : "chapter-button"}
              >
                <MiniIcon size={18} />
              </button>
            );
          })}
        </div>
      </nav>

      <aside className="side-nav" aria-label="Schnellnavigation">
        <button type="button" onClick={() => goToStep(0)} disabled={transitioning}>Reise</button>
        <button type="button" onClick={() => goToStep(4)} disabled={transitioning}>Hoffnung</button>
        <button type="button" onClick={() => goToStep(5)} disabled={transitioning}>Gebet</button>
      </aside>

      <motion.div className="ring ring-large" animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }} />
      <motion.div className="ring ring-small" animate={{ rotate: -360 }} transition={{ duration: 90, repeat: Infinity, ease: "linear" }} />

      {started && chapter.id !== "antwort" && (
        <motion.div className="follow-light" animate={{ y: [0, 10, 0], opacity: [0.25, 0.65, 0.25] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <div>Folge dem Licht</div>
        </motion.div>
      )}

      <div className="fixed-bottom-fade" />
    </motion.main>
  );
}
