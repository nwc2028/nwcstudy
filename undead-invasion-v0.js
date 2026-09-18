(() => {
  'use strict';
  const core = window.UndeadCore, renderer = window.UndeadRender;
  const $ = id => document.getElementById('ui-' + id);
  const canvas = $('canvas'), ctx = canvas.getContext('2d', { alpha: false });
  const keys = new Set(), coarse = matchMedia('(pointer:coarse)');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
  const input = { x: 0, y: 0, aimX: 850, aimY: 445, fire: false };
  let state = core.createState(), screen = 'title', paused = false, lastTime = 0, playground = false;
  let bestDay = 0, stickX = 0, stickY = 0, stickPointer = null, aimPointer = null, touchFiring = false;
  let soundOn = false, audioContext = null, lastShotSound = 0;
  try { bestDay = Number(localStorage.getItem('undead-invasion-v0-best')) || 0; } catch {}
  $('best').textContent = bestDay ? 'survivor · best day ' + String(bestDay).padStart(2, '0') : 'survivor';

  function clearInput() {
    keys.clear(); input.x = input.y = 0; input.fire = false;
    stickX = stickY = 0; stickPointer = aimPointer = null; touchFiring = false;
    $('stick').firstElementChild.style.transform = '';
  }

  function setScreen(next) {
    screen = next;
    for (const name of ['title', 'shop', 'pause', 'ending']) $(name).hidden = name !== next;
    const inRun = next === 'playing';
    $('hud').hidden = !(inRun || next === 'pause');
    $('touch').hidden = !inRun;
    $('pause-button').hidden = !inRun && next !== 'pause';
    $('pause-button').textContent = next === 'pause' ? 'RESUME · P' : 'PAUSE · P';
    clearInput();
    if (next === 'playing') canvas.focus({ preventScroll: true });
    else ({ title: $('start'), shop: $('next-day'), pause: $('resume'), ending: $('retry') })[next]?.focus({ preventScroll: true });
  }

  function beginRun() {
    state = core.createState(); playground = false; paused = false; lastTime = 0;
    core.startDay(state); setScreen('playing'); updateHUD(); recordBest();
    resumeAudio();
  }

  function prepareDefense() {
    state = core.createState(); playground = false; paused = false; lastTime = 0;
    showShop();
  }

  function beginPlayground() {
    state = core.createState(); playground = true; paused = false; lastTime = 0;
    state.coins = 9999;
    core.buy(state, 'smg');
    core.buy(state, 'shotgun');
    core.buy(state, 'barricade');
    core.buy(state, 'trap'); core.buy(state, 'trap'); core.buy(state, 'trap');
    while (state.player.grenades < 5) core.buy(state, 'grenade');
    core.equip(state, 'smg');
    state.base.hp = state.base.maxHp = 9999;
    state.barricade.hp = state.barricade.maxHp = 9999;
    core.startDay(state); setScreen('playing'); updateHUD();
    state.message = 'PLAYGROUND — full arsenal, endless waves.'; state.messageTimer = 4;
    resumeAudio();
  }

  function togglePause() {
    if (state.mode !== 'playing' || screen === 'title') return;
    paused = !paused; lastTime = 0;
    setScreen(paused ? 'pause' : 'playing');
  }

  function returnToTitle() {
    state = core.createState(); playground = false; paused = false; lastTime = 0;
    setScreen('title');
  }

  function updateHUD() {
    const p = state.player, weapon = core.WEAPONS[p.weapon];
    $('day-number').textContent = String(state.day).padStart(2, '0');
    $('hostiles').textContent = state.spawnRemaining + state.enemies.length;
    $('kills').textContent = state.kills;
    $('coins').textContent = '$' + state.coins;
    $('health').textContent = Math.ceil(p.hp);
    $('base').textContent = Math.ceil(state.base.hp);
    $('health-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    $('base-fill').style.width = Math.max(0, state.base.hp / state.base.maxHp * 100) + '%';
    $('weapon').textContent = p.reloadTimer > 0 ? 'RELOADING… ' + p.reloadTimer.toFixed(1) + 's' : weapon.name.toUpperCase();
    $('ammo').replaceChildren(document.createTextNode(p.ammo + ' '));
    const reserve = document.createElement('small'); reserve.textContent = '/ ' + weapon.clip; $('ammo').appendChild(reserve);
    $('grenades').textContent = p.grenades + ' GRENADES · G';
    $('message').textContent = state.messageTimer > 0 ? state.message : '';
  }

  const itemIcons = { smg: '━╤━', shotgun: '━━╤', heal: '✚', repair: '⌂', barricade: '╳╳', trap: '▴▴▴', grenade: '●' };
  function showShop() {
    $('shop-title').textContent = state.day ? 'DAY ' + String(state.day).padStart(2, '0') + ' SECURED.' : 'BEFORE THE HORDE.';
    $('shop-copy').textContent = state.day ? state.dayKills + ' undead stopped. Rearm for the next wave.' : 'Start with $100. Build a barricade or save for a better weapon.';
    $('next-day').replaceChildren(document.createTextNode('DEFEND DAY ' + String(state.day + 1).padStart(2, '0') + ' '));
    const arrow = document.createElement('span'); arrow.textContent = '↗'; $('next-day').appendChild(arrow);
    $('shop-status').textContent = 'Repair the orphanage and keep yourself alive. Supplies carry over.';
    renderShop(); setScreen('shop');
  }

  function renderShop() {
    $('shop-coins').textContent = '$' + state.coins;
    const grid = $('shop-grid'); grid.replaceChildren();
    for (const item of core.SHOP) {
      const card = document.createElement('article'); card.className = 'ui-item';
      const icon = document.createElement('div'); icon.className = 'ui-item-icon'; icon.textContent = itemIcons[item.id] || '+'; icon.setAttribute('aria-hidden', 'true');
      const title = document.createElement('h3'); title.textContent = item.name;
      const description = document.createElement('p'); description.textContent = item.description;
      const button = document.createElement('button'); button.type = 'button';
      const owned = state.player.owned.includes(item.id), equipped = state.player.weapon === item.id;
      let full = item.id === 'heal' && state.player.hp >= state.player.maxHp || item.id === 'repair' && state.base.hp >= state.base.maxHp || item.id === 'barricade' && state.barricade.hp >= state.barricade.maxHp || item.id === 'trap' && state.trap.level >= 3 || item.id === 'grenade' && state.player.grenades >= 5;
      button.textContent = owned ? (equipped ? 'EQUIPPED' : 'EQUIP') : full ? 'FULL' : '$' + item.price + ' · BUY';
      button.disabled = owned ? equipped : full || state.coins < item.price;
      button.setAttribute('aria-label', item.name + ' — ' + button.textContent);
      button.addEventListener('click', () => {
        const success = owned ? core.equip(state, item.id) : core.buy(state, item.id);
        $('shop-status').textContent = success ? item.name + (owned ? ' equipped.' : ' ready. Keep the line standing.') : 'Not available right now.';
        if (success) playTone('buy');
        renderShop();
      });
      card.append(icon, title, description, button); grid.appendChild(card);
    }
    if (!state.player.owned.includes('pistol')) return;
    const card = document.createElement('article'); card.className = 'ui-item';
    const title = document.createElement('h3'); title.textContent = core.WEAPONS.pistol.name;
    const description = document.createElement('p'); description.textContent = 'Reliable sidearm. Unlimited spare magazines.';
    const button = document.createElement('button'); button.type = 'button'; button.textContent = state.player.weapon === 'pistol' ? 'EQUIPPED' : 'EQUIP'; button.disabled = state.player.weapon === 'pistol'; button.setAttribute('aria-label', 'Service pistol — ' + button.textContent);
    button.addEventListener('click', () => { core.equip(state, 'pistol'); renderShop(); });
    card.append(title, description, button); grid.appendChild(card);
  }

  function showEnding() {
    $('ending-title').textContent = state.base.hp <= 0 ? 'OUTPOST LOST.' : 'OVERRUN.';
    $('ending-copy').textContent = state.base.hp <= 0 ? 'The orphanage fell. Rebuild your defenses and make another stand.' : 'The horde broke through. Keep your distance and save a grenade for the crowd.';
    $('result-day').textContent = String(state.day).padStart(2, '0'); $('result-kills').textContent = state.kills;
    setScreen('ending');
  }

  function recordBest() {
    if (state.day <= bestDay) return;
    bestDay = state.day;
    try { localStorage.setItem('undead-invasion-v0-best', String(bestDay)); } catch {}
    $('best').textContent = 'survivor · best day ' + String(bestDay).padStart(2, '0');
  }

  function viewTransform() {
    if (screen === 'title' || !state.player) return { zoom: 1, x: 0, y: 0 };
    const zoom = 1.68;
    const visibleWidth = 1120 / zoom, visibleHeight = 600 / zoom;
    return {
      zoom,
      x: Math.max(0, Math.min(1120 - visibleWidth, state.player.x - visibleWidth * 0.42)),
      y: Math.max(0, Math.min(600 - visibleHeight, state.player.y - visibleHeight * 0.68))
    };
  }

  function worldPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1120, rect.height / 600);
    const left = rect.left + (rect.width - 1120 * scale) / 2;
    const top = rect.top + (rect.height - 600 * scale) / 2;
    const view = viewTransform();
    return {
      x: Math.max(0, Math.min(1120, view.x + (event.clientX - left) / scale / view.zoom)),
      y: Math.max(0, Math.min(600, view.y + (event.clientY - top) / scale / view.zoom))
    };
  }
  function aim(event) { const point = worldPointer(event); input.aimX = point.x; input.aimY = point.y; }
  canvas.addEventListener('pointerdown', event => {
    if (screen !== 'playing' || event.button !== 0) return;
    aim(event); input.fire = true; aimPointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId); event.preventDefault(); resumeAudio();
  });
  canvas.addEventListener('pointermove', event => { if (event.pointerType === 'mouse' || event.pointerId === aimPointer) aim(event); });
  const stopAim = event => { if (event.pointerId === aimPointer) { input.fire = false; aimPointer = null; } };
  canvas.addEventListener('pointerup', stopAim); canvas.addEventListener('pointercancel', stopAim); canvas.addEventListener('lostpointercapture', stopAim);
  canvas.addEventListener('contextmenu', event => event.preventDefault());

  window.addEventListener('keydown', event => {
    if (event.code === 'Tab') return;
    if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat && (screen === 'playing' || screen === 'pause')) { event.preventDefault(); togglePause(); return; }
    if (screen !== 'playing' || event.target.matches('button,a,input')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'KeyR') core.reload(state);
    if (event.code === 'Space') core.kick(state);
    if (event.code === 'KeyE') core.knife(state);
    if (event.code === 'KeyG' || event.code === 'Numpad1') core.throwGrenade(state, input.aimX, input.aimY);
    if (event.code === 'KeyQ') {
      const owned = state.player.owned.filter(id => core.WEAPONS[id]);
      const current = Math.max(0, owned.indexOf(state.player.weapon));
      core.equip(state, owned[(current + 1) % owned.length]);
      updateHUD();
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { if (screen === 'playing') togglePause(); clearInput(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'playing') togglePause(); clearInput(); lastTime = 0; });

  $('stick').addEventListener('pointerdown', event => { if (screen !== 'playing') return; stickPointer = event.pointerId; $('stick').setPointerCapture(event.pointerId); moveStick(event); event.preventDefault(); });
  function moveStick(event) {
    if (event.pointerId !== stickPointer) return;
    const box = $('stick').getBoundingClientRect(), radius = box.width * .34;
    const dx = (event.clientX - box.left - box.width / 2) / radius, dy = (event.clientY - box.top - box.height / 2) / radius;
    const length = Math.max(1, Math.hypot(dx, dy)); stickX = dx / length; stickY = dy / length;
    $('stick').firstElementChild.style.transform = `translate(${stickX * radius}px,${stickY * radius}px)`;
  }
  $('stick').addEventListener('pointermove', moveStick);
  function releaseStick(event) { if (event.pointerId !== stickPointer) return; stickX = stickY = 0; stickPointer = null; $('stick').firstElementChild.style.transform = ''; }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('stick').addEventListener(type, releaseStick);
  $('touch-fire').addEventListener('pointerdown', event => {
    if (screen !== 'playing') return;
    touchFiring = true; input.fire = true; $('touch-fire').setPointerCapture(event.pointerId); event.preventDefault(); resumeAudio();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('touch-fire').addEventListener(type, () => { touchFiring = false; input.fire = aimPointer !== null; });
  $('touch-reload').addEventListener('click', () => core.reload(state));
  $('touch-knife').addEventListener('click', () => core.knife(state));
  $('touch-kick').addEventListener('click', () => core.kick(state));
  $('touch-grenade').addEventListener('click', () => core.throwGrenade(state, input.aimX, input.aimY));
  $('start').addEventListener('click', prepareDefense); $('retry').addEventListener('click', beginRun);
  $('playground').addEventListener('click', beginPlayground);
  $('pause-button').addEventListener('click', togglePause); $('resume').addEventListener('click', togglePause);
  $('quit').addEventListener('click', returnToTitle); $('menu').addEventListener('click', returnToTitle);
  $('next-day').addEventListener('click', () => { core.startDay(state); lastTime = 0; setScreen('playing'); recordBest(); });
  $('arcade').addEventListener('click', event => {
    if (window.parent !== window) { event.preventDefault(); window.parent.postMessage('undead-invasion-v0-menu', '*'); }
  });

  function resumeAudio() {
    if (!soundOn) return;
    try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume().catch(() => {}); } catch { soundOn = false; $('sound').textContent = 'SOUND UNAVAILABLE'; $('sound').disabled = true; }
  }
  $('sound').addEventListener('click', () => {
    soundOn = !soundOn; $('sound').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF'; $('sound').setAttribute('aria-pressed', String(soundOn));
    if (soundOn) { resumeAudio(); playTone('buy'); } else audioContext?.suspend().catch(() => {});
    if (screen === 'playing') canvas.focus({ preventScroll: true });
  });
  function playTone(type) {
    if (!soundOn || !audioContext || audioContext.state !== 'running') return;
    const now = audioContext.currentTime;
    if (type === 'shoot' && now - lastShotSound < .065) return;
    if (type === 'shoot') lastShotSound = now;
    const frequencies = { shoot: 100, hit: 70, kick: 85, knife: 310, blast: 42, hurt: 155, wave: 380, buy: 660, reload: 240 };
    const length = type === 'blast' ? .24 : type === 'wave' ? .25 : .08;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = type === 'buy' || type === 'wave' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequencies[type] || 160, now); oscillator.frequency.exponentialRampToValueAtTime(35, now + length);
    gain.gain.setValueAtTime(.065, now); gain.gain.exponentialRampToValueAtTime(.001, now + length);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + length);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  let hudTimer = 0;
  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - (lastTime || now)) / 1000)); lastTime = now;
    if (!document.hidden) {
      if (screen === 'playing' && !paused) {
        input.x = stickX + (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        input.y = stickY + (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
        if (touchFiring) {
          let nearest = null, distance = Infinity;
          for (const enemy of state.enemies) {
            const next = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
            if (enemy.hp > 0 && next < distance) { nearest = enemy; distance = next; }
          }
          if (nearest) { input.aimX = nearest.x; input.aimY = nearest.y - (nearest.type === 'brute' ? 30 : 24); }
          input.fire = true;
        }
        core.update(state, input, dt);
        for (const type of new Set(state.events)) playTone(type);
        if (state.mode === 'shop' && playground) {
          state.player.hp = state.player.maxHp;
          state.base.hp = state.base.maxHp;
          state.barricade.hp = state.barricade.maxHp;
          core.startDay(state);
          state.message = 'PLAYGROUND WAVE ' + state.day; state.messageTimer = 2;
        } else if (state.mode === 'shop') showShop();
        else if (state.mode === 'dead') { recordBest(); showEnding(); }
        hudTimer += dt; if (hudTimer > .08) { updateHUD(); hudTimer = 0; }
      }
      const view = viewTransform();
      renderer.draw(ctx, state, { width: 1120, height: 600, aimX: input.aimX, aimY: input.aimY, menu: screen === 'title', reducedMotion: reducedMotion.matches, zoom: view.zoom, cameraX: view.x, cameraY: view.y });
    }
    requestAnimationFrame(frame);
  }
  setScreen('title'); requestAnimationFrame(frame);
})();
