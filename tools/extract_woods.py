"""Cut stage-art pieces out of the Petalburg Woods tilesets in pokeemerald-expansion.

Usage: python3 tools/extract_woods.py <path-to-pokeemerald-expansion> <out-dir>

Petalburg Woods uses the General (primary) + Rustboro (secondary) tilesets.
Each 16x16 metatile has a bottom and a top layer of 8x8 tiles. Objects drawn on
the top layer cut out cleanly; objects on the bottom layer have the plain grass
colours keyed out to transparency.
"""
import os
import struct
import sys
from PIL import Image, ImageDraw, ImageFont

DECOMP, OUT = sys.argv[1], sys.argv[2]
TS = os.path.join(DECOMP, 'data', 'tilesets')
NUM_PRIMARY_TILES = 512
NUM_PRIMARY_METATILES = 512


def read_pal(path):
    v = open(path).read().split()
    return [tuple(map(int, v[3 + i * 3:6 + i * 3])) for i in range(int(v[2]))]


def load(ts):
    tiles = Image.open(os.path.join(TS, ts, 'tiles.png'))
    raw = open(os.path.join(TS, ts, 'metatiles.bin'), 'rb').read()
    mts = [struct.unpack('<8H', raw[i:i + 16]) for i in range(0, len(raw), 16)]
    pals = [read_pal(os.path.join(TS, ts, 'palettes', f'{i:02d}.pal')) for i in range(16)]
    return tiles, mts, pals


P_TILES, P_MT, P_PAL = load('primary/general')
S_TILES, S_MT, S_PAL = load('secondary/rustboro')
PALS = P_PAL[:6] + S_PAL[6:13] + P_PAL[13:16]   # Emerald: 6 primary + 7 secondary palettes


def tile(idx):
    t, i = (P_TILES, idx) if idx < NUM_PRIMARY_TILES else (S_TILES, idx - NUM_PRIMARY_TILES)
    w = t.width // 8
    return t.crop(((i % w) * 8, (i // w) * 8, (i % w) * 8 + 8, (i // w) * 8 + 8))


def metatile(mid, layers=(0, 1)):
    m = P_MT[mid] if mid < NUM_PRIMARY_METATILES else S_MT[mid - NUM_PRIMARY_METATILES]
    img = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = img.load()
    for layer in layers:
        for k in range(4):
            e = m[layer * 4 + k]
            t = tile(e & 0x3FF)
            if e & 0x400:
                t = t.transpose(Image.FLIP_LEFT_RIGHT)
            if e & 0x800:
                t = t.transpose(Image.FLIP_TOP_BOTTOM)
            pal = PALS[e >> 12]
            tp = t.load()
            ox, oy = (k % 2) * 8, (k // 2) * 8
            for y in range(8):
                for x in range(8):
                    c = tp[x, y]
                    if c:
                        px[ox + x, oy + y] = pal[c] + (255,)
    return img


GRASS = set()
for g in (1, 517):
    GRASS |= set(metatile(g).getdata())


def build(grid, layers=(0, 1), key=False):
    """Assemble a grid of metatile ids (None = empty). key=True removes plain grass."""
    h, w = len(grid), len(grid[0])
    img = Image.new('RGBA', (w * 16, h * 16), (0, 0, 0, 0))
    for r, row in enumerate(grid):
        for c, mid in enumerate(row):
            if mid is not None:
                img.alpha_composite(metatile(mid, layers), (c * 16, r * 16))
    if key:
        img.putdata([(0, 0, 0, 0) if p in GRASS else p for p in img.getdata()])
    return img


TOP = (1,)

# (folder, name, grid, layers, key grass, description)
PIECES = [
    # Trees and foliage
    ('objects', 'tree', [[462, 463], [470, 471], [486, 487]], (0, 1), True, 'Single Petalburg Woods tree with its ground shadow'),
    ('objects', 'bush_round_a', [[14]], TOP, False, 'Small round bush'),
    ('objects', 'bush_round_b', [[15]], TOP, False, 'Small round bush, variant'),
    ('objects', 'shrub', [[29]], TOP, False, 'Leafy shrub'),
    ('objects', 'bush_dark_a', [[198]], TOP, False, 'Dense dark bush'),
    ('objects', 'bush_dark_b', [[199]], TOP, False, 'Dense dark bush, variant'),
    ('objects', 'tall_grass', [[13]], (0, 1), True, 'Tall grass tuft (wild Pokémon grass)'),
    ('objects', 'tall_grass_patch', [[13, 13, 13], [13, 13, 13]], (0, 1), True, 'Patch of tall grass'),
    ('objects', 'flowers', [[4]], TOP, True, 'Red flowers'),
    ('objects', 'foliage_slope', [[30, 31]], TOP, False, 'Sloped foliage pieces'),
    ('objects', 'foliage_slope_b', [[46, 47]], TOP, False, 'Sloped foliage pieces, variant'),
    # Ledges, fences, props
    ('objects', 'ledge', [[213, 135, 135, 214]], TOP, False, 'One-way ledge, ends + middle'),
    ('objects', 'ledge_left_end', [[213]], TOP, False, 'Ledge left end'),
    ('objects', 'ledge_middle', [[135]], TOP, False, 'Ledge middle (repeat for any length)'),
    ('objects', 'ledge_right_end', [[214]], TOP, False, 'Ledge right end'),
    ('objects', 'fence', [[329, 329]], TOP, False, 'Fence posts (repeatable)'),
    ('objects', 'sign', [[27]], TOP, False, 'Wooden route sign'),
    ('objects', 'boulder', [[197]], TOP, False, 'Grey boulder'),
    # Forest walls: repeat left-right for background layers
    ('strips', 'forest_canopy', [[468, 469], [476, 477]], (0, 1), False, 'Dense canopy, tiles seamlessly in every direction'),
    ('strips', 'forest_wall_bottom_edge', [[468, 469], [476, 477], [468, 469], [476, 477], [484, 485]], (0, 1), True, 'Wall of trees whose bases meet the ground (grass keyed out)'),
    ('strips', 'forest_wall_top_edge', [[462, 463], [470, 471], [476, 477], [468, 469], [476, 477]], (0, 1), True, 'Wall of trees with treetops poking up at the top'),
    # Ground textures (opaque, tile in every direction)
    ('ground', 'grass', [[1]], (0, 1), False, 'Plain woods grass'),
    ('ground', 'grass_plain', [[517]], (0, 1), False, 'Plain grass, alternate'),
    ('ground', 'gravel', [[515]], (0, 1), False, 'Pale gravel path (woods entrance)'),
    ('ground', 'gravel_b', [[516]], (0, 1), False, 'Pale gravel path, variant'),
    ('ground', 'tall_grass_ground', [[13]], (0, 1), False, 'Tall grass with ground behind it'),
]


def contact_sheet(rows, path):
    font = ImageFont.load_default(size=13)
    z = 4
    pad = 14
    x, y, line_h = pad, 40, 0
    width = 1200
    placed = []
    for folder, name, img, desc in rows:
        w, h = img.width * z, img.height * z
        if x + max(w, 250) > width - pad:
            x = pad
            y += line_h + 44
            line_h = 0
        placed.append((x, y, folder, name, img))
        x += max(w, 250) + pad
        line_h = max(line_h, h)
    sheet = Image.new('RGBA', (width, y + line_h + 20), (58, 46, 72, 255))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 10), 'Petalburg Woods pieces (shown 4x; purple = transparent)', font=font, fill=(255, 230, 120))
    for x, y, folder, name, img in placed:
        d.text((x, y - 18), f'{folder}/{name} {img.width}x{img.height}', font=font, fill=(255, 255, 255))
        sheet.alpha_composite(img.resize((img.width * z, img.height * z), Image.NEAREST), (x, y))
    sheet.save(path)


if __name__ == '__main__':
    rows = []
    for folder, name, grid, layers, key, desc in PIECES:
        os.makedirs(os.path.join(OUT, folder), exist_ok=True)
        img = build(grid, layers, key)
        img.save(os.path.join(OUT, folder, f'{name}.png'))
        rows.append((folder, name, img, desc))
    contact_sheet(rows, os.path.join(OUT, 'contact_sheet.png'))
    print(f'{len(rows)} pieces written to {OUT}')
