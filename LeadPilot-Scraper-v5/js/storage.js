const storageKey = "leadpilot-mvp-state-v1";

export function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("LeadPilot state could not be loaded.", error);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.warn("LeadPilot state could not be saved.", error);
  }
}
