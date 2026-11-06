(() => {
  const tools = document.querySelector('#shared-tools');
  const embedded = window.parent !== window;
  if (embedded) document.body.classList.add('embedded-page');
  tools.innerHTML = `
    <dialog id="settings-dialog" class="settings-dialog"><form method="dialog"><button class="dialog-close" aria-label="Close settings">×</button><p class="eyebrow">YOUR SPACE</p><h2>Settings</h2><p>Your preferences save on this device automatically.</p>
      <section class="settings-section clock-settings"><h3>Clock</h3><p>Time syncs automatically when an internet connection is available.</p><p id="clock-sync-status" class="quote-status" aria-live="polite">Checking time service…</p></section>
      <section class="settings-section deadline-settings"><h3>Deadline countdown</h3><p>Choose a date and time. The countdown appears on the hideout home screen.</p><label class="setting-row" for="deadline-date"><span>Deadline date and time</span><input id="deadline-date" type="datetime-local"></label><div class="quote-actions"><button id="save-deadline" class="secondary-button" type="button">Save deadline</button><button id="clear-deadline" class="text-button" type="button">Clear</button></div><p id="deadline-status" class="quote-status" aria-live="polite"></p></section>
      <section class="settings-section theme-settings"><h3>Appearance</h3><label class="toggle-row"><span>Automatic day / night <small>Day 06:00–21:59 · Night 22:00–05:59</small></span><input id="auto-theme" type="checkbox"><span class="switch" aria-hidden="true"></span></label><label class="setting-row" id="manual-theme-row"><span>Current theme</span><select id="manual-theme"><option value="night">Dark / night</option><option value="day">Day</option></select></label></section>
      <section class="settings-section companion-settings"><h3>Chill space</h3><label class="toggle-row"><span>Show companion</span><input id="pet-visible-toggle" type="checkbox"><span class="switch" aria-hidden="true"></span></label><label class="toggle-row"><span>Show music shortcut <small>Hiding this shortcut does not stop music already playing.</small></span><input id="music-shortcut-toggle" type="checkbox"><span class="switch" aria-hidden="true"></span></label></section>
      <section class="settings-section quote-settings"><h3>Comfort quotes</h3><p>Edit the lines shown on the home screen. Quotes rotate automatically every 12 seconds.</p><div id="quote-rows"></div><div class="quote-actions"><button id="add-quote" class="text-button" type="button">+ Add quote</button><button id="save-quotes" class="secondary-button" type="button">Save quotes</button><button id="reset-quotes" class="text-button" type="button">Restore defaults</button></div><p id="quote-status" class="quote-status" aria-live="polite"></p></section>
      <section class="settings-section music-settings" id="music-settings"><h3>Music</h3><p>Choose a local audio file for audio-only playback and a true visualizer, or paste a YouTube video/playlist link.</p><label for="music-file" class="music-file-label">Choose audio file <input id="music-file" type="file" accept="audio/*"></label><div class="quote-actions"><button class="text-button" id="load-bundled-audio" type="button">Load assets/audio/music.mp3</button></div><p id="audio-file-status" class="quote-status" aria-live="polite">Selected files play for this visit only. Put a permanent MP3 at the path above.</p><label class="sr-only" for="music-url">YouTube video or playlist link</label><input id="music-url" type="url" placeholder="https://www.youtube.com/watch?v=..." autocomplete="url"><div class="quote-actions"><button class="secondary-button" id="load-music" type="button">Load YouTube</button><button class="text-button" id="remove-music" type="button">Remove player</button></div><p id="music-status" class="quote-status" aria-live="polite"></p></section>
      <section class="settings-section rain-settings"><h3>Rain ambience</h3><p>Uses the hosted rain track. Controls work across the open page.</p><div class="rain-controls"><button id="rain-play" class="secondary-button" type="button">Play rain</button><button id="rain-mute" class="text-button" type="button">Unmute</button><label for="rain-volume">Volume</label><input id="rain-volume" type="range" min="0" max="1" step="0.01" aria-label="Rain volume"><span id="rain-volume-value">35%</span></div><p id="rain-status" class="quote-status" aria-live="polite">Muted by default.</p></section>
      <section class="settings-section progress-settings"><h3>Saved data</h3><p>Clear saved progress, themes, quotes, and preferences on this device.</p><button id="reset-all-progress" class="text-button danger-button" type="button">Reset all saved progress</button></section>
    </form></dialog>
    <aside id="music-player-panel" class="music-player-panel" hidden aria-label="Music player"><button id="stop-music" class="music-player-close" aria-label="Stop music and close player" title="Close player">×</button><div id="music-player"></div><audio id="music-audio" preload="none"></audio></aside>
    <audio id="rain-audio" src="https://pub-d63cfb891fec4a8e9824d862eda97f51.r2.dev/rain.mp3" loop preload="none"></audio>
    <div id="achievement-toasts" class="achievement-toasts" aria-live="polite" aria-atomic="false"></div>
    <dialog id="achievements-dialog" class="settings-dialog achievements-dialog"><form method="dialog"><button class="dialog-close" aria-label="Close achievements">×</button><p class="eyebrow">MILESTONES</p><h2>Achievements</h2><p id="achievement-summary">0 unlocked</p><div id="achievement-gallery" class="achievement-gallery"></div></form></dialog>
    <dialog id="secret-ending-dialog" class="secret-ending-dialog"><form method="dialog"><p class="eyebrow">THE LAST SURVIVOR</p><h2>Somehow,<br><em>we're still here.</em></h2><p>The semester kept coming. You kept showing up in small ways. That counts as a kind of victory.</p><button class="primary-button">Back to the hideout <span aria-hidden="true">↗</span></button></form></dialog>`;

  const prefs = () => SAStorage.get().preferences;
  const clock = document.querySelector('#clock');
  const clockSyncStatus = document.querySelector('#clock-sync-status');
  let networkEpoch = 0, networkPerf = 0;
  function now() { return networkEpoch ? new Date(networkEpoch + performance.now() - networkPerf) : new Date(); }
  window.SAClockNow = now;
  function theme(value) { document.documentElement.dataset.theme = value; window.dispatchEvent(new CustomEvent('themechange', { detail: value })); }
  async function syncTime() {
    clockSyncStatus.textContent = 'Syncing with internet time…';
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const apiZone = zone === 'Asia/Saigon' ? 'Asia/Ho_Chi_Minh' : zone;
      const path = apiZone.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(`https://utctime.app/api/now/${path}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Time service replied ${response.status}`);
      const data = await response.json();
      const timestamp = Number.isFinite(data.unix_ms) ? data.unix_ms : Number.isFinite(data.unix) ? data.unix * 1000 : NaN;
      if (!Number.isFinite(timestamp)) throw new Error('Time service returned no timestamp');
      networkEpoch = timestamp; networkPerf = performance.now(); if (clock) clock.title = `Internet-synced · ${zone}`;
      clockSyncStatus.textContent = `Synced to ${zone}.`; updateClock();
    } catch (error) {
      if (clock) clock.title = 'Using your device clock; network time unavailable.';
      clockSyncStatus.textContent = 'Internet time unavailable; using your device clock.';
      console.info('Network time unavailable; using device clock.', error);
    }
  }
  let quoteRows = [];
  function storedQuotes() {
    const saved = prefs().quotes;
    const source = Array.isArray(saved) && saved.length ? saved : SA_QUOTES.defaultQuotes;
    return source.map(item => ({ text: String(typeof item === 'string' ? item : item.text || '') }));
  }
  function activeQuotePool() { return (quoteRows.length ? quoteRows : storedQuotes()).filter(item => item.text.trim()); }
  let lastQuote = '', quoteTimer = 0;
  function rotateQuote() {
    const target = document.querySelector('#comfort-message'); if (!target) return;
    const pool = activeQuotePool(); if (!pool.length) return;
    const options = pool.filter(item => item.text !== lastQuote);
    const item = (options.length ? options : pool)[Math.floor(Math.random() * (options.length || pool.length))];
    target.textContent = item.text; lastQuote = item.text;
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(rotateQuote, 12000);
  }
  function renderQuoteRows() {
    const list = document.querySelector('#quote-rows'); if (!list) return;
    list.replaceChildren();
    quoteRows.forEach((entry, index) => {
      const row = document.createElement('div'); row.className = 'quote-row';
      const text = document.createElement('input'); text.className = 'quote-text'; text.type = 'text'; text.value = entry.text; text.placeholder = 'Write your quote…'; text.setAttribute('aria-label', `Quote ${index + 1}`);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quote-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove quote ${index + 1}`);
      text.addEventListener('input', () => entry.text = text.value);
      remove.addEventListener('click', () => { quoteRows.splice(index,1); renderQuoteRows(); });
      row.append(text, remove); list.append(row);
    });
  }
  function updateClock() {
    const date = now(); const timeText = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date); if (clock) clock.textContent = timeText; document.querySelectorAll('[data-current-time]').forEach(el => el.textContent = timeText);
    if (prefs().autoTheme) theme(date.getHours() >= 6 && date.getHours() < 22 ? 'day' : 'night');
    window.dispatchEvent(new CustomEvent('stillalive:clock', { detail: date }));
    const quote = document.querySelector('#comfort-message');
    if (quote && !activeQuotePool(date).some(entry => entry.text === quote.textContent)) rotateQuote();
    updateDeadlineCountdown(date);
  }
  function updateDeadlineCountdown(date = now()) {
    const countdowns = [...document.querySelectorAll('.deadline-countdown')];
    if (!countdowns.length) return;
    const target = prefs().deadlineAt ? new Date(prefs().deadlineAt).getTime() : NaN;
    const fields = ['weeks','days','hours','minutes','seconds'];
    if (!Number.isFinite(target)) { countdowns.forEach(countdown => fields.forEach(key => countdown.querySelector(`[data-countdown="${key}"]`).textContent = '--')); return; }
    let remaining = Math.max(0, Math.floor((target - date.getTime()) / 1000));
    const values = { weeks: Math.floor(remaining / 604800) }; remaining %= 604800;
    values.days = Math.floor(remaining / 86400); remaining %= 86400;
    values.hours = Math.floor(remaining / 3600); remaining %= 3600;
    values.minutes = Math.floor(remaining / 60); values.seconds = remaining % 60;
    countdowns.forEach(countdown => fields.forEach(key => countdown.querySelector(`[data-countdown="${key}"]`).textContent = String(values[key]).padStart(2, '0')));
  }
  function setupMusic() {
    const input = document.querySelector('#music-url'), status = document.querySelector('#music-status'), panel = document.querySelector('#music-player-panel'), mountPoint = document.querySelector('#music-player');
    function getEmbed(link) {
      try {
        const url = new URL(link.trim()); if (url.protocol !== 'https:') return null;
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        if (!['youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(host)) return null;
        let video = '', list = url.searchParams.get('list') || '';
        if (host === 'youtu.be') video = url.pathname.split('/').filter(Boolean)[0] || '';
        else if (url.pathname === '/watch') video = url.searchParams.get('v') || '';
        else video = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] || '';
        if (video && !/^[\w-]{11}$/.test(video)) return null;
        if (list && !/^[\w-]{1,128}$/.test(list)) return null;
        const api = `&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
        if (video) return `https://www.youtube-nocookie.com/embed/${video}?autoplay=0&controls=1&playsinline=1${list ? `&list=${encodeURIComponent(list)}` : ''}${api}`;
        if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}&autoplay=0&controls=1&playsinline=1${api}`;
        return null;
      } catch { return null; }
    }
    function mount(source) {
      mountPoint.replaceChildren();
      const audio = document.querySelector('#music-audio'); audio.pause(); audio.removeAttribute('src'); audio.load();
      if (selectedAudioUrl) URL.revokeObjectURL(selectedAudioUrl); selectedAudioUrl = '';
      const player = document.createElement('iframe'); player.src = source; player.title = 'YouTube video player'; player.loading = 'lazy'; player.allow = 'encrypted-media; picture-in-picture'; player.referrerPolicy = 'strict-origin-when-cross-origin'; player.allowFullscreen = true;
      mountPoint.append(player); panel.classList.remove('audio-only'); panel.hidden = false;
    }
    let selectedAudioUrl = '';
    function loadAudio(file) {
      if (!file || !file.type.startsWith('audio/')) { document.querySelector('#audio-file-status').textContent = 'Choose a supported audio file.'; return; }
      mountPoint.replaceChildren(); const audio = document.querySelector('#music-audio'); audio.pause();
      if (selectedAudioUrl) URL.revokeObjectURL(selectedAudioUrl);
      selectedAudioUrl = URL.createObjectURL(file); audio.src = selectedAudioUrl; audio.load(); panel.classList.add('audio-only'); panel.hidden = false;
      SAStorage.update({ preferences: { ...prefs(), musicUrl: '' } });
      document.querySelector('#audio-file-status').textContent = `${file.name} · audio only · available until this page is closed.`;
      document.querySelector('#music-status').textContent = 'Ready. Press Play when you want to listen.'; input.value = '';
    }
    function loadBundledAudio() {
      // ASSET PATH: place the user's audio-only music file at assets/audio/music.mp3.
      mountPoint.replaceChildren(); const audio = document.querySelector('#music-audio'); audio.pause();
      if (selectedAudioUrl) URL.revokeObjectURL(selectedAudioUrl); selectedAudioUrl = '';
      audio.src = 'assets/audio/music.mp3'; audio.load(); panel.classList.add('audio-only'); panel.hidden = false;
      SAStorage.update({ preferences: { ...prefs(), musicUrl: '' } });
      document.querySelector('#audio-file-status').textContent = 'Using assets/audio/music.mp3. Press Play when ready.';
      input.value = ''; document.querySelector('#music-file').value = '';
    }
    function remove() { mountPoint.replaceChildren(); const audio = document.querySelector('#music-audio'); audio.pause(); audio.removeAttribute('src'); audio.load(); if (selectedAudioUrl) URL.revokeObjectURL(selectedAudioUrl); selectedAudioUrl = ''; panel.hidden = true; panel.classList.remove('audio-only'); input.value = ''; document.querySelector('#music-file').value = ''; SAStorage.update({ preferences: { ...prefs(), musicUrl: '' } }); status.textContent = 'Player removed.'; }
    function load() { const source = getEmbed(input.value); if (!source) { status.textContent = 'Paste a valid YouTube video or playlist URL.'; return; } SAStorage.update({ preferences: { ...prefs(), musicUrl: input.value.trim() } }); mount(source); status.textContent = 'Ready. Press play in the player when you want to listen.'; }
    document.querySelector('#load-music').addEventListener('click', load); document.querySelector('#remove-music').addEventListener('click', remove); document.querySelector('#stop-music').addEventListener('click', remove);
    document.querySelector('#music-file').addEventListener('change', event => loadAudio(event.target.files[0]));
    document.querySelector('#load-bundled-audio').addEventListener('click', loadBundledAudio);
    document.querySelector('#music-audio').addEventListener('error', () => { document.querySelector('#audio-file-status').textContent = 'Audio file could not be loaded. Choose a file or add assets/audio/music.mp3.'; });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); load(); } });
    input.value = prefs().musicUrl || ''; const saved = getEmbed(input.value); if (saved) mount(saved);
  }
  function openSettings(section) {
    const dialog = document.querySelector('#settings-dialog'), auto = document.querySelector('#auto-theme'), manual = document.querySelector('#manual-theme');
    auto.checked = Boolean(prefs().autoTheme);
    if ((SAStorage.get().unlockedThemes || []).includes('starlit') && !manual.querySelector('option[value="starlit"]')) manual.add(new Option('Starlit','starlit'));
    manual.value = prefs().theme || 'night'; document.querySelector('#manual-theme-row').hidden = auto.checked;
    if (networkEpoch) clockSyncStatus.textContent = 'Synced to internet time.';
    else if (!clockSyncStatus.textContent.startsWith('Syncing')) clockSyncStatus.textContent = 'Using device time until sync completes.';
    quoteRows = storedQuotes(); renderQuoteRows(); document.querySelector('#quote-status').textContent = ''; document.querySelector('#music-status').textContent = '';
    const petToggle = document.querySelector('#pet-visible-toggle'), shortcutToggle = document.querySelector('#music-shortcut-toggle');
    if (petToggle) petToggle.checked = prefs().petVisible !== false;
    if (shortcutToggle) shortcutToggle.checked = prefs().musicShortcutVisible !== false;
    document.querySelector('#deadline-date').value = prefs().deadlineAt || '';
    document.querySelector('#deadline-status').textContent = prefs().deadlineAt ? 'Deadline saved on this device.' : 'No deadline set. The home countdown will show dashes.';
    dialog.showModal();
    if (section) window.setTimeout(() => { document.querySelector(`#${section}`).scrollIntoView({ block: 'center', behavior: 'smooth' }); document.querySelector('#music-url').focus({ preventScroll: true }); }, 30);
  }
  function sendMusicCommand(command) {
    const shellFrame = document.querySelector('#activity-frame');
    if (shellFrame && !shellFrame.hidden) shellFrame.contentWindow.postMessage({ type: 'stillalive-music-state-command', command }, location.origin);
    const audio = document.querySelector('#music-audio');
    if (audio?.src && !document.querySelector('#music-player-panel').classList.contains('audio-only')) return;
    if (audio?.src && document.querySelector('#music-player-panel').classList.contains('audio-only')) {
      if (command === 'playVideo') { window.SAInitAudioAnalyser?.(audio); audio.play().catch(() => {}); }
      if (command === 'pauseVideo') audio.pause();
      if (command === 'nextVideo' && Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
      return;
    }
    const frame = document.querySelector('#music-player-panel iframe');
    if (frame) frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args: '' }), '*');
  }
  document.querySelectorAll('[data-music-command]').forEach(button => button.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('stillalive:music-command', { detail: button.dataset.musicCommand }));
    window.dispatchEvent(new CustomEvent('stillalive:music-command', { detail: button.dataset.musicCommand }));
    if (embedded) window.parent.postMessage({ type: 'still-alive-music-command', command: button.dataset.musicCommand }, location.origin);
    else sendMusicCommand(button.dataset.musicCommand);
  }));
  document.querySelector('#settings-button').addEventListener('click', () => openSettings());
  document.querySelector('#save-deadline').addEventListener('click', () => {
    const value = document.querySelector('#deadline-date').value;
    if (!value || !Number.isFinite(new Date(value).getTime())) { document.querySelector('#deadline-status').textContent = 'Choose a valid date and time first.'; return; }
    SAStorage.update({ preferences: { ...prefs(), deadlineAt: value } }); updateDeadlineCountdown();
    document.querySelector('#deadline-status').textContent = 'Deadline saved. Your countdown is ready.';
  });
  document.querySelector('#clear-deadline').addEventListener('click', () => {
    document.querySelector('#deadline-date').value = ''; SAStorage.update({ preferences: { ...prefs(), deadlineAt: '' } }); updateDeadlineCountdown();
    document.querySelector('#deadline-status').textContent = 'Deadline cleared. The home countdown will show dashes.';
  });
  document.querySelector('#music-settings-button')?.addEventListener('click', () => { if (embedded) window.parent.postMessage({ type: 'still-alive-open-music-settings' }, location.origin); else openSettings('music-settings'); });
  document.querySelector('#achievements-button')?.addEventListener('click', () => window.SAAchievements?.openGallery());
  document.querySelector('#settings-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  document.querySelector('#achievements-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  document.querySelector('#auto-theme').addEventListener('change', event => { SAStorage.update({ preferences: { ...prefs(), autoTheme: event.target.checked } }); document.querySelector('#manual-theme-row').hidden = event.target.checked; updateClock(); if (!event.target.checked) theme(document.querySelector('#manual-theme').value); });
  document.querySelector('#manual-theme').addEventListener('change', event => { SAStorage.update({ preferences: { ...prefs(), theme: event.target.value } }); theme(event.target.value); });
  document.querySelector('#add-quote').addEventListener('click', () => { quoteRows.push({ text: '' }); renderQuoteRows(); document.querySelector('#quote-rows .quote-row:last-child .quote-text').focus(); });
  document.querySelector('#save-quotes').addEventListener('click', () => {
    const filtered = quoteRows.map(item => ({ text: item.text.trim() })).filter(item => item.text);
    if (!filtered.length) { document.querySelector('#quote-status').textContent = 'Keep at least one quote.'; return; }
    quoteRows = filtered; SAStorage.update({ preferences: { ...prefs(), quotes: filtered.map(item => item.text) } }); renderQuoteRows(); rotateQuote();
    document.querySelector('#quote-status').textContent = `${filtered.length} quotes saved on this device.`;
  });
  document.querySelector('#reset-quotes').addEventListener('click', () => { SAStorage.update({ preferences: { ...prefs(), quotes: null } }); quoteRows = storedQuotes(); renderQuoteRows(); rotateQuote(); document.querySelector('#quote-status').textContent = 'Default quotes restored.'; });
  document.querySelector('#pet-visible-toggle').addEventListener('change', event => { SAStorage.update({ preferences: { ...prefs(), petVisible: event.target.checked } }); document.body.classList.toggle('pet-hidden', !event.target.checked); window.dispatchEvent(new CustomEvent('pet-visibility-change', { detail: event.target.checked })); });
  document.querySelector('#music-shortcut-toggle').addEventListener('change', event => { SAStorage.update({ preferences: { ...prefs(), musicShortcutVisible: event.target.checked } }); document.body.classList.toggle('music-shortcut-hidden', !event.target.checked); if (embedded) window.parent.postMessage({ type: 'still-alive-music-shortcut', visible: event.target.checked }, location.origin); });
  document.querySelector('#reset-all-progress').addEventListener('click', () => { if (confirm('Reset all saved progress, quotes, themes, and settings on this device?')) { SAStorage.reset(); location.reload(); } });
  if (!embedded) setupMusic();
  if (!embedded) syncTime(); else clockSyncStatus.textContent = 'Using device time for this page.';
  const savedTheme = prefs().theme || 'night'; theme(savedTheme);
  document.body.classList.toggle('pet-hidden', prefs().petVisible === false);
  document.body.classList.toggle('music-shortcut-hidden', prefs().musicShortcutVisible === false);
  updateClock(); window.setInterval(updateClock, 15000); window.setInterval(updateDeadlineCountdown, 1000); if (!embedded) window.setInterval(syncTime, 30 * 60 * 1000);
  if (document.querySelector('#new-message')) { quoteRows = storedQuotes(); rotateQuote(); document.querySelector('#new-message').addEventListener('click', rotateQuote); }

  const shellFrame = document.querySelector('#activity-frame');
  function showHome() { if (!shellFrame) return; shellFrame.contentWindow?.postMessage({ type: 'still-alive-view', visible: false }, location.origin); shellFrame.hidden = true; document.querySelector('.home-main').hidden = false; history.replaceState(null,'','#home'); }
  if (shellFrame) {
    window.SAShowHome = showHome;
    document.querySelectorAll('[data-shell-home]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); showHome(); }));
    shellFrame.addEventListener('load', () => { if (shellFrame.src && !shellFrame.src.endsWith('about:blank')) { shellFrame.hidden = false; document.querySelector('.home-main').hidden = true; shellFrame.contentWindow?.postMessage({ type: 'still-alive-view', visible: true }, location.origin); } });
    window.addEventListener('message', event => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === 'still-alive-home') showHome();
      if (event.data?.type === 'still-alive-music-shortcut') document.body.classList.toggle('music-shortcut-hidden', !event.data.visible);
      if (event.data?.type === 'still-alive-music-command' && ['playVideo','pauseVideo','nextVideo'].includes(event.data.command)) { window.dispatchEvent(new CustomEvent('stillalive:music-command', { detail: event.data.command })); sendMusicCommand(event.data.command); }
      if (event.data?.type === 'still-alive-open-music-settings') openSettings('music-settings');
    });
  } else if (embedded) {
    window.SAShowHome = () => window.parent.postMessage({ type: 'still-alive-home' }, location.origin);
    document.querySelectorAll('[data-home-nav]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); window.SAShowHome(); }));
    window.addEventListener('message', event => {
      if (event.origin !== location.origin) return;
      if (event.data?.type === 'still-alive-view') {
        document.body.dataset.frameHidden = String(!event.data.visible);
        document.dispatchEvent(new CustomEvent('stillalive:frame-visibility', { detail: Boolean(event.data.visible) }));
      }
      if (event.data?.type === 'stillalive-audio-spectrum') window.dispatchEvent(new CustomEvent('stillalive:audio-spectrum', { detail: event.data.values }));
      if (event.data?.type === 'stillalive-audio-active') window.dispatchEvent(new CustomEvent('stillalive:audio-active', { detail: Boolean(event.data.active) }));
      if (event.data?.type === 'stillalive-music-state-command' && ['playVideo','pauseVideo'].includes(event.data.command)) window.dispatchEvent(new CustomEvent('stillalive:music-command', { detail: event.data.command }));
    });
  }
  if (!embedded) {
    let totalSeconds = Number(SAStorage.get().totalSeconds) || 0, lastMinute = Math.floor(totalSeconds / 60);
    function persistTime() { SAStorage.update({ totalSeconds }); }
    window.setInterval(() => {
      if (document.hidden) return; totalSeconds++;
      if (totalSeconds % 15 === 0) persistTime();
      const minute = Math.floor(totalSeconds / 60);
      if (minute !== lastMinute) { lastMinute = minute; persistTime(); window.dispatchEvent(new CustomEvent('stillalive:total-time', { detail: totalSeconds })); }
    }, 1000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) persistTime(); }); window.addEventListener('pagehide', persistTime);
  }
})();
