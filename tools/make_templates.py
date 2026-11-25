"""Build editable art templates (and enlarged guide images) for Hoenn Rescue.

Usage: python3 tools/make_templates.py <exported-textures-dir> <out-dir>

<exported-textures-dir> holds the game's current procedurally drawn images
(bg-far.png, ground.png, slash.png, ...) exported from the running game.
Sprite sheets are built from public/assets/<species>.png follower sprites.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT, OUT = sys.argv[1], sys.argv[2]
G = 4                       # guide zoom
CELL_W, CELL_H = 48, 32     # one animation frame
FEET_X, FEET_Y = 24, 30     # anchor point: centre of the feet
SPRITE_SCALE = 2            # sprites are drawn at 2x in game

FONT = ImageFont.load_default(size=13)
FONT_SMALL = ImageFont.load_default(size=11)

# (animation, frame names, timing note, attack reach in world px or None)
TREECKO = [
    ('idle', ['idle 1', 'idle 2'], 'loops; ~400 ms per frame', None),
    ('walk', ['step A', 'step B'], 'loops; 130 ms per frame', None),
    ('light1', ['wind-up', 'HIT', 'recover'], '50 / 70 / 130 ms', 24),
    ('light2', ['wind-up', 'HIT', 'recover'], '50 / 70 / 140 ms', 24),
    ('light3', ['wind-up', 'HIT', 'recover'], '80 / 90 / 260 ms, knocks down', 26),
    ('heavy', ['wind-up 1', 'wind-up 2', 'HIT', 'recover'], '110+110 / 100 / 320 ms, knocks down', 28),
    ('jump', ['rising', 'falling'], 'while airborne', None),
    ('jump_light', ['air kick'], 'held until landing', 22),
    ('jump_heavy', ['air smash'], 'held until landing, knocks down', 24),
    ('special', ['charge', 'fire A', 'fire B'], 'Bullet Seed: 90 ms, then A/B alternate per seed', None),
    ('block', ['guard'], 'held', None),
    ('hurt', ['hit'], '~260 ms', None),
    ('launched', ['airborne'], 'flying back after a knockdown hit', None),
    ('down', ['lying'], '650 ms', None),
    ('getup', ['getting up'], '260 ms', None),
]

POOCHYENA = [
    ('idle', ['idle 1', 'idle 2'], 'loops', None),
    ('walk', ['step A', 'step B'], 'loops; 130 ms per frame', None),
    ('bite_windup', ['crouch 1', 'crouch 2'], '380 ms total (flashes yellow)', None),
    ('bite', ['lunge', 'BITE'], '190 ms dash', 16),
    ('recover', ['recover'], '520 ms', None),
    ('hurt', ['hit'], '~300 ms', None),
    ('launched', ['airborne'], 'flying back', None),
    ('down', ['lying'], '650 ms', None),
    ('getup', ['getting up'], '260 ms', None),
]


def side_frame(species, n=4):
    sheet = Image.open(os.path.join(ROOT, 'public', 'assets', f'{species}.png')).convert('RGBA')
    return sheet.crop((n * 32, 0, n * 32 + 32, 32))


def base_for(species, anim, i):
    """Starting pixels for a cell: the closest existing follower frame."""
    f = side_frame(species, 5 if (anim == 'walk' and i == 1) else 4)
    if anim == 'down':
        f = f.rotate(90, expand=False)       # lying on its back, as the game fakes it now
    if anim in ('launched', 'getup'):
        f = f.rotate(35 if anim == 'launched' else 45, resample=Image.NEAREST)
    return f


def build_sheet(species, anims, name):
    cols = max(len(a[1]) for a in anims)
    sheet = Image.new('RGBA', (cols * CELL_W, len(anims) * CELL_H), (0, 0, 0, 0))
    for r, (anim, frames, _, _) in enumerate(anims):
        for c in range(len(frames)):
            f = base_for(species, anim, c)
            dy = 0
            if anim in ('down', 'launched', 'getup'):
                bb = f.getbbox()
                dy = (FEET_Y + 1) - bb[3]          # rest the rotated body on the feet line
            sheet.alpha_composite(f, (c * CELL_W + FEET_X - 16, r * CELL_H + dy))
    sheet.save(os.path.join(OUT, f'{name}.png'))

    # Guide: zoomed, labelled, with feet line, centre line and attack reach
    label_w = 300
    cw, ch = CELL_W * G, CELL_H * G
    top = 26
    gimg = Image.new('RGBA', (label_w + cols * cw, len(anims) * (ch + top) + 10), (40, 40, 48, 255))
    d = ImageDraw.Draw(gimg)
    for r, (anim, frames, timing, reach) in enumerate(anims):
        y0 = r * (ch + top) + top
        d.text((10, y0 + 8), f'row {r}: {anim}', font=FONT, fill=(255, 230, 120))
        d.text((10, y0 + 30), timing, font=FONT_SMALL, fill=(210, 210, 210))
        if reach:
            d.text((10, y0 + 50), f'hit reach: {reach // SPRITE_SCALE} px in front', font=FONT_SMALL, fill=(120, 255, 140))
        for c in range(cols):
            x0 = label_w + c * cw
            if c >= len(frames):
                d.rectangle([x0, y0, x0 + cw - 1, y0 + ch - 1], fill=(30, 30, 34))
                continue
            # checkerboard
            for yy in range(CELL_H):
                for xx in range(CELL_W):
                    col = (92, 92, 104) if (xx // 4 + yy // 4) % 2 else (78, 78, 90)
                    d.rectangle([x0 + xx * G, y0 + yy * G, x0 + xx * G + G - 1, y0 + yy * G + G - 1], fill=col)
            cell = sheet.crop((c * CELL_W, r * CELL_H, c * CELL_W + CELL_W, r * CELL_H + CELL_H)).resize((cw, ch), Image.NEAREST)
            gimg.alpha_composite(cell, (x0, y0))
            d.line([x0, y0 + FEET_Y * G, x0 + cw, y0 + FEET_Y * G], fill=(255, 80, 80), width=1)
            d.line([x0 + FEET_X * G, y0, x0 + FEET_X * G, y0 + ch], fill=(90, 160, 255), width=1)
            if reach:
                rx = x0 + (FEET_X - reach // SPRITE_SCALE) * G   # sprites face LEFT in the sheet
                d.line([rx, y0, rx, y0 + ch], fill=(120, 255, 140), width=2)
            d.rectangle([x0, y0, x0 + cw - 1, y0 + ch - 1], outline=(0, 0, 0))
            d.text((x0 + 4, y0 - 18), f'{c}: {frames[c]}', font=FONT_SMALL, fill=(255, 255, 255))
    gimg.save(os.path.join(OUT, 'guides', f'{name}_guide.png'))


def build_layer_guides():
    layers = [
        ('bg_far', 'bg-far', 'Far canopy. Repeats left-right. Scrolls at 0.2x camera speed.'),
        ('bg_trunks', 'bg-trunks', 'Tree trunks. Repeats left-right. Scrolls at 0.55x. Transparent areas show bg_far.'),
        ('ground', 'ground', 'Ground strip. Repeats left-right. Scrolls 1:1. Fighters walk between the red lines.'),
        ('fg_bush', 'fg_bush', 'Foreground bushes. Repeats. Scrolls at 1.3x, drawn in front of fighters.'),
    ]
    for out_name, key, note in layers:
        src = os.path.join(EXPORT, f'{key.replace("_", "-")}.png')
        img = Image.open(src).convert('RGBA')
        img.save(os.path.join(OUT, f'{out_name}.png'))
        w, h = img.size
        z = 3
        twice = Image.new('RGBA', (w * 2, h))
        twice.alpha_composite(img, (0, 0))
        twice.alpha_composite(img, (w, 0))
        big = twice.resize((w * 2 * z, h * z), Image.NEAREST)
        g = Image.new('RGBA', (max(big.width + 20, 760) + (280 if out_name == 'ground' else 0), big.height + 60), (40, 40, 48, 255))
        g.alpha_composite(big, (10, 50))
        d = ImageDraw.Draw(g)
        d.text((10, 6), f'{out_name}.png  ({w}x{h})', font=FONT, fill=(255, 230, 120))
        d.text((10, 26), note + '  Shown twice so you can check the seam (dashed).', font=FONT_SMALL, fill=(220, 220, 220))
        for y in range(50, 50 + big.height, 8):
            d.line([10 + w * z, y, 10 + w * z, y + 4], fill=(255, 255, 255))
        if out_name == 'ground':
            for yy, lab in ((12, 'back edge of walkable path (screen y 110)'), (70, 'front edge (screen y 168)')):
                y = 50 + yy * z
                d.line([10, y, 10 + big.width + 10, y], fill=(255, 80, 80), width=2)
                d.text((big.width + 26, y - 7), lab, font=FONT_SMALL, fill=(255, 120, 120))
        g.save(os.path.join(OUT, 'guides', f'{out_name}_guide.png'))

    # Whole-screen layer map
    stage = Image.open(os.path.join(EXPORT, 'stage.png')).convert('RGBA').resize((960, 540), Image.NEAREST)
    g = Image.new('RGBA', (960 + 300, 540), (40, 40, 48, 255))
    g.alpha_composite(stage, (0, 0))
    d = ImageDraw.Draw(g)
    for y, ly, lab, col in (
        (1, 4, 'top of screen: bg_far + bg_trunks fill y 0-110', (255, 230, 120)),
        (98, 270, 'ground strip starts: y 98', (120, 200, 255)),
        (110, 330, 'walkable path back edge: y 110', (255, 80, 80)),
        (164, 470, 'fg_bush starts: y 164 (in front of fighters)', (120, 255, 140)),
        (168, 500, 'walkable path front edge: y 168', (255, 80, 80)),
    ):
        d.line([0, y * 3, 960, y * 3], fill=col, width=2)
        d.line([960, y * 3, 968, ly + 7], fill=col, width=1)
        d.text((972, ly), lab, font=FONT_SMALL, fill=col)
    d.text((972, 120), 'Screen is 320x180, shown here at 3x', font=FONT_SMALL, fill=(220, 220, 220))
    g.save(os.path.join(OUT, 'guides', 'stage_layers_guide.png'))


def build_effects():
    effects = [
        ('slash', 'Swipe arc on strikes. Faces RIGHT; the game flips it.'),
        ('spark', 'Impact star where a hit lands.'),
        ('seed', 'Bullet Seed projectile. Faces RIGHT.'),
        ('shadow', 'Shadow under every fighter.'),
        ('go-arrow', '"GO" arrow after a wave is cleared.'),
    ]
    z = 8
    rows = []
    for key, note in effects:
        img = Image.open(os.path.join(EXPORT, f'{key}.png')).convert('RGBA')
        img.save(os.path.join(OUT, 'effects', f'{key.replace("-", "_")}.png'))
        rows.append((key, note, img))
    height = sum(i.height * z + 50 for _, _, i in rows) + 10
    g = Image.new('RGBA', (760, height), (40, 40, 48, 255))
    d = ImageDraw.Draw(g)
    y = 10
    for key, note, img in rows:
        d.text((10, y), f'effects/{key.replace("-", "_")}.png  ({img.width}x{img.height})  {note}', font=FONT_SMALL, fill=(255, 230, 120))
        big = img.resize((img.width * z, img.height * z), Image.NEAREST)
        g.alpha_composite(big, (10, y + 22))
        y += img.height * z + 50
    g.save(os.path.join(OUT, 'guides', 'effects_guide.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(OUT, 'guides'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'effects'), exist_ok=True)
    build_sheet('treecko', TREECKO, 'treecko_actions')
    build_sheet('poochyena', POOCHYENA, 'poochyena_actions')
    build_layer_guides()
    build_effects()
    print('templates written to', OUT)
