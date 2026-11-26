// Shared tuning values. Tweak these while playtesting.

export const VIEW_W = 320;
export const VIEW_H = 180;

export const SPRITE_SCALE = 2;          // follower sprites are drawn at 2x
export const FEET_Y = 30 / 32;          // feet sit at y=30 in each 32x32 frame

// The beat 'em up plane: fighters walk between these screen rows
export const GROUND_TOP = 110;
export const GROUND_BOTTOM = 168;

export const WORLD_W = 1280;
export const GRAVITY = 620;             // px/s^2 for jumps and knockdowns

// Wave triggers: when Treecko walks past `at`, the screen locks until the wave is beaten
// Each wave is an Aqua grunt's team: `count` Poochyena at `level`
export const WAVES = [
  { at: 170, count: 2, level: 7 },
  { at: 560, count: 3, level: 8 },
  { at: 960, count: 4, level: 9 },
];
export const MAX_ATTACKERS = 2;         // arcade turn-taking: at most this many enemies attack at once

export const PLAYER = {
  hp: 100,
  speedX: 72,
  speedY: 46,
  jumpVel: 200,
  energyMax: 100,
  specialCost: 50,
  energyPerHit: 7,
};

// Attack data. Times in ms; range = reach in front; depth = allowed difference in depth.
export const ATTACKS = {
  light1: { startup: 50, active: 70, recovery: 130, dmg: 5, range: 24, depth: 9, stun: 260, push: 18, lunge: 3 },
  light2: { startup: 50, active: 70, recovery: 140, dmg: 5, range: 24, depth: 9, stun: 260, push: 18, lunge: 3 },
  light3: { startup: 80, active: 90, recovery: 260, dmg: 9, range: 26, depth: 9, knockdown: true, lunge: 7, slashScale: 1.3 },
  heavy:  { startup: 220, active: 100, recovery: 320, dmg: 15, range: 28, depth: 10, knockdown: true, lunge: 10, slashScale: 1.6, shake: true },
  jumpLight: { dmg: 8, range: 22, depth: 10, stun: 300, push: 24 },
  jumpHeavy: { dmg: 12, range: 24, depth: 10, knockdown: true, shake: true },
  seed: { dmg: 5, stun: 160, push: 14 },
};

export const POOCHYENA = {
  hp: 28,
  speed: 52,
  waitSpeed: 30,
  bite: { windup: 380, dash: 190, dashSpeed: 165, recovery: 520, dmg: 8, range: 16, depth: 8, stun: 300, push: 26 },
};

// ----- Wild Pokémon (Petalburg Woods) ---------------------------------------
// Spawn weights follow the woods' encounter table in pokeemerald-expansion.
export const WILD = {
  firstDelay: [4000, 8000],     // ms before the first wild encounter can happen
  interval: [6000, 12000],      // ms between encounters (counts twice as fast between waves)
  maxAlive: 2,
  levels: [5, 6],               // Petalburg Woods wild levels, from the decomp's encounter table
  table: [
    { species: 'poochyena', weight: 30 },
    { species: 'wurmple', weight: 25 },
    { species: 'shroomish', weight: 15 },
    { species: 'silcoon', weight: 10 },
  ],
};

export const WURMPLE = {
  name: 'WURMPLE', hp: 16, speed: 30, waitSpeed: 20, exp: 8,
  // String Shot: a slow-moving thread that slows you down
  stringShot: { windup: 450, recovery: 650, speed: 150, life: 1.3, minRange: 30, maxRange: 150, dmg: 1, slow: 3000, stun: 120, push: 6 },
  tackle: { windup: 300, dash: 160, dashSpeed: 120, recovery: 500, dmg: 4, range: 14, depth: 8, stun: 220, push: 18 },
};

export const SHROOMISH = {
  name: 'SHROOMISH', hp: 30, speed: 14, exp: 10,
  // Spore cloud: lingers and hurts while you stand in it
  spore: { triggerRange: 54, windup: 550, cooldown: 3200, life: 2200, radiusX: 26, radiusY: 11, tick: 450, dmg: 3 },
};

export const SILCOON = {
  name: 'SILCOON', hp: 45, exp: 10,
  hardenTaken: 0.5,             // takes half damage
  body: { w: 12, d: 6 },        // blocks the lane: you can't walk through it
  slam: { triggerRange: 24, windup: 650, cooldown: 2400, dmg: 7, range: 24, depth: 9, stun: 300, push: 30 },
};

// Grunt waves: XP for clearing, and how long the item choice waits
export const GRUNT = { name: 'AQUA GRUNT' };

// ----- Evolution move upgrades ----------------------------------------------
export const MOVES = {
  // Grovyle choice A: Light attack becomes Fury Cutter. Each light hit that lands in a row hits harder.
  furyCutter: { perStack: 0.5, maxStacks: 4, window: 1200 },
  // Grovyle choice B: Heavy attack becomes Leaf Blade. Harder, and often critical.
  leafBlade: { dmgMult: 1.4, critChance: 0.3, critMult: 2 },
  // Sceptile: Special becomes Leaf Storm. A wide volley of leaves, then Sp. Atk drops for a while.
  leafStorm: { leaves: 12, dmg: 6, spread: 20, speed: 230, life: 0.9, spaDrop: 0.6, dropTime: 8000 },
};
