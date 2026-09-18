// Separate documents keep each game's listeners, audio, and frame loop scoped
// to its tab. Removing the active frame completely releases that game.
(() => {
  'use strict';
  const header = document.getElementById('game-header');
  const host = document.getElementById('game-container');
  const portal = document.getElementById('arcade-portal');
  const exit = document.getElementById('btn-exit-arcade');
  if (!header || !host || !portal || !exit) return;
  const games = [
    { id: 'undead-invasion-v0', name: 'Undead Invasion V0', description: 'Undead Invasion V0', src: 'undead-invasion-v0.html', menuMessage: 'undead-invasion-v0-menu', background: '#121713' },
    { id: 'dead-air', name: 'Dead Air', description: 'Dead Air survival horror', src: 'dead-air.html', menuMessage: 'dead-air-menu', background: '#0a0d0b' }
  ];
  for (const game of games) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-tab';
    button.dataset.game = game.id;
    button.textContent = game.name;
    button.setAttribute('aria-label', game.description);
    header.insertBefore(button, exit);
    game.button = button;
    game.hash = '#' + game.id;
    button.addEventListener('click', () => open(game));
  }

  // Wrapping keeps every game and the study exit reachable on a phone.
  const style = document.createElement('style');
  style.textContent = '#game-header{flex-wrap:wrap}#game-header .game-tab{white-space:nowrap}@media(max-width:560px){#game-header{padding:8px;gap:5px;min-height:56px}#game-header .game-tab{font-size:10px;padding:9px 8px}#btn-exit-arcade{font-size:9px;padding:7px 5px;margin-left:auto}}@media(max-width:360px){#game-header .game-tab{font-size:9px;padding:8px 6px}#btn-exit-arcade{font-size:8px}}';
  document.head.appendChild(style);
  let active = null;

  function nativeTab() {
    const game = typeof currentGame !== 'undefined' && currentGame === 'zombies' ? 'zombies' : 'drift';
    return document.querySelector('[data-game="' + game + '"]');
  }

  function showPortal() {
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('help-bar').style.display = 'none';
    portal.style.display = 'flex';
  }

  function close(clearHash = true) {
    if (!active) return;
    const previous = active;
    active = null;
    previous.frame.remove();
    host.style.display = '';
    previous.game.button.classList.remove('active');
    // The secret entrance reopens currentGame; keep its selected tab in sync.
    nativeTab()?.classList.add('active');
    if (clearHash && location.hash === previous.game.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function open(game) {
    if (active?.game === game) { active.frame.contentWindow?.focus(); return; }
    close(false);
    isPlaying = false;
    paused = false;
    if (typeof raidFiring !== 'undefined') raidFiring = false;
    clearKeys();
    cancelAnimationFrame(animationId);
    document.querySelectorAll('.game-tab').forEach(tab => tab.classList.remove('active'));
    showPortal();
    host.style.display = 'none';
    game.button.classList.add('active');
    const frame = document.createElement('iframe');
    frame.title = game.description + ' game';
    frame.src = game.src;
    frame.allow = 'autoplay';
    frame.style.cssText = 'display:block;border:0;width:100%;flex:1;min-height:0;background:' + game.background;
    frame.addEventListener('load', () => {
      if (active?.frame === frame) frame.contentWindow?.focus();
    });
    active = { game, frame };
    portal.appendChild(frame);
    document.title = game.name + ' · Alpine Arcade';
    if (location.hash !== game.hash) {
      history.replaceState(null, '', location.pathname + location.search + game.hash);
    }
  }

  header.addEventListener('click', event => {
    const target = event.target.closest('button');
    // Restore the host before native tab handlers measure and resize its canvas.
    if (target && !games.some(game => game.button === target)) close();
    if (target?.dataset.game === 'drift') document.title = 'Mountain Pass · Alpine Arcade';
    if (target?.dataset.game === 'zombies') document.title = 'Mutant Raid · Alpine Arcade';
  }, true);
  // Parent shortcuts must not start a hidden game while focus is in the header.
  for (const type of ['keydown', 'keyup']) {
    window.addEventListener(type, event => {
      if (active) event.stopImmediatePropagation();
    }, true);
  }
  window.addEventListener('message', event => {
    if (!active || event.source !== active.frame.contentWindow || event.data !== active.game.menuMessage) return;
    close();
    document.querySelector('[data-game="drift"]').click();
  });
  function route() {
    const game = games.find(candidate => candidate.hash === location.hash);
    if (game) { open(game); return; }
    if (active) {
      close(false);
      // A native tab click recalculates the canvas after a hidden-host resize.
      const tab = location.hash === '#raid' ? document.querySelector('[data-game="zombies"]') : nativeTab();
      tab?.click();
    }
  }
  window.addEventListener('hashchange', route);
  route();
})();
