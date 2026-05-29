const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 720;
const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;

function detectTier() {
  if (reducedMotion || (coarsePointer && smallScreen) || lowMemory) return "low";
  if (coarsePointer || smallScreen) return "medium";
  return "high";
}

const tier = detectTier();
document.documentElement.dataset.qualityTier = tier;

export const quality = {
  tier,
  debugFps: false,
  dpr: tier === "high" ? 1.75 : tier === "medium" ? 1.5 : 1.25,
  particleScale: tier === "high" ? 1 : tier === "medium" ? 0.68 : 0.45,
  maxParticles: tier === "high" ? 260 : tier === "medium" ? 155 : 90,
  starScale: tier === "high" ? 1 : tier === "medium" ? 0.72 : 0.5,
  glowScale: tier === "high" ? 1 : tier === "medium" ? 0.7 : 0.45,
};

export function scaleGlow(value) {
  return Math.max(0, value * quality.glowScale);
}
