(() => {
  const canvases = [...document.querySelectorAll('.star-pane canvas')];
  const visualizer = document.querySelector('#laptop-visualizer');
  if (!canvases.length) return;
  const panes = canvases.map(canvas => ({ canvas, ctx: canvas.getContext('2d'), stars: [], width: 0, height: 0 }));
  const bursts = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, time = 0, audioActive = false, spectrumData = null;
  let constellations = SAStorage.get().preferences.voidConstellations !== false;

  function resize(pane) {
    const rect = pane.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pane.width = rect.width; pane.height = rect.height;
    pane.canvas.width = Math.round(rect.width * dpr); pane.canvas.height = Math.round(rect.height * dpr);
    pane.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pane.stars = Array.from({ length: 19 }, () => ({
      x: Math.random() * pane.width, y: Math.random() * pane.height,
      radius: .5 + Math.random() * 1.1, phase: Math.random() * 6.28,
      speed: .35 + Math.random() * .8
    }));
  }
  function drawPane(pane) {
    const { ctx, width, height, stars } = pane;
    ctx.clearRect(0, 0, width, height);
    const now = time / 1000;
    for (const star of stars) {
      const glow = reducedMotion ? .55 : .27 + (Math.sin(now * star.speed + star.phase) + 1) * .32;
      ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,235,255,${glow})`; ctx.shadowColor = '#a8d7ff'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
    }
    if (constellations) {
      for (let i = 0; i < stars.length; i++) for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i], b = stars[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 52) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(213,213,213,${(1 - d / 52) * .32})`; ctx.lineWidth = .6; ctx.stroke(); }
      }
    }
  }
  function drawVisualizer() {
    if (!visualizer) return;
    const ctx = visualizer.getContext('2d'), rect = visualizer.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (visualizer.width !== Math.round(rect.width * dpr) || visualizer.height !== Math.round(rect.height * dpr)) {
      visualizer.width = Math.round(rect.width * dpr); visualizer.height = Math.round(rect.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const bars = 18, gap = 2, bw = Math.max(1, (rect.width - (bars - 1) * gap) / bars);
    const spectrum = window.SAGetRainSpectrum?.() || spectrumData;
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (let i = 0; i < bars; i++) {
      const raw = spectrum ? spectrum[Math.floor(i / bars * spectrum.length)] / 255 : .12 + (Math.sin(time / 280 + i * .74) + 1) * .17;
      const h = Math.max(2, raw * rect.height * (audioActive ? 1 : .55));
      const gradient = ctx.createLinearGradient(0, rect.height - h, 0, rect.height);
      gradient.addColorStop(0, '#d5d5d5'); gradient.addColorStop(1, '#476487');
      ctx.fillStyle = gradient; ctx.fillRect(i * (bw + gap), rect.height - h, bw, h);
    }
  }
  function render(timestamp = 0) {
    raf = 0; time = timestamp;
    if (document.hidden || document.body.dataset.frameHidden === 'true') return;
    for (const pane of panes) drawPane(pane);
    for (let i = bursts.length - 1; i >= 0; i--) {
      const p = bursts[i]; p.x += p.vx; p.y += p.vy; p.life -= .025;
      const ctx = p.ctx; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fillStyle = `rgba(180,215,255,${Math.max(0,p.life)})`; ctx.fill();
      if (p.life <= 0) bursts.splice(i, 1);
    }
    drawVisualizer();
    if (!reducedMotion || bursts.length) raf = requestAnimationFrame(render);
  }
  function start() { if (!raf && !document.hidden && document.body.dataset.frameHidden !== 'true') raf = requestAnimationFrame(render); }
  function addBurst(canvas, event) {
    const rect = canvas.getBoundingClientRect(), pane = panes.find(item => item.canvas === canvas);
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2, speed = .4 + Math.random() * 1.8;
      bursts.push({ ctx: pane.ctx, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .65 + Math.random() * .35 });
    }
    start();
  }
  panes.forEach(pane => {
    resize(pane);
    pane.canvas.addEventListener('pointerdown', event => addBurst(pane.canvas, event));
    pane.canvas.addEventListener('pointermove', event => { if (event.buttons) addBurst(pane.canvas, event); });
  });
  window.addEventListener('resize', () => panes.forEach(resize));
  window.addEventListener('themechange', start);
  window.addEventListener('stillalive:music-command', event => {
    if (event.detail === 'playVideo') audioActive = true;
    if (event.detail === 'pauseVideo') audioActive = false;
    start();
  });
  window.addEventListener('stillalive:audio-active', event => { audioActive = event.detail; if (!audioActive) spectrumData = null; start(); });
  window.addEventListener('stillalive:audio-spectrum', event => { spectrumData = event.detail; audioActive = true; start(); });
  document.addEventListener('visibilitychange', start);
  document.addEventListener('stillalive:frame-visibility', start);
  start();
})();
