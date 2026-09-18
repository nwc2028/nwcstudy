/* Eye-level station renderer: cached materials, floor projection and depth-clipped actors. */
(() => {
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),TAU=Math.PI*2;
  const surface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  class FirstPersonRenderer extends window.DeadAirRenderer {
    constructor(canvas){
      super(canvas);
      this.floor=surface(320,200);this.floorCtx=this.floor.getContext('2d',{alpha:false});
      this.materials=Array.from({length:4},(_,i)=>this.material(i,false));
      this.hauntedMaterials=Array.from({length:4},(_,i)=>this.material(i,true));
      this.windowMaterials={intact:this.windowMaterial('intact'),broken:this.windowMaterial('broken'),reach:this.windowMaterial('reach')};
      this.axeMaterial=this.axeCaseMaterial();
      this.art=new Map();this.modelStats={models:0,triangles:0};this.bob=0;this.sway=0;this.resize();
    }
    resize(){
      const r=this.canvas.getBoundingClientRect(),scale=Math.min(1.35,1280/Math.max(1,r.width),840/Math.max(1,r.height));
      this.width=Math.max(1,Math.round(r.width*scale));this.height=Math.max(1,Math.round(r.height*scale));
      this.canvas.width=this.width;this.canvas.height=this.height;
      this.dpr=1;this.fov=clamp(this.width/this.height*.76,.8,1.3);this.lens=Math.tan(this.fov/2);this.focal=this.width/(2*this.lens);
      this.rays=Math.min(640,Math.max(240,Math.floor(this.width/2)));this.depth=new Float32Array(this.rays);
      if(this.floor){this.floor.width=Math.min(400,Math.ceil(this.width/3));this.floor.height=Math.max(1,Math.ceil(this.height/3));this.floorPixels=this.floorCtx.createImageData(this.floor.width,this.floor.height);}
    }
    material(kind,haunted=false){
      const tex=surface(128,128),c=tex.getContext('2d');
      const data=c.createImageData(128,128);
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const i=(y*128+x)*4,n=((x*131+y*59+x*y*7)%19)-9,lower=y>69;
        data.data[i]=(haunted?(lower?104:171):(lower?51:91))+n;data.data[i+1]=(haunted?(lower?112:177):(lower?67:98))+n;data.data[i+2]=(haunted?(lower?108:169):(lower?61:91))+n;data.data[i+3]=255;
      }c.putImageData(data,0,0);
      c.fillStyle=haunted?'#354344':'#172422';c.fillRect(0,0,2,128);c.fillRect(126,0,2,128);c.fillRect(0,125,128,3);c.fillRect(0,67,128,4);
      c.fillStyle=haunted?'#d8d5bf88':'#b8aa7777';c.fillRect(0,63,128,2);c.fillStyle=haunted?'#3c4746':'#101b19';c.fillRect(0,113,128,8);
      c.strokeStyle=haunted?'#5a6865':'#20332b';c.lineWidth=1;c.beginPath();c.moveTo(36,0);c.lineTo(43,20);c.lineTo(38,35);c.lineTo(50,46);c.moveTo(91,69);c.lineTo(82,87);c.lineTo(88,109);c.stroke();
      if(haunted){
        c.fillStyle='#25353617';for(let i=0;i<14;i++){const x=(i*47)%123,y=(i*73)%116;c.beginPath();c.ellipse(x,y,8+(i%4)*4,4+(i%3)*3,.3,0,TAU);c.fill();}
        c.strokeStyle='#e4e0cd2c';for(let x=12;x<128;x+=24){c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x-4,22,x+5,43,x,64);c.stroke();}
      }
      if(kind===1){
        c.fillStyle=haunted?'#c9d2cc':'#141e1d';c.fillRect(17,13,94,50);c.fillStyle=haunted?'#637b7e':'#66766b';c.fillRect(22,18,84,40);
        if(haunted){c.fillStyle='#dae0dacc';c.beginPath();c.moveTo(17,10);c.bezierCurveTo(36,24,29,55,50,67);c.lineTo(17,67);c.fill();c.beginPath();c.moveTo(111,10);c.bezierCurveTo(91,26,101,57,78,67);c.lineTo(111,67);c.fill();c.strokeStyle='#eef1e4';for(let y=25;y<58;y+=11){c.beginPath();c.moveTo(24,y);c.lineTo(103,y-4);c.stroke();}}
        else for(let y=28;y<48;y+=4){c.fillStyle='#66766b';c.fillRect(21,y,83,1);}
      }
      if(kind===2){c.fillStyle=haunted?'#202a2c':'#242c2a';c.fillRect(88,0,28,128);c.fillStyle=haunted?'#c9c4ad':'#8b795d';c.fillRect(87,0,5,128);c.fillStyle=haunted?'#66706a':'#373b31';for(let y=14;y<128;y+=41)c.fillRect(83,y,36,5);}
      if(kind===3){c.fillStyle=haunted?'#6a7066':'#302e22';c.fillRect(24,25,70,30);c.fillStyle=haunted?'#d6d1bd':'#c6b57f';c.font='bold 10px monospace';c.textAlign='center';c.fillText(haunted?'ROOM 06':'NORTH RIDGE',59,38);c.font='7px monospace';c.fillText(haunted?'KEEP CURTAINS CLOSED':'RELAY / B1',59,48);}
      return tex;
    }
    windowMaterial(state){
      const tex=surface(128,128),c=tex.getContext('2d'),broken=state!=='intact',reaching=state==='reach';
      c.fillStyle='#303b38';c.fillRect(0,0,128,128);c.fillStyle='#111a19';c.fillRect(0,11,128,105);
      c.fillStyle='#53615d';c.fillRect(2,13,124,101);c.fillStyle='#121d20';c.fillRect(8,19,112,89);
      const glass=c.createLinearGradient(8,19,120,108);glass.addColorStop(0,'#28454d');glass.addColorStop(.45,'#091316');glass.addColorStop(1,'#36525a');c.fillStyle=glass;c.fillRect(12,23,104,81);
      c.fillStyle='#768783';c.fillRect(61,19,6,89);c.fillRect(8,61,112,6);c.fillStyle='#17211f';c.fillRect(0,112,128,16);
      if(broken){
        c.fillStyle='#010405';c.beginPath();c.moveTo(43,30);c.lineTo(69,24);c.lineTo(91,42);c.lineTo(84,57);c.lineTo(104,68);c.lineTo(89,91);c.lineTo(58,104);c.lineTo(43,87);c.lineTo(24,73);c.lineTo(38,55);c.closePath();c.fill();
        c.strokeStyle='#aab5aa';c.lineCap='round';c.lineWidth=reaching?11:5;c.beginPath();c.moveTo(72,47);c.lineTo(62,70);c.lineTo(47,99);c.stroke();
        if(reaching){c.lineWidth=2.5;for(let i=0;i<5;i++){c.beginPath();c.moveTo(48,98);c.lineTo(29+i*8,117-Math.abs(2-i)*2);c.stroke();}}
      }else{
        c.fillStyle='#020607bb';c.beginPath();c.ellipse(83,55,16,22,0,0,TAU);c.fill();c.fillRect(71,69,24,31);
        c.fillStyle='#ffb23a';c.shadowColor='#ff8a18';c.shadowBlur=8;c.beginPath();c.ellipse(78,53,2.2,3,0,0,TAU);c.ellipse(89,53,2.2,3,0,0,TAU);c.fill();c.shadowBlur=0;
      }
      c.strokeStyle='#c2cec477';c.lineWidth=1.5;for(let i=0;i<9;i++){const x=15+(i*41)%98,y=25+(i*53)%73;c.beginPath();c.moveTo(x,y);c.lineTo(x+10,y+7);c.lineTo(x+3,y+18);c.stroke();}
      c.fillStyle='#090e0d99';c.fillRect(0,0,128,8);c.fillRect(0,120,128,8);return tex;
    }
    axeCaseMaterial(){
      const tex=surface(128,128),c=tex.getContext('2d');
      c.fillStyle='#35413d';c.fillRect(0,0,128,128);c.fillStyle='#192321';c.fillRect(0,68,128,60);
      c.fillStyle='#381110';c.fillRect(8,7,112,114);c.fillStyle='#b4362e';c.fillRect(12,11,104,106);c.fillStyle='#250b0a';c.fillRect(18,28,92,80);
      const glass=c.createLinearGradient(18,28,110,108);glass.addColorStop(0,'#d5eced33');glass.addColorStop(.45,'#566c7022');glass.addColorStop(1,'#edf7ee11');c.fillStyle=glass;c.fillRect(21,31,86,74);
      c.save();c.translate(64,69);c.rotate(-.62);c.fillStyle='#5b351d';c.fillRect(-5,-35,10,74);c.fillStyle='#25180f';c.fillRect(-2,-35,4,74);
      c.fillStyle='#aeb7ae';c.beginPath();c.moveTo(-5,-35);c.lineTo(-31,-27);c.lineTo(-36,-12);c.lineTo(-6,-16);c.lineTo(12,-14);c.lineTo(7,-34);c.closePath();c.fill();c.fillStyle='#e2e6dc';c.beginPath();c.moveTo(-34,-26);c.lineTo(-37,-13);c.lineTo(-31,-15);c.closePath();c.fill();c.restore();
      c.strokeStyle='#e7f3ef66';c.lineWidth=2;c.beginPath();c.moveTo(24,35);c.lineTo(97,99);c.moveTo(70,31);c.lineTo(106,63);c.stroke();
      c.fillStyle='#e9ded0';c.font='bold 8px monospace';c.textAlign='center';c.fillText('FIRE AXE',64,22);c.fillStyle='#f0c9bf';c.font='bold 6px monospace';c.fillText('BREAK GLASS',64,116);return tex;
    }
    cast(s,dx,dy){
      const p=s.player;let x=Math.floor(p.x),y=Math.floor(p.y),side=0;
      const stepX=dx<0?-1:1,stepY=dy<0?-1:1,deltaX=Math.abs(1/(dx||1e-9)),deltaY=Math.abs(1/(dy||1e-9));
      let sx=(dx<0?p.x-x:x+1-p.x)*deltaX,sy=(dy<0?p.y-y:y+1-p.y)*deltaY;
      for(let n=0;n<96;n++){
        if(sx<sy){sx+=deltaX;x+=stepX;side=0;}else{sy+=deltaY;y+=stepY;side=1;}
        if(this.isWall(s.grid,x,y))break;
      }
      const depth=Math.max(.045,side?sy-deltaY:sx-deltaX);
      let u=side?p.x+depth*dx:p.y+depth*dy;u-=Math.floor(u);
      if((!side&&dx<0)||(side&&dy>0))u=1-u;
      return {depth,u,side,x,y,wx:p.x+depth*dx,wy:p.y+depth*dy};
    }
    windowAtHit(s,hit){
      if(s.level!==2)return null;
      for(const win of s.windows||[]){
        const vertical=Math.abs(Math.cos(win.angle))>.7;
        if(vertical&&hit.side===0&&Math.abs(hit.wx-win.x)<.08&&Math.abs(hit.wy-win.y)<.74)return {window:win,u:clamp((hit.wy-win.y+.74)/1.48,0,1)};
        if(!vertical&&hit.side===1&&Math.abs(hit.wy-win.y)<.08&&Math.abs(hit.wx-win.x)<.74)return {window:win,u:clamp((hit.wx-win.x+.74)/1.48,0,1)};
      }
      return null;
    }
    axeAtHit(s,hit){
      const axe=s.level===2?s.axeCase:null;if(!axe)return null;
      const vertical=Math.abs(Math.cos(axe.angle))>.7;
      if(vertical&&hit.side===0&&Math.abs(hit.wx-axe.x)<.08&&Math.abs(hit.wy-axe.y)<.48)return {axe,u:clamp((hit.wy-axe.y+.48)/.96,0,1)};
      if(!vertical&&hit.side===1&&Math.abs(hit.wy-axe.y)<.08&&Math.abs(hit.wx-axe.x)<.48)return {axe,u:clamp((hit.wx-axe.x+.48)/.96,0,1)};
      return null;
    }
    floors(s,horizon,dirX,dirY,planeX,planeY){
      const w=this.floor.width,h=this.floor.height,data=this.floorPixels.data;
      const projected=this.focal*h/this.height,hy=horizon*h/this.height;
      const darkness=s.reduced?0:Math.sin(clamp((s.blackout||0)/2.3,0,1)*Math.PI)*.3;
      for(let y=0;y<h;y++){
        const below=y>hy,d=Math.min(45,(below?1.35:1.25)*projected/Math.max(1,Math.abs(y-hy)));
        let wx=s.player.x+d*(dirX-planeX),wy=s.player.y+d*(dirY-planeY);
        const stepX=2*d*planeX/w,stepY=2*d*planeY/w;
        for(let x=0;x<w;x++,wx+=stepX,wy+=stepY){
          const xx=Math.floor(wx),yy=Math.floor(wy),fx=wx-xx,fy=wy-yy,i=(y*w+x)*4;
          const seam=fx<.025||fy<.025,n=((xx*17+yy*31+Math.floor(fx*64)*3+Math.floor(fy*64))&7);
          const beam=Math.exp(-Math.pow((x/w-.5)/(s.player.focus?.17:.34),2)*2);
          const light=(s.level===2?.13+beam*.68:.22+beam*.95)/(1+d*(s.level===2?.25:.2))*(1-darkness);
          let r=s.level===1?(below?74:105):(below?49:31),g=s.level===1?(below?83:113):(below?59:39),b=s.level===1?(below?82:112):(below?56:38);
          if(seam){r*=.42;g*=.42;b*=.42;}
          if(below&&(xx+yy)%7===0&&fx>.13&&fx<.88&&fy>.4&&fy<.58){r+=12;g+=14;b+=14;}
          if(s.level===1&&below&&fx<.035){r*=.55;g*=.58;b*=.6;}
          if(!below&&fy<.04){r=s.level===1?128:58;g=s.level===1?132:60;b=s.level===1?124:50;}
          data[i]=(r+n)*light;data[i+1]=(g+n)*light;data[i+2]=(b+n)*light;data[i+3]=255;
        }
      }
      this.floorCtx.putImageData(this.floorPixels,0,0);this.ctx.drawImage(this.floor,0,0,this.width,this.height);
    }
    sprite(kind,label=''){
      const key=kind+label;if(this.art.has(key))return this.art.get(key);
      const tex=surface(192,320),c=tex.getContext('2d');
      const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
      const oval=(x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
      if(kind.startsWith('ghost')){
        const frame=kind.endsWith('1')?1:0;
        oval(96,310,73,8,'#0008');
        // Hanging gown: uneven translucent folds keep the lower body almost legless.
        const gown=c.createLinearGradient(43,91,148,296);gown.addColorStop(0,'#cdd4cf');gown.addColorStop(.48,'#aebbb7');gown.addColorStop(1,'#596967');
        c.fillStyle=gown;c.beginPath();c.moveTo(67,84);c.quadraticCurveTo(39,151,45,282);c.lineTo(23,313);c.lineTo(73,305);c.lineTo(94,315);c.lineTo(119,303);c.lineTo(164,314);c.quadraticCurveTo(143,209,125,88);c.closePath();c.fill();
        c.strokeStyle='#e1e4db66';c.lineWidth=3;for(let i=0;i<7;i++){c.beginPath();c.moveTo(55+i*12,112);c.bezierCurveTo(41+i*15,183,55+i*10,243,43+i*17,306);c.stroke();}
        // Thin hands disappear into the gown.
        c.strokeStyle='#aeb9b0';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(57,111);c.lineTo(39-frame*5,198);c.lineTo(48,259);c.moveTo(127,109);c.lineTo(148+frame*4,197);c.lineTo(143,261);c.stroke();
        // Long black hair wraps the face and continues down the dress.
        c.fillStyle='#0a1012';c.beginPath();c.moveTo(54,6);c.quadraticCurveTo(92,-9,135,11);c.quadraticCurveTo(153,54,137,131);c.lineTo(127,211);c.lineTo(112,145);c.lineTo(119,72);c.lineTo(63,72);c.lineTo(69,154);c.lineTo(55,220);c.lineTo(43,126);c.quadraticCurveTo(31,42,54,6);c.fill();
        const face=c.createRadialGradient(80,35,3,93,53,44);face.addColorStop(0,'#d9ded7');face.addColorStop(.62,'#9eaaa5');face.addColorStop(1,'#465451');
        c.fillStyle=face;c.beginPath();c.moveTo(66,25);c.quadraticCurveTo(94,2,123,28);c.quadraticCurveTo(128,75,96,101);c.quadraticCurveTo(61,75,66,25);c.fill();
        oval(79,50,13,18,'#020607');oval(110,49,13,19,'#020607');oval(79,48,2.2,2.8,'#e6e6d5');oval(110,47,2.2,2.8,'#e6e6d5');
        c.fillStyle='#020405';c.beginPath();c.moveTo(80,71);c.quadraticCurveTo(96,62,113,72);c.quadraticCurveTo(115,105,96,115);c.quadraticCurveTo(77,103,80,71);c.fill();
        c.fillStyle='#d5d0b9';for(let i=0;i<7;i++){c.beginPath();c.moveTo(84+i*4,73);c.lineTo(86+i*4,82);c.lineTo(88+i*4,73);c.fill();}
        c.strokeStyle='#11191a';c.lineWidth=5;for(let i=0;i<10;i++){const x=48+i*9;c.beginPath();c.moveTo(x,16+(i%3)*3);c.bezierCurveTo(x-10+frame*3,76,x+8-frame*4,137,x-4,224+(i%4)*11);c.stroke();}
      }else if(kind==='peeker'){
        c.fillStyle='#080d0f';c.beginPath();c.moveTo(45,0);c.quadraticCurveTo(135,12,164,77);c.lineTo(155,320);c.lineTo(28,320);c.quadraticCurveTo(63,221,38,148);c.quadraticCurveTo(22,77,45,0);c.fill();
        const pale=c.createRadialGradient(91,72,4,92,91,61);pale.addColorStop(0,'#d9e0da');pale.addColorStop(.55,'#929f9b');pale.addColorStop(1,'#334443');oval(94,88,47,64,pale);
        oval(75,79,17,23,'#030607');oval(116,78,18,24,'#030607');oval(76,76,3,4,'#f1efdc');oval(117,76,3,4,'#f1efdc');
        c.fillStyle='#070809';c.beginPath();c.moveTo(69,111);c.quadraticCurveTo(94,95,124,112);c.quadraticCurveTo(126,159,97,178);c.quadraticCurveTo(65,156,69,111);c.fill();
        c.fillStyle='#ded7bd';for(let i=0;i<8;i++){c.beginPath();c.moveTo(75+i*6,111);c.lineTo(78+i*6,122);c.lineTo(81+i*6,111);c.fill();}
      }else if(kind==='enemy'){
        oval(96,308,70,10,'#0009');
        const coat=c.createLinearGradient(50,0,140,0);coat.addColorStop(0,'#111b1b');coat.addColorStop(.5,'#35413b');coat.addColorStop(1,'#0c1415');
        c.fillStyle=coat;c.beginPath();c.moveTo(67,83);c.lineTo(119,82);c.lineTo(145,241);c.lineTo(120,229);c.lineTo(106,247);c.lineTo(78,233);c.lineTo(49,242);c.closePath();c.fill();
        c.strokeStyle='#1b2725';c.lineWidth=16;c.lineCap='round';
        for(const [x,side] of [[65,-1],[124,1]]){c.beginPath();c.moveTo(x,99);c.lineTo(x+side*17,159);c.lineTo(x+side*31,234);c.stroke();}
        c.strokeStyle='#849184';c.lineWidth=4;for(let j=0;j<4;j++){c.beginPath();c.moveTo(29+j*3,229);c.lineTo(24+j*4,253+j*2);c.stroke();c.beginPath();c.moveTo(156+j*3,229);c.lineTo(153+j*5,254-j*2);c.stroke();}
        rect(66,228,20,73,'#182222');rect(106,230,17,72,'#10191a');oval(72,303,22,9,'#0b1213');oval(119,303,22,9,'#0b1213');
        oval(96,57,39,54,'#0b1213');const skin=c.createRadialGradient(86,43,4,96,57,44);skin.addColorStop(0,'#bbc0a5');skin.addColorStop(.6,'#7f9182');skin.addColorStop(1,'#253830');
        oval(96,57,27,41,skin);oval(83,48,9,15,'#050b0c');oval(110,48,9,15,'#050b0c');oval(97,79,11,18,'#050909');oval(83,49,2,2,'#f0e9ce');oval(110,49,2,2,'#f0e9ce');
        c.fillStyle='#d1c6a1';for(let i=0;i<5;i++){c.beginPath();c.moveTo(89+i*4,70);c.lineTo(91+i*4,79);c.lineTo(93+i*4,70);c.fill();}
        c.strokeStyle='#687568';c.lineWidth=2;for(let i=0;i<6;i++){c.beginPath();c.moveTo(74+i*8,108);c.lineTo(66+i*10,218);c.stroke();}
        c.strokeStyle='#a1a68d';c.lineWidth=3;for(let i=0;i<5;i++){c.beginPath();c.moveTo(77,126+i*15);c.quadraticCurveTo(96,136+i*15,118,125+i*15);c.stroke();}
        c.strokeStyle='#34302a';c.lineWidth=2;c.beginPath();c.moveTo(71,32);c.lineTo(83,43);c.moveTo(120,28);c.lineTo(110,42);c.moveTo(77,88);c.lineTo(68,101);c.stroke();
      }else if(kind==='zombie'){
        oval(96,306,62,9,'#0009');rect(66,218,22,84,'#222b29');rect(108,221,19,81,'#192120');
        c.fillStyle='#4f5648';c.beginPath();c.moveTo(56,91);c.lineTo(130,81);c.lineTo(145,228);c.lineTo(48,228);c.closePath();c.fill();
        c.strokeStyle='#4e5b50';c.lineWidth=15;c.lineCap='round';c.beginPath();c.moveTo(63,104);c.lineTo(34,174);c.lineTo(49,247);c.moveTo(126,98);c.lineTo(157,166);c.lineTo(145,249);c.stroke();
        oval(96,56,31,45,'#849078');c.fillStyle='#332e29';c.beginPath();c.moveTo(64,31);c.quadraticCurveTo(94,-2,128,23);c.lineTo(122,46);c.quadraticCurveTo(94,23,65,51);c.fill();
        oval(84,56,8,10,'#151b18');oval(107,55,8,10,'#151b18');oval(96,80,12,12,'#3a1717');rect(88,76,17,3,'#d2c59d');
        c.strokeStyle='#742c28';c.lineWidth=4;c.beginPath();c.moveTo(55,124);c.lineTo(122,195);c.moveTo(62,184);c.lineTo(129,130);c.stroke();
      }else if(kind.startsWith('window')){
        const broken=kind==='window-broken',reaching=kind==='window-reach';
        rect(8,16,176,285,'#192624');rect(17,25,158,267,'#82908a');rect(25,34,142,249,'#091317');
        const glass=c.createLinearGradient(25,34,167,283);glass.addColorStop(0,'#2a505744');glass.addColorStop(.5,'#152d3344');glass.addColorStop(1,'#88a6a622');c.fillStyle=glass;c.fillRect(26,35,140,247);
        c.strokeStyle='#9bb2ac55';c.lineWidth=3;c.beginPath();c.moveTo(26,102);c.lineTo(166,102);c.moveTo(96,35);c.lineTo(96,282);c.stroke();
        if(broken||reaching){c.fillStyle='#020607';c.beginPath();c.moveTo(71,90);c.lineTo(105,74);c.lineTo(133,108);c.lineTo(119,148);c.lineTo(145,177);c.lineTo(103,208);c.lineTo(66,183);c.lineTo(76,143);c.lineTo(53,118);c.closePath();c.fill();
          c.strokeStyle='#8c9480';c.lineWidth=reaching?15:7;c.lineCap='round';c.beginPath();c.moveTo(99,128);c.lineTo(84,181);c.lineTo(58,243);c.stroke();
          if(reaching)for(let i=0;i<4;i++){c.lineWidth=3;c.beginPath();c.moveTo(58,242);c.lineTo(40+i*9,271-i*3);c.stroke();}
        }
        c.strokeStyle='#c5d2c688';c.lineWidth=2;for(let i=0;i<8;i++){const x=31+(i*37)%129,y=43+(i*61)%220;c.beginPath();c.moveTo(x,y);c.lineTo(x+16,y+13);c.lineTo(x+5,y+28);c.stroke();}
      }else if(kind.startsWith('relay')||kind.startsWith('terminal')){
        const terminal=kind.startsWith('terminal'),on=kind.endsWith('-on');oval(96,306,75,10,'#0009');rect(34,44,124,260,'#1a2526');rect(28,39,127,251,'#56645e');rect(34,45,115,240,'#344441');
        rect(42,54,98,31,on?'#316754':'#a7783e');c.fillStyle=on?'#c3ead2':'#ffe0a4';c.font='bold 17px monospace';c.textAlign='center';c.fillText((terminal?'LOCK ':'RELAY ')+label,91,76);
        rect(44,104,94,60,'#0a201a');c.fillStyle=on?'#7fe2b2':'#d8b36e';c.font='12px monospace';c.fillText(on?'SIGNAL OK':'OFFLINE',91,129);
        for(let i=0;i<9;i++)rect(49+i*9,148-(i%4)*3,5,4+(i%4)*3,on?'#7fce9b':'#7b6b42');
        for(let y=185;y<252;y+=10){rect(44,y,63,4,'#142421');rect(114,y,18,4,on?'#769f72':'#8f6b43');}
        rect(144,105,3,131,'#758276');rect(40,292,11,20,'#1b2827');rect(126,292,11,20,'#1b2827');
      }else if(kind.startsWith('exit')){
        rect(11,0,170,320,'#142523');rect(19,10,154,310,'#526860');rect(26,18,140,302,'#253c36');rect(83,18,3,302,'#101e1d');rect(36,28,118,28,kind==='exit-open'?'#629a76':'#385c4c');
        c.fillStyle='#d8e6c9';c.textAlign='center';c.font='bold 17px monospace';c.fillText('EXIT',96,49);rect(38,136,48,7,'#89998b');rect(109,136,44,7,'#89998b');
        c.font='11px monospace';c.fillStyle='#aac4ae';c.fillText(kind==='exit-open'?'UNLOCKED':'POWER REQUIRED',96,95);
      }else if(kind==='lamp'){
        rect(13,103,166,40,'#13201f');rect(19,107,155,10,'#a7bc9a');rect(24,121,143,9,'#627e65');
      }
      this.art.set(key,tex);return tex;
    }
    projectSprite(s,item,dirX,dirY,horizon){
      const c=this.ctx,p=s.player,dx=item.x-p.x,dy=item.y-p.y,d=dx*dirX+dy*dirY;
      if(d<.12||d>23)return;
      const side=-dx*dirY+dy*dirX,center=this.width/2+side*this.focal/d;
      const h=item.height*this.focal/d,w=item.width*this.focal/d;
      const top=horizon+(1.35-(item.z||0)-item.height)*this.focal/d;
      const left=center-w/2,tex=this.sprite(item.kind,item.label);
      if(left>this.width||left+w<0)return;
      const strip=this.width/this.rays;
      c.globalAlpha=clamp(1-d*.025,.28,1);
      for(let i=Math.max(0,Math.floor(left/strip));i<Math.min(this.rays,Math.ceil((left+w)/strip));i++){
        if(d>this.depth[i]+.04)continue;
        const x=Math.max(left,i*strip),end=Math.min(left+w,(i+1)*strip+.4),source=(x-left)/w*tex.width;
        if(end>x)c.drawImage(tex,source,0,Math.min(tex.width-source,(end-x)/w*tex.width),tex.height,x,top,end-x,h);
      }
      c.globalAlpha=1;
    }
    addEllipsoid(mesh,center,radius,color,lat=4,lon=7){
      const point=(a,b)=>[center[0]+Math.cos(a)*Math.cos(b)*radius[0],center[1]+Math.cos(a)*Math.sin(b)*radius[1],center[2]+Math.sin(a)*radius[2]];
      for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){
        const a0=-Math.PI/2+y*Math.PI/lat,a1=-Math.PI/2+(y+1)*Math.PI/lat,b0=x*TAU/lon,b1=(x+1)*TAU/lon;
        const p0=point(a0,b0),p1=point(a0,b1),p2=point(a1,b1),p3=point(a1,b0);
        mesh.push({p:[p0,p1,p2],color},{p:[p0,p2,p3],color});
      }
    }
    addLimb(mesh,a,b,radius,color,sides=6){
      const axis=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],length=Math.hypot(...axis)||1;axis[0]/=length;axis[1]/=length;axis[2]/=length;
      let ref=Math.abs(axis[2])>.82?[1,0,0]:[0,0,1];
      let u=[axis[1]*ref[2]-axis[2]*ref[1],axis[2]*ref[0]-axis[0]*ref[2],axis[0]*ref[1]-axis[1]*ref[0]],ul=Math.hypot(...u)||1;u=u.map(v=>v/ul);
      const v=[axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]];
      const ring=(origin,i)=>{const q=i*TAU/sides;return origin.map((n,k)=>n+radius*(u[k]*Math.cos(q)+v[k]*Math.sin(q)));};
      for(let i=0;i<sides;i++){const n=(i+1)%sides,a0=ring(a,i),a1=ring(a,n),b0=ring(b,i),b1=ring(b,n);mesh.push({p:[a0,b0,b1],color},{p:[a0,b1,a1],color});}
    }
    zombieMesh(s,z){
      const mesh=[],phase=s.reduced?0:Math.sin(s.time*5.1+(z.gait||z.x)),attack=clamp(z.attackWind||0,0,1);
      const hide=[40,35,35],limb=[55,49,47],joint=[64,56,53],black=[5,5,6],wound=[80,30,28],claw=[96,86,78];
      // A compact crouched torso with a wide shoulder ridge keeps the silhouette inhuman without filling the screen.
      this.addEllipsoid(mesh,[0,-.03,.94],[.31,.24,.37],hide,6,10);this.addEllipsoid(mesh,[0,.02,1.17],[.46,.22,.18],limb,5,10);
      for(const side of [-1,1]){
        // Long weight-bearing arms form the inverted arch from the references.
        const shoulder=[side*.38,.02,1.2],elbow=[side*(.68+phase*.025),.1,attack?1.02:1.0],hand=[side*(.73-attack*.13),.45+attack*.34,.11+attack*.27];
        this.addLimb(mesh,shoulder,elbow,.105,limb,8);this.addEllipsoid(mesh,elbow,[.12,.11,.13],joint,5,8);this.addLimb(mesh,elbow,hand,.078,limb,8);this.addEllipsoid(mesh,hand,[.13,.1,.08],joint,4,8);
        for(let finger=-1;finger<=1;finger++)this.addLimb(mesh,hand,[hand[0]+side*(.15+Math.abs(finger)*.025),hand[1]+.1+finger*.045,.035],.022,claw,6);
        // A second, thinner pair rises behind the body like folded spider legs.
        const rearShoulder=[side*.25,-.12,1.13],rearElbow=[side*.55,-.3,1.48+phase*.025],rearTip=[side*.68,-.05,.72];
        this.addLimb(mesh,rearShoulder,rearElbow,.065,hide,7);this.addLimb(mesh,rearElbow,rearTip,.047,limb,7);
        // Bent, undersized legs keep it low to the floor.
        this.addLimb(mesh,[side*.18,-.08,.82],[side*.36,-.25,.47],.09,hide,8);this.addLimb(mesh,[side*.36,-.25,.47],[side*.27,.1,.07],.068,limb,8);
        this.addEllipsoid(mesh,[side*.27,.14,.055],[.16,.22,.045],joint,3,8);
      }
      this.addLimb(mesh,[0,.02,1.2],[0,.1,1.31],.12,hide,8);this.addEllipsoid(mesh,[0,.2,1.46],[.245,.205,.25],limb,7,11);
      this.addEllipsoid(mesh,[-.075,.393,1.49],[.052,.025,.047],black,4,8);this.addEllipsoid(mesh,[.075,.393,1.49],[.052,.025,.047],black,4,8);
      this.addEllipsoid(mesh,[0,.409,1.35],[.135,.025,.082],black,4,9);
      for(let tooth=-2;tooth<=2;tooth++)this.addLimb(mesh,[tooth*.038,.432,1.39],[tooth*.03,.443,1.33],.009,claw,5);
      for(let spike=-3;spike<=3;spike++)this.addLimb(mesh,[spike*.055,.02,1.65-Math.abs(spike)*.012],[spike*.075,-.1,1.77-Math.abs(spike)*.02],.011,black,5);
      this.addLimb(mesh,[-.17,.405,1.59],[-.03,.418,1.48],.009,wound,5);
      return mesh;
    }
    projectModelPoint(s,z,p,dirX,dirY,horizon){
      const facing=Number.isFinite(z.angle)?z.angle:Math.atan2(s.player.y-z.y,s.player.x-z.x),fx=Math.cos(facing),fy=Math.sin(facing),sx=-fy,sy=fx;
      const wx=z.x+sx*p[0]+fx*p[1],wy=z.y+sy*p[0]+fy*p[1],rx=wx-s.player.x,ry=wy-s.player.y,depth=rx*dirX+ry*dirY;
      if(depth<=.24)return null;return {x:this.width/2+(-rx*dirY+ry*dirX)*this.focal/depth,y:horizon+(1.35-p[2])*this.focal/depth,depth};
    }
    renderZombie(s,z,dirX,dirY,horizon){
      const c=this.ctx,mesh=this.zombieMesh(s,z),projected=[];
      for(const tri of mesh){
        const points=tri.p.map(p=>this.projectModelPoint(s,z,p,dirX,dirY,horizon));if(points.some(p=>!p))continue;
        const depth=(points[0].depth+points[1].depth+points[2].depth)/3,cx=(points[0].x+points[1].x+points[2].x)/3,cy=(points[0].y+points[1].y+points[2].y)/3;
        if(cx<-80||cx>this.width+80||cy<-100||cy>this.height+100)continue;
        const xs=points.map(p=>p.x),ys=points.map(p=>p.y);if(Math.max(...xs)-Math.min(...xs)>this.width*1.35||Math.max(...ys)-Math.min(...ys)>this.height*1.8)continue;
        const ray=clamp(Math.floor(cx/this.width*this.rays),0,this.rays-1);if(depth>this.depth[ray]+.06)continue;
        const a=tri.p[0],b=tri.p[1],d=tri.p[2],ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ad=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
        const n=[ab[1]*ad[2]-ab[2]*ad[1],ab[2]*ad[0]-ab[0]*ad[2],ab[0]*ad[1]-ab[1]*ad[0]],nl=Math.hypot(...n)||1;
        const light=Math.max(0,(n[0]*.3+n[1]*-.55+n[2]*.78)/nl),fade=clamp(.9-depth*.016,.5,.9),shade=(.54+light*.23)*fade;
        projected.push({points,depth,color:tri.color.map(v=>Math.round(v*shade))});
      }
      projected.sort((a,b)=>b.depth-a.depth);c.lineWidth=1.15;
      for(const tri of projected){const color=`rgb(${tri.color[0]},${tri.color[1]},${tri.color[2]})`;c.fillStyle=color;c.strokeStyle=color;c.beginPath();c.moveTo(tri.points[0].x,tri.points[0].y);c.lineTo(tri.points[1].x,tri.points[1].y);c.lineTo(tri.points[2].x,tri.points[2].y);c.closePath();c.fill();c.stroke();}
      const eyeZ=1.49,eyeY=.421;
      for(const side of [-1,1]){
        const eye=this.projectModelPoint(s,z,[side*.1,eyeY,eyeZ],dirX,dirY,horizon);if(!eye)continue;
        const ray=clamp(Math.floor(eye.x/this.width*this.rays),0,this.rays-1);if(eye.x<0||eye.x>this.width||eye.depth>this.depth[ray]+.04)continue;
        const radius=clamp(this.focal*.024/eye.depth,1.7,9),glow=c.createRadialGradient(eye.x,eye.y,0,eye.x,eye.y,radius*3);glow.addColorStop(0,'#ffffff');glow.addColorStop(.2,'#dce8e5');glow.addColorStop(.58,'#718b8b77');glow.addColorStop(1,'#607f7f00');c.fillStyle=glow;c.beginPath();c.arc(eye.x,eye.y,radius*3,0,TAU);c.fill();c.fillStyle='#f7ffff';c.beginPath();c.arc(eye.x,eye.y,radius*.42,0,TAU);c.fill();
      }
      this.modelStats.models++;this.modelStats.triangles+=projected.length;
    }
    hands(s){
      const c=this.ctx,w=this.width,h=this.height,scale=Math.min(w/1000,h/650),t=clamp((.36-s.punch)/.36,0,1);
      const thrust=t<.46?Math.pow(t/.46,1.65):Math.pow((1-t)/.54,2.1);
      const recoil=s.hitMarker>0?Math.sin(s.hitMarker/.22*Math.PI)*.22:0;
      const bob=s.reduced?0:Math.sin(this.bob)*3;
      const fist=(right)=>{
        const active=s.punch>0&&s.punchHand===+right,reach=active?thrust:0,guard=active?1-reach*.72:1;
        const side=right?1:-1,shoulderX=w*(right?.75:.25);
        c.save();c.translate(shoulderX-side*reach*118*scale,h+28*scale+bob-reach*178*scale+recoil*18);c.scale(scale*(1+reach*.24),scale*(1+reach*.17));
        c.rotate(side*(-.13-reach*.21)+side*recoil*.08);
        // Upper arm leaves the frame at the shoulder; the elbow straightens into the jab.
        const sleeve=c.createLinearGradient(-70,0,70,0);sleeve.addColorStop(0,'#172422');sleeve.addColorStop(.5,'#566158');sleeve.addColorStop(1,'#202c28');
        c.fillStyle=sleeve;c.beginPath();c.moveTo(-87,48);c.lineTo(-68,-51-38*reach);c.quadraticCurveTo(-50,-95-22*reach,-29,-105-35*reach);c.lineTo(48,-91-42*reach);c.lineTo(83,48);c.closePath();c.fill();
        c.fillStyle='#202a27';c.beginPath();c.roundRect(-62,-111-35*reach,105,28,10);c.fill();
        // Wrist rolls inward near full extension.
        c.translate(side*reach*10,-reach*25);c.rotate(side*reach*.13);
        const skin=c.createLinearGradient(-55,-180,50,-92);skin.addColorStop(0,'#bcab88');skin.addColorStop(.45,'#887d62');skin.addColorStop(1,'#423e31');
        c.fillStyle=skin;c.beginPath();c.moveTo(-59,-166);c.quadraticCurveTo(-68,-139,-54,-103);c.quadraticCurveTo(-7,-82,37,-106);c.quadraticCurveTo(47,-141,28,-169);c.closePath();c.fill();
        c.strokeStyle='#4d4b38';c.lineWidth=3;
        for(let i=0;i<4;i++){const knuckleY=-181+Math.abs(1.5-i)*3;c.fillStyle=skin;c.beginPath();c.roundRect(-58+i*22,knuckleY,23,46,9);c.fill();c.stroke();}
        c.fillStyle='#998d70';c.beginPath();c.ellipse(31,-129,18,30,-.42,0,TAU);c.fill();
        c.strokeStyle='#d0bd91';c.lineWidth=2;c.beginPath();c.moveTo(-45,-132);c.quadraticCurveTo(-19,-125,3,-130);c.stroke();
        c.strokeStyle='#5b503e';c.lineWidth=1.5;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-36+i*22,-151);c.lineTo(-27+i*22,-144);c.stroke();}
        if(right){c.fillStyle='#172323';c.beginPath();c.roundRect(9,-114,39,63,7);c.fill();c.fillStyle='#a9b89b';c.fillRect(12,-112,33,4);c.fillStyle='#88937a';c.fillRect(17,-93,4,21);}
        c.restore();
      };
      fist(false);fist(true);
    }
    haunting(s){
      if(s.level!==1||!s.enemy.active||s.reduced||s.mode!=='playing')return;
      const phase=(s.time+3)%23;if(phase<13||phase>15.4)return;
      const fade=Math.sin((phase-13)/2.4*Math.PI),right=Math.floor(s.time/23)%2===0;
      const c=this.ctx,h=this.height,size=Math.min(h*.68,this.width*.42),x=right?this.width-size*.72:-size*.28,y=this.height*.18;
      c.save();c.globalAlpha=fade*.88;c.drawImage(this.sprite('peeker'),x,y,size*.6,size);
      c.fillStyle='#030809';if(right)c.fillRect(this.width-size*.19,0,size*.3,this.height);else c.fillRect(0,0,size*.18,this.height);c.restore();
    }
    drawDeath(c,s){
      if(s.level!==1){super.drawDeath(c,s);return;}
      const age=Number(s.deathTime)||0;if(s.reduced||age>1.5)return;
      const alpha=clamp(Math.min(age/.09,(1.5-age)/.3),0,1),size=Math.min(this.width,this.height)*1.18;
      c.save();c.globalAlpha=alpha;c.fillStyle='#010304';c.fillRect(0,0,this.width,this.height);
      c.translate((Math.random()-.5)*Math.max(0,1-age)*8,(Math.random()-.5)*Math.max(0,1-age)*7);
      c.drawImage(this.sprite('peeker'),this.width/2-size*.3,this.height/2-size*.52,size*.6,size);c.restore();
    }
    draw(s,dt=1/60){
      const c=this.ctx,w=this.width,h=this.height,p=s.player;
      this.modelStats={models:0,triangles:0};
      this.bob+=p.moving&&s.mode==='playing'?dt*(p.sprinting?12:8):0;
      const bob=s.reduced||!p.moving?0:Math.sin(this.bob)*h*.003;
      const horizon=h*.49+(p.pitch||0)*this.focal+bob;
      const dx=Math.cos(p.angle),dy=Math.sin(p.angle),px=-dy*this.lens,py=dx*this.lens;
      c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
      this.floors(s,horizon,dx,dy,px,py);
      const strip=w/this.rays,blackout=s.reduced?0:Math.sin(clamp((s.blackout||0)/2.3,0,1)*Math.PI)*.18;
      for(let i=0;i<this.rays;i++){
        const u=(i+.5)/this.rays*2-1,hit=this.cast(s,dx+px*u,dy+py*u);this.depth[i]=hit.depth;
        const wallH=2.6*this.focal/hit.depth,top=horizon-1.25*this.focal/hit.depth;
        const flush=this.windowAtHit(s,hit),axe=this.axeAtHit(s,hit),windowState=flush?(flush.window.reach>0?'reach':flush.window.broken?'broken':'intact'):null;
        const tex=axe?this.axeMaterial:flush?this.windowMaterials[windowState]:(s.level===1?this.hauntedMaterials:this.materials)[Math.abs(hit.x*7+hit.y*13+hit.side)%4];
        const texU=axe?axe.u:flush?flush.u:hit.u;c.drawImage(tex,Math.min(127,Math.floor(texU*128)),0,1,128,i*strip,top,strip+.5,wallH);
        const beam=Math.exp(-Math.pow(u/(p.focus?.35:.75),2)*2);
        const shade=clamp((s.level===2?.74:.59)+hit.depth*(s.level===2?.034:.029)+hit.side*.055-beam*(s.level===2?(p.focus?.38:.3):(p.focus?.52:.43))+blackout,.09,.97);
        c.fillStyle='rgba(0,5,7,'+shade+')';c.fillRect(i*strip,top,strip+.5,wallH);
        // Warm flashlight reflections on the seam and skirting.
        c.fillStyle=(s.level===1?'rgba(183,212,217,':'rgba(166,178,146,')+(beam*(s.level===2?.035:.07)/(1+hit.depth*.2))+')';c.fillRect(i*strip,top+wallH*.56,strip+.5,wallH*.012);
      }
      if(s.level===1){c.fillStyle='rgba(18,48,58,.11)';c.fillRect(0,0,w,h);}
      const items=s.relays.map(r=>({x:r.x,y:r.y,height:1.85,width:1.1,kind:s.level===2?(r.done?'terminal-on':'terminal'):(r.done?'relay-on':'relay'),label:r.id}));
      const goal=s.level===2?s.sequence.length:3;
      items.push({...s.exit,height:2.5,width:1.6,kind:s.collected===goal?'exit-open':'exit'});
      for(const r of s.rooms)items.push({x:r.x+r.w/2,y:r.y+r.h/2,z:2.31,height:.24,width:1.4,kind:'lamp'});
      for(const z of s.zombies||[])if(z.active)items.push({x:z.x,y:z.y,model:z});
      if(s.level===1&&s.enemy.active){const attack=s.enemy.attackWind||0;items.push({x:s.enemy.x,y:s.enemy.y,height:2.55+attack*.25,width:1.3+attack*.18,kind:'ghost'+Math.floor(s.time*4)%2,z:s.reduced?0:Math.sin(s.time*5)*.035});}
      items.sort((a,b)=>Math.hypot(b.x-p.x,b.y-p.y)-Math.hypot(a.x-p.x,a.y-p.y));
      for(const item of items)if(item.model)this.renderZombie(s,item.model,dx,dy,horizon);else this.projectSprite(s,item,dx,dy,horizon);
      const vignette=c.createRadialGradient(w*.5,h*.47,h*.13,w*.5,h*.5,Math.max(w,h)*.66);
      vignette.addColorStop(0,'#0000');vignette.addColorStop(.6,'#0002');vignette.addColorStop(1,'#000d');c.fillStyle=vignette;c.fillRect(0,0,w,h);
      this.haunting(s);
      if(s.mode!=='menu')this.hands(s);
      if(s.mode==='playing'){
        const x=w/2,y=h/2;c.strokeStyle=s.hitMarker>0?'#efd49b':'#dedfc188';c.lineWidth=1.5;
        c.beginPath();if(s.hitMarker>0){for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1]]){c.moveTo(x+a*5,y+b*5);c.lineTo(x+a*10,y+b*10);}}else{c.moveTo(x-6,y);c.lineTo(x-3,y);c.moveTo(x+3,y);c.lineTo(x+6,y);c.moveTo(x,y-6);c.lineTo(x,y-3);c.moveTo(x,y+3);c.lineTo(x,y+6);}c.stroke();
      }
      if(s.hurt>0){const red=c.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,Math.max(w,h)*.7);red.addColorStop(0,'#820b0800');red.addColorStop(1,'rgba(140,28,18,'+s.hurt*.7+')');c.fillStyle=red;c.fillRect(0,0,w,h);}
      if(s.mode==='dead')this.drawDeath(c,s);
    }
  }
  window.DeadAirRenderer=FirstPersonRenderer;
})();
