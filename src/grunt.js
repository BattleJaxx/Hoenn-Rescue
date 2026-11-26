// Team Aqua grunt who commands each wave, and the held items dropped when it's beaten.
import { GROUND_TOP, SPRITE_SCALE } from './config.js';
import { ITEMS } from './items.js';

const FONT = '"Press Start 2P", monospace';

// Overworld trainer sheet: 16x32 frames.
// 0 down, 1 up, 2 left, 3-4 walk down, 5-6 walk up, 7-8 walk left
const F = { down: 0, up: 1, left: 2, walkLeft: [7, 8] };


export class Grunt {
  // cfg: { texture, taunts, defeats } from the stage; boss: { line } or null
  constructor(scene, standX, boss, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.standX = standX;
    this.boss = boss;
    this.x = scene.camX + 340;            // walks in from the right edge
    this.y = GROUND_TOP - 6;              // on the grass bank above the path
    this.state = 'enter';
    this.t = 0;
    this.removed = false;
    this.sprite = scene.add.sprite(this.x, this.y, cfg.texture, F.left)
      .setOrigin(0.5, 1)
      .setScale(SPRITE_SCALE)
      .setDepth(10 + this.y);
    this.bubble = null;
  }

  say(msg, ms = 1600) {
    this.bubble?.destroy();
    const t = this.scene.add.text(0, 0, msg, {
      fontFamily: FONT, fontSize: '8px', color: '#000000',
      backgroundColor: '#ffffff', padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 1).setDepth(19000);
    this.bubble = t;
    this.bubbleT = ms;
  }

  // Called when its Pokémon are all beaten
  defeat() {
    this.state = 'defeated';
    this.t = 0;
    const D = this.cfg.defeats;
    this.say(D[Math.floor(Math.random() * D.length)], 1100);
  }

  update(dt) {
    const ms = dt * 1000;
    this.t += ms;
    let frame = F.down;
    let flip = false;
    switch (this.state) {
      case 'enter': {
        const step = 70 * dt;
        this.x = Math.max(this.standX, this.x - step);
        frame = F.walkLeft[Math.floor(this.t / 140) % 2];
        if (this.x <= this.standX) {
          this.state = 'stand';
          this.t = 0;
          const T = this.cfg.taunts;
          this.say(this.boss ? this.boss.line : T[Math.floor(Math.random() * T.length)], this.boss ? 2400 : 1600);
        }
        break;
      }
      case 'stand':
        // Faces the player, with a little arm-waving bob now and then
        frame = F.left;
        flip = this.scene.player.x > this.x;
        break;
      case 'defeated':
        frame = F.down;
        if (this.t > 900) {
          this.state = 'exit';
          this.t = 0;
          this.scene.dropItems(this.x);
        }
        break;
      case 'exit':
        this.x += 90 * dt;
        frame = F.walkLeft[Math.floor(this.t / 120) % 2];
        flip = true;
        if (this.x > this.scene.camX + 350) this.destroy();
        break;
    }
    if (this.removed) return;
    this.sprite.setFrame(frame).setFlipX(flip).setPosition(Math.round(this.x), Math.round(this.y));
    if (this.bubble) {
      this.bubbleT -= ms;
      this.bubble.setPosition(Math.round(this.x), Math.round(this.y - 58));
      if (this.bubbleT <= 0) { this.bubble.destroy(); this.bubble = null; }
    }
  }

  destroy() {
    this.removed = true;
    this.sprite.destroy();
    this.bubble?.destroy();
  }
}

// ---------------------------------------------------------------------------
// A held item lying on the path, waiting to be picked
// ---------------------------------------------------------------------------
export class Pickup {
  constructor(scene, id, fromX, fromY, toX, toY) {
    this.scene = scene;
    this.id = id;
    this.item = ITEMS[id];
    this.x = toX;
    this.y = toY;
    this.removed = false;
    this.landed = false;
    this.shadow = scene.add.image(toX, toY, 'shadow').setDepth(5).setScale(0.8, 1).setAlpha(0);
    this.img = scene.add.image(fromX, fromY, `item_${id}`).setOrigin(0.5, 1).setDepth(10 + toY);
    this.glint = scene.add.image(toX, toY - 26, 'glint').setDepth(10 + toY + 1).setVisible(false);
    // Arc from the grunt down onto the path
    const peak = Math.min(fromY, toY) - 30;
    scene.tweens.addCounter({
      from: 0, to: 1, duration: 520,
      onUpdate: (tw) => {
        const k = tw.getValue();
        const x = fromX + (toX - fromX) * k;
        const y = (1 - k) * (1 - k) * fromY + 2 * (1 - k) * k * peak + k * k * toY;
        this.img.setPosition(Math.round(x), Math.round(y));
        this.shadow.setAlpha(k);
      },
      onComplete: () => { this.landed = true; },
    });
  }

  update(t, highlighted) {
    if (!this.landed || this.removed) return;
    const bob = Math.round(Math.sin(t / 260) * 1.5);
    this.img.setPosition(Math.round(this.x), Math.round(this.y - 2 + bob));
    this.img.setScale(highlighted ? 1.15 : 1);
    this.glint.setVisible(Math.floor(t / 300) % 3 === 0 || highlighted)
      .setPosition(Math.round(this.x + 8), Math.round(this.y - 22 + bob));
  }

  poof() {
    if (this.removed) return;
    this.removed = true;
    this.scene.tweens.add({
      targets: [this.img, this.shadow, this.glint], alpha: 0, duration: 250,
      onComplete: () => { this.img.destroy(); this.shadow.destroy(); this.glint.destroy(); },
    });
  }
}
