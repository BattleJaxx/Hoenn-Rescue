import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, GROUND_TOP, GROUND_BOTTOM, WORLD_W, WAVES, MAX_ATTACKERS, PLAYER, ATTACKS,
} from './config.js';
import { makeTextures } from './textures.js';
import { Player, Poochyena } from './fighters.js';
import { input } from './input.js';

const FONT = '"Press Start 2P", monospace';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function text(scene, x, y, str, size = 8, color = '#ffffff') {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: 2,
  });
}

// ---------------------------------------------------------------------------
export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    this.load.spritesheet('treecko', 'assets/treecko.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('treecko_actions', 'assets/treecko_actions.png', { frameWidth: 48, frameHeight: 32 });
    this.load.spritesheet('poochyena_actions', 'assets/poochyena_actions.png', { frameWidth: 48, frameHeight: 32 });
    this.load.image('fg-bush', 'assets/fg_bush.png');
    this.load.spritesheet('poochyena', 'assets/poochyena.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    makeTextures(this);
    this.scene.start('title');
  }
}

// ---------------------------------------------------------------------------
export class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  create() {
    this.add.tileSprite(0, 0, VIEW_W, 110, 'bg-far').setOrigin(0);
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.45).setOrigin(0);
    text(this, VIEW_W / 2, 34, 'HOENN', 24, '#7cd35a').setOrigin(0.5);
    text(this, VIEW_W / 2, 62, 'RESCUE', 24, '#ffd23f').setOrigin(0.5);
    this.add.sprite(VIEW_W / 2 - 26, 112, 'treecko', 4).setScale(2).setFlipX(true);
    this.add.sprite(VIEW_W / 2 + 26, 112, 'poochyena', 4).setScale(2);
    const isTouch = document.body.classList.contains('touch');
    this.prompt = text(this, VIEW_W / 2, 132, isTouch ? 'TAP TO START' : 'PRESS ENTER', 8).setOrigin(0.5);
    if (!isTouch) {
      text(this, VIEW_W / 2, 152, 'MOVE ARROWS  LIGHT J  HEAVY K', 8, '#cfcfcf').setOrigin(0.5);
      text(this, VIEW_W / 2, 164, 'JUMP SPACE  SPECIAL L  BLOCK SHIFT', 8, '#cfcfcf').setOrigin(0.5);
    }
    this.t = 0;
    this.ready = false;
    this.time.delayedCall(300, () => { this.ready = true; });
  }

  update(_, delta) {
    input.update();
    this.t += delta;
    this.prompt.setVisible(Math.floor(this.t / 450) % 2 === 0);
    if (this.ready && (input.anyPressed || input.pressed.start)) this.scene.start('game');
  }
}

// ---------------------------------------------------------------------------
export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    this.camX = 0;
    this.locked = false;
    this.waveIdx = 0;
    this.hitstop = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.enemies = [];
    this.seeds = [];
    this.directorT = 0;
    this.frameDt = 16;
    this.lastTarget = null;
    this.lastTargetT = 0;
    this.goT = 0;

    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW_H);
    this.cameras.main.setRoundPixels(true);

    this.buildBackground();

    this.player = new Player(this, 40, 140);
    this.player.facing = 1;

    this.buildHud();
    this.banner = text(this, VIEW_W / 2, 70, 'STAGE 1', 16, '#ffd23f').setOrigin(0.5).setScrollFactor(0).setDepth(20000);
    this.banner2 = text(this, VIEW_W / 2, 92, 'PETALBURG WOODS', 8).setOrigin(0.5).setScrollFactor(0).setDepth(20000);
  }

  // ----- Scenery ----------------------------------------------------------
  buildBackground() {
    this.bgFar = this.add.tileSprite(0, 0, VIEW_W, 110, 'bg-far').setOrigin(0).setScrollFactor(0).setDepth(-40);
    this.bgTrunks = this.add.tileSprite(0, -14, VIEW_W, 120, 'bg-trunks').setOrigin(0).setScrollFactor(0).setDepth(-30);
    this.ground = this.add.tileSprite(0, GROUND_TOP - 12, VIEW_W, 76, 'ground').setOrigin(0).setScrollFactor(0).setDepth(-20);
    this.add.rectangle(0, GROUND_TOP + 64, VIEW_W, VIEW_H, 0x58a043).setOrigin(0).setScrollFactor(0).setDepth(-21);
    this.fg = this.add.tileSprite(0, VIEW_H - 24, VIEW_W, 24, 'fg-bush').setOrigin(0).setScrollFactor(0).setDepth(9000);
  }

  updateBackground() {
    this.bgFar.tilePositionX = this.camX * 0.2;
    this.bgTrunks.tilePositionX = this.camX * 0.55;
    this.ground.tilePositionX = this.camX;
    this.fg.tilePositionX = this.camX * 1.3;
  }

  // ----- HUD ------------------------------------------------------------------
  buildHud() {
    const D = 20000;
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(D);
    this.add.image(2, 0, 'treecko', 0).setOrigin(0).setScrollFactor(0).setDepth(D + 1);
    text(this, 32, 3, 'TREECKO', 8).setScrollFactor(0).setDepth(D + 1);
    this.spText = text(this, 128, 17, 'SP', 8, '#9cff6a').setScrollFactor(0).setDepth(D + 1);
    this.enemyName = text(this, VIEW_W - 4, 3, '', 8).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 1);
    this.goArrow = this.add.image(VIEW_W - 22, 70, 'go-arrow').setScrollFactor(0).setDepth(D).setVisible(false);
    this.goText = text(this, VIEW_W - 34, 66, 'GO', 8, '#ffd23f').setOrigin(1, 0).setScrollFactor(0).setDepth(D).setVisible(false);
  }

  drawBar(g, x, y, w, h, frac, color) {
    g.fillStyle(0x000000, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x3a3a3a, 1).fillRect(x, y, w, h);
    g.fillStyle(color, 1).fillRect(x, y, Math.round(w * clamp(frac, 0, 1)), h);
  }

  updateHud() {
    const g = this.hud;
    const p = this.player;
    g.clear();
    const hpFrac = p.hp / p.maxHp;
    this.drawBar(g, 32, 13, 92, 5, hpFrac, hpFrac > 0.5 ? 0x58d858 : hpFrac > 0.2 ? 0xf8d030 : 0xf85838);
    this.drawBar(g, 32, 21, 92, 3, p.energy / PLAYER.energyMax, 0x40b8f8);
    g.fillStyle(0xffffff, 1).fillRect(32 + 46, 20, 1, 5); // special cost marker
    const ready = p.energy >= PLAYER.specialCost;
    this.spText.setVisible(ready && Math.floor(this.time.now / 300) % 2 === 0);

    const e = this.lastTarget;
    if (e && !e.removed && this.lastTargetT > 0) {
      this.enemyName.setText(e.name).setVisible(true);
      this.drawBar(g, VIEW_W - 96, 13, 92, 5, e.hp / e.maxHp, 0xf85838);
    } else {
      this.enemyName.setVisible(false);
    }

    const showGo = this.goT > 0 && Math.floor(this.goT / 250) % 2 === 0;
    this.goArrow.setVisible(showGo);
    this.goText.setVisible(showGo);
  }

  // ----- Combat helpers -------------------------------------------------------
  overlaps(a, t, atk) {
    const dx = (t.x - a.x) * a.facing;
    return dx > -6 && dx < atk.range + 6
      && Math.abs(t.y - a.y) <= atk.depth
      && Math.abs(t.z - a.z) < 26;
  }

  meleeHit(attacker, atk, hitSet) {
    for (const e of this.enemies) {
      if (hitSet.has(e) || !e.alive || e.removed) continue;
      if (!this.overlaps(attacker, e, atk)) continue;
      const r = e.takeHit(attacker, atk);
      if (!r) continue;
      hitSet.add(e);
      this.lastTarget = e;
      this.lastTargetT = 2500;
      if (r === 'hit') {
        this.player.gainEnergy(PLAYER.energyPerHit);
        this.hitstop = atk.knockdown ? 85 : 55;
        this.spark((attacker.x + e.x) / 2, e.y - e.z - 14);
        if (atk.shake) this.cameras.main.shake(110, 0.012);
      }
    }
  }

  enemyHit(enemy, atk, hitSet) {
    const p = this.player;
    if (hitSet.has(p) || !p.alive) return;
    if (!this.overlaps(enemy, p, atk)) return;
    const r = p.takeHit(enemy, atk);
    if (!r) return;
    hitSet.add(p);
    if (r === 'hit') {
      this.hitstop = 60;
      this.spark((enemy.x + p.x) / 2, p.y - p.z - 14);
    }
  }

  sfxBlock(f) {
    this.spark(f.x + f.facing * 8, f.y - f.z - 14, 0x9fc4ff);
  }

  spark(x, y, tint = 0xffffff) {
    const s = this.add.image(Math.round(x), Math.round(y), 'spark').setDepth(9500).setTint(tint);
    this.tweens.add({ targets: s, scale: 1.8, alpha: 0, duration: 160, onComplete: () => s.destroy() });
  }

  fireSeed(p) {
    const img = this.add.image(p.x, p.y, 'seed').setDepth(9400);
    img.setFlipX(p.facing < 0);
    this.seeds.push({
      img, x: p.x + p.facing * 12, y: p.y + (Math.random() - 0.5) * 4, z: p.z + 14,
      dir: p.facing, life: 0.75,
    });
  }

  updateSeeds(dt) {
    for (const s of this.seeds) {
      s.x += s.dir * 240 * dt;
      s.life -= dt;
      for (const e of this.enemies) {
        if (!e.alive || e.removed || s.life <= 0) continue;
        if (Math.abs(e.x - s.x) < 10 && Math.abs(e.y - s.y) < 9 && e.z < 24) {
          const r = e.takeHit({ x: s.x - s.dir * 20, y: s.y }, ATTACKS.seed);
          if (r) {
            this.lastTarget = e;
            this.lastTargetT = 2500;
            this.spark(s.x, s.y - s.z, 0xc8ff90);
            this.hitstop = Math.max(this.hitstop, 30);
            s.life = 0;
          }
        }
      }
      s.img.setPosition(Math.round(s.x), Math.round(s.y - s.z)).setDepth(11 + s.y);
      if (s.life <= 0) s.img.destroy();
    }
    this.seeds = this.seeds.filter((s) => s.life > 0);
  }

  // ----- Turn-taking director ---------------------------------------------
  releaseToken(e) {
    e.token = false;
    e.tokenAge = 0;
  }

  updateDirector(dt) {
    this.directorT -= dt * 1000;
    if (this.directorT > 0) return;
    this.directorT = 450;
    const p = this.player;
    if (!p.alive || ['launched', 'down', 'getup'].includes(p.state)) return;
    const live = this.enemies.filter((e) => e.alive && !e.removed);
    const holders = live.filter((e) => e.token).length;
    if (holders >= MAX_ATTACKERS) return;
    const free = live.filter((e) => !e.token && e.state === 'idle');
    if (!free.length) return;
    const pick = free[Math.floor(Math.random() * free.length)];
    pick.token = true;
    pick.tokenAge = 0;
  }

  // ----- Waves and camera -------------------------------------------------
  spawnWave(n) {
    for (let i = 0; i < n; i++) {
      const fromRight = i % 2 === 0;
      const x = fromRight ? this.camX + VIEW_W + 20 + i * 14 : this.camX - 20 - i * 14;
      const y = GROUND_TOP + 6 + Math.random() * (GROUND_BOTTOM - GROUND_TOP - 12);
      this.enemies.push(new Poochyena(this, x, y));
    }
  }

  updateCamera() {
    const p = this.player;
    if (!this.locked) {
      const target = clamp(p.x - 130, 0, WORLD_W - VIEW_W);
      this.camX = Math.max(this.camX, target); // arcade-style: no scrolling back
      const next = WAVES[this.waveIdx];
      if (next && p.x >= next.at) {
        this.locked = true;
        this.goT = 0;
        this.spawnWave(next.count);
      }
    } else {
      const alive = this.enemies.filter((e) => e.alive && !e.removed).length;
      if (alive === 0) {
        this.locked = false;
        this.waveIdx++;
        if (this.waveIdx >= WAVES.length) this.stageClear();
        else this.goT = 3000;
      }
    }
    this.cameras.main.scrollX = Math.round(this.camX);
  }

  stageClear() {
    this.phase = 'clear';
    this.phaseT = 0;
    this.banner.setText('STAGE CLEAR').setColor('#ffd23f').setVisible(true);
    this.banner2.setText(document.body.classList.contains('touch') ? 'TAP TO PLAY AGAIN' : 'PRESS ENTER TO PLAY AGAIN').setVisible(true);
  }

  gameOver() {
    this.phase = 'over';
    this.phaseT = 0;
    this.banner.setText('GAME OVER').setColor('#f85838').setVisible(true);
    this.banner2.setText(document.body.classList.contains('touch') ? 'TAP TO RETRY' : 'PRESS ENTER TO RETRY').setVisible(true);
  }

  // ----- Main loop ----------------------------------------------------------
  update(_, delta) {
    input.update();
    const dt = Math.min(delta, 50) / 1000;
    this.frameDt = delta;
    this.phaseT += delta;

    if (this.phase === 'intro') {
      if (this.phaseT > 1600) {
        this.phase = 'play';
        this.banner.setVisible(false);
        this.banner2.setVisible(false);
      }
    }
    if ((this.phase === 'over' || this.phase === 'clear') && this.phaseT > 900
      && (input.anyPressed || input.pressed.start)) {
      this.scene.restart();
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= delta;
    } else {
      if (this.phase !== 'intro') this.player.update(dt);
      for (const e of this.enemies) if (!e.removed) e.update(dt);
      this.enemies = this.enemies.filter((e) => !e.removed);
      this.updateSeeds(dt);
      this.updateDirector(dt);
      if (this.phase === 'play') this.updateCamera();
      this.lastTargetT -= delta;
      this.goT = Math.max(0, this.goT - delta);

      if (this.phase === 'play' && this.player.state === 'dead' && this.player.t > 900) this.gameOver();
    }

    this.player.render();
    for (const e of this.enemies) e.render();
    this.updateBackground();
    this.updateHud();
  }
}
