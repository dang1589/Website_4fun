(() => {
  const canvas = document.querySelector('#rush-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const overlay = document.querySelector('#rush-overlay');
  const startButton = document.querySelector('#rush-start');
  const secretUnlock = document.querySelector('#secret-unlock');
  const student = new Image(); student.src = 'assets/images/companion/walk-1.svg';
  const jumpSprite = new Image(); jumpSprite.src = 'assets/images/companion/jump.svg';
  const runSprite = new Image(); runSprite.src = 'assets/images/companion/walk-2.svg';
  const bossNames = ['Lab Report','Group Project','Midterm Exam','Final Exam','Thesis: Final Form'];
  const gravity = 1750, jumpVelocity = 650, jumpFlightSeconds = (2 * jumpVelocity) / gravity;
  let width = 0, height = 0, dpr = 1, raf = 0, previous = 0, walkClock = 0, frame = 0;
  let mode = 'ready', worldTime = 0, distance = 0, score = 0, energy = 100, wave = 1, speed = 250, nextSpawnDistance = 20, nextBossAt = 115, hazardsSinceCoffee = 0, lastObstacleType = '', jumpBuffer = 0, lastSavedBest = Number(SAStorage.get().bossHighScore) || 0, productivity = Number(SAStorage.get().productivity) || 0, coffees = Number(SAStorage.get().lifetimeCoffees) || 0;
  const player = { x: 95, y: 0, w: 40, h: 52, vy: 0, grounded: true };
  let obstacles = [];
  const ground = () => height - 52;

  function resize() {
    const rect = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(320, rect.width); height = Math.max(220, rect.height);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    player.x = Math.max(55, width * .15); if (player.grounded) player.y = ground() - player.h;
    paint(0);
  }
  function setOverlay(title, text, button) {
    overlay.querySelector('h2').textContent = title; overlay.querySelector('p:not(.eyebrow)').textContent = text; startButton.childNodes[0].textContent = button + ' ';
    overlay.hidden = false;
  }
  function updateHud() {
    document.querySelector('#rush-wave').textContent = `WAVE ${String(wave).padStart(2,'0')}`;
    document.querySelector('#rush-distance').textContent = String(Math.floor(distance)).padStart(3,'0');
    document.querySelector('#rush-score').textContent = Math.floor(score);
    document.querySelector('#rush-best').textContent = Math.max(lastSavedBest,Math.floor(score));
    document.querySelector('#rush-energy-bar').style.width = `${Math.max(0,energy)}%`;
    document.querySelector('#rush-energy-text').textContent = `${Math.max(0,Math.ceil(energy))}%`;
    if (distance >= 4000 && score >= 20604 && !SAStorage.get().preferences.secretRushUnlocked) {
      const preferences = SAStorage.get().preferences;
      SAStorage.update({ preferences: { ...preferences, secretRushUnlocked: true } });
    }
    secretUnlock.hidden = !(SAStorage.get().preferences.secretRushUnlocked || (distance >= 10000 && score >= 10000));
  }
  function saveBest() { if (score > lastSavedBest) { lastSavedBest = Math.floor(score); SAStorage.update({ bossHighScore: lastSavedBest }); } }
  function start() {
    if (mode === 'over') { worldTime = 0; distance = 0; score = 0; energy = 100; wave = 1; speed = 250; nextBossAt = 115; nextSpawnDistance = 20; hazardsSinceCoffee = 0; lastObstacleType = ''; jumpBuffer = 0; obstacles = []; player.vy = 0; player.grounded = true; player.y = ground() - player.h; }
    mode = 'run'; overlay.hidden = true; previous = performance.now(); scheduleFrame(); updateHud();
  }
  function scheduleFrame() { if (!raf && mode === 'run' && !document.hidden && document.body.dataset.frameHidden !== 'true') raf = requestAnimationFrame(tick); }
  function jump() {
    if (mode !== 'run') { start(); return; }
    if (player.grounded) { player.vy = -jumpVelocity; player.grounded = false; jumpBuffer = 0; }
    else jumpBuffer = .12;
  }
  function spawnObstacle() {
    const types = [
      { type:'stack', label:'LAB REPORT', w:40, h:48, color:'#2c4f7c' },
      { type:'email', label:'LECTURER EMAIL', w:43, h:56, color:'#9f687a' },
      { type:'group', label:'GROUP PROJECT', w:53, h:43, color:'#345d94' }
    ];
    const choices = types.filter(item => item.type !== lastObstacleType);
    const item = choices[Math.floor(Math.random()*choices.length)];
    lastObstacleType = item.type;
    obstacles.push({ ...item, x:width+30, y:ground()-item.h, hit:false });
  }
  function spawnBoss() {
    const idx = (wave-1)%bossNames.length;
    obstacles.push({ type:'boss', label:bossNames[idx], w:76, h:79, color:'#a36f7d', x:width+40, y:ground()-79, hp:1, hit:false });
    nextBossAt = distance + 190;
  }
  function addCoffee() { obstacles.push({ type:'coffee', label:'COFFEE', w:25, h:29, color:'#dfb875', x:width+30, y:ground()-95-Math.random()*38, hit:false }); }
  function scheduleNextPattern() {
    const rewardBeat = hazardsSinceCoffee >= 4 || Math.random() < .18;
    let gapPixels;
    if (rewardBeat) {
      addCoffee();
      hazardsSinceCoffee = 0;
      gapPixels = speed * (jumpFlightSeconds + .45 + Math.random() * .18) + 35;
    } else {
      spawnObstacle();
      hazardsSinceCoffee++;
      const landingBuffer = .06 + Math.random() * .06;
      gapPixels = speed * (jumpFlightSeconds + landingBuffer) + 13;
    }
    nextSpawnDistance = distance + gapPixels / 14;
  }
  function intersect(a,b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
  function collide(item, index) {
    if (item.type === 'coffee') {
      energy = Math.min(100,energy+18); score += 35; coffees++;
      SAStorage.update({ lifetimeCoffees: coffees });
      window.dispatchEvent(new CustomEvent('stillalive:progress',{detail:{productivity,coffees}}));
      obstacles.splice(index,1); return true;
    }
    if (item.type === 'boss' && player.vy > 0 && player.y+player.h < item.y+28) {
      item.hp--;
      if (item.hp <= 0) {
        score += 1000 + wave*100; productivity += 25; wave++;
        saveBest();
        SAStorage.update({ productivity });
        window.dispatchEvent(new CustomEvent('stillalive:progress',{detail:{productivity,coffees}}));
        if (energy < 10) window.dispatchEvent(new CustomEvent('stillalive:barely-passing'));
        window.dispatchEvent(new CustomEvent('stillalive:boss-defeated',{detail:{wave:wave-1,score}}));
        player.vy = -310; player.grounded = false; obstacles.splice(index,1); return true;
      }
    }
    if (!item.hit) { item.hit=true; energy=Math.max(0,energy-(item.type==='boss'?32:24)); if(item.type==='boss') nextBossAt=distance+70; obstacles.splice(index,1); }
    return true;
  }
  function drawBackground(t) {
    const day = document.documentElement.dataset.theme === 'day';
    const base = day ? '#aebed1' : '#010818'; ctx.fillStyle=base; ctx.fillRect(0,0,width,height);
    const glow=ctx.createLinearGradient(0,0,0,height);glow.addColorStop(0,day?'#cfd3df':'#031435');glow.addColorStop(1,day?'#d6bfa0':'#010818');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=day?'rgba(255,244,204,.72)':'rgba(213,213,213,.85)';
    for(let i=0;i<34;i++){const x=(i*137-(t*speed*.12)%(width+30)+width+30)%(width+30),y=18+(i*53)%(height*.58);ctx.fillRect(x,y,2,2);}
    ctx.fillStyle=day?'rgba(115,128,154,.18)':'rgba(77,163,255,.12)';
    for(let i=0;i<7;i++){const bx=i*190-(t*speed*.18)%(width+190);ctx.beginPath();ctx.ellipse(bx,height-74,115,45,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=day?'#606c83':'#020e24';ctx.fillRect(0,ground(),width,height-ground());
    ctx.fillStyle=day?'#c7a878':'#4da3ff';ctx.fillRect(0,ground(),width,3);
    ctx.fillStyle=day?'rgba(30,38,55,.24)':'rgba(77,163,255,.18)';
    for(let i=0;i<14;i++){const x=(i*91-(t*speed*.75)%(width+30)+width+30)%(width+30);ctx.fillRect(x,ground()+20,35,2);}
  }
  function drawObstacle(item) {
    if(item.type==='coffee') { ctx.font='27px sans-serif';ctx.textAlign='center';ctx.fillText('☕',item.x+item.w/2,item.y+25);return; }
    ctx.fillStyle=item.color;ctx.beginPath();ctx.roundRect(item.x,item.y,item.w,item.h,5);ctx.fill();
    ctx.fillStyle='rgba(255,245,232,.78)';ctx.fillRect(item.x+8,item.y+10,item.w-16,4);ctx.fillRect(item.x+8,item.y+21,item.w-19,3);
    if(item.type==='boss') {ctx.font='27px sans-serif';ctx.textAlign='center';ctx.fillText('👾',item.x+item.w/2,item.y-5);ctx.font='8px var(--mono)';ctx.fillStyle='#fff1d8';ctx.fillText(item.label,item.x+item.w/2,item.y+item.h+12);}
  }
  function paint(t) {
    drawBackground(t);
    for(const item of obstacles) drawObstacle(item);
    const image = player.grounded ? (Math.floor(t*8)%2 ? runSprite : student) : jumpSprite;
    if(image.complete && image.naturalWidth) ctx.drawImage(image,player.x-13,player.y-11,player.w+24,player.h+18);
    else {ctx.fillStyle='#b49bd7';ctx.beginPath();ctx.roundRect(player.x,player.y,player.w,player.h,12);ctx.fill();}
    if(mode==='run' && obstacles.some(item=>item.type==='boss'&&item.x<width*.68&&item.x>player.x)) {
      const boss=obstacles.find(item=>item.type==='boss'&&item.x<width*.68&&item.x>player.x);
      ctx.fillStyle='#f0d59c';ctx.font='11px var(--mono)';ctx.textAlign='center';ctx.fillText(`BOSS: ${boss.label}`,width/2,27);
    }
  }
  function tick(timestamp) {
    raf=0;if(mode!=='run'||document.hidden)return;
    const dt=Math.min(.035,(timestamp-previous)/1000||.016);previous=timestamp;worldTime+=dt;distance+=dt*(speed/14);speed=Math.min(390,250+distance*.12);score+=dt*4;jumpBuffer=Math.max(0,jumpBuffer-dt);
    walkClock+=dt;if(walkClock>.24){walkClock=0;frame=1-frame;}
    if(distance>=nextBossAt&&!obstacles.some(item=>item.type==='boss')) spawnBoss();
    if(obstacles.some(item=>item.type==='boss')) nextSpawnDistance=Math.max(nextSpawnDistance,distance+18);
    else if(distance>=nextSpawnDistance) scheduleNextPattern();
    player.vy+=gravity*dt;player.y+=player.vy*dt;
    if(player.y+player.h>=ground()){
      player.y=ground()-player.h;player.vy=0;player.grounded=true;
      if(jumpBuffer>0){player.vy=-jumpVelocity;player.grounded=false;jumpBuffer=0;}
    }
    for(let i=obstacles.length-1;i>=0;i--){const item=obstacles[i];item.x-=speed*dt;if(intersect(player,item))collide(item,i);else if(item.x+item.w<-20)obstacles.splice(i,1);}
    updateHud();paint(worldTime);
    if(energy<=0){mode='over';saveBest();overlay.hidden=false;setOverlay('Deadline reached you.',`You made it ${Math.floor(distance)} metres and scored ${Math.floor(score)}. Rest, then try again.`,'Run again');window.dispatchEvent(new CustomEvent('stillalive:runner-over',{detail:{score,distance}}));return;}
    scheduleFrame();
  }
  function startClick(){start();}
  document.querySelector('#secret-unlock-button').addEventListener('click', () => {
    if (SAStorage.get().preferences.secretRushUnlocked && window.confirm('You made it far enough. Want to unlock the easter eggs?')) location.href = 'secret.html';
  });
  startButton.addEventListener('click',startClick);canvas.addEventListener('pointerdown',()=>{if(mode==='run')jump();});
  document.addEventListener('keydown',event=>{if(!document.body.classList.contains('game-body')||event.target.closest('input,textarea,select,button,dialog'))return;if(['Space','ArrowUp','KeyW'].includes(event.code)){event.preventDefault();jump();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else scheduleFrame();});
  document.addEventListener('stillalive:frame-visibility',event=>{if(!event.detail){if(raf)cancelAnimationFrame(raf);raf=0;}else{previous=performance.now();scheduleFrame();}});
  window.addEventListener('resize',resize);window.addEventListener('themechange',()=>paint(worldTime));
  resize();updateHud();
})();
