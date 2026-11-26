// Procedurally drawn placeholder art for Petalburg Woods and combat effects.
// The Pokémon themselves come from pokeemerald-expansion follower sprites.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTex(scene, key, w, h, draw) {
  // A hand-drawn PNG loaded under the same key replaces the placeholder
  if (scene.textures.exists(key)) return scene.textures.get(key);
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx, w, h);
  tex.refresh();
  return tex;
}

// Emerald-ish forest palette
const C = {
  canopyDark: '#18301f',
  canopy: '#21462b',
  canopyLight: '#2f6237',
  leaf: '#3f7d3f',
  trunkDark: '#3a2618',
  trunk: '#5a3b22',
  trunkLight: '#7a5430',
  grassDark: '#3d7a34',
  grass: '#58a043',
  grassLight: '#7cc25a',
  path: '#b8a068',
  pathDark: '#9c8552',
  pathLight: '#d1bb83',
  bush: '#2c5e2a',
  bushLight: '#44853a',
};

export function makeTextures(scene) {
  // Far canopy with light shafts (scrolls slowly)
  canvasTex(scene, 'bg-far', 256, 110, (ctx, w, h) => {
    const r = rng(7);
    ctx.fillStyle = C.canopyDark;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * 70);
      const s = 6 + Math.floor(r() * 14);
      ctx.fillStyle = r() < 0.5 ? C.canopy : C.canopyLight;
      ctx.fillRect(x, y, s, Math.floor(s * 0.6));
      if (x + s > w) ctx.fillRect(x - w, y, s, Math.floor(s * 0.6));
    }
    // distant trunks
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * w);
      ctx.fillStyle = '#2a2a1c';
      ctx.fillRect(x, 40, 5, h - 40);
    }
    // light shafts
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#f4ffcc';
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * w);
      for (let y = 0; y < h; y++) ctx.fillRect(x + Math.floor(y * 0.35), y, 10, 1);
    }
    ctx.globalAlpha = 1;
  });

  // Mid layer: big trunks and roots (scrolls at half speed)
  canvasTex(scene, 'bg-trunks', 192, 120, (ctx, w, h) => {
    const r = rng(21);
    const trunk = (x, tw) => {
      ctx.fillStyle = C.trunkDark;
      ctx.fillRect(x, 0, tw, h);
      ctx.fillStyle = C.trunk;
      ctx.fillRect(x + 2, 0, tw - 6, h);
      ctx.fillStyle = C.trunkLight;
      ctx.fillRect(x + 3, 0, 2, h);
      for (let y = 4; y < h; y += 7 + Math.floor(r() * 6)) {
        ctx.fillStyle = C.trunkDark;
        ctx.fillRect(x + 4 + Math.floor(r() * (tw - 8)), y, 2, 3);
      }
      // roots
      ctx.fillStyle = C.trunk;
      ctx.fillRect(x - 4, h - 6, tw + 8, 6);
      ctx.fillStyle = C.trunkDark;
      ctx.fillRect(x - 4, h - 2, tw + 8, 2);
    };
    trunk(18, 22);
    trunk(104, 28);
    trunk(160, 14);
    // leaf clumps hanging over
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * 28);
      ctx.fillStyle = r() < 0.5 ? C.canopy : C.leaf;
      ctx.fillRect(x, y, 10 + Math.floor(r() * 10), 6 + Math.floor(r() * 6));
    }
  });

  // Ground: grass bank, dirt path (the fighting plane), grass edge
  canvasTex(scene, 'ground', 64, 76, (ctx, w, h) => {
    const r = rng(3);
    ctx.fillStyle = C.grass;
    ctx.fillRect(0, 0, w, h);
    // path occupies most of the depth range
    ctx.fillStyle = C.path;
    ctx.fillRect(0, 12, w, 54);
    ctx.fillStyle = C.pathLight;
    ctx.fillRect(0, 12, w, 2);
    ctx.fillStyle = C.pathDark;
    ctx.fillRect(0, 64, w, 2);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = r() < 0.5 ? C.pathDark : C.pathLight;
      ctx.fillRect(Math.floor(r() * w), 15 + Math.floor(r() * 48), 2, 1);
    }
    // grass tufts
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * w);
      const y = r() < 0.5 ? Math.floor(r() * 10) : 67 + Math.floor(r() * 8);
      ctx.fillStyle = r() < 0.5 ? C.grassDark : C.grassLight;
      ctx.fillRect(x, y, 1, 2);
      ctx.fillRect(x + 2, y + 1, 1, 2);
    }
  });

  // Foreground bushes along the bottom edge (scroll faster than the camera)
  canvasTex(scene, 'fg-bush', 160, 24, (ctx, w, h) => {
    const r = rng(11);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * w), rad = 7 + Math.floor(r() * 6);
      for (let y = -rad; y <= rad; y++) {
        const half = Math.floor(Math.sqrt(rad * rad - y * y));
        ctx.fillStyle = y < -rad / 3 ? C.bushLight : C.bush;
        ctx.fillRect(x - half, h - 4 + y, half * 2, 1);
        if (x - half < 0) ctx.fillRect(x - half + w, h - 4 + y, half * 2, 1);
        if (x + half > w) ctx.fillRect(x - half - w, h - 4 + y, half * 2, 1);
      }
    }
  });

  // Shadow under fighters
  canvasTex(scene, 'shadow', 20, 6, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(4, 0, 12, 6);
    ctx.fillRect(2, 1, 16, 4);
    ctx.fillRect(0, 2, 20, 2);
  });

  // Slash arc for strikes
  canvasTex(scene, 'slash', 16, 20, (ctx) => {
    ctx.fillStyle = '#ffffff';
    const pts = [[4, 1], [7, 2], [9, 4], [11, 7], [12, 10], [11, 13], [9, 16], [7, 18], [4, 19]];
    pts.forEach(([x, y]) => ctx.fillRect(x, y, 3, 2));
    ctx.fillStyle = '#fff6a0';
    pts.forEach(([x, y]) => ctx.fillRect(x - 2, y, 2, 2));
  });

  // Impact spark
  canvasTex(scene, 'spark', 13, 13, (ctx) => {
    ctx.fillStyle = '#fff6a0';
    ctx.fillRect(6, 0, 1, 13);
    ctx.fillRect(0, 6, 13, 1);
    ctx.fillRect(2, 2, 1, 1); ctx.fillRect(10, 2, 1, 1);
    ctx.fillRect(2, 10, 1, 1); ctx.fillRect(10, 10, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 4, 5, 5);
  });

  // Bullet Seed projectile
  canvasTex(scene, 'seed', 6, 4, (ctx) => {
    ctx.fillStyle = '#2d5a1b';
    ctx.fillRect(0, 0, 6, 4);
    ctx.fillStyle = '#8fd14f';
    ctx.fillRect(1, 1, 4, 2);
    ctx.fillStyle = '#e6ffb0';
    ctx.fillRect(1, 1, 1, 1);
  });

  // String Shot thread
  canvasTex(scene, 'string', 12, 4, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 1, 12, 1);
    ctx.fillRect(2, 0, 3, 1); ctx.fillRect(7, 2, 3, 1);
    ctx.fillStyle = '#c8c8e8';
    ctx.fillRect(0, 2, 5, 1); ctx.fillRect(6, 0, 4, 1);
  });

  // Spore cloud puff
  canvasTex(scene, 'spore', 56, 24, (ctx) => {
    const r = rng(5);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      const x = Math.round(28 + Math.cos(a) * d * 26), y = Math.round(12 + Math.sin(a) * d * 11);
      ctx.fillStyle = r() < 0.5 ? '#e8e070' : '#b8d860';
      ctx.fillRect(x, y, r() < 0.3 ? 2 : 1, r() < 0.3 ? 2 : 1);
    }
  });

  // Leaf for rustling grass
  canvasTex(scene, 'leaf', 3, 3, (ctx) => {
    ctx.fillStyle = '#58a043';
    ctx.fillRect(0, 1, 3, 1); ctx.fillRect(1, 0, 1, 3);
    ctx.fillStyle = '#7cc25a';
    ctx.fillRect(1, 1, 1, 1);
  });

  // Leaf Storm leaf
  canvasTex(scene, 'leafstorm', 9, 5, (ctx) => {
    ctx.fillStyle = '#2d6a1b';
    ctx.fillRect(1, 1, 7, 3); ctx.fillRect(0, 2, 9, 1);
    ctx.fillStyle = '#7cd35a';
    ctx.fillRect(2, 1, 5, 2);
    ctx.fillStyle = '#d8ffb0';
    ctx.fillRect(3, 2, 4, 1);
  });

  // Smeargle's paint blob
  canvasTex(scene, 'paint', 6, 5, (ctx) => {
    ctx.fillStyle = '#c03070';
    ctx.fillRect(1, 0, 4, 5); ctx.fillRect(0, 1, 6, 3);
    ctx.fillStyle = '#ff70c0';
    ctx.fillRect(1, 1, 4, 3);
    ctx.fillStyle = '#ffd0ea';
    ctx.fillRect(2, 1, 1, 1);
  });

  // Rock Slide boulder
  canvasTex(scene, 'rock', 10, 9, (ctx) => {
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(2, 0, 6, 9); ctx.fillRect(0, 2, 10, 5); ctx.fillRect(1, 1, 8, 7);
    ctx.fillStyle = '#8a7058';
    ctx.fillRect(2, 1, 6, 6); ctx.fillRect(1, 2, 8, 4);
    ctx.fillStyle = '#b89878';
    ctx.fillRect(2, 2, 3, 2);
  });

  // ----- Starter specials -----
  canvasTex(scene, 'waterpulse', 10, 10, (ctx) => {
    ctx.fillStyle = '#2060c0';
    for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; ctx.fillRect(Math.round(5 + Math.cos(t) * 4), Math.round(5 + Math.sin(t) * 4), 1, 1); }
    ctx.fillStyle = '#60b0ff'; ctx.fillRect(3, 2, 4, 6); ctx.fillRect(2, 3, 6, 4);
    ctx.fillStyle = '#d0f0ff'; ctx.fillRect(3, 3, 2, 2);
  });

  canvasTex(scene, 'surf', 26, 22, (ctx) => {
    // a curling wave crest facing right
    const rows = [[2, 14], [0, 18], [0, 22], [0, 24], [0, 25], [0, 26], [0, 26], [0, 26]];
    ctx.fillStyle = '#2060c0';
    for (let y = 0; y < 22; y++) {
      const w = y < 4 ? 10 + y * 3 : 26 - Math.max(0, (y - 12));
      ctx.fillRect(0, y, Math.min(26, w), 1);
    }
    ctx.fillStyle = '#4890e8';
    for (let y = 3; y < 22; y++) ctx.fillRect(0, y, Math.min(20, 8 + y), 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 0, 8, 2); ctx.fillRect(16, 2, 6, 2); ctx.fillRect(20, 4, 4, 3); ctx.fillRect(4, 8, 3, 1); ctx.fillRect(8, 14, 4, 1);
    void rows;
  });

  canvasTex(scene, 'flame', 8, 10, (ctx) => {
    ctx.fillStyle = '#c02810'; ctx.fillRect(1, 3, 6, 7); ctx.fillRect(2, 1, 4, 2);
    ctx.fillStyle = '#ff8020'; ctx.fillRect(2, 4, 4, 5); ctx.fillRect(3, 2, 2, 2);
    ctx.fillStyle = '#ffe060'; ctx.fillRect(3, 6, 2, 3);
  });

  // ----- Mt. Chimney -----
  canvasTex(scene, 'mc-far', 256, 110, (ctx, w, h) => {
    const r = rng(41);
    const bands = ['#3a1a1a', '#5a2418', '#7a3018', '#9a4420', '#b85a28'];
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * 18, w, 22); });
    // distant volcano with a smoke plume
    ctx.fillStyle = '#2a1414';
    for (let y = 30; y < h; y++) {
      const half = Math.floor((y - 30) * 1.4);
      ctx.fillRect(128 - 14 - half, y, 28 + half * 2, 1);
    }
    ctx.fillStyle = '#d84a20';
    ctx.fillRect(116, 30, 24, 2);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = r() < 0.5 ? 'rgba(80,70,70,0.7)' : 'rgba(110,100,100,0.6)';
      const y = 4 + Math.floor(r() * 26);
      ctx.fillRect(110 + Math.floor(r() * 40) + (30 - y) * 0.6, y, 6 + Math.floor(r() * 8), 4);
    }
    // far ridge
    ctx.fillStyle = '#1e0e0e';
    for (let x = 0; x < w; x++) {
      const y = 88 + Math.floor(Math.sin(x / 14) * 4 + Math.sin(x / 5) * 2);
      ctx.fillRect(x, y, 1, h - y);
    }
  });

  canvasTex(scene, 'mc-mid', 192, 120, (ctx, w, h) => {
    const r = rng(43);
    // jagged dark crags, transparent sky above
    const peaks = [[0, 70], [30, 44], [56, 66], [84, 36], [118, 60], [150, 40], [176, 64], [192, 70]];
    for (let x = 0; x < w; x++) {
      let i = 0;
      while (peaks[i + 1][0] < x) i++;
      const [x0, y0] = peaks[i]; const [x1, y1] = peaks[i + 1];
      const top = Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
      ctx.fillStyle = '#3a2420';
      ctx.fillRect(x, top, 1, h - top);
      ctx.fillStyle = '#5a3a30';
      ctx.fillRect(x, top, 1, 2);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = r() < 0.5 ? '#2a1814' : '#4a2e26';
      ctx.fillRect(Math.floor(r() * w), 50 + Math.floor(r() * 70), 3, 2);
    }
    // glowing lava seams
    ctx.fillStyle = '#e8601c';
    for (let i = 0; i < 6; i++) {
      let x = Math.floor(r() * w), y = 80 + Math.floor(r() * 30);
      for (let k = 0; k < 10; k++) { ctx.fillRect(x, y, 2, 1); x += 1; y += r() < 0.5 ? 1 : 0; }
    }
  });

  canvasTex(scene, 'mc-ground', 64, 76, (ctx, w, h) => {
    const r = rng(47);
    ctx.fillStyle = '#4a3630'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6a544a'; ctx.fillRect(0, 12, w, 54);  // ashy path
    ctx.fillStyle = '#8a7468'; ctx.fillRect(0, 12, w, 2);
    ctx.fillStyle = '#3a2824'; ctx.fillRect(0, 64, w, 2);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = r() < 0.5 ? '#5a463e' : '#8a7a72';
      ctx.fillRect(Math.floor(r() * w), 15 + Math.floor(r() * 48), r() < 0.3 ? 2 : 1, 1);
    }
    // ash drifts
    for (let i = 0; i < 6; i++) { ctx.fillStyle = '#9a8e88'; ctx.fillRect(Math.floor(r() * w), 16 + Math.floor(r() * 44), 4, 1); }
    // lava cracks in the rock edges
    ctx.fillStyle = '#d8501c';
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.floor(r() * w), r() < 0.5 ? 4 + Math.floor(r() * 6) : 68 + Math.floor(r() * 6), 3, 1);
  });

  canvasTex(scene, 'mc-fg', 160, 24, (ctx, w, h) => {
    const r = rng(53);
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(r() * w), rw = 8 + Math.floor(r() * 10), rh = 6 + Math.floor(r() * 8);
      ctx.fillStyle = '#2a1a16'; ctx.fillRect(x, h - rh, rw, rh);
      ctx.fillStyle = '#4a3028'; ctx.fillRect(x + 1, h - rh + 1, rw - 3, 2);
    }
  });

  canvasTex(scene, 'ash', 2, 2, (ctx) => { ctx.fillStyle = '#b8b0ac'; ctx.fillRect(0, 0, 2, 2); });

  canvasTex(scene, 'ember', 7, 6, (ctx) => {
    ctx.fillStyle = '#c02810'; ctx.fillRect(1, 0, 5, 6); ctx.fillRect(0, 1, 7, 4);
    ctx.fillStyle = '#ff8020'; ctx.fillRect(1, 1, 5, 4);
    ctx.fillStyle = '#ffe060'; ctx.fillRect(2, 2, 3, 2);
  });

  canvasTex(scene, 'smog', 56, 24, (ctx) => {
    const r = rng(9);
    for (let i = 0; i < 80; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      ctx.fillStyle = r() < 0.5 ? '#a070c0' : '#7a5090';
      ctx.fillRect(Math.round(28 + Math.cos(a) * d * 26), Math.round(12 + Math.sin(a) * d * 11), 2, 2);
    }
  });

  const puddle = (key, dark, mid, light) => canvasTex(scene, key, 30, 10, (ctx) => {
    for (let y = -4; y <= 4; y++) {
      const half = Math.floor(14 * Math.sqrt(1 - (y * y) / 20));
      ctx.fillStyle = Math.abs(y) > 2 ? dark : mid;
      ctx.fillRect(15 - half, 5 + y, half * 2, 1);
    }
    ctx.fillStyle = light; ctx.fillRect(10, 3, 5, 1); ctx.fillRect(17, 5, 4, 1);
  });
  puddle('lava', '#a02810', '#e8601c', '#ffd060');
  puddle('sludge', '#4a2060', '#7a4090', '#c090e0');

  canvasTex(scene, 'geyser-mark', 34, 12, (ctx) => {
    ctx.fillStyle = '#ff4020';
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      ctx.fillRect(Math.round(17 + Math.cos(t) * 16), Math.round(6 + Math.sin(t) * 5), 1, 1);
    }
  });

  canvasTex(scene, 'lava-col', 12, 44, (ctx) => {
    ctx.fillStyle = '#c02810'; ctx.fillRect(1, 0, 10, 44);
    ctx.fillStyle = '#ff7020'; ctx.fillRect(3, 0, 6, 44);
    ctx.fillStyle = '#ffd060'; ctx.fillRect(5, 0, 2, 44);
  });

  canvasTex(scene, 'smoke-big', 64, 40, (ctx) => {
    const r = rng(13);
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      ctx.fillStyle = r() < 0.5 ? 'rgba(60,56,56,0.9)' : 'rgba(90,86,86,0.85)';
      ctx.fillRect(Math.round(32 + Math.cos(a) * d * 30), Math.round(20 + Math.sin(a) * d * 18), 4, 4);
    }
  });

  // Sparkle under dropped items
  canvasTex(scene, 'glint', 7, 7, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 0, 1, 7); ctx.fillRect(0, 3, 7, 1);
    ctx.fillStyle = '#fff6a0';
    ctx.fillRect(2, 2, 3, 3);
  });

  // "GO" arrow
  canvasTex(scene, 'go-arrow', 16, 13, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 3, 9, 7); ctx.fillRect(8, 0, 2, 13);
    for (let i = 0; i < 7; i++) ctx.fillRect(9 + i, i, 1, 13 - i * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(1, 4, 8, 5);
    for (let i = 0; i < 5; i++) ctx.fillRect(9 + i, 2 + i, 1, 9 - i * 2);
  });
}
