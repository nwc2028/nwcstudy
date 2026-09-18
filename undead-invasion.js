(() => {
  'use strict';

  const embedded = new URLSearchParams(location.search).has('embedded');
  if (embedded) document.body.classList.add('embedded');

  const canvas = document.getElementById('undead-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = canvas.width, H = canvas.height, GROUND = 402;
  ctx.imageSmoothingEnabled = false;
  // Preserve the fixed-size pixel look while avoiding unnecessary redraws on
  // Chromebook-class integrated graphics.
  const browserNavigator = typeof navigator === 'undefined' ? {} : navigator;
  const lowPowerDevice = /CrOS/i.test(browserNavigator.userAgent || '') || (browserNavigator.deviceMemory && browserNavigator.deviceMemory <= 4) || (browserNavigator.hardwareConcurrency && browserNavigator.hardwareConcurrency <= 4);

  const ui = {
    menu: document.getElementById('main-menu'), dialog: document.getElementById('message-screen'),
    shop: document.getElementById('shop-screen'), hud: document.getElementById('hud'),
    inventory: document.getElementById('inventory'), mobile: document.getElementById('mobile-controls'),
    title: document.getElementById('dialog-title'), kicker: document.getElementById('dialog-kicker'),
    copy: document.getElementById('dialog-copy'), actions: document.getElementById('dialog-actions'),
    day: document.getElementById('hud-day'), weapon: document.getElementById('hud-weapon'),
    ammo: document.getElementById('hud-ammo'), health: document.getElementById('health-meter'),
    base: document.getElementById('base-meter'), shopDay: document.getElementById('shop-day'),
    shopMoney: document.getElementById('shop-money'), shopGrid: document.getElementById('shop-grid')
  };

  const weapons = {
    pistol: { name:'PISTOL', damage:30, mag:12, reserve:60, delay:13, speed:19, spread:.025, pellets:1, color:'#f4dd8b' },
    shotgun: { name:'SHOTGUN', damage:15, mag:6, reserve:30, delay:38, speed:17, spread:.18, pellets:7, color:'#efb45f' },
    rifle: { name:'ASSAULT RIFLE', damage:20, mag:24, reserve:120, delay:6, speed:23, spread:.045, pellets:1, color:'#fbdf78' }
  };

  let scene = 'menu', mode = 'defense', day = 1, money = 0, score = 0, kills = 0;
  let player, zombies = [], bullets = [], particles = [], corpses = [], barriers = [], grenades = [];
  let spawnLeft = 0, spawnTimer = 0, tick = 0, shake = 0, flash = 0, buildMode = false;
  let keys = Object.create(null), pointer = { x:720, y:310, down:false }, last = 0;
  let soundOn = true, audio;

  const rnd = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const hideAll = () => { ui.menu.hidden = ui.dialog.hidden = ui.shop.hidden = true; };
  const px = (x,y,w,h,c) => { ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };

  function tone(freq, duration=.05, type='square', volume=.025) {
    if (!soundOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const o=audio.createOscillator(), g=audio.createGain();
      o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(volume,audio.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime+duration);
    } catch {}
  }

  function resetGame(chosenMode) {
    mode = chosenMode; day = 1; money = chosenMode === 'playground' ? 9999 : 70; score = kills = tick = 0;
    player = {
      x:176, y:GROUND-52, vx:0, hp:100, maxHp:100, baseHp:100, maxBaseHp:100,
      weapon:'pistol', unlocked:{pistol:true,shotgun:chosenMode==='playground',rifle:chosenMode==='playground'},
      ammo:{pistol:12,shotgun:6,rifle:24}, reserve:{pistol:60,shotgun:30,rifle:120},
      cooldown:0, reload:0, melee:0, kick:0, hurt:0, armor:chosenMode==='playground'?2:0,
      damageLevel:0, speedLevel:0, grenades:chosenMode==='playground'?99:1, facing:1
    };
    zombies=[]; bullets=[]; particles=[]; corpses=[]; barriers=[]; grenades=[]; buildMode=false;
    beginDay();
  }

  function beginDay() {
    hideAll(); scene='playing'; ui.hud.hidden=ui.inventory.hidden=ui.mobile.hidden=false;
    spawnLeft = mode==='playground' ? 18 + day*2 : 7 + day*3;
    spawnTimer=35; kills=0; updateHUD();
    showBanner(mode==='playground' ? 'PLAYGROUND' : `DAY ${day}`, mode==='playground'?'EVERYTHING UNLOCKED':'THEY ARE COMING');
  }

  function showBanner(big,small) { particles.push({banner:true,big,small,life:105,max:105}); }

  function spawnZombie() {
    const armored = day>=3 && Math.random()<Math.min(.4,.08+day*.025);
    const runner = !armored && day>=2 && Math.random()<.24;
    const brute = day>=6 && Math.random()<.08;
    const side = day>=4 && Math.random()<.18 ? -1 : 1;
    const type = brute?'brute':armored?'armored':runner?'runner':'walker';
    const stats = type==='brute'?[210,.42,30,42]:type==='armored'?[90,.56,19,34]:type==='runner'?[42,1.12,12,28]:[55,.7,14,31];
    zombies.push({x:side>0?W+35:-35,y:GROUND-stats[3],side,hp:stats[0]*(1+(day-1)*.08),max:stats[0]*(1+(day-1)*.08),speed:stats[1],damage:stats[2],h:stats[3],type,attack:0,hit:0,phase:rnd(0,6)});
  }

  function fire() {
    if (scene!=='playing'||player.reload||player.cooldown||player.ammo[player.weapon]<=0) {
      if(scene==='playing'&&!player.reload&&player.ammo[player.weapon]<=0) reload();
      return;
    }
    const w=weapons[player.weapon], ox=player.x+(pointer.x>=player.x?25:-12), oy=player.y+20;
    let a=Math.atan2(pointer.y-oy,pointer.x-ox); player.facing=Math.cos(a)>=0?1:-1;
    for(let i=0;i<w.pellets;i++){
      const aa=a+rnd(-w.spread,w.spread);
      bullets.push({x:ox,y:oy,vx:Math.cos(aa)*w.speed,vy:Math.sin(aa)*w.speed,damage:w.damage*(1+player.damageLevel*.22),life:55,color:w.color});
    }
    player.ammo[player.weapon]--; player.cooldown=w.delay; shake=player.weapon==='shotgun'?8:3; flash=3;
    for(let i=0;i<5;i++)particles.push({x:ox,y:oy,vx:rnd(1,4)*player.facing,vy:rnd(-1.5,1.5),life:rnd(5,10),color:'#ffdc72',size:rnd(1,3)});
    tone(player.weapon==='shotgun'?90:player.weapon==='rifle'?150:210,.055,'square',player.weapon==='shotgun'?.05:.025);
    updateHUD();
  }

  function reload() {
    const w=weapons[player.weapon], missing=w.mag-player.ammo[player.weapon];
    if(scene!=='playing'||player.reload||missing<=0||player.reserve[player.weapon]<=0)return;
    player.reload=player.weapon==='shotgun'?75:52; tone(420,.04,'square',.018);
  }

  function finishReload() {
    const w=weapons[player.weapon], n=Math.min(w.mag-player.ammo[player.weapon],player.reserve[player.weapon]);
    player.ammo[player.weapon]+=n; player.reserve[player.weapon]-=n; updateHUD(); tone(610,.045,'square',.02);
  }

  function melee() {
    if(scene!=='playing'||player.melee>0)return;
    player.melee=28; const dir=player.facing||1;
    zombies.forEach(z=>{if(Math.abs(z.x-(player.x+dir*25))<54&&Math.abs(z.y-player.y)<45)hurtZombie(z,42*(1+player.damageLevel*.15),dir*5);});
    tone(115,.08,'sawtooth',.025);
  }

  function kick() {
    if(scene!=='playing'||player.kick>0)return;
    player.kick=48; const dir=player.facing||1;
    zombies.forEach(z=>{if(Math.abs(z.x-(player.x+dir*27))<62&&Math.abs(z.y-player.y)<48){z.x+=dir*48;z.hit=12;hurtZombie(z,12,dir*8);}});
    tone(75,.1,'square',.035);
  }

  function throwBomb() {
    if(scene!=='playing'||player.grenades<=0)return;
    player.grenades--; grenades.push({x:player.x+20*player.facing,y:player.y+14,vx:7*player.facing,vy:-7,life:65}); updateHUD();
  }

  function explode(x,y) {
    shake=18; tone(48,.25,'sawtooth',.07);
    zombies.forEach(z=>{const d=Math.hypot(z.x-x,z.y-y);if(d<145)hurtZombie(z,Math.max(20,160-d),Math.sign(z.x-x)*10);});
    for(let i=0;i<(lowPowerDevice?28:55);i++)particles.push({x,y,vx:rnd(-8,8),vy:rnd(-8,5),life:rnd(18,50),color:i%3?'#b94829':'#f0ad42',size:rnd(2,7),gravity:.2});
  }

  function hurtZombie(z,damage,push=0) {
    if(z.dead)return; z.hp-=damage;z.x+=push;z.hit=5;
    for(let i=0;i<4;i++)particles.push({x:z.x,y:z.y+8,vx:rnd(-2.5,2.5),vy:rnd(-3,1),life:rnd(10,24),color:'#8d151b',size:rnd(2,5),gravity:.16});
    if(z.hp<=0)killZombie(z);
  }

  function killZombie(z) {
    z.dead=true; const bounty=z.type==='brute'?45:z.type==='armored'?20:z.type==='runner'?13:10;
    money+=bounty;score+=bounty*10;kills++;corpses.push({x:z.x,y:z.y,type:z.type,flip:Math.random()<.5,life:650});
    for(let i=0;i<(lowPowerDevice?6:10);i++)particles.push({x:z.x,y:z.y+8,vx:rnd(-4,4),vy:rnd(-5,1),life:rnd(18,45),color:i%3?'#7f1118':'#a99772',size:rnd(2,5),gravity:.18});
    updateHUD();
  }

  function placeBarrier(x) {
    x=clamp(x,235,W-85);
    if(scene!=='playing'||(!buildMode&&mode!=='playground'))return;
    if(barriers.some(b=>Math.abs(b.x-x)<55))return;
    const cost=mode==='playground'?0:40;if(money<cost)return;
    money-=cost;barriers.push({x,y:GROUND-39,hp:120,max:120});buildMode=false;updateHUD();tone(290,.08,'square',.025);
  }

  function switchWeapon(name) {
    if(!player?.unlocked[name])return;
    player.weapon=name;player.reload=0;updateHUD();tone(350,.035,'square',.015);
  }

  function update() {
    tick++;
    if(scene!=='playing')return;
    if(player.hurt>0)player.hurt--;if(player.cooldown>0)player.cooldown--;if(player.melee>0)player.melee--;if(player.kick>0)player.kick--;
    if(player.reload>0&&--player.reload===0)finishReload();
    const accel=.65+player.speedLevel*.08;
    if(keys.KeyA||keys.ArrowLeft||keys.left)player.vx-=accel;
    if(keys.KeyD||keys.ArrowRight||keys.right)player.vx+=accel;
    player.vx*=.72;player.x=clamp(player.x+player.vx,125,W-80);
    if(Math.abs(player.vx)>.2)player.facing=Math.sign(player.vx);
    if(pointer.down)fire();

    if(spawnLeft>0&&--spawnTimer<=0){spawnZombie();spawnLeft--;spawnTimer=Math.max(22,80-day*3+rnd(-12,15));}
    for(const b of bullets){b.x+=b.vx;b.y+=b.vy;b.life--;for(const z of zombies){if(z.dead)continue;if(Math.abs(b.x-z.x)<16&&b.y>z.y-4&&b.y<z.y+z.h+4){const head=b.y<z.y+11;hurtZombie(z,b.damage*(head?1.75:1),Math.sign(b.vx)*2);b.life=0;if(head)particles.push({x:z.x,y:z.y-4,vx:0,vy:-.4,life:28,color:'#f1cb65',size:2,text:'HEADSHOT'});break;}}}
    bullets=bullets.filter(b=>b.life>0&&b.x>-40&&b.x<W+40&&b.y>0&&b.y<H);

    for(const g of grenades){g.x+=g.vx;g.y+=g.vy;g.vy+=.32;if(g.y>GROUND-5){g.y=GROUND-5;g.vy*=-.45;g.vx*=.7;}if(--g.life<=0)explode(g.x,g.y);}
    grenades=grenades.filter(g=>g.life>0);

    for(const z of zombies){
      if(z.dead)continue;if(z.hit>0){z.hit--;continue;}
      const nearest=barriers.filter(b=>b.hp>0).sort((a,b)=>Math.abs(a.x-z.x)-Math.abs(b.x-z.x))[0];
      const towardPlayer=Math.abs(z.x-player.x)<180;
      let targetX=towardPlayer?player.x:(nearest&&Math.abs(nearest.x-z.x)<130?nearest.x:85);
      const dir=Math.sign(targetX-z.x)||1;
      if(Math.abs(targetX-z.x)>24){z.x+=dir*z.speed*(1+day*.025);z.phase+=.16;}else if(--z.attack<=0){
        z.attack=42;
        if(towardPlayer&&Math.abs(z.x-player.x)<42){if(player.hurt<=0){const armor=Math.max(.45,1-player.armor*.18);player.hp-=z.damage*armor;player.hurt=28;shake=8;tone(65,.12,'sawtooth',.035);}}
        else if(nearest&&Math.abs(nearest.x-z.x)<38)nearest.hp-=z.damage;
        else player.baseHp-=z.damage*.7;
      }
    }
    zombies=zombies.filter(z=>!z.dead&&z.x>-80&&z.x<W+80);barriers=barriers.filter(b=>b.hp>0);
    particles.forEach(p=>{if(p.banner){p.life--;return;}p.x+=p.vx||0;p.y+=p.vy||0;p.vy=(p.vy||0)+(p.gravity||0);p.life--;});particles=particles.filter(p=>p.life>0);
    corpses.forEach(c=>c.life--);corpses=corpses.filter(c=>c.life>0);
    if(player.hp<=0||player.baseHp<=0){gameOver();return;}
    if(spawnLeft===0&&zombies.length===0){if(mode==='playground'){day++;beginDay();}else{scene='transition';setTimeout(openShop,650);}}
    updateHUD();
  }

  function gameOver() {
    scene='gameover';pointer.down=false;ui.hud.hidden=ui.inventory.hidden=ui.mobile.hidden=true;
    showDialog('RUN ENDED','The last defense fell.',`You survived ${day} day${day===1?'':'s'} and earned <b>${score.toLocaleString()}</b> points.`,[['Try again',()=>resetGame(mode),'danger'],['Main menu',mainMenu]]);
  }

  const shopItems = [
    {name:'Pump shotgun',desc:'Seven pellets. Devastating at close range.',cost:140,buy:()=>{player.unlocked.shotgun=true;switchWeapon('shotgun');},sold:()=>player.unlocked.shotgun},
    {name:'Assault rifle',desc:'Fast, controllable fire for larger waves.',cost:280,buy:()=>{player.unlocked.rifle=true;switchWeapon('rifle');},sold:()=>player.unlocked.rifle},
    {name:'Weapon training',desc:'Permanent +22% damage for this run.',cost:120,buy:()=>player.damageLevel++,sold:()=>player.damageLevel>=3,level:()=>player.damageLevel},
    {name:'Field medicine',desc:'Restore health and add +15 maximum HP.',cost:85,buy:()=>{player.maxHp+=15;player.hp=player.maxHp;},sold:()=>player.maxHp>=160},
    {name:'Reinforce gate',desc:'Repair the orphanage and add +10 strength.',cost:70,buy:()=>{player.maxBaseHp+=10;player.baseHp=player.maxBaseHp;},sold:()=>player.maxBaseHp>=150},
    {name:'Ammunition crate',desc:'Refill every unlocked weapon.',cost:55,buy:()=>{for(const k of Object.keys(weapons))if(player.unlocked[k])player.reserve[k]=Math.max(player.reserve[k],weapons[k].reserve);},sold:()=>false},
    {name:'Body armor',desc:'Reduce incoming damage by 18%.',cost:180,buy:()=>player.armor++,sold:()=>player.armor>=3,level:()=>player.armor},
    {name:'Conditioning',desc:'Move faster when the road gets crowded.',cost:100,buy:()=>player.speedLevel++,sold:()=>player.speedLevel>=3,level:()=>player.speedLevel},
    {name:'Fragmentation bomb',desc:'Add two bombs to inventory slot 5.',cost:65,buy:()=>player.grenades+=2,sold:()=>false}
  ];

  function openShop() {
    hideAll();scene='shop';ui.hud.hidden=ui.inventory.hidden=ui.mobile.hidden=true;ui.shop.hidden=false;
    ui.shopDay.textContent=day+1;renderShop();tone(520,.08,'triangle',.025);
  }

  function renderShop() {
    ui.shopMoney.textContent=`$${money}`;ui.shopGrid.innerHTML='';
    shopItems.forEach(item=>{
      const sold=item.sold(), button=document.createElement('button');button.type='button';button.className='shop-item';button.disabled=sold||money<item.cost;
      button.innerHTML=`<b>${item.name.toUpperCase()}${item.level&&item.level()?` · LV ${item.level()}`:''}</b><span>${item.desc}</span><strong>${sold?'SOLD':`$${item.cost}`}</strong>`;
      button.onclick=()=>{if(money<item.cost||item.sold())return;money-=item.cost;item.buy();renderShop();updateHUD();tone(730,.06,'square',.03);};ui.shopGrid.appendChild(button);
    });
  }

  function showDialog(kicker,title,copy,actions) {
    hideAll();ui.dialog.hidden=false;ui.kicker.textContent=kicker;ui.title.textContent=title;ui.copy.innerHTML=copy;ui.actions.innerHTML='';
    actions.forEach(([label,fn,kind])=>{const b=document.createElement('button');b.type='button';b.textContent=label;if(kind)b.className=`pixel-button ${kind}`;b.onclick=fn;ui.actions.appendChild(b);});
  }

  function showInfo(which) {
    if(which==='controls')showDialog('FIELD MANUAL','Survive the road.','<b>A / D</b> move · <b>Mouse / tap</b> shoots<br><b>Q</b> switches weapons · <b>R</b> reloads<br><b>E</b> uses the knife · <b>Space</b> kicks<br><b>4</b> places a fence · <b>5</b> throws a bomb', [['Back',mainMenu]]);
    else showDialog('THE LAST SAFE PLACE','Hold the orphanage.','Every day brings a larger, tougher wave. Earn cash from kills, then buy weapons, ammunition, training, and stronger defenses. Playground mode unlocks the full arsenal.', [['Back',mainMenu]]);
  }

  function pause() {
    if(scene!=='playing')return;scene='paused';pointer.down=false;
    showDialog('PAUSED',`Day ${day}`,`Score: <b>${score.toLocaleString()}</b><br>The horde will wait.`,[['Resume',()=>{hideAll();scene='playing';ui.hud.hidden=ui.inventory.hidden=ui.mobile.hidden=false;}],['Restart',()=>resetGame(mode)],['Main menu',mainMenu]]);
  }

  function mainMenu() {
    hideAll();scene='menu';ui.menu.hidden=false;ui.hud.hidden=ui.inventory.hidden=ui.mobile.hidden=true;pointer.down=false;buildMode=false;
    document.title='Undead Invasion';
  }

  function updateHUD() {
    if(!player)return;const w=weapons[player.weapon];ui.day.textContent=mode==='playground'?'∞':day;ui.weapon.textContent=`${w.name}${player.reload?' · RELOADING':''}`;
    ui.ammo.textContent=`${player.ammo[player.weapon]} / ${player.reserve[player.weapon]} · $${money}`;
    ui.health.style.width=`${clamp(player.hp/player.maxHp*100,0,100)}%`;ui.base.style.width=`${clamp(player.baseHp/player.maxBaseHp*100,0,100)}%`;
    document.querySelectorAll('[data-weapon]').forEach(b=>{const name=b.dataset.weapon;b.classList.toggle('active',name===player.weapon);b.disabled=!player.unlocked[name];});
    document.getElementById('build-button').classList.toggle('active',buildMode);document.getElementById('bomb-button').querySelector('span').textContent=`BOMB ×${player.grenades}`;
  }

  function drawBackground() {
    px(0,0,W,H,'#9bd0cc');px(0,55,W,95,'#5a8751');
    for(let i=0;i<(lowPowerDevice?20:34);i++){const x=i*34+(i%3)*7,h=20+(i*17)%30;px(x,120-h,42,h,'#376b43');px(x+8,110-h,28,h,'#2e5f3c');}
    px(0,150,W,116,'#779719');for(let i=0;i<(lowPowerDevice?45:90);i++)px((i*47)%W,156+(i*23)%103,2,9+(i%4)*3,i%2?'#657f17':'#8ca92b');
    px(0,266,W,18,'#d7d3ad');px(0,284,W,119,'#30383a');px(0,292,W,4,'#485151');px(0,395,W,8,'#e2dfc5');px(0,403,W,H-403,'#4c4025');
    for(let x=20;x<W;x+=76){px(x,342,50,5,'#e2d82c');px(x+8,451,5,5,'#b0a879');}for(let i=0;i<(lowPowerDevice?35:70);i++)px((i*83)%W,410+(i*37)%120,3+(i%4),2+(i%3),i%2?'#716341':'#342f20');
    px(0,183,92,101,'#4b514c');px(8,196,70,88,'#6e6d61');px(20,211,22,28,'#182628');px(54,211,17,28,'#172426');px(13,242,68,7,'#3e3d37');px(23,253,48,31,'#312f2d');px(33,255,27,29,'#151b1b');
    ctx.fillStyle='#d7d0a8';ctx.font='bold 9px monospace';ctx.fillText('ORPHANAGE',12,191);px(88,253,7,150,'#575e55');px(95,272,16,131,'#3c433d');
    if(flash>0){ctx.fillStyle='#fff3';ctx.fillRect(0,0,W,H);flash--;}
  }

  function drawPlayer() {
    const p=player,f=p.facing||1,bob=Math.abs(p.vx)>.3?Math.sin(tick*.35)*2:0;
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y+bob));ctx.scale(f,1);if(p.hurt%4>1)ctx.globalAlpha=.45;
    px(-10,37,8,15,'#342a26');px(8,37,8,15,'#342a26');px(-15,17,31,26,'#526477');px(-13,20,25,5,'#65798c');px(-11,2,22,19,'#9a7455');px(-13,1,25,7,'#342d28');px(-17,5,6,11,'#422f27');px(3,8,3,2,'#111');
    const aim=Math.atan2(pointer.y-(p.y+20),Math.abs(pointer.x-p.x));ctx.save();ctx.translate(5,20);ctx.rotate(aim*f);px(0,-3,25,6,'#b28c6a');px(19,-5,29,7,p.weapon==='rifle'?'#262c2b':p.weapon==='shotgun'?'#554838':'#d1d0c1');px(42,-4,8,3,'#181d1c');ctx.restore();
    if(p.melee>17){ctx.strokeStyle='#ddd6b8';ctx.lineWidth=4;ctx.beginPath();ctx.arc(17,20,32,-.8,.65);ctx.stroke();}if(p.kick>30){ctx.save();ctx.rotate(-.35);px(8,37,30,7,'#4b4036');ctx.restore();}ctx.restore();
  }

  function drawZombie(z) {
    const dir=Math.sign(player.x-z.x)||-1,walk=Math.sin(z.phase)*4;ctx.save();ctx.translate(Math.round(z.x),Math.round(z.y));ctx.scale(dir,1);if(z.hit%3>0)ctx.globalAlpha=.5;
    px(-9,z.h-9+walk,7,12,'#322d26');px(4,z.h-9-walk,7,12,'#342f28');const shirt=z.type==='runner'?'#77524c':z.type==='armored'?'#4b5760':z.type==='brute'?'#695143':'#3d526f';px(-13,13,27,z.h-17,shirt);px(-16,17,7,20,'#9a9d69');px(12,20,21,6,'#939866');px(28,19,7,6,'#7e8459');px(-10,0,21,16,'#a2a274');px(4,5,3,2,'#151814');px(8,10,5,3,'#6d1b1b');
    if(z.type==='armored'){px(-13,-3,27,9,'#5d6260');px(-11,0,23,6,'#777c78');px(-15,12,31,8,'#49535b');}if(z.type==='brute'){px(-15,-4,30,22,'#85835f');px(-18,15,36,24,'#695143');}ctx.restore();if(z.type==='brute'){px(z.x-22,z.y-15,44,4,'#181b18');px(z.x-22,z.y-15,44*z.hp/z.max,4,'#b43d35');}
  }

  function drawBarrier(b) {px(b.x-17,b.y,34,39,'#654d31');px(b.x-14,b.y+3,28,33,'#9b8053');for(let y=5;y<34;y+=10)px(b.x-18,b.y+y,36,5,'#4b3d2a');px(b.x-20,b.y-5,5,45,'#34372f');px(b.x+15,b.y-5,5,45,'#34372f');px(b.x-18,b.y-9,36*b.hp/b.max,3,'#aabe67');}

  function draw() {
    const sx=shake?rnd(-shake,shake):0,sy=shake?rnd(-shake*.45,shake*.45):0;shake*=.74;if(shake<.3)shake=0;ctx.save();ctx.translate(sx,sy);drawBackground();
    corpses.forEach(c=>{ctx.globalAlpha=Math.min(1,c.life/80);ctx.save();ctx.translate(c.x,c.y+31);ctx.rotate(c.flip?.12:-.1);px(-24,-6,48,11,'#26394d');px(9,-10,15,12,'#929568');ctx.restore();ctx.globalAlpha=1;});
    barriers.forEach(drawBarrier);grenades.forEach(g=>{px(g.x-4,g.y-4,8,8,'#2b312d');px(g.x-1,g.y-7,3,4,'#d5b55a');});zombies.forEach(drawZombie);if(player)drawPlayer();bullets.forEach(b=>px(b.x,b.y,7,2,b.color));
    particles.forEach(p=>{if(p.banner)return;if(p.text){ctx.fillStyle=p.color;ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);ctx.textAlign='left';}else{ctx.globalAlpha=Math.min(1,p.life/8);px(p.x,p.y,p.size||2,p.size||2,p.color);ctx.globalAlpha=1;}});ctx.restore();
    const banner=particles.find(p=>p.banner);if(banner){const a=Math.min(1,(banner.max-banner.life)/15,banner.life/20);ctx.globalAlpha=a;ctx.textAlign='center';ctx.fillStyle='#f0e5c8';ctx.font='bold 35px monospace';ctx.fillText(banner.big,W/2,190);ctx.fillStyle='#e03e45';ctx.font='bold 11px monospace';ctx.fillText(banner.small,W/2,216);ctx.textAlign='left';ctx.globalAlpha=1;}
    if(buildMode&&scene==='playing'){ctx.strokeStyle='#dbb455';ctx.lineWidth=2;ctx.strokeRect(clamp(pointer.x,235,W-85)-20,GROUND-48,40,48);ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText('PLACE FENCE · $40',clamp(pointer.x-52,10,W-120),GROUND-57);}
  }

  let lastDraw=0;
  function loop(now) {const dt=Math.min(2.5,(now-last)/16.67||1);last=now;if(scene==='playing'){for(let i=0;i<Math.max(1,Math.round(dt));i++)update();}if(!lowPowerDevice||now-lastDraw>=1000/30){draw();lastDraw=now;}requestAnimationFrame(loop);}
  function canvasPoint(e) { const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}; }
  canvas.addEventListener('pointermove',e=>Object.assign(pointer,canvasPoint(e)));
  canvas.addEventListener('pointerdown',e=>{if(scene!=='playing')return;Object.assign(pointer,canvasPoint(e));if(buildMode){placeBarrier(pointer.x);return;}pointer.down=true;canvas.setPointerCapture?.(e.pointerId);fire();});
  canvas.addEventListener('pointerup',()=>pointer.down=false);canvas.addEventListener('pointercancel',()=>pointer.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());

  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;
    if(e.code==='KeyQ'){const order=['pistol','shotgun','rifle'],start=order.indexOf(player?.weapon);for(let i=1;i<=order.length;i++){const n=order[(start+i)%order.length];if(player?.unlocked[n]){switchWeapon(n);break;}}}
    if(e.code==='KeyR')reload();if(e.code==='KeyE')melee();if(e.code==='Space')kick();if(e.code==='Digit1')switchWeapon('pistol');if(e.code==='Digit2')switchWeapon('shotgun');if(e.code==='Digit3')switchWeapon('rifle');if(e.code==='Digit4'){buildMode=!buildMode;updateHUD();}if(e.code==='Digit5')throwBomb();if(e.code==='Escape')scene==='playing'?pause():scene==='paused'&&ui.actions.firstElementChild?.click();
  });
  window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{pointer.down=false;keys=Object.create(null);if(!embedded&&scene==='playing')pause();});
  window.addEventListener('message',e=>{if(e.data==='pause-undead'&&scene==='playing')pause();if(e.data==='open-undead')mainMenu();});

  document.querySelectorAll('[data-start]').forEach(b=>b.addEventListener('click',()=>resetGame(b.dataset.start)));document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>showInfo(b.dataset.panel)));document.querySelectorAll('[data-weapon]').forEach(b=>b.addEventListener('click',()=>switchWeapon(b.dataset.weapon)));
  document.getElementById('build-button').addEventListener('click',()=>{buildMode=!buildMode;updateHUD();});document.getElementById('bomb-button').addEventListener('click',throwBomb);document.getElementById('next-day-button').addEventListener('click',()=>{day++;beginDay();});
  document.getElementById('sound-button').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♪':'×';e.currentTarget.setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');});
  document.querySelectorAll('[data-hold]').forEach(b=>{const set=v=>{keys[b.dataset.hold]=v;};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);set(true);});['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,()=>set(false)));});
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;if(a==='fire'){pointer.x=player?.facing>0?W:0;pointer.y=(player?.y||330)+20;pointer.down=true;fire();}if(a==='melee')melee();if(a==='kick')kick();}));document.querySelector('[data-action="fire"]').addEventListener('pointerup',()=>pointer.down=false);

  player={x:176,y:GROUND-52,vx:0,hp:100,maxHp:100,baseHp:100,maxBaseHp:100,facing:1,weapon:'pistol',ammo:{pistol:12},reserve:{pistol:60},unlocked:{pistol:true},grenades:1};
  zombies=[{x:730,y:GROUND-31,h:31,type:'walker',hp:55,max:55,phase:1},{x:805,y:GROUND-34,h:34,type:'armored',hp:90,max:90,phase:3}];
  mainMenu();requestAnimationFrame(loop);
})();
