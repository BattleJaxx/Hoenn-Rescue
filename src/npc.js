// People who stand on the grass bank between grunt fights: Ace Trainers, Traders and Move Tutors.
import { GROUND_TOP, SPRITE_SCALE } from './config.js';

const FONT = '"Press Start 2P", monospace';

// Overworld sheet: 16x32 frames. 0 down, 1 up, 2 left, 3-4 walk down, 5-6 walk up, 7-8 walk left
const F = { down: 0, left: 2, walkLeft: [7, 8] };

export class Npc {
  constructor(scene, kind, x, texture, data = {}) {
    this.scene = scene;
    this.kind = kind;            // 'ace' | 'trader' | 'tutor'
    this.data = data;
    this.x = x;
    this.y = GROUND_TOP - 6;     // on the grass bank, like the grunts
    this.state = 'stand';
    this.t = 0;
    this.available = true;       // can still be talked to
    this.removed = false;
    this.sprite = scene.add.sprite(x, this.y, texture, F.down)
      .setOrigin(0.5, 1).setScale(SPRITE_SCALE).setDepth(10 + this.y);
    this.prompt = scene.add.text(x, this.y - 64, '', {
      fontFamily: FONT, fontSize: '8px', color: '#9cff6a', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(19000).setVisible(false);
    this.bubble = null;
  }

  say(msg, ms = 1800) {
    this.bubble?.destroy();
    this.bubble = this.scene.add.text(0, 0, msg, {
      fontFamily: FONT, fontSize: '8px', color: '#000000', backgroundColor: '#ffffff',
      padding: { x: 3, y: 2 }, wordWrap: { width: 150 },
    }).setOrigin(0.5, 1).setDepth(19000);
    this.bubbleT = ms;
  }

  leave(delay = 900) {
    this.available = false;
    this.state = 'leaving';
    this.t = -delay;
  }

  update(dt, hovered, promptText) {
    if (this.removed) return;
    const ms = dt * 1000;
    this.t += ms;
    const p = this.scene.player;
    let frame = F.down;
    let flip = false;
    if (this.state === 'stand') {
      // Turn to look at the player when they're close
      if (Math.abs(p.x - this.x) < 90) { frame = F.left; flip = p.x > this.x; }
    } else if (this.state === 'leaving') {
      if (this.t > 0) {
        this.x += 80 * dt;
        frame = F.walkLeft[Math.floor(this.t / 130) % 2];
        flip = true;
        if (this.x > this.scene.camX + 350) { this.destroy(); return; }
      }
    }
    // Gone off the left of the screen: the chance has passed
    if (this.x < this.scene.camX - 30) { this.destroy(); return; }

    this.sprite.setFrame(frame).setFlipX(flip).setPosition(Math.round(this.x), Math.round(this.y));
    this.prompt.setVisible(hovered && this.available).setText(promptText || '')
      .setPosition(Math.round(this.x), Math.round(this.y - 64 + Math.sin(this.t / 200) * 1.5));
    if (this.bubble) {
      this.bubbleT -= ms;
      this.bubble.setPosition(Math.round(this.x), Math.round(this.y - 58));
      if (this.bubbleT <= 0) { this.bubble.destroy(); this.bubble = null; }
    }
  }

  destroy() {
    this.removed = true;
    this.available = false;
    this.sprite.destroy();
    this.prompt.destroy();
    this.bubble?.destroy();
  }
}
