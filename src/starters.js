// The three Hoenn starters. Each line has its own special, its Lv16 move choice and its Lv36 special upgrade.
// Stats come from the Gen 3 base stats in leveling.js; `speed` scales walking speed (Treecko's line is fastest).

export const STARTERS = {
  treecko: {
    forms: ['treecko', 'grovyle', 'sceptile'],
    speed: 1,
    special: 'bulletSeed',
    special2: 'leafStorm',
    choice: { light: 'furyCutter', heavy: 'leafBlade' },
    blurb: 'Fast. SPECIAL: BULLET SEED',
    upgradeText: "BULLET SEED became LEAF STORM!\nA wide volley of leaves, then Sp. Atk drops for a while.",
  },
  torchic: {
    forms: ['torchic', 'combusken', 'blaziken'],
    speed: 0.95,
    special: 'flameCharge',
    special2: 'flareBlitz',
    choice: { light: 'doubleKick', heavy: 'blazeKick' },
    blurb: 'Hard-hitting. SPECIAL: FLAME CHARGE',
    upgradeText: "FLAME CHARGE became FLARE BLITZ!\nA longer, stronger charge that burns.",
  },
  mudkip: {
    forms: ['mudkip', 'marshtomp', 'swampert'],
    speed: 0.9,
    special: 'waterPulse',
    special2: 'surf',
    choice: { light: 'mudSlap', heavy: 'takeDown' },
    blurb: 'Tough. SPECIAL: WATER PULSE',
    upgradeText: "WATER PULSE became SURF!\nA wave that crashes through every enemy.",
  },
};

export const STARTER_IDS = ['treecko', 'torchic', 'mudkip'];

export const lineOf = (form) => STARTER_IDS.find((id) => STARTERS[id].forms.includes(form)) || 'treecko';

// Special moves: tuning numbers (damage is multiplied by the player's Attack or Sp. Atk)
export const SPECIALS = {
  bulletSeed: { name: 'BULLET SEED', stat: 'spa' },
  leafStorm: { name: 'LEAF STORM', stat: 'spa' },
  waterPulse: { name: 'WATER PULSE', stat: 'spa', orbs: 3, dmg: 7, speed: 200, life: 0.8, spread: 12 },
  surf: { name: 'SURF', stat: 'spa', dmg: 22, speed: 240 },
  flameCharge: { name: 'FLAME CHARGE', stat: 'atk', dmg: 12, windup: 90, dash: 200, dashSpeed: 380, recovery: 200, speedBoost: 2500 },
  flareBlitz: { name: 'FLARE BLITZ', stat: 'atk', dmg: 24, windup: 110, dash: 280, dashSpeed: 430, recovery: 260, burn: 0.4 },
};
