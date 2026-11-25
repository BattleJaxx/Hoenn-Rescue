# Hoenn Rescue

An arcade-style Pokémon beat 'em up roguelike for the web, built with [Phaser](https://phaser.io) and art and audio from [pokeemerald-expansion](https://github.com/BattleJaxx/pokeemerald-expansion).

**Current milestone (1):** Treecko fights through a short Petalburg Woods section against three waves of Team Aqua Poochyena.

## Play

- **Phone:** open the GitHub Pages link and turn your phone sideways. Use the on-screen stick and buttons.
- **Keyboard:**

| Action | Keys |
| --- | --- |
| Move | Arrows or WASD |
| Light attack (tap 3x for a combo) | J or Z |
| Heavy attack | K or X |
| Jump (attack in the air for a jump kick) | Space or C |
| Special: Bullet Seed (costs half the blue meter) | L or V |
| Block | Shift or I |
| Start / retry | Enter |

## Develop

```bash
npm install
npm run dev      # local server; also reachable from your phone on the same Wi-Fi
npm run build    # production build into dist/
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

## Layout

| Path | What it holds |
| --- | --- |
| `src/config.js` | All tuning numbers: speeds, attack timings, damage, waves |
| `src/fighters.js` | Treecko (player) and Poochyena (enemy AI) |
| `src/game.js` | Boot, title and game scenes: waves, camera, HUD, hit detection |
| `src/input.js` | Keyboard and touch controls |
| `src/textures.js` | Placeholder Petalburg Woods scenery and hit effects, drawn in code |
| `public/assets/` | Follower sprites converted from pokeemerald-expansion |

## Sprites

Follower sprites come from `graphics/pokemon/<species>/overworld.png` in pokeemerald-expansion, coloured with `overworld_normal.pal`. Each sheet is six 32x32 frames: down ×2, up ×2, side ×2 (facing left).

Attack, hit and knockdown frames are placeholders for now (lunges, flashes and slash effects) until hand-drawn frames are added.
