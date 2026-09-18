(function (root) {
  'use strict';

  // All art is drawn here. Change these colors to reskin the entire outpost.
  const W = 1120;
  const H = 600;
  const C = {
    ink: '#24282d', deep: '#283034', dark: '#343b3d', asphalt: '#525557',
    sky: '#e9bd8f', cream: '#f8d9a0', sun: '#ffe5ad', haze: '#c99681',
    distant: '#a5847e', city: '#806e70', cityDark: '#655f63',
    teal: '#527d7a', tealLight: '#78a39a', tealDark: '#355958',
    rust: '#a96f50', sand: '#bf9873', bone: '#dcc197',
    red: '#ca644b', yellow: '#f0c66f', white: '#f7e6c7'
  };
  let scenery = null;

  function box(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  }

  function line(ctx, color, width, points) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.stroke();
  }

  function polygon(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    ctx.fill();
  }

  function label(ctx, words, x, y, size, color, align) {
    ctx.fillStyle = color;
    ctx.font = 'bold ' + size + 'px monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(words, x, y);
  }

  function rng(seed) {
    return function () {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };
  }

  function pixelSun(ctx, x, y, radius) {
    for (let row = -radius; row < radius; row += 4) {
      const half = Math.sqrt(Math.max(0, radius * radius - row * row));
      box(ctx, row < 8 ? C.sun : '#fbd69b', x - half, y + row, half * 2, 4);
    }
  }

  function building(ctx, x, y, width, height, color, detail, random) {
    box(ctx, color, x, y, width, height);
    box(ctx, color, x + 5, y - 5, width - 10, 5);
    if (!detail) return;
    for (let row = y + 13; row < y + height - 12; row += 16) {
      for (let col = x + 8; col < x + width - 6; col += 13) {
        if (random() > 0.24) box(ctx, random() > 0.90 ? '#c4a183' : '#8b7777', col, row, 4, 6);
      }
    }
  }

  function skyline(ctx) {
    const random = rng(4704);
    box(ctx, C.sky, 0, 0, W, H);
    box(ctx, '#e5b188', 0, 175, W, 97);
    box(ctx, '#d5a087', 0, 264, W, 126);
    // Broad, stepped cloud banks keep the scene sharp at small screen sizes.
    box(ctx, '#edc99d', 100, 74, 390, 6);
    box(ctx, '#edc99d', 182, 67, 242, 7);
    box(ctx, '#e2ad87', 591, 107, 352, 7);
    box(ctx, '#e2ad87', 664, 100, 189, 7);
    box(ctx, '#f0c698', 34, 135, 313, 5);
    pixelSun(ctx, 896, 172, 62);
    box(ctx, '#e7b38a', 810, 190, 221, 6);
    box(ctx, '#e7b38a', 844, 207, 260, 4);

    let x = 156;
    while (x < W) {
      const width = 22 + Math.floor(random() * 45);
      const y = 231 + Math.floor(random() * 44);
      building(ctx, x, y, width, 117, '#b68a7d', false, random);
      if (random() > 0.55) box(ctx, '#b68a7d', x + width / 2, y - 18, 3, 18);
      x += width + 9;
    }
    // Evacuation cranes and quiet industrial rooftops.
    line(ctx, '#9d7d75', 3, [478, 298, 478, 192, 430, 208, 548, 208]);
    line(ctx, '#9d7d75', 2, [478, 192, 535, 208, 535, 249]);
    line(ctx, '#9d7d75', 2, [436, 208, 476, 228, 519, 208]);
    building(ctx, 218, 266, 80, 104, C.distant, true, random);
    building(ctx, 315, 243, 63, 127, C.distant, true, random);
    building(ctx, 393, 281, 113, 89, C.distant, true, random);
    building(ctx, 1014, 244, 98, 126, C.distant, true, random);
    box(ctx, '#b2887b', 173, 322, W, 9);

    building(ctx, 711, 282, 244, 98, C.cityDark, false, random);
    polygon(ctx, '#6b6264', [690, 283, 754, 253, 821, 283, 821, 264, 879, 237, 949, 279, 976, 279, 976, 291, 690, 291]);
    for (let roof = 0; roof < 3; roof++) {
      box(ctx, '#7f6b66', 744 + roof * 68, 284, 42, 13);
      box(ctx, '#c29779', 747 + roof * 68, 286, 35, 3);
    }
    box(ctx, '#6b6061', 949, 204, 19, 148);
    box(ctx, '#85726c', 947, 203, 23, 8);
    box(ctx, '#786963', 948, 229, 22, 7);
    box(ctx, '#786963', 948, 256, 22, 7);
    // Square smoke plumes are baked into the static backdrop.
    box(ctx, '#c79a83', 944, 175, 27, 23);
    box(ctx, '#cea087', 931, 151, 40, 29);
    box(ctx, '#d3a48a', 914, 126, 48, 31);
    box(ctx, '#daac8d', 886, 107, 64, 24);
    box(ctx, '#b89981', 809, 325, 56, 9);
    label(ctx, 'NORTH WORKS', 790, 320, 10, '#a99480');
    for (let win = 0; win < 9; win++) box(ctx, '#ad9174', 726 + win * 25, 345, 12, 14);

    // Broken elevated roadway and concrete support.
    box(ctx, '#827271', 482, 303, 213, 15);
    box(ctx, '#6f6262', 489, 318, 204, 7);
    polygon(ctx, '#827271', [695, 303, 718, 307, 703, 310, 713, 314, 696, 319]);
    box(ctx, '#796b68', 539, 324, 19, 63);
    box(ctx, '#796b68', 652, 324, 19, 63);
    line(ctx, '#8f7870', 3, [494, 303, 494, 287, 670, 287, 670, 303]);
    for (let rail = 514; rail <= 653; rail += 28) box(ctx, '#8f7870', rail, 288, 2, 15);

    box(ctx, '#726968', 177, 363, 943, 26);
    box(ctx, '#8f7970', 177, 363, 943, 4);
    // A distant stripped car, kept behind the perimeter.
    polygon(ctx, '#6c6464', [991, 367, 1004, 355, 1040, 355, 1055, 367, 1074, 370, 1074, 384, 980, 384, 980, 372]);
    polygon(ctx, '#b1967d', [1009, 357, 1037, 357, 1047, 367, 1002, 367]);
    box(ctx, '#47494b', 994, 378, 14, 12);
    box(ctx, '#47494b', 1049, 378, 14, 12);
  }

  function pavement(ctx) {
    const random = rng(291);
    box(ctx, C.asphalt, 0, 389, W, 211);
    box(ctx, '#696663', 0, 387, W, 8);
    box(ctx, '#494e50', 0, 395, W, 4);
    box(ctx, '#5a5a59', 0, 434, W, 2);
    box(ctx, '#4a5052', 0, 545, W, 55);
    box(ctx, '#41494b', 0, 593, W, 7);
    for (let i = 0; i < 290; i++) {
      const x = Math.floor(random() * W);
      const y = 402 + Math.floor(random() * 191);
      box(ctx, i % 3 ? '#616060' : '#41494b', x, y, 2 + random() * 7, 1 + random() * 2);
    }
    // Old road paint follows the flat combat lanes.
    for (let x = 180; x < W; x += 165) {
      box(ctx, '#a89775', x, 487, 85, 4);
      box(ctx, C.asphalt, x + 17, 487, 8, 2);
      box(ctx, C.asphalt, x + 58, 488, 13, 2);
    }
    line(ctx, '#3b4549', 2, [510, 449, 561, 456, 581, 472, 646, 476]);
    line(ctx, '#3b4549', 2, [559, 456, 596, 445, 635, 447]);
    line(ctx, '#41494c', 2, [846, 568, 867, 554, 862, 541, 898, 529, 963, 534]);
    line(ctx, '#41494c', 2, [215, 529, 246, 535, 257, 559, 299, 570]);
    box(ctx, '#3d484c', 755, 409, 63, 15);
    for (let slat = 0; slat < 10; slat++) box(ctx, '#70706a', 759 + slat * 6, 411, 2, 10);
    // The shelter apron and its worn safety stripes.
    polygon(ctx, '#686963', [0, 398, 113, 398, 152, 568, 0, 568]);
    line(ctx, '#b2a07a', 4, [125, 422, 154, 560]);
    for (let stripe = 0; stripe < 8; stripe++) {
      polygon(ctx, '#a69471', [5 + stripe * 16, 565, 12 + stripe * 16, 565, 1 + stripe * 16, 584, -6 + stripe * 16, 584]);
    }
  }

  function chainFence(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(182, 326, 938, 66);
    ctx.clip();
    ctx.globalAlpha = 0.40;
    for (let x = 110; x < 1220; x += 21) {
      line(ctx, '#514f50', 1, [x, 323, x + 65, 394]);
      line(ctx, '#514f50', 1, [x, 394, x + 65, 323]);
    }
    ctx.restore();
    box(ctx, '#454b4d', 177, 323, 943, 3);
    box(ctx, '#454b4d', 177, 389, 943, 4);
    for (let x = 194; x < W; x += 109) {
      box(ctx, '#3f494c', x, 313, 5, 84);
      box(ctx, '#7f8277', x, 314, 2, 81);
      line(ctx, '#454b4d', 2, [x, 314, x + 10, 301]);
    }
    line(ctx, '#5d5554', 1, [196, 307, 306, 313, 416, 307, 525, 313, 634, 307, 743, 313, 852, 307, 961, 313, 1070, 307, 1120, 310]);
    for (let x = 218; x < W; x += 31) line(ctx, '#5d5554', 1, [x, 305, x + 5, 314, x + 3, 308, x + 9, 307]);
    box(ctx, '#bd9972', 575, 339, 71, 34);
    box(ctx, '#665952', 578, 342, 65, 28);
    polygon(ctx, '#d4b17c', [588, 363, 596, 346, 604, 363]);
    box(ctx, '#665952', 595, 351, 2, 6);
    box(ctx, '#665952', 595, 360, 2, 2);
    label(ctx, 'KEEP', 609, 353, 8, '#d4b17c');
    label(ctx, 'OUT', 609, 364, 8, '#d4b17c');
  }

  function shelter(ctx) {
    // A deep doorway makes the evacuation shelter unmistakable at a glance.
    box(ctx, '#2c4245', 0, 198, 148, 224);
    box(ctx, '#53716c', 0, 198, 151, 11);
    box(ctx, '#74918a', 0, 198, 151, 3);
    box(ctx, '#345052', 0, 218, 143, 182);
    for (let y = 223; y < 391; y += 12) box(ctx, '#3e5a5b', 0, y, 142, 2);
    box(ctx, '#688378', 145, 213, 7, 198);
    box(ctx, '#6b7970', 0, 407, 157, 8);
    box(ctx, '#343f42', 0, 415, 158, 11);
    box(ctx, '#202d32', 30, 279, 79, 129);
    box(ctx, '#243d41', 41, 288, 57, 120);
    box(ctx, '#182a30', 57, 297, 41, 111);
    box(ctx, '#899283', 24, 276, 7, 135);
    box(ctx, '#899283', 108, 276, 7, 135);
    box(ctx, '#809082', 24, 272, 91, 7);
    box(ctx, '#c9b782', 33, 274, 69, 3);
    box(ctx, '#46665f', 33, 289, 5, 105);
    box(ctx, '#aeac87', 3, 242, 134, 27);
    box(ctx, '#263f41', 6, 245, 128, 21);
    label(ctx, 'SHELTER 04', 70, 260, 15, '#e2d9b2', 'center');
    box(ctx, '#192f35', 33, 228, 71, 6);
    box(ctx, '#f4d495', 36, 228, 64, 4);
    box(ctx, '#354c4e', 121, 305, 18, 44);
    box(ctx, '#8e9981', 124, 310, 12, 13);
    box(ctx, '#233b3d', 126, 313, 8, 6);
    box(ctx, '#b3b990', 126, 329, 4, 4);
    box(ctx, '#c57850', 132, 329, 3, 4);
    box(ctx, '#677d6f', 122, 342, 15, 3);
    label(ctx, 'ENTRY', 69, 303, 8, '#709185', 'center');
    // Rooftop antenna, caged tank, and emergency beacon.
    box(ctx, '#374a4d', 24, 183, 64, 15);
    box(ctx, '#526b66', 29, 166, 55, 18);
    box(ctx, '#7b8e7c', 33, 163, 47, 4);
    box(ctx, '#263c41', 111, 144, 4, 52);
    line(ctx, '#3e5052', 2, [93, 154, 134, 154]);
    line(ctx, '#3e5052', 2, [103, 149, 124, 149]);
    box(ctx, '#314548', 116, 189, 22, 9);
    box(ctx, '#ad5c46', 121, 179, 12, 10);
    box(ctx, '#e49c68', 123, 179, 7, 3);
    // A poster and bundled supplies add scale without obscuring the doorway.
    box(ctx, '#b3a57e', 5, 315, 15, 24);
    box(ctx, '#5e695e', 8, 320, 9, 2);
    box(ctx, '#5e695e', 8, 325, 7, 2);
    box(ctx, '#7c7861', 4, 377, 19, 30);
    box(ctx, '#a29976', 2, 376, 23, 4);
    box(ctx, '#52675d', 3, 385, 21, 3);
    box(ctx, '#52675d', 3, 400, 21, 3);
    // Utility line connects the occupied shelter to the perimeter.
    line(ctx, '#464b4b', 2, [149, 209, 214, 233, 304, 242, 398, 231]);
    box(ctx, '#455153', 396, 231, 5, 165);
    box(ctx, '#728076', 394, 229, 10, 5);
    box(ctx, '#354247', 380, 258, 33, 7);
    box(ctx, '#d8c28d', 381, 265, 29, 3);
    box(ctx, '#4b5855', 171, 354, 33, 39);
    box(ctx, '#71806d', 169, 353, 36, 5);
    box(ctx, '#3a4848', 172, 363, 31, 4);
    box(ctx, '#3a4848', 172, 383, 31, 4);
    box(ctx, '#c1ab7b', 181, 369, 12, 10);
    box(ctx, '#58766a', 184, 371, 5, 6);
  }

  // Rural highway and orphanage frontage, matching the reference game's
  // low-resolution roadside-defense setting while remaining original art.
  function referenceScenery(ctx) {
    const random = rng(1987);
    box(ctx, '#9cad94', 0, 0, W, H);
    box(ctx, '#b9c3a6', 0, 92, W, 156);
    polygon(ctx, '#778c72', [0,245,130,172,244,229,356,151,493,226,641,143,790,219,929,157,1120,223,1120,345,0,345]);
    polygon(ctx, '#637b61', [0,273,164,214,296,280,435,205,558,273,706,194,866,278,1019,205,1120,244,1120,361,0,361]);
    // Pine and scrub silhouettes along the quiet valley.
    for (let x = 16; x < W; x += 34) {
      const height = 25 + Math.floor(random() * 55);
      const y = 346;
      polygon(ctx, random() > .45 ? '#405d4b' : '#4e6954', [x,y,x+11,y-height,x+22,y,x+17,y,x+26,y-height*.63,x+34,y,x+29,y]);
      box(ctx, '#4c5542', x + 15, y - 9, 4, 16);
    }
    // The orphanage is the defended structure on the left edge.
    box(ctx, '#4c4942', 0, 177, 170, 190);
    box(ctx, '#6b675b', 0, 182, 165, 179);
    for (let y = 190; y < 350; y += 15) {
      for (let x = (y / 15) % 2 ? -9 : 0; x < 165; x += 25) box(ctx, '#817764', x, y, 22, 11);
    }
    polygon(ctx, '#3d3d38', [0,177,35,137,128,137,173,177]);
    box(ctx, '#555046', 32, 129, 99, 13);
    box(ctx, '#292d2b', 19, 238, 58, 125);
    box(ctx, '#171c1d', 29, 250, 39, 113);
    box(ctx, '#aaa27d', 83, 216, 61, 31);
    box(ctx, '#343a36', 88, 221, 51, 21);
    label(ctx, 'ORPHANAGE', 114, 237, 11, '#d0c796', 'center');
    box(ctx, '#302f2a', 105, 267, 35, 38);
    box(ctx, '#93a183', 110, 272, 25, 27);
    line(ctx, '#40463e', 3, [122,272,122,299,110,285,135,285]);
    // Grass verges and drainage shoulder.
    box(ctx, '#577052', 0, 350, W, 41);
    box(ctx, '#718365', 0, 350, W, 9);
    for (let x = 170; x < W; x += 13) {
      const h = 4 + Math.floor(random() * 15);
      line(ctx, x % 2 ? '#8e9b72' : '#445f48', 2, [x,390,x-3,390-h]);
    }
    box(ctx, '#3b4140', 0, 390, W, 210);
    box(ctx, '#505351', 0, 395, W, 5);
    box(ctx, '#555754', 0, 487, W, 4);
    box(ctx, '#323938', 0, 584, W, 16);
    // Broken yellow center line and white shoulders.
    box(ctx, '#d8d0a5', 0, 406, W, 3);
    box(ctx, '#d8d0a5', 0, 569, W, 3);
    for (let x = 22; x < W; x += 130) {
      box(ctx, '#d3b84e', x, 483, 72, 5);
      box(ctx, '#8e803d', x + 7, 488, 62, 2);
    }
    // Asphalt wear, cracks, casings, abandoned weapons and old gore.
    for (let i = 0; i < 170; i++) {
      const x = Math.floor(random() * W), y = 413 + Math.floor(random() * 160);
      box(ctx, i % 4 ? '#474b49' : '#2f3635', x, y, 2 + random() * 6, 1 + random() * 2);
    }
    line(ctx, '#272f2f', 2, [534,426,559,437,553,448,578,461,604,457]);
    line(ctx, '#272f2f', 2, [881,532,864,517,870,506,842,496]);
    line(ctx, '#272f2f', 2, [283,552,306,542,320,550,347,532]);
    // Wrecked roadside defense shed.
    box(ctx, '#514b43', 190, 328, 83, 61);
    polygon(ctx, '#3b3a34', [181,330,225,300,283,331]);
    box(ctx, '#202725', 209, 348, 29, 41);
    box(ctx, '#85785c', 244, 344, 19, 15);
    box(ctx, '#222928', 248, 347, 11, 9);
    // A fallen walker and scattered gear establish the messy ragdoll tone.
    box(ctx, '#26312d', 744, 526, 42, 7);
    box(ctx, '#556d50', 774, 514, 20, 13);
    box(ctx, '#80916a', 788, 511, 11, 10);
    box(ctx, '#6b2824', 751, 532, 54, 5);
    box(ctx, '#962f28', 786, 529, 24, 7);
    box(ctx, '#202626', 673, 449, 34, 4);
    box(ctx, '#8b7652', 668, 447, 13, 7);
    box(ctx, '#232a2a', 905, 553, 24, 4);
    for (let x = 614; x < 660; x += 9) box(ctx, '#bc9654', x, 541 + (x % 3), 4, 2);
    label(ctx, 'MILE 13', 1025, 382, 9, '#c4c6a1');
  }

  function drawMenuBackdrop(ctx) {
    box(ctx, '#050607', 0, 0, W, H);
    // Huge cropped block-figure silhouettes echo the reference menu artwork.
    const bodies = [
      { x:82, y:-50, s:2.4, skin:'#536857', cloth:'#5c5a45', blood:'#421718' },
      { x:442, y:-120, s:2.9, skin:'#475849', cloth:'#3a4440', blood:'#56191b' },
      { x:780, y:-70, s:2.55, skin:'#607062', cloth:'#303a38', blood:'#491516' }
    ];
    for (const body of bodies) {
      const x=body.x,y=body.y,s=body.s;
      box(ctx, body.cloth, x+32*s, y+138*s, 55*s, 112*s);
      box(ctx, body.skin, x+27*s, y+72*s, 63*s, 72*s);
      box(ctx, '#181d1b', x+36*s, y+99*s, 14*s, 11*s);
      box(ctx, '#171b19', x+67*s, y+99*s, 14*s, 11*s);
      box(ctx, body.blood, x+27*s, y+73*s, 18*s, 20*s);
      polygon(ctx, body.skin, [x+26*s,y+151*s,x-7*s,y+220*s,x+12*s,y+231*s,x+48*s,y+170*s]);
      polygon(ctx, body.skin, [x+87*s,y+151*s,x+119*s,y+218*s,x+101*s,y+231*s,x+67*s,y+170*s]);
      polygon(ctx, body.cloth, [x+43*s,y+242*s,x+29*s,y+340*s,x+52*s,y+342*s,x+65*s,y+247*s]);
      polygon(ctx, body.cloth, [x+72*s,y+242*s,x+82*s,y+343*s,x+105*s,y+343*s,x+88*s,y+241*s]);
      box(ctx, body.blood, x+37*s, y+185*s, 27*s, 13*s);
    }
    ctx.save(); ctx.globalAlpha=.42; box(ctx,'#000',0,0,W,H); ctx.restore();
  }

  function drawScenery(ctx) {
    referenceScenery(ctx);
  }

  function cachedScenery() {
    if (scenery) return scenery;
    if (typeof document === 'undefined' || !document.createElement) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.imageSmoothingEnabled = false;
      drawScenery(context);
      scenery = canvas;
      return scenery;
    } catch (_) {
      return null;
    }
  }

  function shadow(ctx, x, y, width, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha || 0.35;
    box(ctx, '#202b31', x - width / 2, y - 2, width, 5);
    box(ctx, '#202b31', x - width / 2 + 4, y - 4, width - 8, 9);
    ctx.restore();
  }

  function bar(ctx, x, y, value, maximum, width, color) {
    box(ctx, '#253034', x - width / 2 - 1, y - 1, width + 2, 5);
    box(ctx, '#6c6056', x - width / 2, y, width, 3);
    box(ctx, color, x - width / 2, y, Math.max(0, Math.min(1, value / Math.max(1, maximum))) * width, 3);
  }

  function barricadePanel(ctx, y, hp, maximum) {
    shadow(ctx, 433, y, 52, 0.25);
    box(ctx, '#3b3635', 411, y - 32, 7, 33);
    box(ctx, '#3b3635', 450, y - 33, 7, 34);
    box(ctx, '#bc8d5d', 412, y - 34, 5, 31);
    box(ctx, '#bc8d5d', 451, y - 35, 5, 32);
    box(ctx, '#cba274', 406, y - 29, 53, 9);
    box(ctx, '#8b684c', 406, y - 21, 53, 3);
    box(ctx, '#aa7f57', 409, y - 14, 47, 8);
    box(ctx, '#8b684c', 409, y - 7, 47, 3);
    box(ctx, '#e0b67b', 408, y - 29, 49, 2);
    box(ctx, '#554b41', 414, y - 25, 3, 3);
    box(ctx, '#554b41', 450, y - 25, 3, 3);
    box(ctx, '#554b41', 414, y - 11, 3, 3);
    box(ctx, '#554b41', 450, y - 11, 3, 3);
    if (hp / maximum < 0.45) {
      polygon(ctx, '#505457', [434, y - 29, 441, y - 29, 435, y - 24, 438, y - 18, 429, y - 18, 435, y - 24]);
      box(ctx, '#505457', 423, y - 13, 10, 6);
    }
  }

  function trap(ctx, state, time) {
    const item = state.trap || {};
    if (!item.level) return;
    for (let y = 408; y <= 548; y += 35) {
      box(ctx, '#394246', item.x - 31, y - 8, 65, 17);
      box(ctx, '#8a8c7c', item.x - 28, y - 8, 59, 2);
      box(ctx, '#2b363d', item.x - 29, y + 5, 61, 4);
      for (let x = item.x - 24; x <= item.x + 26; x += 11) {
        polygon(ctx, item.cooldown > 0 ? '#858879' : '#b6b59a', [x - 3, y + 4, x, y - 7, x + 4, y + 4]);
      }
      box(ctx, item.cooldown > 0 ? C.rust : C.tealLight, item.x - 28, y + 1, 4, 4);
      if (item.level > 1) box(ctx, C.tealLight, item.x + 27, y + 1, 3, 4);
    }
  }

  function limb(ctx, points, color, width, light) {
    line(ctx, C.ink, width + 2, points);
    line(ctx, color, width, points);
    if (light) box(ctx, light, points[0] - 2, points[1] - 2, 3, 3);
  }

  function survivor(ctx, player, time, options, state) {
    const x = Math.round(player.x || 260);
    const y = Math.round(player.y || 470);
    const targetX = Number.isFinite(options.aimX) ? options.aimX : x + 220;
    const targetY = Number.isFinite(options.aimY) ? options.aimY : y - 27;
    const face = targetX < x ? -1 : 1;
    const stride = options.menu || state.mode !== 'playing' ? 0 : Math.sin(time * 9 + x * 0.055 + y * 0.055) * 3;
    const angle = Math.atan2(targetY - (y - 28), targetX - x);
    shadow(ctx, x, y, 33);
    ctx.save();
    ctx.translate(x, y);
    const bootKick = player.kickTimer > 0 ? 16 : 0;
    limb(ctx, [-4, -17, -5 - stride, -9, -5 - stride, -2], '#3a4850', 6);
    limb(ctx, [4, -17, 5 + stride + bootKick * face, -10 - bootKick * 0.35, 7 + stride + bootKick * face, -2 - bootKick * 0.45], '#56626a', 6);
    box(ctx, '#232e34', -10 - stride, -3, 10, 4);
    box(ctx, '#253238', 4 + stride + bootKick * face, -3 - bootKick * 0.45, 11, 4);
    box(ctx, '#253e43', -10, -35, 19, 21);
    box(ctx, '#527e79', -8, -34, 15, 16);
    box(ctx, '#7b9d8b', -6, -34, 12, 3);
    box(ctx, '#315b5d', -8, -24, 7, 7);
    box(ctx, '#9c9d7b', -8, -18, 16, 3);
    box(ctx, '#d9c193', -1, -18, 4, 3);
    // Shoulder bag, scarf, and little radio distinguish the defender.
    box(ctx, '#2a4245', face > 0 ? -13 : 6, -32, 7, 17);
    box(ctx, '#68776a', face > 0 ? -12 : 7, -30, 5, 10);
    box(ctx, '#29383d', -7, -46, 14, 12);
    box(ctx, '#ceaa7c', -6, -44, 12, 11);
    box(ctx, '#edc593', face > 0 ? 0 : -6, -43, 7, 7);
    box(ctx, '#272f32', -7, -46, 14, 4);
    box(ctx, '#3b4140', face > 0 ? -7 : 4, -43, 3, 7);
    box(ctx, '#283236', face > 0 ? 4 : -5, -41, 2, 2);
    box(ctx, '#a37458', face > 0 ? 3 : -6, -35, 3, 2);
    box(ctx, '#b77b50', -7, -35, 13, 4);
    box(ctx, '#d49f67', -6, -35, 11, 2);
    box(ctx, '#b77b50', face > 0 ? -10 : 6, -33, 5, 7);

    // The survivor visibly carries the reference game's knife in the free hand.
    ctx.save();
    ctx.translate(-face * 5, -27);
    ctx.scale(face, 1);
    ctx.rotate(player.knifeTimer > 0 ? -1.05 : 0.72);
    limb(ctx, [0, 0, 7, 8, 13, 10], C.tealDark, 5);
    box(ctx, '#604333', 11, 7, 8, 6);
    polygon(ctx, '#d7ddd1', [18, 7, 37, 3, 39, 6, 20, 12]);
    box(ctx, '#f4e8c5', 20, 7, 15, 2);
    ctx.restore();

    // Rotate the firing arm and weapon together so the muzzle follows the cursor.
    ctx.save();
    ctx.translate(0, -28);
    ctx.rotate(angle);
    if (face < 0) ctx.scale(1, -1);
    const reloading = player.reloadTimer > 0;
    const recoil = player.fireTimer > 0.09 ? 2 : 0;
    limb(ctx, [0, 1, 8, reloading ? 7 : 4, 14 - recoil, 0], C.teal, 5);
    box(ctx, '#d9b485', 10 - recoil, -3, 6, 5);
    if (player.weapon === 'shotgun') {
      box(ctx, '#744e39', 6 - recoil, -4, 12, 6);
      box(ctx, '#222e34', 17 - recoil, -6, 24, 5);
      box(ctx, '#92a09b', 18 - recoil, -6, 23, 2);
      box(ctx, '#a0754e', 22 - recoil, -1, 11, 4);
      box(ctx, '#202c31', 39 - recoil, -7, 3, 7);
    } else if (player.weapon === 'smg') {
      box(ctx, '#223037', 11 - recoil, -6, 23, 8);
      box(ctx, '#718480', 13 - recoil, -6, 18, 2);
      box(ctx, '#25353b', 21 - recoil, 1, 5, 8);
      box(ctx, '#223037', 32 - recoil, -5, 8, 4);
      box(ctx, '#24343a', 12 - recoil, 0, 5, 5);
    } else {
      box(ctx, '#233038', 11 - recoil, -5, 18, 6);
      box(ctx, '#91a198', 12 - recoil, -5, 15, 2);
      box(ctx, '#24353b', 12 - recoil, 0, 5, 6);
    }
    if (player.fireTimer > 0 && (state.effects || []).some(function (effect) { return effect.type === 'shot'; })) {
      const muzzle = player.weapon === 'pistol' ? 30 : 41;
      polygon(ctx, '#ffe1a0', [muzzle, -4, muzzle + 7, -8, muzzle + 5, -4, muzzle + 15, -2, muzzle + 5, 1, muzzle + 8, 5, muzzle, 1]);
      box(ctx, '#fff1c3', muzzle, -3, 8, 4);
    }
    ctx.restore();
    if (player.reloadTimer > 0) {
      label(ctx, 'RELOADING', 0, -57, 8, C.cream, 'center');
      box(ctx, C.deep, -18, -53, 36, 3);
      const weapon = root.UndeadCore && root.UndeadCore.WEAPONS && root.UndeadCore.WEAPONS[player.weapon];
      const total = weapon && weapon.reload || 1.5;
      box(ctx, C.tealLight, -18, -53, 36 * Math.max(0, 1 - player.reloadTimer / total), 3);
    }
    if (player.hp < player.maxHp && state.mode !== 'dead') bar(ctx, 0, -64, player.hp, player.maxHp, 31, C.tealLight);
    ctx.restore();
  }

  function zombie(ctx, enemy, time, menu) {
    const brute = enemy.type === 'brute';
    const runner = enemy.type === 'runner';
    const scale = brute ? 1.38 : runner ? 0.94 : 1;
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y);
    const seed = (enemy.id || 2) * 1.73;
    const cycle = time * (runner ? 13 : 5.5) + seed;
    const stride = Math.sin(cycle) * (runner ? 7 : 4);
    const bob = menu ? 0 : Math.abs(Math.cos(cycle)) * (runner ? 2 : 1);
    const face = enemy.facing || -1;
    const skin = enemy.hitTimer > 0 ? '#f6d9b0' : brute ? '#9c9c70' : runner ? '#a2aa83' : '#9da288';
    const shirt = brute ? '#886447' : runner ? '#98664f' : (enemy.id || 0) % 2 ? '#657577' : '#7c776b';
    shadow(ctx, x, y, brute ? 43 : 31, 0.29);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * -face, scale);
    // Enemy art faces left; flip only when explicitly supplied a rightward facing.
    limb(ctx, [-4, -17, -3 - stride, -9, -7 - stride, -2], '#495258', 5);
    limb(ctx, [5, -17, 6 + stride, -9, 4 + stride, -2], '#535b5b', 5);
    box(ctx, '#303a3e', -13 - stride, -3, 10, 4);
    box(ctx, '#303a3e', stride, -3, 10, 4);
    box(ctx, C.ink, -10, -34 - bob, brute ? 23 : 20, 19);
    box(ctx, shirt, -8, -33 - bob, brute ? 20 : 16, 17);
    box(ctx, brute ? '#aa855c' : '#9a9580', -8, -33 - bob, brute ? 19 : 13, 3);
    box(ctx, '#41494a', 5, -21, 5, 6);
    box(ctx, '#746a58', -6, -19, 5, 3);
    if (brute) {
      box(ctx, '#584c40', -5, -31, 5, 14);
      box(ctx, '#b08c60', 1, -29, 8, 8);
      box(ctx, '#454743', 2, -28, 6, 2);
    } else if (runner) {
      box(ctx, '#c09567', -4, -32, 4, 15);
      box(ctx, '#baad8a', 1, -24, 4, 3);
    } else {
      box(ctx, '#47575b', 0, -30, 3, 12);
      box(ctx, '#b4aa85', 3, -28, 2, 2);
    }
    const reach = enemy.attackTimer > 0.3 ? 4 : 0;
    limb(ctx, [5, -30 - bob, -8 - reach, -27, -17 - reach, -31 + Math.sin(cycle) * 2], shirt, 5);
    box(ctx, skin, -24 - reach, -33 + Math.sin(cycle) * 2, 8, 5);
    box(ctx, C.ink, -11, -47 - bob, 16, 15);
    box(ctx, skin, -10, -45 - bob, 14, 12);
    box(ctx, brute ? '#a78b5f' : '#565e56', -10, -47 - bob, 14, 4);
    if (brute) {
      box(ctx, '#c29e61', -12, -45 - bob, 18, 4);
      box(ctx, '#d5b97c', -8, -49 - bob, 10, 3);
    }
    box(ctx, '#616e5c', 1, -41 - bob, 3, 7);
    box(ctx, '#343c38', -10, -41 - bob, 5, 3);
    box(ctx, '#e7b073', -10, -41 - bob, 2, 2);
    box(ctx, '#51483f', -10, -35 - bob, 6, 2);
    box(ctx, '#cabc90', -9, -35 - bob, 3, 1);
    limb(ctx, [-6, -30 - bob, -14 - reach, -29, -22 - reach, -25 - Math.cos(cycle)], shirt, 5);
    box(ctx, skin, -29 - reach, -27 - Math.cos(cycle), 8, 5);
    box(ctx, skin, -30 - reach, -25 - Math.cos(cycle), 3, 5);
    ctx.restore();
    if (!menu && (enemy.hp < enemy.maxHp || brute)) bar(ctx, x, y - (brute ? 77 : 56), enemy.hp, enemy.maxHp, brute ? 43 : 27, brute ? C.yellow : C.red);
  }

  function grenade(ctx, item, time) {
    const flight = Math.max(0, Math.min(1, 1 - (item.timer || 0) / 0.9));
    const height = Math.sin(flight * Math.PI) * 38;
    shadow(ctx, item.x, item.y, 13, 0.2);
    ctx.save();
    ctx.translate(item.x, item.y - height - 15);
    ctx.rotate(time * 10);
    box(ctx, C.ink, -5, -5, 10, 11);
    box(ctx, '#93a078', -4, -4, 7, 8);
    box(ctx, '#c2c19a', -3, -4, 5, 2);
    box(ctx, '#d7ca9d', -2, -7, 4, 3);
    box(ctx, C.yellow, 0, -10, 3, 3);
    ctx.restore();
  }

  function corpse(ctx, body) {
    const scale = body.type === 'brute' ? 1.35 : .95;
    const face = body.flip || 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(.35, (body.life || 0) / 2));
    ctx.translate(body.x, body.y);
    ctx.scale(face, 1);
    box(ctx, '#76211f', -27 * scale, -4, 58 * scale, 7);
    box(ctx, '#38483d', -14 * scale, -12, 36 * scale, 13);
    box(ctx, '#68785f', 15 * scale, -16, 16 * scale, 14);
    box(ctx, '#222a27', -31 * scale, -8, 22 * scale, 7);
    box(ctx, '#56684f', 27 * scale, -8, 22 * scale, 6);
    box(ctx, '#9a3128', 7 * scale, -5, 24 * scale, 5);
    ctx.restore();
  }

  function effects(ctx, state, time, options) {
    for (const bullet of state.bullets || []) {
      const x = bullet.x || 0;
      const y = bullet.y || 0;
      const px = Number.isFinite(bullet.px) ? bullet.px : x - (bullet.vx || 0) * 0.012;
      const py = Number.isFinite(bullet.py) ? bullet.py : y - (bullet.vy || 0) * 0.012;
      line(ctx, '#d3ab67', 3, [px, py, x, y]);
      line(ctx, '#ffe4a2', 1, [px, py, x, y]);
      box(ctx, '#fff0c5', x - 1, y - 1, 3, 3);
    }
    for (const effect of state.effects || []) {
      const ratio = Math.max(0, Math.min(1, effect.life / (effect.maxLife || 0.3)));
      ctx.save();
      ctx.globalAlpha = ratio;
      if (effect.type === 'blast') {
        const radius = (effect.radius || 95) * (1 - ratio * 0.6);
        ctx.strokeStyle = '#f6bc72';
        ctx.lineWidth = 3 + ratio * 4;
        ctx.beginPath();
        ctx.ellipse(effect.x, effect.y - 10, radius, radius * 0.57, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (let j = 0; j < 9; j++) {
          const angle = j / 9 * Math.PI * 2;
          const size = 6 + ratio * 14;
          const distance = radius * 0.64;
          box(ctx, j % 2 ? '#ed9856' : '#f8d18a', effect.x + Math.cos(angle) * distance - size / 2, effect.y - 15 + Math.sin(angle) * distance * 0.6 - (1 - ratio) * 29, size, size);
        }
        box(ctx, '#ffe4a4', effect.x - ratio * 15, effect.y - 25 - ratio * 10, ratio * 30, ratio * 28);
      } else if (effect.type === 'kick') {
        ctx.strokeStyle = C.cream;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const face = state.player && state.player.facing < 0 ? Math.PI : 0;
        ctx.arc(effect.x, effect.y - 20, 22 + (1 - ratio) * 17, face - 0.8, face + 0.8);
        ctx.stroke();
      } else if (effect.type === 'knife') {
        const face = state.player && state.player.facing < 0 ? Math.PI : 0;
        ctx.strokeStyle = '#f4ead0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 20 + (1 - ratio) * 31, face - 1.05, face + 1.05);
        ctx.stroke();
        ctx.strokeStyle = '#9fa99d';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const particle of state.particles || []) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / (particle.maxLife || 0.5)));
      const size = particle.size || 3;
      box(ctx, particle.color || C.bone, particle.x - size / 2, particle.y - size / 2, size, size);
      ctx.restore();
    }
    if (!options.reducedMotion) {
      // A fixed number of windblown specks: no allocated or growing particle pool.
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 11; i++) {
        const x = ((i * 149 + time * (7 + i % 4)) % 1160) - 20;
        const y = 255 + (i * 41) % 280 + Math.sin(time * 0.65 + i) * 7;
        box(ctx, i % 3 ? '#d2b48d' : '#b2aa90', x, y, i % 3 ? 2 : 3, 2);
      }
      ctx.restore();
    }
  }

  const menuWalkers = [
    { id: 12, x: 717, y: 422, hp: 45, maxHp: 45, type: 'walker' },
    { id: 21, x: 919, y: 446, hp: 45, maxHp: 45, type: 'walker' },
    { id: 8, x: 842, y: 523, hp: 45, maxHp: 45, type: 'runner' },
    { id: 7, x: 1052, y: 511, hp: 100, maxHp: 100, type: 'brute' }
  ];

  function draw(ctx, state, options) {
    if (!ctx) return;
    state = state || {};
    options = options || {};
    const time = options.reducedMotion ? 0 : state.time || 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale((options.width || W) / W, (options.height || H) / H);
    if (options.menu) {
      drawMenuBackdrop(ctx);
      ctx.restore();
      return;
    }
    const zoom = Number.isFinite(options.zoom) ? options.zoom : 1;
    ctx.scale(zoom, zoom);
    ctx.translate(-(options.cameraX || 0), -(options.cameraY || 0));
    const background = cachedScenery();
    if (background && typeof ctx.drawImage === 'function') ctx.drawImage(background, 0, 0);
    else drawScenery(ctx);
    const base = state.base || { hp: 100, maxHp: 100 };
    const alive = base.hp > base.maxHp * 0.25;
    box(ctx, alive ? '#9bba94' : '#e17e59', 123, 181, 7, 5);
    // Warm doorway spill stays behind gameplay sprites.
    ctx.save();
    ctx.globalAlpha = 0.12;
    polygon(ctx, C.sun, [30, 407, 108, 407, 172, 486, 19, 475]);
    ctx.restore();
    trap(ctx, state, time);
    for (const body of state.corpses || []) corpse(ctx, body);
    const entries = [];
    const enemies = state.enemies || [];
    for (const enemy of enemies) entries.push({ kind: 'enemy', y: enemy.y, value: enemy });
    if (state.player) entries.push({ kind: 'player', y: state.player.y, value: state.player });
    if (state.barricade && state.barricade.hp > 0) {
      for (let y = 410; y <= 546; y += 34) entries.push({ kind: 'barricade', y: y, value: state.barricade });
    }
    entries.sort(function (a, b) { return a.y - b.y; });
    for (const entry of entries) {
      if (entry.kind === 'player') survivor(ctx, entry.value, time, options, state);
      else if (entry.kind === 'enemy') zombie(ctx, entry.value, time, !!options.menu);
      else barricadePanel(ctx, entry.y, entry.value.hp, entry.value.maxHp);
    }
    if (state.barricade && state.barricade.hp > 0) bar(ctx, 432, 367, state.barricade.hp, state.barricade.maxHp, 43, C.yellow);
    for (const item of state.grenades || []) grenade(ctx, item, time);
    effects(ctx, state, time, options);
    if (!options.menu && state.mode === 'playing' && Number.isFinite(options.aimX) && Number.isFinite(options.aimY)) {
      const x = Math.round(options.aimX);
      const y = Math.round(options.aimY);
      ctx.save();
      ctx.globalAlpha = 0.8;
      line(ctx, '#263138', 3, [x - 9, y, x - 4, y]);
      line(ctx, '#263138', 3, [x + 4, y, x + 9, y]);
      line(ctx, '#263138', 3, [x, y - 9, x, y - 4]);
      line(ctx, '#263138', 3, [x, y + 4, x, y + 9]);
      line(ctx, C.cream, 1, [x - 9, y, x - 4, y]);
      line(ctx, C.cream, 1, [x + 4, y, x + 9, y]);
      line(ctx, C.cream, 1, [x, y - 9, x, y - 4]);
      line(ctx, C.cream, 1, [x, y + 4, x, y + 9]);
      box(ctx, '#ffe0a2', x, y, 1, 1);
      ctx.restore();
    }
    ctx.restore();
  }

  root.UndeadRender = Object.freeze({ draw: draw });
})(typeof window !== 'undefined' ? window : globalThis);
