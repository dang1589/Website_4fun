(() => {
  const stage = document.querySelector('.companion-world');
  if (!stage) return;

  const creature = document.querySelector('#companion-creature');
  const sprite = document.querySelector('#companion-sprite');
  const bubble = document.querySelector('#companion-message');
  const sleepZ = document.querySelector('#sleep-z');
  const encouragement = [
    'You can take it one small thing at a time.',
    'A pause is part of making progress.',
    'You made it here. That counts for a moment.',
    'Water, a breath, and then maybe one tiny task.'
  ];
  const saved = SAStorage.get().companion || {};
  const companion = { interactions: 0, snacks: 0, friendship: 0, togetherSeconds: 0, look: 'moss', unlockedLooks: ['moss'], ...saved };
  let direction = 1;
  let moving = false;
  let asleep = false;
  let timer = 0;
  let phaseTimer = 0;
  let frame = 0;
  let positionX = 4;
  let positionY = 91;
  let wanderSessions = 0;
  let runSessions = 0;
  let wanderLimit = randomInt(3, 7);
  let runLimit = randomInt(3, 7);

  function randomInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
  function say(message) {
    bubble.textContent = message;
    bubble.classList.add('visible');
    window.clearTimeout(bubble._hide);
    bubble._hide = window.setTimeout(() => bubble.classList.remove('visible'), 5000);
  }
  function setPetVisible(visible) { document.body.classList.toggle('pet-hidden', !visible); }

  function checkLookUnlocks() {
    const looks = [
      { id: 'moon', name: 'Moon', open: companion.interactions >= 12 },
      { id: 'honey', name: 'Honey', open: companion.interactions >= 35 },
      { id: 'rose', name: 'Rose', open: companion.togetherSeconds >= 1800 }
    ];
    for (const look of looks) {
      if (look.open && !companion.unlockedLooks.includes(look.id)) {
        companion.unlockedLooks.push(look.id);
        companion.look = look.id;
        window.SAAchievements?.toast(`${look.name} look unlocked`, 'A new little look for your companion.', 'secret');
      }
    }
    creature.dataset.look = companion.look;
  }

  function setSprite(name) {
    sprite.src = `assets/images/companion/${name}.svg`;
  }

  function scheduleNext(min = 700, max = 1900) {
    window.clearTimeout(timer);
    if (document.hidden || document.body.dataset.frameHidden === 'true') {
      timer = window.setTimeout(() => scheduleNext(1200, 2200), 4000);
      return;
    }
    if (asleep) return;
    timer = window.setTimeout(move, randomInt(min, max));
  }

  function rest(kind, min, max) {
    window.clearTimeout(timer);
    asleep = kind === 'sleep';
    moving = false;
    creature.dataset.motion = asleep ? 'sleeping' : 'eating';
    sleepZ.hidden = !asleep;
    setSprite('idle');
    phaseTimer = window.setTimeout(() => {
      asleep = false;
      sleepZ.hidden = true;
      creature.dataset.motion = 'idle';
      scheduleNext();
    }, randomInt(min, max));
  }

  function restAfterSessions() {
    const kind = Math.random() < 0.5 ? 'sleep' : 'eat';
    rest(kind, kind === 'sleep' ? 4800 : 3000, kind === 'sleep' ? 9500 : 5600);
  }

  function move() {
    if (document.hidden || document.body.dataset.frameHidden === 'true' || asleep || moving) {
      scheduleNext(1200, 2200);
      return;
    }

    const mode = Math.random() < 0.58 ? 'wandering' : 'running';
    const targetX = randomInt(5, 95);
    const targetY = randomInt(5, 95);
    const normalDuration = mode === 'running' ? randomInt(1700, 3000) : randomInt(3900, 6500);
    const duration = Math.round(normalDuration / 0.3);
    direction = targetX < positionX ? -1 : 1;
    moving = true;
    creature.style.transitionDuration = `${duration}ms`;
    creature.style.left = `${targetX}%`;
    creature.style.top = `${targetY}%`;
    creature.style.transform = `translate(-50%,-50%) scaleX(${direction})`;
    creature.dataset.motion = mode;

    phaseTimer = window.setTimeout(() => {
      moving = false;
      positionX = targetX;
      positionY = targetY;
      creature.dataset.motion = 'idle';
      setSprite('idle');

      if (mode === 'running') {
        runSessions++;
      } else {
        wanderSessions++;
      }

      // Near an edge, the capybara pauses for a short nap before choosing a new destination.
      const atBorder = targetX <= 7 || targetX >= 93 || targetY <= 8 || targetY >= 91;
      if (atBorder) {
        if (mode === 'running') { runSessions = 0; runLimit = randomInt(3, 7); }
        else { wanderSessions = 0; wanderLimit = randomInt(3, 7); }
        rest('sleep', 2600, 5000);
        return;
      }

      if (mode === 'running' && runSessions >= runLimit) {
        runSessions = 0;
        runLimit = randomInt(3, 7);
        restAfterSessions();
        return;
      }
      if (mode === 'wandering' && wanderSessions >= wanderLimit) {
        wanderSessions = 0;
        wanderLimit = randomInt(3, 7);
        restAfterSessions();
        return;
      }
      scheduleNext();
    }, duration);
  }

  creature.addEventListener('click', () => {
    const rect = creature.getBoundingClientRect();
    positionX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    positionY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    window.clearTimeout(timer);
    window.clearTimeout(phaseTimer);
    creature.style.transitionDuration = '0ms';
    creature.style.left = `${positionX}%`;
    creature.style.top = `${positionY}%`;
    window.requestAnimationFrame(() => { creature.style.transitionDuration = ''; });
    companion.interactions++;
    companion.friendship = Math.min(100, companion.friendship + 1);
    checkLookUnlocks();
    asleep = false;
    moving = false;
    sleepZ.hidden = true;
    creature.dataset.motion = 'jumping';
    setSprite('jump');
    SAStorage.update({ companion });
    say(['Hi. I was just passing by.', 'That was a nice hello.', 'I am glad we found this quiet place.'][randomInt(0, 2)]);
    phaseTimer = window.setTimeout(() => {
      creature.dataset.motion = 'idle';
      setSprite('idle');
      scheduleNext();
    }, 950);
  });

  window.setInterval(() => {
    if (!document.hidden && document.body.dataset.frameHidden !== 'true') {
      companion.togetherSeconds++;
      if (companion.togetherSeconds % 30 === 0) SAStorage.update({ companion });
      if (companion.togetherSeconds % 60 === 0) { checkLookUnlocks(); SAStorage.update({ companion }); }
    }
  }, 1000);

  window.setInterval(() => {
    if (!moving) return;
    frame = 1 - frame;
    setSprite(`walk-${frame + 1}`);
  }, 260);

  document.addEventListener('visibilitychange', () => scheduleNext(500, 1000));
  document.addEventListener('stillalive:frame-visibility', () => scheduleNext(500, 1000));
  window.addEventListener('pet-visibility-change', event => setPetVisible(event.detail));
  setPetVisible(SAStorage.get().preferences.petVisible !== false);
  creature.dataset.look = companion.look;
  scheduleNext(800, 1800);
})();
