(() => {
  const KEY = 'still-alive-save';
  const VERSION = 3;
  const defaults = { version: VERSION, achievements: {}, productivity: 0, lifetimeCoffees: 0, unlockedThemes: [], companion: { interactions: 0, snacks: 0, friendship: 0, togetherSeconds: 0, look: 'moss' }, audio: { volume: 0.35, muted: true }, totalSeconds: 0, bossHighScore: 0, preferences: { autoTheme: false, theme: 'night', quotes: null, musicUrl: '', petVisible: true, musicShortcutVisible: true, deadlineAt: '', secretRushUnlocked: false } };
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      if (!value || typeof value !== 'object') return structuredClone(defaults);
      const state = { ...structuredClone(defaults), ...value, version: VERSION, audio: { ...defaults.audio, ...(value.audio || {}) }, companion: { ...defaults.companion, ...(value.companion || {}) }, preferences: { ...defaults.preferences, ...(value.preferences || {}) } };
      if ((value.version || 1) < VERSION) {
        ['sanity','currency','lifetimeProductivity','coffee','stress','clickerPrestige','upgrades','sanityUpdatedAt'].forEach(key => delete state[key]);
        state.productivity = 0; state.lifetimeCoffees = 0;
      }
      return state;
    } catch (error) {
      console.warn('Save data could not be read; using safe defaults.', error);
      return structuredClone(defaults);
    }
  }
  let state = read();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (error) { console.warn('Progress could not be saved.', error); return false; }
  }
  window.SAStorage = {
    get: () => state,
    update: (changes) => { state = { ...state, ...changes }; save(); return state; },
    reset: () => { state = structuredClone(defaults); save(); return state; },
    save,
    defaults: structuredClone(defaults)
  };
})();
