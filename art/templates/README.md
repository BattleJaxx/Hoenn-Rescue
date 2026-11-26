# Art templates

Each `.png` here is an editable template at real pixel size. It's pre-filled with what the game currently uses, so you can paint over it. The `guides/` folder has an enlarged, labelled copy of each one to keep open next to it while you draw.

The game doesn't load these files yet. Once some frames are drawn, the code will be wired up to use them.

## Rules for all sprites

- **Palette:** keep each Pokémon to its follower palette (15 colours plus transparent) so it stays Emerald-authentic.
- **Facing:** draw everything facing **left**, like Emerald's side frames. The game flips them for right.
- **Scale:** sprites are drawn at 2x in the game, so 1 pixel here is 2 screen pixels.
- **Transparency:** the background must be fully transparent (alpha 0).

## Stage map (Petalburg Woods)

The stage isn't tile-based. Like classic arcade beat 'em ups, it's built from horizontal strips that repeat left-right and scroll at different speeds (parallax). Each strip's left and right edges must line up so the repeat is seamless. Each guide shows the strip twice so you can check the seam.

| File | Size | Scroll speed | Notes |
| --- | --- | --- | --- |
| `bg_far.png` | 256x110 | 0.2x | Back canopy and light. Fully opaque. |
| `bg_trunks.png` | 192x120 | 0.55x | Tree trunks. Transparent areas show `bg_far`. Bottom sits at screen y 106. |
| `ground.png` | 64x76 | 1x | Grass bank and path. Fighters' feet walk from strip row 12 to row 70 (screen y 110–168). Starts at screen y 98. |
| `fg_bush.png` | 160x24 | 1.3x | Drawn in front of the fighters along the bottom edge (screen y 156–180). Keep it low and sparse so it doesn't hide feet on the front lane (y 168). |

`guides/stage_layers_guide.png` shows how the layers stack on the 320x180 screen.

## Treecko: `treecko_actions.png` (192x480)

Every frame is a **48x32 cell**. The feet always touch **row 30** at **column 24**: the red and blue lines in the guide. Extra width is room for lunges and kicks. Empty cells to the right of a row are unused.

| Row | Animation | Frames | Timing | Hit reach |
| --- | --- | --- | --- | --- |
| 0 | idle | idle 1, idle 2 | loops | |
| 1 | walk | step A, step B | 130 ms each | |
| 2 | light1 (combo hit 1) | wind-up, HIT, recover | 50 / 70 / 130 ms | 12 px |
| 3 | light2 (combo hit 2) | wind-up, HIT, recover | 50 / 70 / 140 ms | 12 px |
| 4 | light3 (combo finisher) | wind-up, HIT, recover | 80 / 90 / 260 ms | 13 px |
| 5 | heavy | wind-up 1, wind-up 2, HIT, recover | 110+110 / 100 / 320 ms | 14 px |
| 6 | jump | rising, falling | while airborne | |
| 7 | jump_light (air kick) | air kick | until landing | 11 px |
| 8 | jump_heavy (air smash) | air smash | until landing | 12 px |
| 9 | special (Bullet Seed) | charge, fire A, fire B | 90 ms, then A/B per seed | projectile |
| 10 | block | guard | held | |
| 11 | hurt | hit | ~260 ms | |
| 12 | launched | airborne | knocked flying | |
| 13 | down | lying | 650 ms | |
| 14 | getup | getting up | 260 ms | |

**Hit reach** is how far in front of the feet the attack connects (green line in the guide). Make the HIT frame visibly reach that line.

## Poochyena: `poochyena_actions.png` (96x288)

Same 48x32 cells and feet point.

| Row | Animation | Frames | Timing | Hit reach |
| --- | --- | --- | --- | --- |
| 0 | idle | idle 1, idle 2 | loops | |
| 1 | walk | step A, step B | 130 ms each | |
| 2 | bite_windup | crouch 1, crouch 2 | 380 ms (flashes yellow) | |
| 3 | bite | lunge, BITE | 190 ms dash | 8 px |
| 4 | recover | recover | 520 ms | |
| 5 | hurt | hit | ~300 ms | |
| 6 | launched | airborne | knocked flying | |
| 7 | down | lying | 650 ms | |
| 8 | getup | getting up | 260 ms | |

## Grovyle: `grovyle_actions.png` (192x480)

Same 48x32 cells, feet point and rows as Treecko. Two rows also serve the move upgrade chosen on evolving:

- **Rows 2–4 (light combo):** used for Fury Cutter too. The game tints the slash green.
- **Row 5 (heavy):** used for Leaf Blade too. It's worth showing the arm blades in the HIT frame.
- **Row 9 (special):** still Bullet Seed.

## Sceptile: `sceptile_actions.png` (256x600)

Sceptile is much bigger, so its cells are **64x40**, with the feet on **row 38 at column 32**. The rows are the same as Treecko's, except row 9:

| Row | Animation | Frames | Timing |
| --- | --- | --- | --- |
| 9 | special (Leaf Storm) | charge, release, follow-through | 120 ms charge, the volley fires, then held ~500 ms |

## Wild Pokémon

All use 48x32 cells with the feet on row 30 at column 24.

### Wurmple: `wurmple_actions.png` (96x352)

| Row | Animation | Frames | Timing | Hit reach |
| --- | --- | --- | --- | --- |
| 0 | idle | idle 1, idle 2 | loops | |
| 1 | walk | crawl A, crawl B | 130 ms each | |
| 2 | string_windup | rear up 1, rear up 2 | 450 ms total (flashes yellow) | |
| 3 | string_shot | spit | the thread fires; held through the 650 ms recovery | projectile |
| 4 | tackle_windup | coil | 300 ms (flashes yellow) | |
| 5 | tackle | lunge, HIT | 160 ms dash | 7 px |
| 6 | recover | recover | 650 ms | |
| 7 | hurt | hit | ~250 ms | |
| 8 | launched | airborne | knocked flying | |
| 9 | down | lying | 650 ms | |
| 10 | getup | getting up | 260 ms | |

### Shroomish: `shroomish_actions.png` (96x256)

| Row | Animation | Frames | Timing |
| --- | --- | --- | --- |
| 0 | idle | idle 1, idle 2 | loops |
| 1 | walk | waddle A, waddle B | slow, 130 ms each |
| 2 | spore_windup | shiver 1, shiver 2 | 550 ms (flashes yellow) |
| 3 | spore_puff | puff | the cloud is released (~300 ms) |
| 4 | hurt | hit | ~250 ms |
| 5 | launched | airborne | knocked flying |
| 6 | down | lying | 650 ms |
| 7 | getup | getting up | 260 ms |

### Silcoon: `silcoon_actions.png` (96x288)

Silcoon never walks, so it has a hop for jumping out of the grass instead.

| Row | Animation | Frames | Timing | Hit reach |
| --- | --- | --- | --- | --- |
| 0 | idle | idle 1, idle 2 | loops | |
| 1 | hop | hop | jumping out of the tall grass | |
| 2 | slam_windup | tense 1, tense 2 | 650 ms (flashes yellow) | |
| 3 | slam_air | airborne | short hop | |
| 4 | slam_land | SLAM | ~200 ms on landing | 12 px, on **both** sides |
| 5 | hurt | hit | ~250 ms | |
| 6 | launched | airborne | knocked flying | |
| 7 | down | lying | 650 ms | |
| 8 | getup | getting up | 260 ms | |

## Effects: `effects/`

| File | Size | Use |
| --- | --- | --- |
| `slash.png` | 16x20 | Swipe arc on strikes (faces right) |
| `spark.png` | 13x13 | Impact star |
| `seed.png` | 6x4 | Bullet Seed projectile (faces right) |
| `shadow.png` | 20x6 | Shadow under fighters (semi-transparent) |
| `go_arrow.png` | 16x13 | "GO" arrow after a wave |

## Regenerating

`python3 tools/make_templates.py <exported-textures-dir> art/templates all` rebuilds everything from the current game art, which overwrites painted templates. To build only some sheets, name them instead of `all`, e.g. `... art/templates wurmple_actions`.
