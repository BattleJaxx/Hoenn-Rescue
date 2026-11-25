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
