// Upgraded moves for the light and heavy slots: evolution choices and Move Tutor TMs.
// Each move changes how the slot's attack works through these optional fields:
//   dmg       damage multiplier            hits      number of hits per attack (re-hits during active frames)
//   active    active frames (ms)           startup   wind-up (ms)
//   range     extra reach                  stun / knockdown   hit reaction overrides
//   bothSides hits in front and behind      area      hits around you (range and depth)
//   crit      { chance, mult }             pierce    ignores Harden and other damage reduction
//   onHit(scene, player, enemy, atk)       effect when a hit lands
//   spawn     'seedBomb' | 'rockSlide'     the attack throws something instead of hitting directly
//
// Compatibility per starter line: L = in its learnset, T = thematic fit. Level-up moves are left out.

export const TYPE_TINT = {
  Normal: 0xffffff, Fighting: 0xff9060, Dark: 0x9070d0, Steel: 0xc8d8e8, Ghost: 0xb080ff,
  Bug: 0xb8e040, Grass: 0x9cff6a, Dragon: 0x80a0ff, Electric: 0xffe040, Poison: 0xd070e0,
  Ground: 0xd8b060, Rock: 0xc8a878, Water: 0x60b0ff, Fire: 0xff7040, Ice: 0xa0f0ff, Flying: 0xc0d0ff,
};

const vuln = (amount, ms, maxStacks = 1, key) => (scene, p, e) => e.addVuln(key, amount, ms, maxStacks);

export const MOVES_DEF = {
  // ----- Evolution choices (Treecko line) -----
  furyCutter: { slot: 'light', name: 'FURY CUTTER', type: 'Bug', desc: 'Each light hit landed in a row hits harder' },
  leafBlade: { slot: 'heavy', name: 'LEAF BLADE', type: 'Grass', desc: 'Stronger heavy attack, often critical' },

  // ----- Tutor: light -----
  furySwipes: {
    slot: 'light', name: 'FURY SWIPES', type: 'Normal', lines: { treecko: 'T', torchic: 'T' },
    desc: 'Each light attack is a flurry of 2-5 scratches',
    build: (a) => { a.hits = 2 + Math.floor(Math.random() * 4); a.dmg *= 0.45; a.active = 45 * a.hits; },
  },
  doubleHit: {
    slot: 'light', name: 'DOUBLE HIT', type: 'Normal', lines: { treecko: 'T', mudkip: 'T' },
    desc: 'Every light attack strikes twice',
    build: (a) => { a.hits = 2; a.dmg *= 0.65; a.active = Math.max(a.active, 100); },
  },
  doubleKick: {
    slot: 'light', name: 'DOUBLE KICK', type: 'Fighting', lines: { treecko: 'L' },
    desc: 'Light attacks hit enemies in front and behind',
    build: (a) => { a.bothSides = true; },
  },
  armThrust: {
    slot: 'light', name: 'ARM THRUST', type: 'Fighting', lines: { torchic: 'T' },
    desc: 'Light combo extends to 5 rapid palm strikes', build: (a) => { a.dmg *= 0.8; },
  },
  bulletPunch: {
    slot: 'light', name: 'BULLET PUNCH', type: 'Steel', lines: { torchic: 'T', mudkip: 'T' },
    desc: 'Lightning-fast jab that interrupts enemy wind-ups',
    build: (a) => { a.startup = 20; a.interrupt = true; },
  },
  machPunch: {
    slot: 'light', name: 'MACH PUNCH', type: 'Fighting', lines: { torchic: 'T' },
    desc: 'Light opener is a dash-jab that closes distance', build: (a, n) => { if (n === 'light1') a.dash = 160; },
  },
  aquaJet: {
    slot: 'light', name: 'AQUA JET', type: 'Water', lines: { mudkip: 'T' },
    desc: 'Light finisher dashes straight through enemies', build: (a, n) => { if (n === 'light3') a.dash = 220; },
  },
  bite: {
    slot: 'light', name: 'BITE', type: 'Dark', lines: { treecko: 'T', mudkip: 'L' },
    desc: 'Light hits make enemies flinch for longer', build: (a) => { a.stun = (a.stun || 250) + 300; },
  },
  rockSmash: {
    slot: 'light', name: 'ROCK SMASH', type: 'Fighting', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Light hits lower defence (enemies take +10% per stack, up to 3)',
    onHit: vuln(0.1, 6000, 3, 'rockSmash'),
  },
  powerUpPunch: {
    slot: 'light', name: 'POWER-UP PUNCH', type: 'Fighting', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Each light hit landed raises your attack +6% (up to 5) for a while',
    onHit: (scene, p) => p.addPowerStack(),
  },
  flameCharge: {
    slot: 'light', name: 'FLAME CHARGE', type: 'Fire', lines: { torchic: 'L' },
    desc: 'Light finisher dashes and boosts your speed', build: (a, n) => { if (n === 'light3') { a.dash = 200; a.speedBoost = 2500; } },
  },
  shadowClaw: {
    slot: 'light', name: 'SHADOW CLAW', type: 'Ghost', lines: { treecko: 'T', torchic: 'L' },
    desc: 'Light hits have a 25% critical chance (1.5x)', build: (a) => { a.crit = { chance: 0.25, mult: 1.5 }; },
  },

  // ----- Tutor: heavy -----
  headbutt: {
    slot: 'heavy', name: 'HEADBUTT', type: 'Normal', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Heavy makes the target flinch for a long stun instead of knocking it down',
    build: (a) => { a.knockdown = false; a.stun = 1100; a.push = 30; a.dmg *= 1.15; },
  },
  crunch: {
    slot: 'heavy', name: 'CRUNCH', type: 'Dark', lines: { treecko: 'L', mudkip: 'T' },
    desc: 'Heavy lowers defence: the target takes +25% damage for 6s', onHit: vuln(0.25, 6000, 1, 'crunch'),
  },
  waveCrash: {
    slot: 'heavy', name: 'WAVE CRASH', type: 'Water', lines: { mudkip: 'T' },
    desc: 'Huge dashing lunge; you take 1/3 of the damage as recoil',
    build: (a) => { a.dmg *= 1.8; a.dash = 260; a.recoil = 1 / 3; },
  },
  brickBreak: {
    slot: 'heavy', name: 'BRICK BREAK', type: 'Fighting', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Smashes through Harden and other damage reduction', build: (a) => { a.pierce = true; a.dmg *= 1.1; },
  },
  ironTail: {
    slot: 'heavy', name: 'IRON TAIL', type: 'Steel', lines: { treecko: 'L', mudkip: 'L' },
    desc: 'Spinning tail sweep that hits both sides', build: (a) => { a.bothSides = true; a.range += 4; },
  },
  dragonClaw: {
    slot: 'heavy', name: 'DRAGON CLAW', type: 'Dragon', lines: { treecko: 'L' },
    desc: 'Long-reach slash', build: (a) => { a.range += 16; a.slashScale = 2.1; a.dmg *= 1.1; },
  },
  bodySlam: {
    slot: 'heavy', name: 'BODY SLAM', type: 'Normal', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Slam with a shockwave around you; can slow (paralyse) enemies',
    build: (a) => { a.area = true; a.range = 30; a.depth = 14; },
    onHit: (scene, p, e) => { if (Math.random() < 0.3) e.slowFor(3000); },
  },
  seedBomb: {
    slot: 'heavy', name: 'SEED BOMB', type: 'Grass', lines: { treecko: 'L' },
    desc: 'Lobs a seed that explodes where it lands', build: (a) => { a.spawn = 'seedBomb'; },
  },
  xScissor: {
    slot: 'heavy', name: 'X-SCISSOR', type: 'Bug', lines: { treecko: 'L' },
    desc: 'Cross slash that hits twice', build: (a) => { a.hits = 2; a.dmg *= 0.65; a.active = 140; },
  },
  poisonJab: {
    slot: 'heavy', name: 'POISON JAB', type: 'Poison', lines: { torchic: 'L', mudkip: 'L' },
    desc: 'Poisons the target: damage over time', onHit: (scene, p, e, a) => e.poison(a.dmg * 0.6, 4000),
  },
  thunderPunch: {
    slot: 'heavy', name: 'THUNDER PUNCH', type: 'Electric', lines: { treecko: 'L', torchic: 'L' },
    desc: 'A spark jumps to another nearby enemy', onHit: (scene, p, e, a) => scene.chainSpark(e, a.dmg * 0.5),
  },
  icePunch: {
    slot: 'heavy', name: 'ICE PUNCH', type: 'Ice', lines: { mudkip: 'L' },
    desc: 'Freezes the target solid for a moment', build: (a) => { a.knockdown = false; a.stun = 1400; a.freeze = true; },
  },
  waterfall: {
    slot: 'heavy', name: 'WATERFALL', type: 'Water', lines: { mudkip: 'L' }, desc: 'Rising uppercut that launches the target',
    build: (a) => { a.launchHigh = true; },
  },
  bulldoze: {
    slot: 'heavy', name: 'BULLDOZE', type: 'Ground', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Stomp shockwave hits everything nearby and slows it',
    build: (a) => { a.area = true; a.range = 40; a.depth = 16; a.knockdown = false; a.stun = 400; a.dmg *= 0.8; },
    onHit: (scene, p, e) => e.slowFor(3000),
  },
  superpower: {
    slot: 'heavy', name: 'SUPERPOWER', type: 'Fighting', lines: { torchic: 'L', mudkip: 'L' },
    desc: 'Massive hit, then your attack drops for a while', build: (a) => { a.dmg *= 2; a.selfDrop = 'atk'; },
  },
  braveBird: {
    slot: 'heavy', name: 'BRAVE BIRD', type: 'Flying', lines: { torchic: 'L' },
    desc: 'Diving lunge; heavy recoil', build: (a) => { a.dmg *= 1.9; a.dash = 240; a.recoil = 1 / 3; },
  },
  closeCombat: {
    slot: 'heavy', name: 'CLOSE COMBAT', type: 'Fighting', lines: { torchic: 'L' },
    desc: 'Flurry of blows, then you take more damage for a while',
    build: (a) => { a.hits = 4; a.dmg *= 0.55; a.active = 220; a.selfDrop = 'def'; },
  },
  hammerArm: {
    slot: 'heavy', name: 'HAMMER ARM', type: 'Fighting', lines: { mudkip: 'L' },
    desc: 'Enormous overhead smash, then you move slower', build: (a) => { a.dmg *= 1.7; a.startup += 120; a.selfDrop = 'spe'; },
  },
  drainPunch: {
    slot: 'heavy', name: 'DRAIN PUNCH', type: 'Fighting', lines: { treecko: 'L' },
    desc: 'Heals you for 40% of the damage dealt', onHit: (scene, p, e, a) => p.healFlat(a.dmg * 0.4),
  },
  rockSlide: {
    slot: 'heavy', name: 'ROCK SLIDE', type: 'Rock', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Rocks fall on a strip in front of you', build: (a) => { a.spawn = 'rockSlide'; },
  },
  focusPunch: {
    slot: 'heavy', name: 'FOCUS PUNCH', type: 'Fighting', lines: { treecko: 'L', torchic: 'L', mudkip: 'L' },
    desc: 'Charge up, then a huge hit. Getting hit while charging cancels it',
    build: (a) => { a.startup = 650; a.dmg *= 2.6; a.focus = true; a.slashScale = 2; },
  },
};

export const LINE_OF = {
  treecko: 'treecko', grovyle: 'treecko', sceptile: 'treecko',
  torchic: 'torchic', combusken: 'torchic', blaziken: 'torchic',
  mudkip: 'mudkip', marshtomp: 'mudkip', swampert: 'mudkip',
};

// Moves a tutor can offer this form for a slot (not already known)
export function tutorPool(form, slot, current) {
  const line = LINE_OF[form];
  return Object.entries(MOVES_DEF)
    .filter(([id, m]) => m.slot === slot && m.lines && m.lines[line] && id !== current)
    .map(([id]) => id);
}

// Pick a slot (leaning to the one not upgraded yet) and a random compatible move
export function rollTutorOffer(player) {
  const { light, heavy } = player.upgrades;
  let pHeavy = 0.5;
  if (light && !heavy) pHeavy = 0.8;
  if (heavy && !light) pHeavy = 0.2;
  let slot = Math.random() < pHeavy ? 'heavy' : 'light';
  let pool = tutorPool(player.form, slot, player.upgrades[slot]);
  if (!pool.length) {
    slot = slot === 'heavy' ? 'light' : 'heavy';
    pool = tutorPool(player.form, slot, player.upgrades[slot]);
  }
  if (!pool.length) return null;
  return { slot, move: pool[Math.floor(Math.random() * pool.length)] };
}
