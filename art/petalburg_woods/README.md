# Petalburg Woods pieces

These pieces are cut from the tilesets Petalburg Woods uses in pokeemerald-expansion (General + Rustboro), with original colours and 1x pixel size. `contact_sheet.png` previews them all at 4x.

Emerald draws the overworld from above at a slight angle. Trees, bushes, signs and fences read fine from the side, but ledges and ground textures are top-down. For a side-on brawler they work best as path details or background pieces.

Regenerate with `python3 tools/extract_woods.py <pokeemerald-expansion> art/petalburg_woods`.

## objects/: transparent, place anywhere

| File | Size | Notes |
| --- | --- | --- |
| `tree.png` | 32x48 | Single woods tree with its ground shadow |
| `bush_round_a.png`, `bush_round_b.png` | 16x16 | Small round bushes |
| `shrub.png` | 16x16 | Leafy shrub |
| `bush_dark_a.png`, `bush_dark_b.png` | 16x16 | Dense dark bushes |
| `tall_grass.png` | 16x16 | Tall grass tuft (ground colour removed) |
| `tall_grass_patch.png` | 48x32 | 3x2 patch of tall grass |
| `flowers.png` | 16x16 | Red flowers |
| `foliage_slope.png`, `foliage_slope_b.png` | 32x16 | Low mounds of foliage |
| `ledge.png` | 64x16 | Ledge assembled from the three pieces below |
| `ledge_left_end.png`, `ledge_middle.png`, `ledge_right_end.png` | 16x16 each | Repeat the middle for any length |
| `fence.png` | 32x16 | Fence posts, repeatable |
| `sign.png` | 16x16 | Wooden route sign (blank face) |
| `boulder.png` | 16x16 | Grey boulder |

## strips/: repeat left-right for background layers

| File | Size | Notes |
| --- | --- | --- |
| `forest_canopy.png` | 32x32 | Dense canopy. Tiles seamlessly in every direction, so it can fill a whole far layer. |
| `forest_wall_bottom_edge.png` | 32x80 | Stacked trees ending in trunks and shadow, for a tree line behind the path. Transparent below. |
| `forest_wall_top_edge.png` | 32x80 | Stacked trees with treetops poking up. Transparent above. |

## ground/: opaque, tile in every direction

| File | Size | Notes |
| --- | --- | --- |
| `grass.png`, `grass_plain.png` | 16x16 | Woods grass |
| `gravel.png`, `gravel_b.png` | 16x16 | Pale gravel from the woods entrance |
| `tall_grass_ground.png` | 16x16 | Tall grass with ground behind it |

## Scale

In game the fighters are drawn at 2x. These pieces come from the same game as the follower sprites, so drawing them at 2x too keeps everything in proportion: a tree is then 96 px tall next to a 32 px Treecko. At 1x, a tree is only 1.5 times Treecko's height on screen.
