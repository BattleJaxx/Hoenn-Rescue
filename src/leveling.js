// Levels, stats and EXP, using Emerald's (Gen 3) formulas and the base stats from pokeemerald-expansion.

// Base stats and EXP yields (Gen 3 values)
export const SPECIES = {
  treecko:   { name: 'TREECKO',   hp: 40, atk: 45, spa: 65,  exp: 65,  growth: 'mediumSlow' },
  grovyle:   { name: 'GROVYLE',   hp: 50, atk: 65, spa: 85,  exp: 141, growth: 'mediumSlow' },
  sceptile:  { name: 'SCEPTILE',  hp: 70, atk: 85, spa: 105, exp: 265, growth: 'mediumSlow' },
  poochyena: { name: 'POOCHYENA', hp: 35, atk: 55, spa: 30,  exp: 56 },
  wurmple:   { name: 'WURMPLE',   hp: 45, atk: 45, spa: 20,  exp: 56 },
  shroomish: { name: 'SHROOMISH', hp: 60, atk: 40, spa: 40,  exp: 65 },
  silcoon:   { name: 'SILCOON',   hp: 50, atk: 35, spa: 25,  exp: 71 },
};

// Evolution line and the level each form is reached at (mainline levels)
export const EVOLUTIONS = {
  treecko: { into: 'grovyle', level: 16 },
  grovyle: { into: 'sceptile', level: 36 },
};

export const START_LEVEL = 5;   // starters begin at Lv5, as in the mainline games
export const MAX_LEVEL = 100;
const IV = 15;                  // average individual value, no EVs, neutral nature

// Gen 3 stat formulas
export const hpStat = (base, L) => Math.floor(((2 * base + IV) * L) / 100) + L + 10;
export const otherStat = (base, L) => Math.floor(((2 * base + IV) * L) / 100) + 5;

// Total EXP needed to reach a level
export function expForLevel(L, growth = 'mediumSlow') {
  if (L <= 1) return 0;
  if (growth === 'mediumSlow') return Math.max(0, Math.floor(1.2 * L ** 3 - 15 * L ** 2 + 100 * L - 140));
  return L ** 3; // medium fast
}

// EXP for knocking out a Pokémon (Gen 3): base yield x level / 7, x1.5 if it belongs to a trainer
export function expYield(species, level, trainer) {
  const base = Math.floor((SPECIES[species].exp * level) / 7);
  return Math.floor(base * (trainer ? 1.5 : 1));
}

// In-game numbers are scaled from the real stats so a Lv5 Treecko matches Milestone 1's tuning:
// max HP = HP stat x 5, damage multiplier = Attack (or Sp. Atk) relative to Lv5 Treecko's.
export const HP_SCALE = 5;
const REF_ATK = otherStat(SPECIES.treecko.atk, START_LEVEL);
const REF_SPA = otherStat(SPECIES.treecko.spa, START_LEVEL);

export function playerStats(form, L) {
  const s = SPECIES[form];
  return {
    maxHp: hpStat(s.hp, L) * HP_SCALE,
    atkMult: otherStat(s.atk, L) / REF_ATK,
    spaMult: otherStat(s.spa, L) / REF_SPA,
  };
}

// Enemies: their config numbers are tuned for Lv5; scale HP and damage by their own stats at their level
export function enemyScale(species, L) {
  const s = SPECIES[species];
  return {
    hp: hpStat(s.hp, L) / hpStat(s.hp, 5),
    dmg: otherStat(s.atk, L) / otherStat(s.atk, 5),
  };
}
