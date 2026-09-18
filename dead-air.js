/* Dead Air — self-contained simulation, input, and synthesized station audio. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const ROOMS = [
    { x: 1, y: 9, w: 6, h: 6, name: 'ARRIVALS' },
    { x: 2, y: 2, w: 7, h: 5, name: 'TAPE ARCHIVE' },
    { x: 11, y: 7, w: 9, h: 9, name: 'CONTROL ROOM' },
    { x: 24, y: 2, w: 5, h: 7, name: 'TRANSMISSION' },
    { x: 22, y: 15, w: 7, h: 6, name: 'GENERATOR' },
    { x: 3, y: 18, w: 7, h: 3, name: 'MAINTENANCE' }
  ];
  const LAB_ROOMS = [
    {x:2,y:9,w:6,h:5,name:'SERVICE LIFT'},{x:3,y:2,w:8,h:5,name:'OBSERVATION'},
    {x:12,y:2,w:8,h:7,name:'SPECIMEN WARD'},{x:22,y:3,w:7,h:6,name:'QUARANTINE'},
    {x:10,y:11,w:11,h:9,name:'SEQUENCE LAB'},{x:23,y:14,w:6,h:6,name:'MORGUE'}
  ];
  function createState(level=1) {
    level=Number(level)===2?2:1;
    const rooms=level===2?LAB_ROOMS:ROOMS;
    const grid = Array.from({ length: 23 }, () => Array(31).fill(1));
    const carve = r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = 0; };
    rooms.forEach(carve);
    const halls=level===2
      ? [[5,5,3,8],[7,4,7,2],[16,7,3,6],[18,4,7,2],[25,7,3,9],[7,12,6,3],[19,13,7,3],[6,18,6,2]]
      : [[5,11,10,3],[4,5,3,7],[8,4,18,2],[13,4,3,6],[18,10,9,3],[25,7,3,5],[14,14,3,6],[8,18,17,3],[25,11,3,7]];
    halls.forEach(([x,y,w,h])=>carve({x,y,w,h}));
    if(level===1)for(let y=10;y<13;y++)for(let x=14;x<16;x++)grid[y][x]=1;
    const labOrder=[0,1,2,3].sort(()=>Math.random()-.5);
    const labTerminals=[
      {x:5.5,y:3.5,id:'△',name:'TRIANGLE',done:false,progress:0,index:0},
      {x:16.5,y:5.5,id:'○',name:'CIRCLE',done:false,progress:0,index:1},
      {x:26.5,y:5.5,id:'□',name:'SQUARE',done:false,progress:0,index:2},
      {x:15.5,y:17.5,id:'✕',name:'CROSS',done:false,progress:0,index:3}
    ];
    const labWindows=[
      {x:3.01,y:3.5,spawnX:4.2,spawnY:3.5,angle:0,label:'W1',reach:0,cool:4,broken:false},
      {x:14.5,y:2.01,spawnX:14.5,spawnY:3.3,angle:Math.PI/2,label:'W2',reach:0,cool:7,broken:false},
      {x:28.99,y:6,spawnX:27.7,spawnY:6,angle:Math.PI,label:'W3',reach:0,cool:10,broken:false},
      {x:28.99,y:17.5,spawnX:27.7,spawnY:17.5,angle:Math.PI,label:'W4',reach:0,cool:13,broken:false},
      {x:13.5,y:19.99,spawnX:13.5,spawnY:18.7,angle:-Math.PI/2,label:'W5',reach:0,cool:16,broken:false}
    ];
    return {
      level,grid, cols:31,rows:23,rooms,
      player:level===2?{x:5.5,y:11.5,angle:-Math.PI/2,pitch:0,moving:false,sprinting:false,focus:false}:{x:5.5,y:11.5,angle:-Math.PI/2,pitch:0,moving:false,sprinting:false,focus:false},
      enemy:{x:26.5,y:18.5,angle:0,active:false,mode:'dormant',stun:0,path:[],pathTimer:0,memory:0,target:null,patrol:0,attackWind:0},
      zombies:[],windows:level===2?labWindows:[],axeCase:level===2?{x:7.99,y:10.5,angle:Math.PI,label:'FIRE AXE'}:null,windowTimer:level===2?18:Infinity,maxZombies:1,
      relays:level===2?labTerminals:[{x:4.5,y:3.5,id:'01',name:'Tape archive',done:false,progress:0},{x:27.5,y:4.5,id:'02',name:'Transmission',done:false,progress:0},{x:26.5,y:18.5,id:'03',name:'Generator',done:false,progress:0}],
      sequence:labOrder,puzzleStep:0,puzzleMistakes:0,
      exit:level===2?{x:3.5,y:11.5}:{x:2.5,y:11.5},mode:'playing',time:0,collected:0,battery:100,stamina:100,
      threat:0, flash:0, reduced:false, deathTime:0, wakeAt:Infinity, exitProgress:0,
      health:100, hurt:0, punch:0, punchCooldown:0, punchPending:false, punchHand:0, hitMarker:0,
      grace:0, scareCooldown:0, signalTimer:32, blackout:0, step:0, events:[],
      enemySpawns:level===2?[{x:26.5,y:17.5},{x:25.5,y:5.5},{x:14.5,y:4.5}]:[{x:26.5,y:18.5},{x:27.5,y:4.5},{x:4.5,y:3.5},{x:6.5,y:19.5}],
      patrol:level===2?[{x:5.5,y:4.5},{x:16.5,y:5.5},{x:26.5,y:5.5},{x:25.5,y:17.5},{x:15.5,y:15.5}]:[{x:5.5,y:4.5},{x:26.5,y:5.5},{x:26.5,y:18.5},{x:7.5,y:19.5},{x:12.5,y:11.5}],
      caption:level===2?'Read the sequence. Activate the four symbols in order. Stay away from the glass.':'Find the amber signals. Restore all three relays.',captionUntil:8,focusLocked:false,breathless:false
    };
  }
  function wall(s,x,y) { return s.grid[Math.floor(y)]?.[Math.floor(x)] !== 0; }
  function canOccupy(s,x,y,r=.23) {
    return !wall(s,x-r,y-r) && !wall(s,x+r,y-r) && !wall(s,x-r,y+r) && !wall(s,x+r,y+r);
  }
  function move(s,body,dx,dy,r=.23) {
    const pieces = Math.max(1, Math.ceil(Math.hypot(dx,dy)/.12));
    for(let n=0;n<pieces;n++) {
      if(canOccupy(s,body.x+dx/pieces,body.y,r)) body.x+=dx/pieces;
      if(canOccupy(s,body.x,body.y+dy/pieces,r)) body.y+=dy/pieces;
    }
  }
  function lineOfSight(s,a,b) {
    const length=dist(a,b), steps=Math.max(1,Math.ceil(length/.12));
    for(let i=1;i<=steps;i++) if(wall(s,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)) return false;
    return true;
  }
  function findPath(s,from,to) {
    const fx=Math.floor(from.x),fy=Math.floor(from.y),tx=Math.floor(to.x),ty=Math.floor(to.y);
    if(wall(s,fx,fy)||wall(s,tx,ty)) return [];
    const start=fy*s.cols+fx, goal=ty*s.cols+tx;
    const previous=new Int16Array(s.cols*s.rows).fill(-1), queue=[start]; previous[start]=start;
    for(let head=0;head<queue.length;head++) {
      const cell=queue[head]; if(cell===goal) break;
      const x=cell%s.cols,y=Math.floor(cell/s.cols);
      for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
        const next=ny*s.cols+nx;
        if(!wall(s,nx,ny)&&previous[next]===-1) { previous[next]=cell;queue.push(next); }
      }
    }
    if(previous[goal]===-1) return [];
    const path=[]; for(let cell=goal;cell!==start;cell=previous[cell]) path.push({x:cell%s.cols+.5,y:Math.floor(cell/s.cols)+.5});
    return path.reverse();
  }
  function nearestInteraction(s) {
    const relay=s.relays.find(r=>!r.done && dist(s.player,r)<1.25 && lineOfSight(s,s.player,r));
    if(relay) return {kind:'relay',object:relay};
    if(dist(s.player,s.exit)<1.5) return {kind:'exit',object:s.exit};
    return null;
  }
  function say(s,text,duration=5) { s.caption=text;s.captionUntil=s.time+duration; }
  function event(s,type) { s.events.push(type); }
  function harm(s,amount,source) {
    if(s.grace>0||s.mode!=='playing')return false;
    s.health=Math.max(0,s.health-amount);s.hurt=1;s.grace=1.35;event(s,'hurt');
    if(source){const d=Math.max(.01,dist(s.player,source));move(s,s.player,(s.player.x-source.x)/d*.28,(s.player.y-source.y)/d*.28);}
    say(s,s.health>0?'PUNCH — then move!':'The glass goes quiet.',2);
    if(s.health<=0){s.mode='dead';s.deathTime=0;event(s,'caught');}
    return true;
  }
  function spawnZombie(s,window) {
    if(s.zombies.length>=s.maxZombies)return false;
    const w=window||s.windows.find(v=>!v.broken)||s.windows[0];if(!w)return false;
    w.broken=true;w.reach=0;w.cool=8;
    s.zombies.push({x:w.spawnX,y:w.spawnY,angle:w.angle+Math.PI,active:true,stun:.7,path:[],pathTimer:0,attackWind:0,window:w.label,kind:'stalker',gait:Math.random()*TAU});
    event(s,'windowBreak');say(s,'GLASS BROKEN. It folded itself through.',3.5);return true;
  }
  function updateZombie(s,z,dt) {
    if(!z.active)return;
    z.stun=Math.max(0,z.stun-dt);z.pathTimer-=dt;
    if(z.pathTimer<=0){z.path=findPath(s,z,s.player);z.pathTimer=.45;}
    if(z.stun<=0){
      const target=lineOfSight(s,z,s.player)?s.player:z.path[0];
      if(target){const d=dist(z,target),speed=1.14;if(d>.05){z.angle=Math.atan2(target.y-z.y,target.x-z.x);move(s,z,(target.x-z.x)/d*Math.min(d,speed*dt),(target.y-z.y)/d*Math.min(d,speed*dt),.22);}if(z.path[0]&&dist(z,z.path[0])<.16)z.path.shift();}
    }
    if(dist(s.player,z)<.92&&z.stun<=0){z.attackWind+=dt;if(z.attackWind>.55){harm(s,25,z);z.attackWind=0;z.stun=.35;}}else z.attackWind=0;
  }
  function updateLab(s,input,interaction,dt) {
    if(!input.interact)s.interactLatch=null;
    for(const terminal of s.relays){
      if(input.interact&&s.interactLatch!==terminal.index&&interaction?.object===terminal){
        terminal.progress=clamp(terminal.progress+dt/.8,0,1);
        if(terminal.progress>=1){
          terminal.progress=0;s.interactLatch=terminal.index;
          if(terminal.index===s.sequence[s.puzzleStep]){
            terminal.done=true;s.puzzleStep++;s.collected=s.puzzleStep;s.flash=.2;s.grace=Math.max(s.grace,1);event(s,'terminal');
            if(s.puzzleStep===s.sequence.length){say(s,'SEQUENCE ACCEPTED. The service lift is unlocked.',6);event(s,'escape');}
            else say(s,'Correct. Next symbol: '+s.relays[s.sequence[s.puzzleStep]].id,3);
          }else{
            s.puzzleMistakes++;s.puzzleStep=0;s.collected=0;for(const r of s.relays)r.done=false;
            say(s,'WRONG SEQUENCE. The windows are opening.',4);event(s,'wrong');
            spawnZombie(s,s.windows.reduce((best,w)=>dist(s.player,w)<dist(s.player,best)?w:best,s.windows[0]));
          }
        }
      }else if(!terminal.done)terminal.progress=Math.max(0,terminal.progress-dt*.6);
    }
    for(const w of s.windows){
      w.cool=Math.max(0,w.cool-dt);const near=dist(s.player,w)<1.55;
      if(near&&!w.broken&&w.cool<=0){w.reach+=dt;if(w.reach>.72){harm(s,20,w);w.reach=0;w.cool=4.5;event(s,'windowHit');}}
      else w.reach=Math.max(0,w.reach-dt*1.8);
    }
    s.windowTimer-=dt;
    if(s.windowTimer<=0&&s.puzzleStep<s.sequence.length){spawnZombie(s,s.windows.find(w=>!w.broken));s.windowTimer=20+Math.random()*8;}
    for(const z of s.zombies)updateZombie(s,z,dt);
  }
  function punch(s) {
    if(s.mode!=='playing'||s.punchCooldown>0||s.stamina<24)return false;
    s.stamina-=24;s.punch=.36;s.punchCooldown=.68;s.punchPending=true;s.punchHand=1-s.punchHand;
    event(s,'swing');return true;
  }
  function update(s,input,dt) {
    if(s.mode!=='playing') return;
    dt=clamp(dt,0,.05); s.time+=dt;s.grace=Math.max(0,s.grace-dt);
    s.flash=Math.max(0,s.flash-dt*1.3);s.scareCooldown=Math.max(0,s.scareCooldown-dt);
    s.blackout=Math.max(0,s.blackout-dt);
    const p=s.player,e=s.enemy;
    s.hurt=Math.max(0,s.hurt-dt);s.hitMarker=Math.max(0,s.hitMarker-dt);
    s.punchCooldown=Math.max(0,s.punchCooldown-dt);s.punch=Math.max(0,s.punch-dt);
    if(input.punch&&!input.interact)punch(s);
    let mx=input.x||0,my=input.y||0, length=Math.hypot(mx,my);
    if(Number.isFinite(input.aimAngle)) p.angle=input.aimAngle;
    p.angle=angleDiff(p.angle+(input.turn||0)*dt*1.85,0);
    if(Number.isFinite(input.forward)||Number.isFinite(input.strafe)){
      const f=input.forward||0,side=input.strafe||0;
      mx=Math.cos(p.angle)*f-Math.sin(p.angle)*side;my=Math.sin(p.angle)*f+Math.cos(p.angle)*side;length=Math.hypot(mx,my);
    }
    if(length>1){mx/=length;my/=length;length=1;}
    if(s.punchPending&&s.punch<=.23){
      s.punchPending=false;
      const target=[e,...s.zombies].filter(t=>t.active&&dist(p,t)<1.65&&Math.abs(angleDiff(Math.atan2(t.y-p.y,t.x-p.x),p.angle))<.65&&lineOfSight(s,p,t)).sort((a,b)=>dist(p,a)-dist(p,b))[0];
      if(target){
        const d=Math.max(.01,dist(p,target));move(s,target,(target.x-p.x)/d*.95,(target.y-p.y)/d*.95,.22);
        target.stun=1.1;target.attackWind=0;target.pathTimer=0;s.hitMarker=.22;s.grace=Math.max(s.grace,.35);event(s,'punchHit');
        say(s,'You staggered it. MOVE.',1.5);
      }
    }
    p.moving=length>.05;
    if(s.stamina<1) s.breathless=true;
    if(s.stamina>24) s.breathless=false;
    p.sprinting=!!input.sprint && p.moving && !s.breathless && !input.interact;
    if(s.battery<1) s.focusLocked=true;
    if(!input.focus && s.battery>15) s.focusLocked=false;
    p.focus=!!input.focus && !s.focusLocked && s.battery>0;
    s.stamina=clamp(s.stamina+dt*(p.sprinting?-26:s.punchCooldown>0?4:17),0,100);
    s.battery=clamp(s.battery+dt*(p.focus?-29:10),0,100);
    const speed=(p.sprinting?3.65:2.12)*(input.interact ? .35 : 1)*(p.focus ? .78 : 1);
    move(s,p,mx*speed*dt,my*speed*dt);
    if(p.moving) {s.step+=dt*(p.sprinting?3.6:2.4);if(s.step>=1){s.step%=1;event(s,p.sprinting?'run':'step');}}
    const interaction=nearestInteraction(s);
    if(s.level===2)updateLab(s,input,interaction,dt);
    for(const r of s.relays) {
      if(s.level===2)break;
      if(r.done) continue;
      if(input.interact && interaction?.object===r) {
        r.progress=clamp(r.progress+dt/2.4,0,1);
        if(e.active){e.target={x:p.x,y:p.y};e.memory=16;}
        if(r.progress>=1) {
          r.done=true;s.collected++;s.battery=100;s.stamina=100;s.flash=.35;s.grace=2.5;event(s,'relay');
          if(s.collected===1) {s.wakeAt=s.time+7;say(s,'Relay online. Something heard that.',5);}
          else if(s.collected===3) {say(s,'EXIT UNLOCKED. Return to arrivals. Do not stop.',7);event(s,'escape');}
          else say(s,'Two online. The footsteps are getting closer.',5);
        }
      } else r.progress=Math.max(0,r.progress-dt*.35);
    }
    const goal=s.level===2?s.sequence.length:3;
    if(input.interact && interaction?.kind==='exit' && s.collected===goal) {
      s.exitProgress=clamp(s.exitProgress+dt/1.1,0,1);
      if(s.exitProgress>=1) {s.mode='won';event(s,'win');return;}
    } else s.exitProgress=0;
    if(!e.active && s.time>=s.wakeAt) {
      // Wake at a distant floor location, never in the player's current room.
      const candidates=s.enemySpawns;
      const far=candidates.sort((a,b)=>dist(b,p)-dist(a,p))[0];
      e.x=far.x;e.y=far.y;e.active=true;e.target={x:p.x,y:p.y};e.memory=15;e.mode='search';
      event(s,'wake');say(s,'That is not the building settling. Keep your beam ready.',6);
    }
    if(!e.active){
      const living=s.zombies.filter(z=>z.active);
      if(living.length){const near=Math.min(...living.map(z=>dist(p,z)));s.threat+=(clamp(1-near/8,0,1)-s.threat)*Math.min(1,dt*4);}
      else s.threat=0;
      return;
    }
    const distance=dist(p,e),visible=lineOfSight(s,e,p), sees=visible && distance<10;
    const heard=p.sprinting && distance<16;
    if(sees||heard) {e.target={x:p.x,y:p.y};e.memory=11;}
    else e.memory=Math.max(0,e.memory-dt);
    const hitByBeam=p.focus && distance<7.5 && visible && Math.abs(angleDiff(Math.atan2(e.y-p.y,e.x-p.x),p.angle))<.42;
    if(hitByBeam) {
      if(e.stun<.05) event(s,'repel');
      e.stun=Math.max(e.stun,.45);e.mode='repelled';e.attackWind=0;
      // Light buys breathing room. It never permanently kills the listener.
      if(distance<4.8 && distance>.1) move(s,e,(e.x-p.x)/distance*1.1*dt,(e.y-p.y)/distance*1.1*dt,.25);
    } else {e.stun=Math.max(0,e.stun-dt);e.mode=e.stun>0?'staggered':sees?'chase':'search';}
    if(e.stun<=0) {
      if(!e.target||e.memory<=0) {
        const patrol=s.patrol;
        if(!e.target||dist(e,e.target)<.7||e.memory===0) {
          e.target=patrol[e.patrol++%patrol.length];e.memory=7;
        }
      }
      e.pathTimer-=dt;
      if(e.pathTimer<=0) {e.path=findPath(s,e,e.target);e.pathTimer=.5;}
      // Direct chase only across an unobstructed segment; otherwise follow the grid.
      const target=lineOfSight(s,e,e.target)?e.target:e.path[0];
      if(target) {
        const d=dist(e,target),speed=(e.mode==='chase'?1.55:1.25)+s.collected*.12;
        if(d>.06){e.angle=Math.atan2(target.y-e.y,target.x-e.x);move(s,e,(target.x-e.x)/d*Math.min(d,speed*dt),(target.y-e.y)/d*Math.min(d,speed*dt),.25);}
        if(e.path[0]&&dist(e,e.path[0])<.15)e.path.shift();
      }
    }
    const danger=clamp(1-distance/10,0,1);
    s.threat+=((visible?danger:danger*.5)-s.threat)*Math.min(1,dt*4);
    if(sees && distance<5.5 && s.scareCooldown<=0 && !hitByBeam) {
      event(s,'sighting');s.scareCooldown=16;s.flash=.23;say(s,'HOLD SPACE. Point the beam at it.',3.5);
    }
    s.signalTimer-=dt;
    if(s.signalTimer<=0) {s.signalTimer=30+s.collected*3;s.blackout=2.3;event(s,'signal');say(s,'The signal is breaking up.',3);}
    if(dist(p,e)<1.03 && e.stun<=0 && s.grace<=0 && lineOfSight(s,p,e)) {
      e.attackWind=(e.attackWind||0)+dt;
      if(e.attackWind>=.42){
        harm(s,40,e);e.attackWind=0;e.stun=.5;
        const d=Math.max(.01,dist(p,e));move(s,p,(p.x-e.x)/d*.3,(p.y-e.y)/d*.3);say(s,'CLICK or F — punch it back!',2);
      }
    }else e.attackWind=0;
  }
  // Pure simulation stays available for deterministic regression verification.
  window.DeadAirCore={createState,update,punch,canOccupy,move,lineOfSight,findPath,nearestInteraction};
  if(typeof document==='undefined'||!document.getElementById('da-canvas'))return;

  class StationAudio {
    constructor(){this.ctx=null;this.enabled=true;this.volume=.55;this.nextBeat=0;this.nextCreak=0;this.nextWhisper=0;}
    start(){
      try {
        if(!this.ctx){
          const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
          this.ctx=new Audio();const a=this.ctx;
          this.master=a.createGain();this.master.gain.value=this.enabled?this.volume*.42:0;
          const compressor=a.createDynamicsCompressor();compressor.threshold.value=-22;compressor.ratio.value=6;
          this.master.connect(compressor);compressor.connect(a.destination);
          this.drone=a.createGain();this.drone.gain.value=.04;this.drone.connect(this.master);
          [42,63.2,84.3].forEach((f,i)=>{const o=a.createOscillator();o.type=i===1?'sine':'triangle';o.frequency.value=f;o.connect(this.drone);o.start();});
          const buffer=a.createBuffer(1,a.sampleRate*2,a.sampleRate),data=buffer.getChannelData(0);
          for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
          this.noiseBuffer=buffer;
        }
        if(this.ctx.state==='suspended') this.ctx.resume().catch(()=>{});
      }catch{/* Audio support is optional; every threat has a visual cue. */}
    }
    set(enabled,volume=this.volume){this.enabled=enabled;this.volume=volume;if(this.ctx)this.master.gain.setTargetAtTime(enabled?volume*.42:0,this.ctx.currentTime,.05);}
    pause(){if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
    close(){if(this.ctx)this.ctx.close().catch(()=>{});}
    tone(frequency,duration,volume,type='sine',end=frequency,delay=0){
      if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;
      const a=this.ctx,t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();
      o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(10,end),t+duration);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+duration);
      o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.04);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    noise(duration,volume,frequency=600,pan=0){
      if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;
      const a=this.ctx,t=a.currentTime,source=a.createBufferSource(),filter=a.createBiquadFilter(),g=a.createGain();
      source.buffer=this.noiseBuffer;source.loop=true;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
      g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(volume,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+duration);
      source.connect(filter);filter.connect(g);
      let panner;if(a.createStereoPanner){panner=a.createStereoPanner();panner.pan.value=clamp(pan,-1,1);g.connect(panner);panner.connect(this.master);}else g.connect(this.master);
      source.start();source.stop(t+duration+.05);source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();panner?.disconnect();};
    }
    play(type){
      if(type==='step'||type==='run'){this.noise(.1,type==='run'?.18:.10,170);this.tone(80,.11,.12,'sine',35);}
      if(type==='relay'){this.tone(240,.2,.16,'sine',260);this.tone(390,.4,.15,'sine',520,.18);this.noise(.8,.18,120);}
      if(type==='wake'){this.tone(190,2,.23,'triangle',27);this.noise(1.6,.3,420,-.7);}
      if(type==='sighting'){this.tone(145,.8,.22,'sawtooth',43);this.noise(.7,.26,1050);}
      if(type==='repel'){this.noise(.4,.13,2200);this.tone(630,.3,.07,'sine',840);}
      if(type==='swing')this.noise(.2,.19,450);
      if(type==='punchHit'){this.tone(110,.16,.32,'triangle',32);this.noise(.16,.3,250);}
      if(type==='hurt'){this.tone(70,.4,.3,'sawtooth',30);this.noise(.5,.3,380);}
      if(type==='signal'){this.noise(1.8,.2,1600,.6);this.tone(750,.5,.05,'sine',600);}
      if(type==='terminal'){this.tone(330,.18,.16,'square',390);this.tone(590,.3,.12,'sine',720,.16);}
      if(type==='wrong'){this.tone(160,.8,.3,'sawtooth',45);}
      if(type==='windowBreak'){this.noise(.75,.45,1900);this.tone(90,.6,.2,'square',30);}
      if(type==='windowHit'){this.noise(.25,.3,520);}
      if(type==='escape'){[0,.22,.44].forEach(d=>this.tone(440,.15,.15,'triangle',440,d));}
      if(type==='caught'){this.noise(1.5,.5,750);this.tone(280,1.6,.32,'sawtooth',25);}
      if(type==='win'){[220,277,330,440].forEach((f,i)=>this.tone(f,1.7,.12,'sine',f,i*.2));}
    }
    tick(s){
      if(!this.ctx||!this.enabled)return;
      const t=this.ctx.currentTime;
      this.drone.gain.setTargetAtTime(.045+s.threat*.095,t,.3);
      if(s.threat>.08 && t>this.nextBeat){
        this.nextBeat=t+1.1-s.threat*.65;
        this.tone(56,.16,.18+s.threat*.12,'sine',31);this.tone(48,.13,.1,'sine',28,.18);
      }
      if(t>this.nextCreak){this.nextCreak=t+9+Math.random()*10;this.noise(.9,.055,130+Math.random()*150,Math.random()*2-1);}
      if(s.enemy.active && t>this.nextWhisper){this.nextWhisper=t+6+Math.random()*5;this.noise(1.3,.06+s.threat*.13,700,(s.enemy.x-s.player.x)/9);}
    }
  }
  const $=id=>document.getElementById(id);
  const renderer=new window.DeadAirRenderer($('da-canvas')),audio=new StationAudio();
  let selectedLevel=1,state=createState(selectedLevel);state.mode='menu';
  let last=0,accumulator=0,raf=0,lastMode='menu',mapOpen=false,endingShown=false;
  const keys=new Set(),touch={x:0,y:0,focus:false,sprint:false,interact:false,punch:false};
  let pointer=null,stickPointer=null,aimPointer=null,stickOrigin=null,mousePunch=false,lookTravel=0;
  let best=null;try{best=Number(localStorage.getItem('dead-air-best'))||null;}catch{}
  const reducedMedia=window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchMedia=window.matchMedia('(pointer: coarse)');
  $('da-reduced').checked=reducedMedia.matches;state.reduced=reducedMedia.matches;
  function clearInput(){keys.clear();touch.x=touch.y=0;touch.focus=touch.sprint=touch.interact=touch.punch=false;mousePunch=false;pointer=null;stickPointer=aimPointer=null;stickOrigin=null;$('da-stick-knob').style.transform='translate(-50%, -50%)';}
  function releaseMouse(){if(document.pointerLockElement===$('da-canvas'))document.exitPointerLock?.();}
  function captureMouse(){
    if(touchMedia.matches||state.mode!=='playing')return;
    try{const result=$('da-canvas').requestPointerLock?.();result?.catch(()=>say(state,'Drag the view to look. Arrow keys turn. F punches.',5));}catch{say(state,'Drag the view to look. Arrow keys turn. F punches.',5);}
  }
  function visible(id,show){$(id).hidden=!show;}
  function setScreen(mode){
    visible('da-menu',mode==='menu');visible('da-pause',mode==='paused'&&!mapOpen);
    visible('da-hud',mode==='playing'||mode==='paused');
    $('da-hud').inert=mode!=='playing';
    visible('da-touch',mode==='playing');visible('da-caption',mode==='playing');
    if(mode!=='playing')visible('da-prompt',false);
    document.body.dataset.mode=mode;
  }
  function start(level=selectedLevel){
    if(typeof level!=='number')level=selectedLevel;selectedLevel=level;
    clearInput();pointer=null;state=createState(selectedLevel);state.reduced=$('da-reduced').checked;
    endingShown=false;lastMode='playing';mapOpen=false;visible('da-ending',false);visible('da-map',false);
    audio.set($('da-audio').checked,Number($('da-volume').value)/100);audio.start();
    setScreen('playing');last=0;accumulator=0;renderer.initialized=false;renderer.resize();$('da-canvas').focus();
    captureMouse();
  }
  function pause(){
    if(state.mode!=='playing')return;
    state.mode='paused';releaseMouse();clearInput();audio.pause();setScreen('paused');$('da-resume').focus();
  }
  function resume(){
    if(state.mode!=='paused')return;
    mapOpen=false;visible('da-map',false);state.mode='playing';clearInput();audio.start();last=0;accumulator=0;
    setScreen('playing');$('da-canvas').focus();
    captureMouse();
  }
  function menu(){
    releaseMouse();clearInput();state=createState(selectedLevel);state.mode='menu';state.reduced=$('da-reduced').checked;
    endingShown=false;
    mapOpen=false;visible('da-map',false);visible('da-ending',false);audio.pause();renderer.initialized=false;setScreen('menu');$('da-start').focus();
  }
  function toggleMap(){
    if(mapOpen){resume();return;}
    if(state.mode!=='playing')return;
    pause();mapOpen=true;visible('da-pause',false);visible('da-map',true);
    $('da-map-kicker').textContent=state.level===2?'NORTH RIDGE / SUBLEVEL 02':'NORTH RIDGE / SUBLEVEL 01';
    $('da-map-title').textContent=state.level===2?'Glass Ward schematic':'Station schematic';
    $('da-map-objective-label').textContent=state.level===2?'SYMBOL LOCK':'RELAY';
    visible('da-map-window-legend',state.level===2);
    renderer.drawMap($('da-map-canvas'),state);$('da-map-close').focus();
  }
  function formatTime(time){return Math.floor(time/60).toString().padStart(2,'0')+':'+Math.floor(time%60).toString().padStart(2,'0');}
  function finish(){
    const won=state.mode==='won';endingShown=true;releaseMouse();clearInput();setScreen(state.mode);visible('da-ending',true);
    $('da-ending-title').textContent=won?'You got out.':'It heard you.';
    $('da-ending-copy').textContent=won?'The signal is dead. Behind you, the footsteps stop. Then the radio in your pocket turns on.':'The station is quiet again. Punch when it gets close, then run. Keep stamina in reserve and use your focused beam before it reaches you.';
    let newBest=false;if(won&&(!best||state.time<best)){best=state.time;newBest=true;try{localStorage.setItem('dead-air-best',String(best));}catch{}}
    $('da-ending-stats').textContent=state.collected+' / '+(state.level===2?'4 SYMBOLS':'3 RELAYS')+'  ·  '+formatTime(state.time)+(won?(newBest?'  ·  NEW BEST':'  ·  BEST '+formatTime(best)):' SURVIVED');
    $('da-retry').textContent=won?'Enter again':'Try again';$('da-retry').focus();
  }
  let uiTick=0;
  function updateHud(dt){
    uiTick+=dt;if(uiTick<.07)return;uiTick=0;
    const total=state.level===2?4:3;
    $('da-count-label').textContent=state.level===2?'SEQUENCE LOCKS':'RELAYS ONLINE';
    $('da-count').textContent=String(state.collected).padStart(2,'0')+' / '+String(total).padStart(2,'0');
    $('da-objective').textContent=state.level===2
      ? state.collected===total?'Return to service lift · Door unlocked':'Order: '+state.sequence.map((n,i)=>(i<state.puzzleStep?'✓':state.relays[n].id)).join('  ›  ')
      : state.collected===3?'Return to arrivals · Exit unlocked':'Restore the three relay signals';
    $('da-clock').textContent=formatTime(state.time);
    $('da-battery').style.width=state.battery+'%';$('da-stamina').style.width=state.stamina+'%';
    $('da-health').textContent=state.health+'%';$('da-health').dataset.danger=state.health<50?'true':'false';
    $('da-fists').textContent=state.stamina<24?'FISTS · EXHAUSTED':state.punchCooldown>0?'FISTS · RECOVERING':touchMedia.matches?'FISTS · PUNCH':'FISTS · CLICK / F';
    const zombieAttack=state.zombies.some(z=>z.active&&z.attackWind>0),zombieStun=state.zombies.some(z=>z.active&&z.stun>0);
    const threat=state.enemy.attackWind>0||zombieAttack?'PUNCH — IT IS REACHING':state.enemy.stun>0||zombieStun?'STAGGERED · GET AWAY':state.threat>.6?'IT IS RIGHT BEHIND YOU':state.threat>.3?'FOOTSTEPS NEARBY':state.enemy.active||state.zombies.some(z=>z.active)?'YOU ARE NOT ALONE':'NO SIGNAL';
    $('da-threat').textContent=threat;$('da-threat').dataset.danger=state.threat>.3?'true':'false';
    $('da-caption').textContent=state.time<state.captionUntil?(touchMedia.matches?state.caption.replace('SPACE','FOCUS'):state.caption):'';
    const target=nearestInteraction(state);
    visible('da-prompt',!!target&&state.mode==='playing');
    if(target){
      const label=$('da-prompt').querySelector('[data-prompt-label]');
      const key=touchMedia.matches?'USE':'E';
      const goal=state.level===2?4:3,verb=state.level===2?'Activate ':'Restore ';
      const text=target.kind==='relay'?'Hold '+key+' · '+verb+target.object.name:state.collected===goal?'Hold '+key+' · Open '+(state.level===2?'service lift':'emergency exit'):'Exit sealed · Complete the objective';
      if(label)label.textContent=text;
      else $('da-prompt').setAttribute('aria-label',text);
      $('da-progress').style.width=((target.kind==='relay'?target.object.progress:state.exitProgress)*100)+'%';
      $('da-use').textContent=target.kind==='relay'?(state.level===2?'ACTIVATE':'RESTORE'):'EXIT';
    }else $('da-use').textContent='USE';
    $('da-sound').textContent=audio.enabled?'SOUND ON':'SOUND OFF';$('da-sound').setAttribute('aria-pressed',String(audio.enabled));$('da-sound').setAttribute('aria-label',audio.enabled?'Mute sound':'Enable sound');
  }
  function frame(now){
    const elapsed=last?Math.min((now-last)/1000,.1):0;last=now;
    if(state.mode==='playing'){
      accumulator+=elapsed;
      while(accumulator>=1/60){
        const p=state.player;
        const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-touch.y;
        const strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.x;
        const turn=(keys.has('ArrowRight')||keys.has('KeyL')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyJ')?1:0);
        update(state,{forward,strafe,turn,punch:mousePunch||keys.has('KeyF')||touch.punch,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.sprint,focus:keys.has('Space')||touch.focus,interact:keys.has('KeyE')||touch.interact},1/60);
        accumulator-=1/60;
        if(state.mode!=='playing'){accumulator=0;break;}
      }
      state.events.splice(0).forEach(type=>audio.play(type));audio.tick(state);updateHud(elapsed);
    }
    if(state.mode==='dead'||state.mode==='won'){
      state.deathTime+=elapsed;
      if(!endingShown&&state.deathTime>(state.reduced ? .25 : 1.3))finish();
    }
    if(lastMode!==state.mode){lastMode=state.mode;if(state.mode==='dead'||state.mode==='won'){releaseMouse();setScreen(state.mode);}}
    if(state.mode!=='paused')renderer.draw(state,elapsed);
    raf=requestAnimationFrame(frame);
  }
  $('da-start').addEventListener('click',start);$('da-restart').addEventListener('click',start);$('da-retry').addEventListener('click',start);
  document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{
    selectedLevel=Number(button.dataset.level)||1;
    document.querySelectorAll('[data-level]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});
    $('da-start').querySelector('span').textContent=selectedLevel===2?'Enter the glass ward':'Enter the relay station';
    const lab=selectedLevel===2;
    $('da-brief-title').innerHTML=lab?'Decode the lock.<br>Stay clear of the glass.':'Bring the power back.<br>Make it out alive.';
    $('da-story').textContent=lab?'The lift stops below the station. Four locks guard the exit. Beyond every observation window, something is waiting.':'The station went silent at 02:17. The doors locked. Then the footsteps started.';
    $('da-step1-title').textContent=lab?'Memorize the sequence':'Restore three relays';
    $('da-step1-copy').textContent=lab?'The HUD shows four symbols. Activate their terminals in order.':'Find the amber signals. Hold E / USE to repair.';
    $('da-step2-title').textContent=lab?'Do not trust the windows':'Fight it off';
    $('da-step2-copy').textContent=lab?'Move away when an arm reaches in. Wrong answers cause a breach.':'Click / F / PUNCH staggers it. Save your stamina.';
    $('da-step3-title').textContent=lab?'Reach the service lift':'Return to the exit';
    $('da-step3-copy').textContent=lab?'Punch the escaped dead back. Finish the sequence and run.':'Move quietly. Running tells it where you are.';
  }));
  $('da-resume').addEventListener('click',resume);$('da-pause-button').addEventListener('click',pause);
  $('da-end-menu').addEventListener('click',menu);
  $('da-quit').addEventListener('click',menu);
  $('da-map-button').addEventListener('click',toggleMap);$('da-map-close').addEventListener('click',resume);
  $('da-audio').addEventListener('change',()=>audio.set($('da-audio').checked));
  $('da-volume').addEventListener('input',()=>audio.set(audio.enabled,Number($('da-volume').value)/100));
  $('da-reduced').addEventListener('change',()=>state.reduced=$('da-reduced').checked);
  $('da-sound').addEventListener('click',()=>{audio.set(!audio.enabled);$('da-audio').checked=audio.enabled;updateHud(.1);});
  window.addEventListener('keydown',e=>{
    const inForm=/INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
    if(inForm&&state.mode!=='playing'&&e.code!=='Escape')return;
    if((state.mode==='playing'&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE'].includes(e.code))||(['playing','paused'].includes(state.mode)&&['KeyM','Escape'].includes(e.code)))e.preventDefault();
    if(e.code==='Tab'&&(state.mode==='paused'||endingShown)){
      const modal=$(mapOpen?'da-map':state.mode==='paused'?'da-pause':'da-ending');
      const buttons=Array.from(modal.querySelectorAll('button'));
      const first=buttons[0],lastButton=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastButton.focus();}
      else if(!e.shiftKey&&document.activeElement===lastButton){e.preventDefault();first.focus();}
    }
    if(!e.repeat&&(e.code==='Escape'||e.code==='KeyP')){if(state.mode==='playing')pause();else if(state.mode==='paused')resume();return;}
    if(!e.repeat&&e.code==='KeyM'){toggleMap();return;}
    if(!e.repeat&&e.code==='KeyF'&&state.mode==='playing')punch(state);
    if(state.mode==='playing')keys.add(e.code);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{clearInput();pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();audio.pause();}});
  document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state.mode==='playing')pause();});
  document.addEventListener('mousemove',e=>{
    if(document.pointerLockElement===$('da-canvas')&&state.mode==='playing'){
      state.player.angle=angleDiff(state.player.angle+e.movementX*.0023,0);
      state.player.pitch=clamp(state.player.pitch-e.movementY*.0018,-.46,.46);
    }
  });
  $('da-canvas').addEventListener('pointermove',e=>{
    if(e.pointerId===aimPointer&&pointer&&state.mode==='playing'&&!document.pointerLockElement){
      state.player.angle=angleDiff(state.player.angle+(e.clientX-pointer.x)*.005,0);
      state.player.pitch=clamp(state.player.pitch-(e.clientY-pointer.y)*.003,-.46,.46);
      lookTravel+=Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y);
      pointer={x:e.clientX,y:e.clientY};
    }
  });
  $('da-canvas').addEventListener('pointerdown',e=>{
    if(state.mode!=='playing')return;
    if(e.pointerType==='mouse'&&document.pointerLockElement===$('da-canvas')){if(e.button===0){mousePunch=true;punch(state);}return;}
    aimPointer=e.pointerId;lookTravel=0;pointer={x:e.clientX,y:e.clientY};$('da-canvas').setPointerCapture(e.pointerId);
    if(e.pointerType==='mouse')captureMouse();
  });
  window.addEventListener('pointerup',()=>mousePunch=false);
  const releaseAim=e=>{if(e.pointerId===aimPointer){if(e.type==='pointerup'&&e.pointerType==='mouse'&&lookTravel<6&&!document.pointerLockElement)punch(state);aimPointer=null;pointer=null;}};
  $('da-canvas').addEventListener('pointerup',releaseAim);$('da-canvas').addEventListener('pointercancel',releaseAim);
  $('da-stick').addEventListener('pointerdown',e=>{
    if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;
    const r=$('da-stick').getBoundingClientRect();stickOrigin={x:r.left+r.width/2,y:r.top+r.height/2};$('da-stick').setPointerCapture(e.pointerId);dragStick(e);
  });
  function dragStick(e){if(e.pointerId!==stickPointer||!stickOrigin)return;e.preventDefault();const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y,d=Math.hypot(dx,dy),limit=36,scale=d>limit?limit/d:1;touch.x=dx*scale/limit;touch.y=dy*scale/limit;$('da-stick-knob').style.transform='translate(calc(-50% + '+dx*scale+'px), calc(-50% + '+dy*scale+'px))';}
  $('da-stick').addEventListener('pointermove',dragStick);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])$('da-stick').addEventListener(type,e=>{if(e.pointerId===stickPointer){stickPointer=null;touch.x=touch.y=0;$('da-stick-knob').style.transform='translate(-50%, -50%)';}});
  for(const [id,key] of [['da-focus','focus'],['da-run','sprint'],['da-use','interact'],['da-punch','punch']]){
    $(id).addEventListener('pointerdown',e=>{e.preventDefault();if(state.mode==='playing'){touch[key]=true;if(key==='punch')punch(state);$(id).setPointerCapture(e.pointerId);}});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])$(id).addEventListener(type,()=>touch[key]=false);
    $(id).addEventListener('contextmenu',e=>e.preventDefault());
  }
  window.addEventListener('resize',()=>{renderer.resize();if(mapOpen)renderer.drawMap($('da-map-canvas'),state);else renderer.draw(state,0);});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);audio.close();});
  setScreen('menu');renderer.resize();raf=requestAnimationFrame(frame);
})();
