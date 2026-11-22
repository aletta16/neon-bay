// Save / load. One job: persist money, mission progress and position to
// localStorage, and restore them.
const KEY = 'neonbay-save-v1';

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      money: state.money,
      missionIndex: state.missionIndex,
      completedAll: state.completedAll,
      pos: [state.pos.x, state.pos.z],
      heading: state.heading,
      health: state.health,
      savedAt: Date.now(),
    }));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
