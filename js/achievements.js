(() => {
  const catalog = [
    { id: 'stillAlive', name: 'STILL ALIVE', description: 'Open the website for the first time.' },
    { id: 'oneMoreMinute', name: 'ONE MORE MINUTE', description: 'Spend 10 minutes in the playground.' },
    { id: 'theVoid', name: 'THE VOID', description: 'Spend 30 minutes in The Void.' },
    { id: 'nightShift', name: 'NIGHT SHIFT', description: 'Visit after 03:00 local time.' },
    { id: 'academicWeapon', name: 'ACADEMIC WEAPON', description: 'Reach 100 productivity points.' },
    { id: 'barelyPassing', name: 'BARELY PASSING', description: 'Defeat a boss with less than 10% energy.' },
    { id: 'coffeeAddict', name: 'COFFEE ADDICT', description: 'Consume 100 coffees.' },
    { id: 'touchGrass', name: 'TOUCH GRASS', description: 'Take a break and leave the website.' },
    { id: 'perfectionist', name: 'PERFECTIONIST', description: 'Unlock every normal achievement.' },
    { id: 'coffeeOverlord', name: 'COFFEE OVERLORD', description: 'Reach 100 coffees. Somehow.' , secret: true },
    { id: 'lastSurvivor', name: 'THE LAST SURVIVOR', description: 'Find the secret ending.', secret: true }
  ];
  const normal = catalog.filter(item => !item.secret && item.id !== 'perfectionist').map(item => item.id);
  const gallery = document.querySelector('#achievement-gallery');
  const toastBox = document.querySelector('#achievement-toasts');
  const dialog = document.querySelector('#achievements-dialog');
  const endingDialog = document.querySelector('#secret-ending-dialog');
  function progress() { return SAStorage.get().achievements || {}; }
  function render() {
    const saved = progress();
    const unlocked = Object.keys(saved).length;
    document.querySelector('#achievement-count').textContent = unlocked;
    document.querySelector('#achievement-summary').textContent = `${unlocked} unlocked`;
    gallery.replaceChildren();
    catalog.filter(item => !item.secret || saved[item.id]).forEach(item => {
      const record = saved[item.id];
      const card = document.createElement('article'); card.className = `achievement-card${record ? ' unlocked' : ' locked'}`;
      const badge = document.createElement('span'); badge.className = 'achievement-badge'; badge.textContent = record ? '✧' : '◇';
      const body = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = item.name;
      const description = document.createElement('p'); description.textContent = item.description;
      const date = document.createElement('small'); date.textContent = record ? new Date(record.at).toLocaleString() : 'LOCKED';
      body.append(name, description, date); card.append(badge, body); gallery.append(card);
    });
  }
  function toast(title, description, style = 'achievement') {
    if (window.parent !== window) { window.parent.postMessage({ type: 'still-alive-toast', title, description, style }, location.origin); return; }
    const node = document.createElement('div'); node.className = `toast ${style}`;
    const label = document.createElement('span'); label.textContent = style === 'achievement' ? 'ACHIEVEMENT UNLOCKED' : 'A LITTLE NOTE';
    const heading = document.createElement('strong'); heading.textContent = title;
    const text = document.createElement('p'); text.textContent = description;
    node.append(label, heading, text); toastBox.append(node);
    window.setTimeout(() => { node.classList.add('leaving'); window.setTimeout(() => node.remove(), 450); }, 5200);
  }
  function unlock(id) {
    const item = catalog.find(entry => entry.id === id); if (!item || progress()[id]) return false;
    const achievements = { ...progress(), [id]: { at: new Date().toISOString() } };
    SAStorage.update({ achievements }); render(); toast(item.name, item.description);
    if (window.parent !== window) window.parent.postMessage({ type: 'still-alive-achievement-update' }, location.origin);
    if (id !== 'perfectionist' && normal.every(key => achievements[key])) unlock('perfectionist');
    if (['titleTheme', 'konami', 'tenHours'].includes(id)) checkSecretEnding();
    return true;
  }
  function setSecretFlag(flag) {
    const prefs = SAStorage.get().preferences;
    const flags = { ...(prefs.secretFlags || {}), [flag]: true };
    SAStorage.update({ preferences: { ...prefs, secretFlags: flags } });
    return flags;
  }
  function checkSecretEnding() {
    const flags = SAStorage.get().preferences.secretFlags || {};
    if (flags.titleTheme && flags.konami && flags.tenHours && unlock('lastSurvivor')) {
      toast('THE LAST SURVIVOR', 'You made it through the long night. The secret ending is yours.', 'secret');
      window.dispatchEvent(new CustomEvent('stillalive:secret-ending'));
      if (window.parent !== window) window.parent.postMessage({ type: 'still-alive-ending' }, location.origin);
      else endingDialog.showModal();
    }
  }
  function openGallery() { render(); dialog.showModal(); }
  window.SAAchievements = { unlock, toast, openGallery, progress, refresh: render };
  window.addEventListener('message', event => {
    if (window.parent !== window || event.origin !== location.origin) return;
    if (event.data?.type === 'still-alive-toast') toast(event.data.title, event.data.description, event.data.style);
    if (event.data?.type === 'still-alive-achievement-update') render();
    if (event.data?.type === 'still-alive-ending') endingDialog.showModal();
  });
  document.querySelector('#achievements-button').addEventListener('click', openGallery);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  window.addEventListener('stillalive:action', event => {
    const state = SAStorage.get();
    if (event.detail.kind === 'coffee' && state.lifetimeCoffees >= 100) { unlock('coffeeAddict'); unlock('coffeeOverlord'); }
  });
  window.addEventListener('stillalive:progress', event => {
    if (event.detail.productivity >= 100) unlock('academicWeapon');
    if (event.detail.coffees >= 100) { unlock('coffeeAddict'); unlock('coffeeOverlord'); }
  });
  window.addEventListener('stillalive:break', () => {
    const prefs = SAStorage.get().preferences; SAStorage.update({ preferences: { ...prefs, pendingGrass: true } });
  });
  function leftSite() {
    if (SAStorage.get().preferences.pendingGrass) {
      unlock('touchGrass'); const prefs = SAStorage.get().preferences; SAStorage.update({ preferences: { ...prefs, pendingGrass: false } });
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) leftSite(); });
  window.addEventListener('pagehide', leftSite);
  window.addEventListener('stillalive:barely-passing', () => unlock('barelyPassing'));
  window.addEventListener('stillalive:void-30', () => unlock('theVoid'));
  window.addEventListener('stillalive:clock', event => {
    const now = event.detail;
    if (now.getHours() >= 3 && !progress().nightShift) unlock('nightShift');
    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    if (now.getHours() === 3 && now.getMinutes() === 33 && SAStorage.get().preferences.last0333 !== dayKey) {
      toast('03:33', 'The night is listening. You are doing okay.', 'secret');
      const prefs = SAStorage.get().preferences; SAStorage.update({ preferences: { ...prefs, last0333: dayKey } });
    }
  });
  document.querySelector('.wordmark').addEventListener('click', event => {
    if (window.SAShowHome) { event.preventDefault(); window.SAShowHome(); }
    else if (window.SAShowScreen) { event.preventDefault(); window.SAShowScreen('home'); }
    const prefs = SAStorage.get().preferences; const clicks = (prefs.titleClicks || 0) + 1;
    SAStorage.update({ preferences: { ...prefs, titleClicks: clicks } });
    if (clicks >= 7 && !(SAStorage.get().unlockedThemes || []).includes('starlit')) {
      const themes = [...(SAStorage.get().unlockedThemes || []), 'starlit'];
      SAStorage.update({ unlockedThemes: themes }); setSecretFlag('titleTheme');
      toast('A new color found you.', 'The Starlit theme is available in Settings.', 'secret');
      document.dispatchEvent(new CustomEvent('stillalive:theme-unlocked'));
    }
  });
  const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let cursor = 0;
  document.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    cursor = key === code[cursor] ? cursor + 1 : (key === code[0] ? 1 : 0);
    if (cursor === code.length) { cursor = 0; const flags = setSecretFlag('konami'); toast('The code still works.', 'Somehow, we are still here.', 'secret'); checkSecretEnding(); }
  });
  document.addEventListener('stillalive:total-time', event => {
    if (event.detail >= 36000 && !SAStorage.get().preferences.secretFlags?.tenHours) {
      setSecretFlag('tenHours'); toast('Bro. Go to sleep. I’ll handle it.', 'The little hideout has been awake with you.', 'secret'); checkSecretEnding();
    }
    if (event.detail >= 600) unlock('oneMoreMinute');
  });
  render();
  if (!progress().stillAlive) unlock('stillAlive');
  const savedRun = SAStorage.get();
  if (savedRun.productivity >= 100 || savedRun.lifetimeProductivity >= 100) unlock('academicWeapon');
  if (savedRun.lifetimeCoffees >= 100) { unlock('coffeeAddict'); unlock('coffeeOverlord'); }
})();
