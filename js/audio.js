(() => {
  const audio = document.querySelector('#rain-audio');
  if (!audio) return;
  const playButton = document.querySelector('#rain-play');
  const muteButton = document.querySelector('#rain-mute');
  const volumeSlider = document.querySelector('#rain-volume');
  const volumeValue = document.querySelector('#rain-volume-value');
  const status = document.querySelector('#rain-status');
  const musicAudio = document.querySelector('#music-audio');
  let settings = SAStorage.get().audio;
  const analyserByAudio = new WeakMap();
  function initAnalyser(target) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      if (!analyserByAudio.has(target)) {
        const context = new AudioContextClass(), analyser = context.createAnalyser(); analyser.fftSize = 64;
        const spectrum = new Uint8Array(analyser.frequencyBinCount);
        const source = context.createMediaElementSource(target); source.connect(analyser); analyser.connect(context.destination);
        analyserByAudio.set(target, { context, analyser, spectrum });
      }
      const graph = analyserByAudio.get(target); if (graph.context.state === 'suspended') graph.context.resume();
    } catch (error) { console.info('Rain audio visualization unavailable.', error); }
  }
  window.SAInitAudioAnalyser = initAnalyser;
  window.SAGetAudioSpectrum = () => {
    const target = musicAudio && !musicAudio.paused ? musicAudio : !audio.paused ? audio : null;
    const graph = target && analyserByAudio.get(target); if (!graph) return null;
    graph.analyser.getByteFrequencyData(graph.spectrum); return graph.spectrum;
  };
  window.SAGetRainSpectrum = window.SAGetAudioSpectrum;
  let spectrumTimer = 0;
  function relaySpectrum() {
    if (audio.paused && (!musicAudio || musicAudio.paused)) { spectrumTimer = 0; return; }
    const data = window.SAGetAudioSpectrum();
    if (data) {
      const values = Array.from(data);
      window.dispatchEvent(new CustomEvent('stillalive:audio-spectrum', { detail: values }));
      const frame = document.querySelector('#activity-frame');
      if (frame && !frame.hidden) frame.contentWindow.postMessage({ type: 'stillalive-audio-spectrum', values }, location.origin);
    }
    spectrumTimer = window.setTimeout(relaySpectrum, 100);
  }
  audio.volume = Number.isFinite(settings.volume) ? settings.volume : .35;
  audio.muted = settings.muted !== false;
  volumeSlider.value = String(audio.volume); volumeValue.textContent = `${Math.round(audio.volume * 100)}%`;
  function saveAudio() { SAStorage.update({ audio: { volume: audio.volume, muted: audio.muted } }); }
  function render() {
    playButton.textContent = audio.paused ? 'Play rain' : 'Pause rain';
    muteButton.textContent = audio.muted ? 'Unmute' : 'Mute';
    volumeSlider.value = String(audio.volume); volumeValue.textContent = `${Math.round(audio.volume * 100)}%`;
  }
  playButton.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); status.textContent = 'Rain paused.'; render(); return; }
    try {
      await audio.play(); status.textContent = audio.muted ? 'Rain is playing, but currently muted.' : 'Rain is playing.';
    } catch {
      status.textContent = 'The hosted rain track could not play. Check the connection and try again.';
    }
    render();
  });
  muteButton.addEventListener('click', () => {
    audio.muted = !audio.muted; saveAudio(); render();
    status.textContent = audio.muted ? 'Rain muted.' : (audio.paused ? 'Unmuted. Press Play rain to start.' : 'Rain is playing.');
  });
  volumeSlider.addEventListener('input', () => { audio.volume = Number(volumeSlider.value); saveAudio(); render(); });
  audio.addEventListener('error', () => { status.textContent = 'Hosted rain track unavailable. Check the URL or your connection.'; });
  function onMediaState() {
    const active = !audio.paused || Boolean(musicAudio && !musicAudio.paused);
    window.dispatchEvent(new CustomEvent('stillalive:audio-active', { detail: active }));
    const frame = document.querySelector('#activity-frame'); if (frame && !frame.hidden) frame.contentWindow.postMessage({ type: 'stillalive-audio-active', active }, location.origin);
    if (active && !spectrumTimer) relaySpectrum();
    else if (!active) { window.clearTimeout(spectrumTimer); spectrumTimer = 0; }
  }
  audio.addEventListener('play', () => { render(); onMediaState(); });
  audio.addEventListener('pause', () => { render(); onMediaState(); });
  if (musicAudio) { musicAudio.addEventListener('play', () => { initAnalyser(musicAudio); onMediaState(); }); musicAudio.addEventListener('pause', onMediaState); }
  render();
})();
