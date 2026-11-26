// Stage definitions. Each stage has its own scenery, team, grunt waves, boss, wild table and Ace Trainers.
// Levels follow the plan: Grovyle (Lv16) during stage 2, final evolution before the last stage.

export const STAGES = {
  1: {
    name: 'PETALBURG WOODS',
    bg: { far: 'bg-far', mid: 'bg-trunks', ground: 'ground', fg: 'fg-bush' },
    ash: false,
    grunt: {
      texture: 'aqua_grunt',
      taunts: ['Go, POOCHYENA!', 'Team Aqua, attack!', 'Get that kid!', "You won't pass!"],
      defeats: ['Tch! Retreat!', 'No way!', "I'll remember this!", 'Grr... fall back!'],
    },
    // Each grunt wave: who attacks and at what level. The last one adds the boss.
    waves: [
      { at: 170, level: 7, mons: ['poochyena', 'poochyena'] },
      { at: 560, level: 8, mons: ['poochyena', 'poochyena', 'poochyena'] },
      {
        at: 960, level: 9, mons: ['poochyena', 'poochyena'],
        boss: { species: 'poochyena', level: 12, trainer: 'AQUA GRUNT', line: 'Go, my POOCHYENA!' },
      },
    ],
    wild: {
      levels: [5, 6],
      table: [
        { species: 'poochyena', weight: 30 },
        { species: 'wurmple', weight: 25 },
        { species: 'shroomish', weight: 15 },
        { species: 'silcoon', weight: 10 },
      ],
    },
    aces: [
      { pokemon: 'shedinja', level: 12, line: 'My SHEDINJA can only be hurt from behind!' },
      { pokemon: 'smeargle', level: 11, line: 'SMEARGLE copies everything you do!' },
      { pokemon: 'spinda', level: 11, line: "Can you keep up with SPINDA's dance?" },
    ],
    slots: [365, 760],
  },

  2: {
    name: 'MT. CHIMNEY',
    bg: { far: 'mc-far', mid: 'mc-mid', ground: 'mc-ground', fg: 'mc-fg' },
    ash: true,
    grunt: {
      texture: 'magma_grunt',
      taunts: ['Team Magma will expand the land!', 'Burn them, NUMEL!', 'Out of our way!', "You're in Magma territory!"],
      defeats: ['Too hot to handle...', 'Retreat! Retreat!', "Tabitha won't like this...", 'Ugh, fall back!'],
    },
    waves: [
      { at: 170, level: 15, mons: ['numel', 'poochyena'] },
      { at: 560, level: 16, mons: ['zubat', 'numel', 'poochyena'] },
      {
        at: 960, level: 17, mons: ['zubat', 'numel'],
        boss: { species: 'camerupt', level: 21, trainer: 'TABITHA', line: "TABITHA: Hehehe! CAMERUPT, erupt!" },
      },
    ],
    // Fiery Path encounter table from pokeemerald-expansion
    wild: {
      levels: [14, 16],
      table: [
        { species: 'numel', weight: 30 },
        { species: 'koffing', weight: 25 },
        { species: 'torkoal', weight: 18 },
        { species: 'machop', weight: 15 },
        { species: 'slugma', weight: 10 },
        { species: 'grimer', weight: 2 },
      ],
    },
    aces: [
      { pokemon: 'kecleon', level: 20, line: 'Can you even see my KECLEON?' },
      { pokemon: 'sableye', level: 19, line: "SABLEYE loves shiny things. Like yours!" },
      { pokemon: 'torkoal_ace', level: 20, line: "TORKOAL's shell and smoke will stop you cold!" },
    ],
    slots: [365, 760],
  },
};

export const LAST_STAGE = 2;

// What carries between stages in a run
export const run = { carry: null };
