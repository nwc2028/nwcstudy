(function (root) {
  'use strict';

  // All coordinates and timers live here; this module has no browser dependencies.
  const WEAPONS = Object.freeze({
    pistol: Object.freeze({ name: 'Service pistol', clip: 12, reload: 1.15, cooldown: 0.25, damage: 26, speed: 1400, pellets: 1, spread: 0, price: 0 }),
    smg: Object.freeze({ name: 'Submachine gun', clip: 30, reload: 1.5, cooldown: 0.09, damage: 20, speed: 1600, pellets: 1, spread: 0.045, price: 180 }),
    shotgun: Object.freeze({ name: 'Pump shotgun', clip: 6, reload: 1.7, cooldown: 0.7, damage: 22, speed: 1300, pellets: 7, spread: 0.23, price: 260 })
  });
  const SHOP = Object.freeze([
    { id: 'smg', name: 'Submachine gun', description: '30 rounds. Rapid fire for a crowded fence.', price: 180 },
    { id: 'shotgun', name: 'Pump shotgun', description: 'Seven pellets per shell. Clear the front line.', price: 260 },
    { id: 'heal', name: 'First aid', description: 'Restore all survivor health.', price: 60 },
    { id: 'repair', name: 'Orphanage repair', description: 'Restore all orphanage integrity.', price: 75 },
    { id: 'barricade', name: 'Barricade', description: 'Build or fully repair a 180 HP barricade.', price: 100 },
    { id: 'trap', name: 'Spike strip', description: 'Damage and slow enemies. Upgrade up to level 3.', price: 125 },
    { id: 'grenade', name: 'Grenade', description: 'Add one grenade, up to five carried.', price: 45 }
  ].map(Object.freeze));

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const finite = (n, fallback) => Number.isFinite(n) ? n : fallback;
  const torsoY = enemy => enemy.y - (enemy.type === 'brute' ? 30 : 24);
  const radiusX = enemy => enemy.type === 'brute' ? 25 : 17;
  const radiusY = enemy => enemy.type === 'brute' ? 36 : 28;
  function random(s) {
    s._seed = (Math.imul(s._seed, 1664525) + 1013904223) >>> 0;
    return s._seed / 4294967296;
  }
  function event(s, name) {
    const list = s._updating ? s.events : s._pendingEvents;
    if (list.length < 40) list.push(name);
  }
  function message(s, text, seconds = 2.5) {
    s.message = text;
    s.messageTimer = seconds;
  }
  function effect(s, type, x, y, life, radius) {
    if (s.effects.length >= 50) s.effects.shift();
    s.effects.push({ type, x, y, life, maxLife: life, radius });
  }
  function particles(s, x, y, color, count, force = 70) {
    for (let i = 0; i < count && s.particles.length < 220; i++) {
      const angle = random(s) * Math.PI * 2;
      const speed = (0.25 + random(s) * 0.75) * force;
      const life = 0.2 + random(s) * 0.4;
      s.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 20,
        life, maxLife: life, color, size: 2 + random(s) * 3 });
    }
  }

  function createState() {
    return {
      time: 0, mode: 'ready', day: 0, coins: 100, kills: 0, dayKills: 0,
      spawnRemaining: 0, spawnTimer: 0, message: 'Build a barricade, or save for a better weapon.', messageTimer: 8,
      player: { x: 260, y: 470, hp: 100, maxHp: 100, weapon: 'pistol', ammo: WEAPONS.pistol.clip,
        reloadTimer: 0, fireTimer: 0, kickTimer: 0, knifeTimer: 0, grenades: 2, facing: 1, owned: ['pistol'] },
      base: { hp: 100, maxHp: 100 }, barricade: { x: 430, hp: 0, maxHp: 180 },
      trap: { x: 650, level: 0, cooldown: 0 }, enemies: [], corpses: [], bullets: [], particles: [], grenades: [], effects: [], events: [],
      _seed: 912730, _nextId: 1, _spawned: 0, _hurtTimer: 0, _pendingEvents: [], _updating: false
    };
  }

  function startDay(s) {
    if (s.mode !== 'ready' && s.mode !== 'shop') return false;
    s.day++;
    s.mode = 'playing';
    s.dayKills = 0;
    s.spawnRemaining = Math.min(48, 8 + s.day * 2);
    s.spawnTimer = 0.65;
    s._spawned = 0;
    s._hurtTimer = 0;
    s.player.reloadTimer = 0;
    s.player.fireTimer = 0;
    s.player.kickTimer = 0;
    s.player.knifeTimer = 0;
    s.player.ammo = WEAPONS[s.player.weapon].clip;
    s.bullets.length = 0;
    s.grenades.length = 0;
    message(s, s.day % 5 === 0 ? 'Day ' + s.day + ' — a siege brute is coming.' : 'Day ' + s.day + ' — hold the orphanage!', 3);
    event(s, 'wave');
    return true;
  }

  function reload(s) {
    const p = s.player;
    const w = WEAPONS[p.weapon];
    if (s.mode !== 'playing' || p.reloadTimer > 0 || p.ammo >= w.clip) return false;
    p.reloadTimer = w.reload;
    event(s, 'reload');
    return true;
  }

  function hit(s, enemy, damage, push = 0) {
    if (enemy.hp <= 0) return;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitTimer = 0.13;
    enemy.x = Math.min(1140, enemy.x + push);
    particles(s, enemy.x, torsoY(enemy), '#98b974', 3);
    event(s, 'hit');
    if (enemy.hp === 0) {
      s.kills++;
      s.dayKills++;
      s.coins += enemy._boss ? 65 : enemy.type === 'brute' ? 25 : enemy.type === 'runner' ? 14 : 10;
      if (s.corpses.length >= 28) s.corpses.shift();
      s.corpses.push({ x: enemy.x, y: enemy.y, type: enemy.type, life: 24, flip: random(s) > 0.5 ? 1 : -1 });
      particles(s, enemy.x, enemy.y - 15, '#60795c', 10, 105);
    }
  }

  function kick(s) {
    const p = s.player;
    if (s.mode !== 'playing' || p.kickTimer > 0) return false;
    p.kickTimer = 0.8;
    effect(s, 'kick', p.x + p.facing * 42, p.y - 20, 0.22, 63);
    event(s, 'kick');
    for (const enemy of s.enemies) {
      const forward = (enemy.x - p.x) * p.facing;
      if (forward >= -18 && forward <= 100 && Math.abs(enemy.y - p.y) < 48) {
        hit(s, enemy, 35, p.facing * (enemy.type === 'brute' ? 15 : 58));
        enemy.attackTimer = Math.max(enemy.attackTimer, 0.55);
      }
    }
    return true;
  }

  function knife(s) {
    const p = s.player;
    if (s.mode !== 'playing' || p.knifeTimer > 0) return false;
    p.knifeTimer = 0.45;
    effect(s, 'knife', p.x + p.facing * 35, p.y - 23, 0.18, 58);
    event(s, 'knife');
    for (const enemy of s.enemies) {
      const forward = (enemy.x - p.x) * p.facing;
      if (forward >= -8 && forward <= 70 && Math.abs(enemy.y - p.y) < 44) {
        hit(s, enemy, 62, p.facing * (enemy.type === 'brute' ? 8 : 22));
        enemy.attackTimer = Math.max(enemy.attackTimer, 0.35);
      }
    }
    return true;
  }

  function throwGrenade(s, aimX, aimY) {
    const p = s.player;
    if (s.mode !== 'playing' || p.grenades <= 0 || s.grenades.length >= 5) return false;
    p.grenades--;
    s.grenades.push({ x: p.x, y: p.y - 32, targetX: clamp(finite(aimX, p.x + 220), 110, 1100),
      targetY: clamp(finite(aimY, p.y - 24), 340, 545), timer: 0.65 });
    return true;
  }

  function equip(s, id) {
    if ((s.mode !== 'ready' && s.mode !== 'shop') || !WEAPONS[id] || !s.player.owned.includes(id)) return false;
    s.player.weapon = id;
    s.player.ammo = WEAPONS[id].clip;
    s.player.reloadTimer = 0;
    s.player.fireTimer = 0;
    return true;
  }

  function buy(s, id) {
    if (s.mode !== 'ready' && s.mode !== 'shop') return false;
    const item = SHOP.find(entry => entry.id === id);
    if (!item || s.coins < item.price) return false;
    if (WEAPONS[id]) {
      if (s.player.owned.includes(id)) return false;
      s.player.owned.push(id);
      equip(s, id);
    } else if (id === 'heal') {
      if (s.player.hp >= s.player.maxHp) return false;
      s.player.hp = s.player.maxHp;
    } else if (id === 'repair') {
      if (s.base.hp >= s.base.maxHp) return false;
      s.base.hp = s.base.maxHp;
    } else if (id === 'barricade') {
      if (s.barricade.hp >= s.barricade.maxHp) return false;
      s.barricade.hp = s.barricade.maxHp;
    } else if (id === 'trap') {
      if (s.trap.level >= 3) return false;
      s.trap.level++;
    } else if (id === 'grenade') {
      if (s.player.grenades >= 5) return false;
      s.player.grenades++;
    }
    s.coins -= item.price;
    event(s, 'buy');
    message(s, item.name + ' ready.');
    return true;
  }

  function spawn(s) {
    s._spawned++;
    const boss = s.day % 5 === 0 && s.spawnRemaining === 1;
    const type = boss || (s.day >= 3 && s._spawned % 8 === 0) ? 'brute' :
      s.day >= 2 && s._spawned % 4 === 0 ? 'runner' : 'walker';
    const scale = 1 + (s.day - 1) * 0.11;
    const hp = Math.round((boss ? 330 : type === 'brute' ? 145 : type === 'runner' ? 39 : 50) * scale);
    s.enemies.push({ id: s._nextId++, x: 1100 + random(s) * 18, y: 405 + random(s) * 130,
      hp, maxHp: hp, speed: (type === 'runner' ? 58 : type === 'brute' ? 19 : 25) + Math.min(18, s.day * 1.2),
      damage: (boss ? 20 : type === 'brute' ? 13 : type === 'runner' ? 5 : 7) + Math.floor(s.day / 4),
      type, attackTimer: 0.2, hitTimer: 0, _boss: boss });
    s.spawnRemaining--;
    s.spawnTimer = Math.max(0.38, 1.42 - s.day * 0.075) * (0.8 + random(s) * 0.4);
  }

  function shoot(s, input) {
    const p = s.player;
    const w = WEAPONS[p.weapon];
    if (p.reloadTimer > 0 || p.fireTimer > 0) return;
    if (p.ammo <= 0) { reload(s); return; }
    p.ammo--;
    p.fireTimer = w.cooldown;
    const x = p.x + p.facing * 20;
    const y = p.y - 28;
    const angle = Math.atan2(finite(input.aimY, p.y - 28) - y, finite(input.aimX, p.x + 200) - x);
    for (let i = 0; i < w.pellets && s.bullets.length < 150; i++) {
      const spread = w.pellets > 1 ? ((i / (w.pellets - 1)) * 2 - 1) * w.spread : (random(s) - 0.5) * w.spread;
      const a = angle + spread;
      s.bullets.push({ x, y, px: x, py: y, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: 1.2, damage: w.damage });
    }
    effect(s, 'shot', x + Math.cos(angle) * 15, y + Math.sin(angle) * 15, 0.065, 12);
    event(s, 'shoot');
  }

  // Segment versus ellipse: the earliest intersection wins, independent of enemy array order.
  function intersection(b, enemy) {
    const rx = radiusX(enemy), ry = radiusY(enemy);
    const x = (b.px - enemy.x) / rx, y = (b.py - torsoY(enemy)) / ry;
    const dx = (b.x - b.px) / rx, dy = (b.y - b.py) / ry;
    const c = x * x + y * y - 1;
    if (c <= 0) return 0;
    const a = dx * dx + dy * dy;
    if (a < 1e-12) return Infinity;
    const q = 2 * (x * dx + y * dy);
    const d = q * q - 4 * a * c;
    if (d < 0) return Infinity;
    const t = (-q - Math.sqrt(d)) / (2 * a);
    return t >= 0 && t <= 1 ? t : Infinity;
  }

  function updateBullets(s, dt) {
    for (const b of s.bullets) {
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      let target = null, nearest = Infinity;
      for (const enemy of s.enemies) {
        if (enemy.hp <= 0) continue;
        const t = intersection(b, enemy);
        if (t < nearest) { nearest = t; target = enemy; }
      }
      if (target) { hit(s, target, b.damage); b.life = 0; }
    }
    s.bullets = s.bullets.filter(b => b.life > 0 && b.x > -30 && b.x < 1180 && b.y > -30 && b.y < 650);
  }

  function updateGrenades(s, dt) {
    for (const grenade of s.grenades) {
      const step = Math.min(1, dt / Math.max(0.001, grenade.timer));
      grenade.x += (grenade.targetX - grenade.x) * step;
      grenade.y += (grenade.targetY - grenade.y) * step;
      grenade.timer -= dt;
      if (grenade.timer > 0) continue;
      effect(s, 'blast', grenade.x, grenade.y, 0.48, 150);
      particles(s, grenade.x, grenade.y, '#ffb45d', 34, 220);
      event(s, 'blast');
      for (const enemy of s.enemies) {
        const distance = Math.hypot(enemy.x - grenade.x, torsoY(enemy) - grenade.y);
        if (distance < 150) hit(s, enemy, 150 - distance * 0.45, 35);
      }
    }
    s.grenades = s.grenades.filter(g => g.timer > 0);
  }

  function damagePlayer(s, amount) {
    if (s._hurtTimer > 0) return;
    s.player.hp = Math.max(0, s.player.hp - amount);
    s._hurtTimer = 0.38;
    particles(s, s.player.x, s.player.y - 24, '#ef906a', 5);
    event(s, 'hurt');
  }

  function updateEnemies(s, dt) {
    const p = s.player;
    s.trap.cooldown = Math.max(0, s.trap.cooldown - dt);
    let triggerTrap = false;
    for (const enemy of s.enemies) {
      if (enemy.hp <= 0) continue;
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      enemy.hitTimer = Math.max(0, enemy.hitTimer - dt);
      const trapped = s.trap.level > 0 && Math.abs(enemy.x - s.trap.x) < 39;
      if (trapped && s.trap.cooldown <= 0) {
        hit(s, enemy, 16 + s.trap.level * 12);
        triggerTrap = true;
        if (enemy.hp <= 0) continue;
      }
      const speed = enemy.speed * (trapped ? Math.max(0.25, 0.65 - s.trap.level * 0.1) : 1);
      const wallBetween = s.barricade.hp > 0 && p.x < s.barricade.x && enemy.x >= s.barricade.x;
      const playerNear = Math.abs(enemy.x - p.x) < 190 && Math.abs(enemy.y - p.y) < 82 && !wallBetween;
      const wallContact = s.barricade.hp > 0 && enemy.x >= s.barricade.x && enemy.x <= s.barricade.x + radiusX(enemy) + 9;
      if (playerNear) {
        const dx = p.x - enemy.x, dy = p.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 34) {
          enemy.x += dx / distance * speed * dt;
          enemy.y += dy / distance * speed * dt;
        } else if (enemy.attackTimer <= 0) {
          damagePlayer(s, enemy.damage);
          enemy.attackTimer = enemy.type === 'runner' ? 0.72 : 0.95;
        }
      } else if (wallContact) {
        if (enemy.attackTimer <= 0) {
          s.barricade.hp = Math.max(0, s.barricade.hp - enemy.damage);
          enemy.attackTimer = 1;
          particles(s, s.barricade.x, enemy.y - 20, '#c0a176', 3);
          if (s.barricade.hp === 0) message(s, 'Barricade down! Protect the orphanage.');
        }
      } else if (enemy.x <= 106) {
        if (enemy.attackTimer <= 0) {
          s.base.hp = Math.max(0, s.base.hp - enemy.damage);
          enemy.attackTimer = 1.1;
          event(s, 'hurt');
          particles(s, 91, enemy.y - 26, '#f0ba74', 5);
          message(s, 'The orphanage is under attack!', 0.8);
        }
      } else {
        const nextX = enemy.x - speed * dt;
        const stopX = s.barricade.x + radiusX(enemy) + 8;
        enemy.x = s.barricade.hp > 0 && enemy.x >= stopX ? Math.max(stopX, nextX) : nextX;
      }
    }
    if (triggerTrap) s.trap.cooldown = 0.9;
    s.enemies = s.enemies.filter(enemy => enemy.hp > 0);
  }

  function update(s, input = {}, delta = 0) {
    s.events.length = 0;
    s.events.push(...s._pendingEvents.splice(0));
    s._updating = true;
    const dt = clamp(finite(delta, 0), 0, 0.05);
    s.time += dt;
    s.messageTimer = Math.max(0, s.messageTimer - dt);
    for (const particle of s.particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      particle.vy += 110 * dt; particle.life -= dt;
    }
    s.particles = s.particles.filter(p => p.life > 0);
    for (const e of s.effects) e.life -= dt;
    s.effects = s.effects.filter(e => e.life > 0);
    for (const corpse of s.corpses) corpse.life -= dt;
    s.corpses = s.corpses.filter(corpse => corpse.life > 0);
    if (s.mode !== 'playing' || dt <= 0) { s._updating = false; return; }
    const p = s.player;
    if (p.hp <= 0 || s.base.hp <= 0) { die(s); s._updating = false; return; }
    let moveX = clamp(finite(input.x, 0), -1, 1), moveY = clamp(finite(input.y, 0), -1, 1);
    const length = Math.hypot(moveX, moveY);
    if (length > 1) { moveX /= length; moveY /= length; }
    p.x = clamp(p.x + moveX * 185 * dt, 105, 1060);
    p.y = clamp(p.y + moveY * 185 * dt, 390, 550);
    if (Number.isFinite(input.aimX) && Math.abs(input.aimX - p.x) > 1) p.facing = input.aimX >= p.x ? 1 : -1;
    p.fireTimer = Math.max(0, p.fireTimer - dt);
    p.kickTimer = Math.max(0, p.kickTimer - dt);
    p.knifeTimer = Math.max(0, p.knifeTimer - dt);
    s._hurtTimer = Math.max(0, s._hurtTimer - dt);
    if (p.reloadTimer > 0) {
      p.reloadTimer = Math.max(0, p.reloadTimer - dt);
      if (p.reloadTimer === 0) p.ammo = WEAPONS[p.weapon].clip;
    }
    if (input.fire) shoot(s, input);
    s.spawnTimer -= dt;
    if (s.spawnRemaining > 0 && s.spawnTimer <= 0 && s.enemies.length < 64) spawn(s);
    updateBullets(s, dt);
    updateGrenades(s, dt);
    updateEnemies(s, dt);
    if (p.hp <= 0 || s.base.hp <= 0) die(s);
    else if (s.spawnRemaining === 0 && s.enemies.length === 0) {
      s.mode = 'shop';
      const bonus = 40 + s.day * 15;
      s.coins += bonus;
      s.bullets.length = 0;
      s.grenades.length = 0;
      message(s, 'Day ' + s.day + ' survived! +' + bonus + ' supply bonus.', 30);
      event(s, 'wave');
    }
    s._updating = false;
  }

  function die(s) {
    s.mode = 'dead';
    s.player.hp = Math.max(0, s.player.hp);
    s.base.hp = Math.max(0, s.base.hp);
    message(s, s.base.hp <= 0 ? 'The orphanage has fallen.' : 'Your last stand is over.', 99);
    event(s, 'hurt');
  }

  const api = Object.freeze({ createState, startDay, update, reload, kick, knife, throwGrenade, buy, equip, WEAPONS, SHOP });
  root.UndeadCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
