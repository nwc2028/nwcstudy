/* Dead Air — original, asset-free station renderer. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const relayLabel = relay => typeof relay.id === 'string' ? relay.id.padStart(2, '0') : String((Number(relay.id) || 0) + 1).padStart(2, '0');
  const hash = (x, y, z = 0) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const rounded = (c, x, y, w, h, r) => {
    c.beginPath();
    c.roundRect(x, y, w, h, r);
  };

  class DeadAirRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.lightCanvas = document.createElement('canvas');
      this.light = this.lightCanvas.getContext('2d');
      this.world = document.createElement('canvas');
      this.camera = { x: 3.5, y: 11.5 };
      this.initialized = false;
      this.cachedGrid = null;
      this.worldTile = 72;
      this.resize();
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, r.width || this.canvas.clientWidth || window.innerWidth);
      this.height = Math.max(1, r.height || this.canvas.clientHeight || window.innerHeight);
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.lightCanvas.width = this.canvas.width;
      this.lightCanvas.height = this.canvas.height;
      this.scale = clamp(Math.min(this.width / 15.5, this.height / 10.2), 38, 68);
      this.ctx.imageSmoothingEnabled = true;
    }

    screenToWorld(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) * this.width / Math.max(1, r.width) - this.width / 2) / this.scale + this.camera.x,
        y: ((clientY - r.top) * this.height / Math.max(1, r.height) - this.height * 0.52) / this.scale + this.camera.y
      };
    }

    worldTransform(c) {
      c.translate(this.width / 2, this.height * 0.52);
      c.scale(this.scale, this.scale);
      c.translate(-this.camera.x, -this.camera.y);
    }

    isWall(grid, x, y) {
      const row = grid[Math.floor(y)];
      return !row || row[Math.floor(x)] === undefined || row[Math.floor(x)] === 1;
    }

    // Grid traversal gives the beam an exact wall contact without expensive pixel work.
    ray(grid, x, y, angle, distance) {
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let gx = Math.floor(x), gy = Math.floor(y);
      const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
      const deltaX = Math.abs(1 / (dx || 1e-10)), deltaY = Math.abs(1 / (dy || 1e-10));
      let nextX = (dx < 0 ? x - gx : gx + 1 - x) * deltaX;
      let nextY = (dy < 0 ? y - gy : gy + 1 - y) * deltaY;
      let travel = 0;
      for (let i = 0; i < 80 && travel < distance; i++) {
        if (nextX < nextY) { travel = nextX; nextX += deltaX; gx += sx; }
        else { travel = nextY; nextY += deltaY; gy += sy; }
        if (!grid[gy] || grid[gy][gx] === undefined || grid[gy][gx] === 1) break;
      }
      travel = Math.min(travel, distance);
      return { x: x + dx * travel, y: y + dy * travel };
    }

    visible(grid, a, b) {
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const hit = this.ray(grid, a.x, a.y, Math.atan2(b.y - a.y, b.x - a.x), distance);
      return Math.hypot(hit.x - a.x, hit.y - a.y) >= distance - 0.08;
    }

    cacheWorld(state) {
      const grid = state.grid;
      this.cachedGrid = grid;
      this.cols = state.cols || grid[0].length;
      this.rows = state.rows || grid.length;
      const t = this.worldTile;
      this.world.width = this.cols * t;
      this.world.height = this.rows * t;
      const c = this.world.getContext('2d', { alpha: false });
      c.fillStyle = '#111a20';
      c.fillRect(0, 0, this.world.width, this.world.height);
      c.scale(t, t);

      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if (grid[y][x] === 1) continue;
        const n = hash(x, y);
        const shade = Math.floor(39 + n * 8);
        c.fillStyle = `rgb(${shade - 8},${shade},${shade + 3})`;
        c.fillRect(x, y, 1, 1);
        c.strokeStyle = 'rgba(5,13,18,.44)';
        c.lineWidth = 0.017;
        c.strokeRect(x + .018, y + .018, .964, .964);
        c.strokeStyle = 'rgba(119,140,145,.11)';
        c.beginPath(); c.moveTo(x + .04, y + .965); c.lineTo(x + .96, y + .965); c.stroke();
        // Every bit of scenery is floor texture: it can never snag the player.
        if (n > .68) {
          c.strokeStyle = 'rgba(6,14,17,.42)';
          c.lineWidth = .016;
          c.beginPath();
          c.moveTo(x + .21, y + .1);
          c.lineTo(x + .3, y + .35);
          c.lineTo(x + .22, y + .54);
          c.lineTo(x + .4, y + .68);
          c.moveTo(x + .3, y + .35);
          c.lineTo(x + .52, y + .4);
          c.stroke();
        }
        if (n < .15) {
          c.fillStyle = 'rgba(93,121,132,.12)';
          c.beginPath(); c.ellipse(x + .55, y + .55, .32, .11, n * 8, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(120,154,160,.10)';
          c.lineWidth = .012;
          c.beginPath(); c.ellipse(x + .54, y + .54, .27, .07, n * 8, .2, Math.PI); c.stroke();
        }
        if (hash(x, y, 3) > .91) {
          c.fillStyle = '#19272d'; c.fillRect(x + .21, y + .27, .57, .46);
          c.strokeStyle = '#435257'; c.lineWidth = .018; c.strokeRect(x + .21, y + .27, .57, .46);
          c.strokeStyle = '#0b161c'; c.lineWidth = .04;
          for (let k = 0; k < 6; k++) {
            c.beginPath(); c.moveTo(x + .27, y + .33 + k * .064); c.lineTo(x + .72, y + .33 + k * .064); c.stroke();
          }
        }
        const neighbors = [this.isWall(grid, x, y - 1), this.isWall(grid, x + 1, y), this.isWall(grid, x, y + 1), this.isWall(grid, x - 1, y)];
        for (let side = 0; side < 4; side++) if (neighbors[side]) {
          c.save(); c.translate(x + .5, y + .5); c.rotate(side * Math.PI / 2);
          const edge = c.createLinearGradient(0, -.5, 0, -.17);
          edge.addColorStop(0, 'rgba(0,3,7,.58)'); edge.addColorStop(1, 'rgba(0,3,7,0)');
          c.fillStyle = edge; c.fillRect(-.5, -.5, 1, .34);
          c.strokeStyle = '#111c21'; c.lineWidth = .07;
          c.beginPath(); c.moveTo(-.5, -.37); c.lineTo(.5, -.37); c.stroke();
          c.strokeStyle = '#536264'; c.lineWidth = .024;
          c.beginPath(); c.moveTo(-.5, -.39); c.lineTo(.5, -.39); c.stroke();
          c.fillStyle = '#768083'; c.fillRect(-.045, -.44, .055, .13);
          if (hash(x, y, side + 9) > .76) {
            c.fillStyle = '#172329'; c.fillRect(-.29, -.46, .55, .23);
            c.strokeStyle = '#3c4c52'; c.lineWidth = .015; c.strokeRect(-.29, -.46, .55, .23);
            c.fillStyle = '#738177';
            for (let k = 0; k < 5; k++) c.fillRect(-.22 + k * .075, -.41, .035, .025);
            c.fillStyle = '#10191d'; c.fillRect(-.22, -.34, .37, .04);
          }
          c.restore();
        }
      }

      for (let i = 0; i < (state.rooms || []).length; i++) {
        const room = state.rooms[i];
        const rx = room.x, ry = room.y, rw = room.w, rh = room.h;
        if (![rx, ry, rw, rh].every(Number.isFinite)) continue;
        c.save();
        c.strokeStyle = 'rgba(175,149,95,.23)'; c.lineWidth = .025;
        c.setLineDash([.24, .13]);
        c.strokeRect(rx + .48, ry + .48, Math.max(.1, rw - .96), Math.max(.1, rh - .96));
        c.setLineDash([]);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '600 .19px ui-monospace, Consolas, monospace';
        c.fillStyle = 'rgba(164,183,181,.37)';
        const title = (room.name || 'STATION').toUpperCase();
        c.fillText(title, rx + rw / 2, ry + rh / 2 + .55, Math.max(1, rw - 1));
        c.font = '500 .13px ui-monospace, Consolas, monospace';
        c.fillStyle = 'rgba(164,183,181,.23)';
        c.fillText(`SECTOR 0${i + 1} / AUTHORIZED PERSONNEL`, rx + rw / 2, ry + rh / 2 + .83, Math.max(1, rw - 1));
        // Embedded cable tracks lead the eye along each room's edge.
        c.strokeStyle = 'rgba(10,20,24,.5)'; c.lineWidth = .035;
        for (let k = 0; k < 3; k++) {
          c.beginPath(); c.moveTo(rx + .28 + k * .05, ry + .7);
          c.lineTo(rx + .28 + k * .05, ry + rh - .55);
          c.quadraticCurveTo(rx + .28 + k * .05, ry + rh - .28, rx + .55, ry + rh - .28 - k * .05);
          c.lineTo(rx + rw - .7, ry + rh - .28 - k * .05); c.stroke();
        }
        c.restore();
      }

      // Raised bulkheads sit above the floor, with visible bevels and soft shadows.
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        if (grid[y][x] !== 1) continue;
        const n = hash(x, y, 11);
        c.fillStyle = '#0d171d'; c.fillRect(x, y, 1, 1);
        c.fillStyle = n > .5 ? '#27343a' : '#243238';
        c.fillRect(x + .055, y + .025, .89, .85);
        c.fillStyle = '#15232a'; c.fillRect(x + .055, y + .875, .89, .10);
        if (!this.isWall(grid, x, y - 1)) {
          c.fillStyle = '#526164'; c.fillRect(x + .055, y + .025, .89, .035);
          c.fillStyle = '#38484d'; c.fillRect(x + .055, y + .06, .89, .035);
        }
        if (!this.isWall(grid, x - 1, y)) { c.fillStyle = '#45555a'; c.fillRect(x + .025, y + .05, .035, .84); }
        if (!this.isWall(grid, x + 1, y)) { c.fillStyle = '#0c171d'; c.fillRect(x + .91, y + .035, .065, .92); }
        if (!this.isWall(grid, x, y + 1)) {
          c.fillStyle = '#081319'; c.fillRect(x + .025, y + .95, .95, .08);
          c.fillStyle = '#506065'; c.fillRect(x + .055, y + .835, .89, .025);
        }
        c.fillStyle = 'rgba(103,119,120,.13)'; c.fillRect(x + .11, y + .13, .035, .035);
        c.fillRect(x + .85, y + .75, .035, .035);
        if (n > .85) {
          c.strokeStyle = 'rgba(10,21,26,.38)'; c.lineWidth = .012;
          c.beginPath(); c.moveTo(x + .43, y + .1); c.lineTo(x + .51, y + .35); c.lineTo(x + .45, y + .7); c.stroke();
        }
      }
    }

    glow(c, x, y, radius, color) {
      const g = c.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    drawRelay(c, relay, time, afterDark = false) {
      const done = !!relay.done;
      const color = done ? '#6ddbbe' : '#e8be7c';
      const pulse = done ? .55 : .55 + Math.sin(time * 2 + (Number(relay.id) || 0)) * .12;
      c.save(); c.translate(relay.x, relay.y);
      if (afterDark) {
        this.glow(c, 0, -.17, done ? 1.05 : .9, done ? 'rgba(65,188,157,.15)' : `rgba(232,168,78,${pulse * .21})`);
        c.fillStyle = color;
        c.shadowBlur = 10; c.shadowColor = color;
        c.fillRect(-.17, -.32, .34, .035);
        c.shadowBlur = 0;
        c.fillStyle = done ? 'rgba(127,236,205,.8)' : 'rgba(255,211,142,.85)';
        c.font = '600 .115px ui-monospace, Consolas, monospace'; c.textAlign = 'center';
        c.fillText(done ? 'ONLINE' : relayLabel(relay), 0, -.49);
        if (!done) {
          c.strokeStyle = 'rgba(244,193,111,.45)'; c.lineWidth = .016;
          c.beginPath(); c.arc(0, 0, .52 + .025 * Math.sin(time * 2), 0, TAU); c.stroke();
        }
        c.restore(); return;
      }
      c.fillStyle = 'rgba(0,6,10,.4)'; c.beginPath(); c.ellipse(.06, .14, .43, .37, 0, 0, TAU); c.fill();
      c.strokeStyle = '#6a6350'; c.lineWidth = .033;
      for (let side = -1; side <= 1; side += 2) {
        c.beginPath(); c.moveTo(side * .37, -.4); c.lineTo(side * .48, -.4); c.lineTo(side * .48, .36); c.lineTo(side * .37, .36); c.stroke();
      }
      c.fillStyle = '#15262c'; rounded(c, -.31, -.39, .62, .78, .05); c.fill();
      c.fillStyle = '#455858'; rounded(c, -.28, -.39, .56, .69, .035); c.fill();
      c.fillStyle = '#203438'; c.fillRect(-.22, -.27, .44, .28);
      c.fillStyle = done ? '#315c4f' : '#504933'; c.fillRect(-.18, -.235, .36, .2);
      c.strokeStyle = done ? '#77d0ae' : '#dbb974'; c.lineWidth = .014;
      c.beginPath();
      for (let i = 0; i < 20; i++) {
        const yy = -.135 + Math.sin(i * .8 + time * (done ? .6 : 3)) * (done ? .017 : .04) * Math.sin(i / 20 * Math.PI);
        if (!i) c.moveTo(-.17, yy); else c.lineTo(-.17 + i * .018, yy);
      }
      c.stroke();
      c.fillStyle = '#12252b'; c.fillRect(-.2, .06, .26, .13);
      c.fillStyle = '#a09a79'; c.beginPath(); c.arc(.15, .12, .054, 0, TAU); c.fill();
      c.fillStyle = '#192a2e'; c.beginPath(); c.arc(.15, .12, .027, 0, TAU); c.fill();
      c.strokeStyle = '#192b31'; c.lineWidth = .019;
      for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(-.2, .22 + k * .025); c.lineTo(.2, .22 + k * .025); c.stroke(); }
      const progress = clamp(relay.progress || 0, 0, 1);
      if (progress > 0 && !done) {
        c.lineWidth = .045; c.strokeStyle = color;
        c.beginPath(); c.arc(0, 0, .55, -Math.PI / 2, -Math.PI / 2 + TAU * progress); c.stroke();
      }
      c.restore();
    }

    drawExit(c, exit, ready, time, afterDark) {
      if (!exit) return;
      c.save(); c.translate(exit.x, exit.y);
      if (afterDark) {
        this.glow(c, 0, 0, ready ? 1.8 : .95, ready ? 'rgba(69,219,189,.18)' : 'rgba(53,148,160,.08)');
        c.strokeStyle = ready ? '#87e7cd' : '#497c81'; c.lineWidth = .035;
        c.strokeRect(-.39, -.36, .78, .75);
        c.fillStyle = ready ? '#b0fbe5' : '#638d91';
        c.textAlign = 'center'; c.font = '700 .14px ui-monospace, Consolas, monospace';
        c.fillText('EXIT', 0, -.49);
        if (ready) {
          c.strokeStyle = `rgba(123,230,201,${.22 + Math.sin(time * 2) * .07})`;
          c.lineWidth = .02;
          c.beginPath(); c.arc(0, 0, .66, 0, TAU); c.stroke();
        }
      } else {
        c.fillStyle = '#192b30'; rounded(c, -.44, -.42, .88, .86, .05); c.fill();
        c.fillStyle = '#304950'; c.fillRect(-.33, -.33, .66, .66);
        c.strokeStyle = '#59716f'; c.lineWidth = .026;
        c.beginPath(); c.moveTo(0, -.3); c.lineTo(0, .3); c.stroke();
        c.strokeStyle = ready ? '#a0e6ce' : '#507e7f'; c.lineWidth = .04;
        c.beginPath(); c.moveTo(-.13, .06); c.lineTo(.13, .06); c.moveTo(.04, -.03); c.lineTo(.13, .06); c.lineTo(.04, .15); c.stroke();
      }
      c.restore();
    }

    drawPlayer(c, player, time) {
      const stride = player.moving ? Math.sin(time * (player.sprinting ? 16 : 10)) : 0;
      c.save(); c.translate(player.x, player.y); c.rotate(player.angle || 0);
      c.fillStyle = 'rgba(0,4,8,.6)'; c.beginPath(); c.ellipse(.03, .045, .29, .24, 0, 0, TAU); c.fill();
      c.fillStyle = '#112126';
      rounded(c, -.19 + stride * .045, -.16, .25, .105, .03); c.fill();
      rounded(c, -.19 - stride * .045, .055, .25, .105, .03); c.fill();
      c.fillStyle = '#7a7660'; c.beginPath(); c.ellipse(-.018, 0, .17, .225, 0, 0, TAU); c.fill();
      c.fillStyle = '#bbb08a'; c.beginPath(); c.ellipse(.028, 0, .145, .18, 0, 0, TAU); c.fill();
      c.fillStyle = '#756c54'; c.beginPath(); c.ellipse(-.035, 0, .13, .14, 0, 0, TAU); c.fill();
      c.fillStyle = '#d4c398'; c.beginPath(); c.ellipse(.02, 0, .11, .13, 0, 0, TAU); c.fill();
      c.strokeStyle = '#9a8867'; c.lineWidth = .025;
      c.beginPath(); c.arc(.02, 0, .096, Math.PI * .55, Math.PI * 1.45); c.stroke();
      c.strokeStyle = '#b9ab84'; c.lineWidth = .08; c.lineCap = 'round';
      c.beginPath(); c.moveTo(.04, .14); c.lineTo(.23, .17); c.stroke();
      c.fillStyle = '#17282d'; rounded(c, .16, .12, .17, .09, .02); c.fill();
      c.fillStyle = '#eee1b7'; c.fillRect(.30, .13, .035, .07);
      c.strokeStyle = 'rgba(235,225,181,.7)'; c.lineWidth = .018;
      c.beginPath(); c.moveTo(-.065, -.18); c.lineTo(-.065, .18); c.stroke();
      c.restore();
    }

    drawEnemy(c, enemy, player, time, reduced) {
      const sway = Math.sin(time * 3.4) * .055;
      const reach = Math.sin(time * 4) * .07;
      c.save(); c.translate(enemy.x, enemy.y);
      c.rotate(Math.atan2(player.y - enemy.y, player.x - enemy.x) + Math.PI / 2);
      this.glow(c, 0, .1, 1.2, 'rgba(0,0,2,.45)');
      c.fillStyle = '#02070a';
      c.beginPath(); c.moveTo(-.14, -.26); c.bezierCurveTo(-.37, -.1, -.22, .35, -.26 + sway, .68);
      c.lineTo(-.10, .53); c.lineTo(-.02, .74); c.lineTo(.10, .49); c.lineTo(.21, .66);
      c.bezierCurveTo(.26, .18, .36, -.11, .14, -.26); c.closePath(); c.fill();
      c.strokeStyle = '#070f12'; c.lineCap = 'round'; c.lineWidth = .09;
      c.beginPath(); c.moveTo(-.2, -.1); c.lineTo(-.41, .15 + reach); c.lineTo(-.42, -.25 + reach); c.stroke();
      c.beginPath(); c.moveTo(.2, -.1); c.lineTo(.4, .24 - reach); c.lineTo(.51, -.18 - reach); c.stroke();
      c.strokeStyle = '#667b78'; c.lineWidth = .019;
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.moveTo(-.42 + k * .022, -.23 + reach); c.lineTo(-.47 + k * .026, -.42 + reach); c.stroke();
        c.beginPath(); c.moveTo(.49 + k * .022, -.17 - reach); c.lineTo(.49 + k * .029, -.38 - reach); c.stroke();
      }
      c.strokeStyle = '#223033'; c.lineWidth = .013;
      c.beginPath(); c.moveTo(-.10, -.13); c.bezierCurveTo(-.02, .1, -.12, .25, -.09, .53); c.stroke();
      c.beginPath(); c.moveTo(.08, -.10); c.lineTo(.11, .37); c.stroke();
      c.fillStyle = '#071014'; c.beginPath(); c.ellipse(0, -.25, .185, .22, sway, 0, TAU); c.fill();
      c.fillStyle = enemy.stun > 0 ? '#e0e9c4' : '#a9b4a4';
      c.beginPath(); c.moveTo(-.10, -.4); c.quadraticCurveTo(0, -.46, .11, -.4);
      c.quadraticCurveTo(.13, -.2, .015, -.12); c.quadraticCurveTo(-.12, -.22, -.10, -.4); c.fill();
      c.fillStyle = '#050a0d';
      c.beginPath(); c.ellipse(-.045, -.32, .031, .051, -.18, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(.052, -.32, .031, .051, .18, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(.009, -.205, .029, .043, 0, 0, TAU); c.fill();
      c.fillStyle = '#dae7ce'; c.fillRect(-.049, -.338, .013, .009); c.fillRect(.043, -.338, .013, .009);
      c.restore();
    }

    lighting(state) {
      const c = this.light, p = state.player;
      const menu = state.mode === 'menu';
      const blackout = state.reduced ? 0 : Math.sin(clamp((Number(state.blackout) || 0) / 2.3, 0, 1) * Math.PI);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, this.width, this.height);
      c.fillStyle = menu ? 'rgba(1,7,12,.76)' : `rgba(1,5,10,${.89 + blackout * .045})`;
      c.fillRect(0, 0, this.width, this.height);
      c.save(); this.worldTransform(c);
      c.globalCompositeOperation = 'destination-out';
      c.save();
      c.beginPath();
      for (let i = 0; i <= 150; i++) {
        const v = this.ray(state.grid, p.x, p.y, i / 150 * TAU, 11);
        if (!i) c.moveTo(v.x, v.y); else c.lineTo(v.x, v.y);
      }
      c.closePath(); c.clip();
      const ambientRadius = menu ? 6.5 : 3.6;
      const ambient = c.createRadialGradient(p.x, p.y, .15, p.x, p.y, ambientRadius);
      ambient.addColorStop(0, `rgba(0,0,0,${.68 - blackout * .19})`); ambient.addColorStop(.35, `rgba(0,0,0,${.37 - blackout * .14})`); ambient.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = ambient; c.fillRect(p.x - ambientRadius, p.y - ambientRadius, ambientRadius * 2, ambientRadius * 2);
      c.restore();

      const focus = !!p.focus;
      const angle = Number.isFinite(p.angle) ? p.angle : 0;
      const battery = Number.isFinite(state.battery) ? state.battery : 100;
      const power = (battery > 0 ? 1 : .33) * (1 - blackout * .4);
      const range = (focus ? 10.5 : 8.3) * (.67 + power * .33);
      const spread = focus ? .27 : .43;
      // Nested low-opacity beams give the torch a soft optical falloff at its edge.
      const fringes = [[1.10, .13], [1.02, .19], [.94, .27], [.85, .48], [.73, .66]];
      for (const [width, strength] of fringes) {
        const halfAngle = spread * width;
        c.save(); c.beginPath(); c.moveTo(p.x, p.y);
        for (let i = 0; i <= 38; i++) {
          const v = this.ray(state.grid, p.x, p.y, angle - halfAngle + (i / 38) * halfAngle * 2, range);
          c.lineTo(v.x, v.y);
        }
        c.closePath(); c.clip();
        const beam = c.createRadialGradient(p.x, p.y, .18, p.x, p.y, range);
        beam.addColorStop(0, `rgba(0,0,0,${strength * .86 * power})`);
        beam.addColorStop(.32, `rgba(0,0,0,${strength * power})`);
        beam.addColorStop(.67, `rgba(0,0,0,${strength * .52 * power})`);
        beam.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = beam; c.fillRect(p.x - range, p.y - range, range * 2, range * 2);
        c.restore();
      }
      c.restore();
      c.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(this.lightCanvas, 0, 0, this.width, this.height);
    }

    drawDeath(c, state) {
      const age = Number.isFinite(state.deathTime) ? state.deathTime : 0;
      if (state.reduced || age > 1.5) return;
      const fade = clamp((1.5 - age) / .45, 0, 1);
      const grow = 1 + Math.min(age, .8) * .12;
      const unit = Math.min(this.width, this.height) * .38 * grow;
      c.save(); c.globalAlpha = fade;
      c.fillStyle = 'rgba(3,6,9,.91)'; c.fillRect(0, 0, this.width, this.height);
      c.translate(this.width * .5, this.height * .43); c.scale(unit, unit);
      const skull = c.createRadialGradient(-.12, -.25, .05, 0, .1, 1);
      skull.addColorStop(0, '#b3beb1'); skull.addColorStop(.4, '#87958a'); skull.addColorStop(.76, '#344943'); skull.addColorStop(1, '#0a1519');
      c.fillStyle = '#02070b'; c.beginPath(); c.ellipse(0, 0, .91, 1.35, -.045, 0, TAU); c.fill();
      c.fillStyle = skull;
      c.beginPath(); c.moveTo(-.52, -.7); c.bezierCurveTo(-.64, -.14, -.43, .56, 0, 1.02);
      c.bezierCurveTo(.44, .6, .67, -.17, .55, -.73); c.quadraticCurveTo(0, -1.08, -.52, -.7); c.fill();
      c.fillStyle = '#050a0c';
      c.beginPath(); c.ellipse(-.24, -.22, .145, .215, -.23, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(.255, -.24, .14, .205, .23, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(.025, .53, .14, .275, -.025, 0, TAU); c.fill();
      c.fillStyle = '#d1dcc2';
      c.beginPath(); c.arc(-.225, -.21, .023, 0, TAU); c.fill();
      c.beginPath(); c.arc(.245, -.235, .023, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(13,27,28,.45)'; c.lineWidth = .014;
      for (let i = 0; i < 8; i++) {
        const xx = -.44 + i * .126;
        c.beginPath(); c.moveTo(xx, -.72); c.lineTo(xx + .035, -.54); c.lineTo(xx - .025, -.44); c.stroke();
      }
      c.strokeStyle = '#203632'; c.lineWidth = .035;
      c.beginPath(); c.moveTo(.025, -.2); c.lineTo(-.035, .18); c.lineTo(.055, .2); c.stroke();
      c.restore();
    }

    draw(state, dt = 1 / 60) {
      if (!state || !state.grid || !state.player) return;
      if (state.grid !== this.cachedGrid) this.cacheWorld(state);
      const c = this.ctx, p = state.player, time = Number(state.time) || 0;
      const step = clamp(Number(dt) || 1 / 60, 0, .1);
      const look = state.mode === 'menu' ? .35 : .68;
      const left = this.width / this.scale * .5 - .3;
      const right = this.cols - this.width / this.scale * .5 + .3;
      const top = this.height / this.scale * .52 - .3;
      const bottom = this.rows - this.height / this.scale * .48 + .3;
      const boundX = x => left > right ? this.cols / 2 : clamp(x, left, right);
      const boundY = y => top > bottom ? this.rows / 2 + this.height / this.scale * .02 : clamp(y, top, bottom);
      const tx = boundX(p.x + Math.cos(p.angle || 0) * look);
      const ty = boundY(p.y + Math.sin(p.angle || 0) * look);
      if (!this.initialized) { this.camera.x = tx; this.camera.y = ty; this.initialized = true; }
      const smoothing = state.reduced ? 1 : 1 - Math.exp(-step * 8);
      this.camera.x = boundX(this.camera.x + (tx - this.camera.x) * smoothing);
      this.camera.y = boundY(this.camera.y + (ty - this.camera.y) * smoothing);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#03090f'; c.fillRect(0, 0, this.width, this.height);
      c.save(); this.worldTransform(c);
      c.drawImage(this.world, 0, 0, this.cols, this.rows);
      const relays = state.relays || [];
      const ready = relays.length > 0 && relays.every(r => r.done);
      this.drawExit(c, state.exit, ready, time, false);
      for (const relay of relays) this.drawRelay(c, relay, time, false);
      // A warm spill keeps the flashlight physical rather than a flat white wedge.
      const beamX = p.x + Math.cos(p.angle || 0) * 1.6;
      const beamY = p.y + Math.sin(p.angle || 0) * 1.6;
      if (this.visible(state.grid, p, { x: beamX, y: beamY })) this.glow(c, beamX, beamY, 2.7, 'rgba(229,207,143,.095)');
      if (state.enemy && state.enemy.active && this.visible(state.grid, p, state.enemy)) this.drawEnemy(c, state.enemy, p, time, state.reduced);
      this.drawPlayer(c, p, time);
      c.restore();
      this.lighting(state);

      c.save(); this.worldTransform(c);
      this.drawExit(c, state.exit, ready, time, true);
      for (const relay of relays) this.drawRelay(c, relay, time, true);
      // Dust is subtle, world anchored, and visible only inside the flashlight.
      if (!state.reduced) {
        c.fillStyle = 'rgba(221,223,188,.25)';
        for (let i = 0; i < 65; i++) {
          const x = hash(i, 7) * this.cols + Math.sin(time * .13 + i) * .09;
          const y = hash(i, 13) * this.rows + Math.sin(time * .19 + i * 2) * .07;
          const dx = x - p.x, dy = y - p.y, dist = Math.hypot(dx, dy);
          let a = Math.atan2(dy, dx) - (p.angle || 0); a = Math.atan2(Math.sin(a), Math.cos(a));
          if (dist < 7 && Math.abs(a) < .39 && this.visible(state.grid, p, { x, y })) {
            c.globalAlpha = .25 + hash(i, 19) * .65;
            c.beginPath(); c.arc(x, y, .01 + hash(i, 16) * .008, 0, TAU); c.fill();
          }
        }
      }
      c.restore();

      const vignette = c.createRadialGradient(this.width * .5, this.height * .52, this.height * .13, this.width * .5, this.height * .5, Math.max(this.width, this.height) * .67);
      vignette.addColorStop(0, 'rgba(0,3,8,0)'); vignette.addColorStop(.64, 'rgba(0,3,8,.1)'); vignette.addColorStop(1, 'rgba(0,3,8,.78)');
      c.fillStyle = vignette; c.fillRect(0, 0, this.width, this.height);
      const threat = clamp(Number(state.threat) || 0, 0, 1);
      if (threat > .05) {
        const danger = c.createRadialGradient(this.width * .5, this.height * .5, this.height * .23, this.width * .5, this.height * .5, Math.max(this.width, this.height) * .64);
        danger.addColorStop(0, 'rgba(90,14,17,0)'); danger.addColorStop(1, `rgba(117,28,30,${threat * .35})`);
        c.fillStyle = danger; c.fillRect(0, 0, this.width, this.height);
      }
      if (state.flash > 0 && !state.reduced) {
        c.fillStyle = `rgba(150,198,181,${Math.min(.1, state.flash * .1)})`;
        c.fillRect(0, 0, this.width, this.height);
      }
      if (state.mode === 'dead') this.drawDeath(c, state);
    }

    drawMap(canvas, state) {
      if (!canvas || !state || !state.grid) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 560, height = rect.height || 420;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.round(width * dpr), bh = Math.round(height * dpr);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, width, height);
      c.fillStyle = '#08141b'; c.fillRect(0, 0, width, height);
      const cols = state.cols || state.grid[0].length, rows = state.rows || state.grid.length;
      const scale = Math.min((width - 30) / cols, (height - 30) / rows);
      const ox = (width - cols * scale) / 2, oy = (height - rows * scale) / 2;
      c.save(); c.translate(ox, oy); c.scale(scale, scale);
      c.lineWidth = 1 / scale;
      c.strokeStyle = '#132731';
      for (let x = 0; x <= cols; x++) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, rows); c.stroke(); }
      for (let y = 0; y <= rows; y++) { c.beginPath(); c.moveTo(0, y); c.lineTo(cols, y); c.stroke(); }
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (state.grid[y][x] !== 1) {
        c.fillStyle = '#20363e'; c.fillRect(x + .045, y + .045, .91, .91);
        c.strokeStyle = '#567178';
        for (let side = 0; side < 4; side++) {
          const nx = x + [0, 1, 0, -1][side], ny = y + [-1, 0, 1, 0][side];
          if (!this.isWall(state.grid, nx, ny)) continue;
          c.beginPath();
          if (side === 0) { c.moveTo(x, y); c.lineTo(x + 1, y); }
          if (side === 1) { c.moveTo(x + 1, y); c.lineTo(x + 1, y + 1); }
          if (side === 2) { c.moveTo(x, y + 1); c.lineTo(x + 1, y + 1); }
          if (side === 3) { c.moveTo(x, y); c.lineTo(x, y + 1); }
          c.stroke();
        }
      }
      for (const r of state.relays || []) {
        c.fillStyle = r.done ? '#73d8b9' : '#e7b774';
        rounded(c, r.x - .38, r.y - .38, .76, .76, .1); c.fill();
        c.fillStyle = '#102027'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = 'bold .39px ui-monospace, Consolas, monospace'; c.fillText(r.done ? '✓' : relayLabel(r), r.x, r.y + .025);
      }
      for (const w of state.windows || []) {
        c.strokeStyle = w.broken ? '#bd6758' : '#6d9796'; c.lineWidth = .11;
        c.beginPath(); c.moveTo(w.x - .3, w.y - .3); c.lineTo(w.x + .3, w.y + .3); c.moveTo(w.x + .3, w.y - .3); c.lineTo(w.x - .3, w.y + .3); c.stroke();
      }
      if (state.axeCase) {
        const axe = state.axeCase;c.save();c.translate(axe.x, axe.y);c.rotate(axe.angle || 0);
        c.fillStyle = '#b94a3c';c.fillRect(-.3,-.13,.6,.26);c.fillStyle = '#f2d5ca';c.font = 'bold .24px ui-monospace, Consolas, monospace';c.textAlign = 'center';c.textBaseline = 'middle';c.fillText('A',0,.01);c.restore();
      }
      if (state.exit) {
        c.strokeStyle = '#86d6cd'; c.lineWidth = .09;
        c.strokeRect(state.exit.x - .38, state.exit.y - .38, .76, .76);
        c.fillStyle = '#9ce2d6'; c.font = 'bold .32px ui-monospace, Consolas, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('E', state.exit.x, state.exit.y + .01);
      }
      if (state.player) {
        const p = state.player;
        c.save(); c.translate(p.x, p.y); c.rotate(p.angle || 0);
        c.fillStyle = 'rgba(209,231,237,.12)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 1.6, -.45, .45); c.closePath(); c.fill();
        c.fillStyle = '#e8f5f2'; c.beginPath(); c.moveTo(.5, 0); c.lineTo(-.27, -.3); c.lineTo(-.15, 0); c.lineTo(-.27, .3); c.closePath(); c.fill();
        c.restore();
      }
      c.restore();
    }
  }

  window.DeadAirRenderer = DeadAirRenderer;
})();
