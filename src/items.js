// Held items. Each stacks: "first" is the value at 1 stack, "per" is added for each extra stack.
// value(n) = first + per * (n - 1)
//
// Effects are applied where the game needs them (see `effects` helpers below):
// combat damage in fighters.js and game.js, healing on wave clear and KO in game.js.

const pct = (v) => `${Math.round(v * 10) / 10}%`;

export const ITEMS = {
  lucky_egg: {
    name: 'LUCKY EGG', first: 5, per: 5,
    desc: (v) => `+${pct(v)} EXP from knockouts`,
  },
  bright_powder: {
    name: 'BRIGHT POWDER', first: 4, per: 4,
    // Hyperbolic so it can never reach 100%: 1 - 1/(1 + v/100)
    desc: (v) => `${pct(100 * (1 - 1 / (1 + v / 100)))} chance a hit on you misses`,
  },
  macho_brace: {
    name: 'MACHO BRACE', first: 1, per: 1, speedFirst: 4, speedPer: 4,
    desc: (v, n) => `-${pct(100 * (1 - Math.pow(0.96, n)))} speed, +${pct(v)} damage, defence and max HP`,
  },
  shell_bell: {
    name: 'SHELL BELL', first: 1, per: 1,
    desc: (v) => `Heal ${pct(v)} of max HP on each knockout`,
  },
  air_balloon: {
    name: 'AIR BALLOON', first: 10, per: 5,
    desc: (v) => `Jumps last ${pct(v)} longer`,
  },
  expert_belt: {
    name: 'EXPERT BELT', first: 10, per: 10,
    desc: (v) => `Light combo finisher deals +${pct(v)} damage`,
  },
  rocky_helmet: {
    name: 'ROCKY HELMET', first: 2, per: 1,
    desc: (v) => `Blocking an attack deals ${v} damage to the attacker`,
  },
  metal_coat: {
    name: 'METAL COAT', first: 1, per: 1,
    desc: (v) => `Take ${v} less damage from each hit (minimum 1)`,
  },
  clear_amulet: {
    name: 'CLEAR AMULET', first: 10, per: 5,
    desc: (v) => `Stat drops (like String Shot) wear off ${pct(v)} faster`,
  },
  eject_button: {
    name: 'EJECT BUTTON', first: 2, per: 1,
    desc: (v) => `After taking a hit, +100% speed that fades over ${v}s`,
  },
  leftovers: {
    name: 'LEFTOVERS', first: 10, per: 5,
    desc: (v) => `Heal ${pct(v)} of max HP after each grunt battle`,
  },
  wise_glasses: {
    name: 'WISE GLASSES', first: 5, per: 5,
    desc: (v) => `Special deals +${pct(v)} damage`,
  },
};

export const ITEM_IDS = Object.keys(ITEMS);

export function itemValue(id, n) {
  if (!n) return 0;
  const it = ITEMS[id];
  return it.first + it.per * (n - 1);
}

export function itemDesc(id, n) {
  return ITEMS[id].desc(itemValue(id, n), n);
}

// Pick `count` different random items
export function rollItems(count = 2) {
  const pool = [...ITEM_IDS];
  const out = [];
  while (out.length < count && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

// Derived numbers the rest of the game reads. `inv` maps item id -> stack count.
export const effects = {
  xpMult: (inv) => 1 + itemValue('lucky_egg', inv.lucky_egg) / 100,
  missChance: (inv) => {
    const v = itemValue('bright_powder', inv.bright_powder) / 100;
    return 1 - 1 / (1 + v);
  },
  // Macho Brace: speed multiplies down per stack (never reaches zero); other stats up
  machoSpeed: (inv) => Math.pow(1 - ITEMS.macho_brace.speedPer / 100, inv.macho_brace || 0),
  machoStat: (inv) => 1 + itemValue('macho_brace', inv.macho_brace) / 100,
  koHeal: (inv) => itemValue('shell_bell', inv.shell_bell) / 100,
  jumpTime: (inv) => 1 + itemValue('air_balloon', inv.air_balloon) / 100,
  finisherMult: (inv) => 1 + itemValue('expert_belt', inv.expert_belt) / 100,
  thorns: (inv) => itemValue('rocky_helmet', inv.rocky_helmet),
  flatReduce: (inv) => itemValue('metal_coat', inv.metal_coat),
  statDropSpeed: (inv) => 1 + itemValue('clear_amulet', inv.clear_amulet) / 100,
  ejectSeconds: (inv) => itemValue('eject_button', inv.eject_button),
  waveHeal: (inv) => itemValue('leftovers', inv.leftovers) / 100,
  specialMult: (inv) => 1 + itemValue('wise_glasses', inv.wise_glasses) / 100,
};
