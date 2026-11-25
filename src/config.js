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
export const WAVES = [
  { at: 170, count: 2 },
  { at: 560, count: 3 },
  { at: 960, count: 4 },
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
