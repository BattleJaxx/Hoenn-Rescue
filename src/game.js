import Phaser from 'phaser';
import {
  VIEW_W, VIEW_H, GROUND_TOP, GROUND_BOTTOM, WORLD_W, WAVES, MAX_ATTACKERS, PLAYER, ATTACKS, WILD, FEET_Y,
} from './config.js';
import { makeTextures } from './textures.js';
import { Player, Poochyena, sign } from './fighters.js';
import { WILD_CLASSES, randomLaneY } from './wild.js';
import { Grunt, Pickup } from './grunt.js';
import { ITEMS, ITEM_IDS, itemDesc, rollItems, effects } from './items.js';
import { input } from './input.js';
import { MOVES, SCENE_SLOTS, SCENE_WEIGHTS, ACES, ACE_ITEMS } from './config.js';
import { Npc } from './npc.js';
import { ACE_CLASSES } from './aces.js';
import { MOVES_DEF, rollTutorOffer } from './moves.js';
import { SPECIES, START_LEVEL, expForLevel, expYield } from './leveling.js';

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
    this.load.image('ground', 'assets/ground.png');
    this.load.spritesheet('poochyena', 'assets/poochyena.png', { frameWidth: 32, frameHeight: 32 });
    for (const m of ['wurmple', 'shroomish', 'silcoon', 'grovyle', 'sceptile', 'shedinja', 'smeargle', 'spinda']) {
      this.load.spritesheet(m, `assets/${m}.png`, { frameWidth: 32, frameHeight: 32 });
    }
    for (const k of ['aqua_grunt', 'ace_trainer_m', 'ace_trainer_f', 'trader', 'tutor']) {
      this.load.spritesheet(k, `assets/${k}.png`, { frameWidth: 16, frameHeight: 32 });
    }
    for (const id of ITEM_IDS) this.load.image(`item_${id}`, `assets/items/${id}.png`);
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
// ---------------------------------------------------------------------------
export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    this.camX = 0;
    this.locked = false;
    this.waveIdx = 0;
    this.waveState = 'none';     // none | fighting | choosing
    this.hitstop = 0;
    this.phase = 'intro';
    this.phaseT = 0;
    this.enemies = [];
    this.seeds = [];
    this.enemyShots = [];
    this.clouds = [];
    this.pickups = [];
    this.hoverPickup = null;
    this.grunt = null;
    this.directorT = 0;
    this.frameDt = 16;
    this.lastTarget = null;
    this.lastTargetT = 0;
    this.goT = 0;
    this.wildT = Phaser.Math.Between(...WILD.firstDelay);
    this.pendingWild = null;
    this.evolution = null;
    this.evoQueue = [];
    this.npcs = [];
    this.hoverNpc = null;
    this.menu = null;
    this.aceNpc = null;
    this.specials = [];   // Seed Bomb and Rock Slide in flight
    this.params = new URLSearchParams(window.location.search);
    this.slots = SCENE_SLOTS.map((x) => ({ x, spawned: false }));

    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW_H);
    this.cameras.main.setRoundPixels(true);

    this.buildBackground();

    this.player = new Player(this, 40, 140);
    this.player.facing = 1;

    this.buildHud();
    this.applyTestLevel();
    this.banner = text(this, VIEW_W / 2, 70, 'STAGE 1', 16, '#ffd23f').setOrigin(0.5).setScrollFactor(0).setDepth(20000);
    this.banner2 = text(this, VIEW_W / 2, 92, 'PETALBURG WOODS', 8).setOrigin(0.5).setScrollFactor(0).setDepth(20000);
  }

  // ----- Scenery ----------------------------------------------------------
  buildBackground() {
    this.bgFar = this.add.tileSprite(0, 0, VIEW_W, 110, 'bg-far').setOrigin(0).setScrollFactor(0).setDepth(-40);
    this.bgTrunks = this.add.tileSprite(0, -14, VIEW_W, 120, 'bg-trunks').setOrigin(0).setScrollFactor(0).setDepth(-30);
    this.ground = this.add.tileSprite(0, GROUND_TOP - 12, VIEW_W, 76, 'ground').setOrigin(0).setScrollFactor(0).setDepth(-20);
    // Fill below the ground strip with the colour of its bottom-left pixel
    const gTex = this.textures.get('ground').getSourceImage();
    const under = this.textures.getPixel(0, gTex.height - 1, 'ground');
    this.add.rectangle(0, GROUND_TOP - 12 + gTex.height, VIEW_W, VIEW_H, under ? under.color : 0x58a043)
      .setOrigin(0).setScrollFactor(0).setDepth(-21);
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
    this.portrait = this.add.image(2, 0, 'treecko', 0).setOrigin(0).setScrollFactor(0).setDepth(D + 1);
    this.nameText = text(this, 32, 3, 'TREECKO', 8).setScrollFactor(0).setDepth(D + 1);
    this.levelText = text(this, 124, 3, '', 8, '#fff6a0').setOrigin(1, 0).setScrollFactor(0).setDepth(D + 1);
    this.spText = text(this, 128, 17, 'SP', 8, '#9cff6a').setScrollFactor(0).setDepth(D + 1);
    this.enemyName = text(this, VIEW_W - 4, 3, '', 8).setOrigin(1, 0).setScrollFactor(0).setDepth(D + 1);
    this.goArrow = this.add.image(VIEW_W - 22, 70, 'go-arrow').setScrollFactor(0).setDepth(D).setVisible(false);
    this.goText = text(this, VIEW_W - 34, 66, 'GO', 8, '#ffd23f').setOrigin(1, 0).setScrollFactor(0).setDepth(D).setVisible(false);
    this.itemRow = [];
    this.movesText = text(this, 32, 44, '', 8, '#c8ffb0').setScrollFactor(0).setDepth(D + 1);

    // Item choice panel (shown while standing on a dropped item)
    this.panel = this.add.container(0, 0).setScrollFactor(0).setDepth(D + 2).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.82).fillRect(8, 136, VIEW_W - 16, 40);
    bg.lineStyle(1, 0xffffff, 0.8).strokeRect(8.5, 136.5, VIEW_W - 17, 39);
    this.panelIcon = this.add.image(26, 156, 'item_lucky_egg');
    this.panelName = text(this, 44, 141, '', 8, '#ffd23f');
    this.panelDesc = this.add.text(44, 153, '', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff', wordWrap: { width: 250 }, lineSpacing: 2,
    });
    const isTouch = document.body.classList.contains('touch');
    this.panelHint = text(this, VIEW_W - 12, 141, isTouch ? 'L: TAKE' : 'J: TAKE', 8, '#9cff6a').setOrigin(1, 0);
    this.panel.add([bg, this.panelIcon, this.panelName, this.panelDesc, this.panelHint]);

    // Evolution message box
    this.evoPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(D + 3).setVisible(false);
    const ebg = this.add.graphics();
    ebg.fillStyle(0x101830, 0.95).fillRect(6, 116, VIEW_W - 12, 60);
    ebg.lineStyle(1, 0xffffff, 0.9).strokeRect(6.5, 116.5, VIEW_W - 13, 59);
    this.evoText = this.add.text(14, 122, '', {
      fontFamily: FONT, fontSize: '8px', color: '#ffffff', wordWrap: { width: VIEW_W - 28 }, lineSpacing: 4,
    });
    this.evoPanel.add([ebg, this.evoText]);
    this.evoSprite = this.add.sprite(VIEW_W / 2, 104, 'treecko', 0).setOrigin(0.5, FEET_Y)
      .setScale(3).setScrollFactor(0).setDepth(16000).setVisible(false);
    this.evoOverlay = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 1).setOrigin(0)
      .setScrollFactor(0).setDepth(15000).setAlpha(0);

    // Menu box for talking to Traders and Move Tutors
    this.menuPanel = this.add.container(0, 0).setScrollFactor(0).setDepth(D + 4).setVisible(false);
    const mbg = this.add.graphics();
    mbg.fillStyle(0x101830, 0.95).fillRect(6, 56, VIEW_W - 12, 120);
    mbg.lineStyle(1, 0xffffff, 0.9).strokeRect(6.5, 56.5, VIEW_W - 13, 119);
    mbg.lineStyle(1, 0xffffff, 0.3).lineBetween(12, 148.5, VIEW_W - 12, 148.5);
    const wrap = { fontFamily: FONT, fontSize: '8px', color: '#ffffff', wordWrap: { width: VIEW_W - 28 }, lineSpacing: 3 };
    this.menuTitle = this.add.text(14, 61, '', wrap);
    this.menuDesc = this.add.text(14, 152, '', { ...wrap, color: '#c8d8ff' });
    this.menuLines = [0, 1, 2, 3].map((i) => this.add.text(24, 104 + i * 11, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff' }));
    this.menuCursor = this.add.text(14, 104, '>', { fontFamily: FONT, fontSize: '8px', color: '#ffd23f' });
    const isTouchM = document.body.classList.contains('touch');
    this.menuHint = text(this, VIEW_W - 8, 46, isTouchM ? 'L: OK   H: BACK' : 'J: OK   K: BACK', 8, '#9cff6a').setOrigin(1, 0);
    this.menuPanel.add([mbg, this.menuTitle, this.menuDesc, ...this.menuLines, this.menuCursor, this.menuHint]);
  }

  refreshItemRow() {
    this.itemRow.forEach((o) => o.destroy());
    this.itemRow = [];
    let x = 34;
    for (const id of ITEM_IDS) {
      const n = this.player.items[id];
      if (!n) continue;
      const img = this.add.image(x, 37, `item_${id}`).setScale(0.5).setScrollFactor(0).setDepth(20001);
      this.itemRow.push(img);
      if (n > 1) {
        this.itemRow.push(text(this, x + 3, 36, `${n}`, 8).setScrollFactor(0).setDepth(20002));
      }
      x += n > 1 ? 20 : 14;
    }
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
    this.drawBar(g, 32, 27, 92, 1, p.expIntoLevel / p.expToNext, 0x58c8f8); // EXP to next level
    const ready = p.energy >= PLAYER.specialCost;
    this.spText.setVisible(ready && Math.floor(this.time.now / 300) % 2 === 0);
    this.levelText.setText(`Lv${p.level}`);
    const mv = [];
    if (p.upgrades.light) mv.push(`L:${MOVES_DEF[p.upgrades.light].name}`);
    if (p.upgrades.heavy) mv.push(`H:${MOVES_DEF[p.upgrades.heavy].name}`);
    this.movesText.setText(mv.join(' '));
    this.movesText.setY(this.itemRow.length ? 46 : 32);
    if (this.nameText.text !== p.name) {
      this.nameText.setText(p.name);
      this.portrait.setTexture(p.form, 0);
    }

    const e = this.lastTarget;
    if (e && !e.removed && this.lastTargetT > 0) {
      this.enemyName.setText(`${e.wild ? 'WILD ' : ''}${e.name} Lv${e.level}`).setVisible(true);
      this.drawBar(g, VIEW_W - 96, 13, 92, 5, e.hp / e.maxHp, 0xf85838);
    } else {
      this.enemyName.setVisible(false);
    }

    const showGo = this.goT > 0 && Math.floor(this.goT / 250) % 2 === 0;
    this.goArrow.setVisible(showGo);
    this.goText.setVisible(showGo);

    const h = this.hoverPickup;
    this.panel.setVisible(!!h);
    if (h) {
      const have = p.items[h.id] || 0;
      this.panelIcon.setTexture(`item_${h.id}`);
      this.panelName.setText(have ? `${ITEMS[h.id].name} (have ${have})` : ITEMS[h.id].name);
      this.panelDesc.setText(itemDesc(h.id, have + 1));
    }
  }

  floatText(x, y, str, color = '#ffffff') {
    const t = text(this, Math.round(x), Math.round(y), str, 8, color).setOrigin(0.5).setDepth(19500);
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ----- Combat helpers -------------------------------------------------------
  overlaps(a, t, atk) {
    const dx = (t.x - a.x) * a.facing;
    return dx > -6 && dx < atk.range + 6
      && Math.abs(t.y - a.y) <= atk.depth
      && Math.abs(t.z - a.z) < 26;
  }

  noteTarget(e) {
    this.lastTarget = e;
    this.lastTargetT = 2500;
  }

  overlapsMove(a, t, atk) {
    if (atk.area) {
      return Math.abs(t.x - a.x) < atk.range + 6 && Math.abs(t.y - a.y) <= atk.depth && Math.abs(t.z - a.z) < 26;
    }
    if (this.overlaps(a, t, atk)) return true;
    if (atk.bothSides) {
      const dx = (a.x - t.x) * a.facing; // behind
      return dx > -6 && dx < atk.range + 6 && Math.abs(t.y - a.y) <= atk.depth && Math.abs(t.z - a.z) < 26;
    }
    return false;
  }

  meleeHit(attacker, atk, hitSet) {
    let landed = 0;
    for (const e of this.enemies) {
      if (hitSet.has(e) || !e.alive || e.removed) continue;
      if (!this.overlapsMove(attacker, e, atk)) continue;
      const r = e.takeHit(attacker, atk);
      if (!r) continue;
      hitSet.add(e);
      this.noteTarget(e);
      if (r === 'hit') {
        landed++;
        if (atk.onHit) atk.onHit(this, this.player, e, atk);
        this.player.gainEnergy(PLAYER.energyPerHit);
        this.hitstop = atk.knockdown ? 85 : 55;
        this.spark((attacker.x + e.x) / 2, e.y - e.z - 14, atk.crit ? 0xffd23f : 0xffffff);
        if (atk.crit) this.floatText(e.x, e.y - 40, 'CRITICAL!', '#ffd23f');
        if (atk.shake || atk.crit) this.cameras.main.shake(110, 0.012);
      }
    }
    return landed;
  }

  enemyHit(enemy, atk, hitSet) {
    const p = this.player;
    if (hitSet.has(p) || !p.alive) return;
    if (!this.overlaps(enemy, p, atk)) return;
    const r = p.takeHit(enemy, { ...atk, dmg: atk.dmg * (enemy.dmgMult || 1) });
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

  onEnemyKO(e) {
    const p = this.player;
    const gained = Math.floor(expYield(e.species, e.level, e.fromAce ? 'ace' : e.fromGrunt) * effects.xpMult(p.items));
    this.floatText(e.x, e.y - 36, `+${gained} EXP`, '#9fd8ff');
    p.heal(effects.koHeal(p.items));
    p.gainExp(gained);
  }

  // Silcoon and other obstacles: push a fighter out of their body
  pushOutOfObstacles(f) {
    for (const e of this.enemies) {
      if (!e.obstacle || !e.alive || e.removed || f.z > 14) continue;
      const dx = f.x - e.x;
      if (Math.abs(dx) < e.obstacle.w && Math.abs(f.y - e.y) < e.obstacle.d) {
        f.x = e.x + sign(dx) * e.obstacle.w;
      }
    }
  }

  // ----- Projectiles ----------------------------------------------------------
  fireSeed(p) {
    const img = this.add.image(p.x, p.y, 'seed').setDepth(9400);
    img.setFlipX(p.facing < 0);
    this.seeds.push({
      img, x: p.x + p.facing * 12, y: p.y + (Math.random() - 0.5) * 4, z: p.z + 14,
      dir: p.facing, life: 0.75,
      atk: { ...ATTACKS.seed, dmg: ATTACKS.seed.dmg * p.outgoing('seed') },
    });
  }

  fireLeafStorm(p) {
    const L = MOVES.leafStorm;
    const atk = { ...ATTACKS.seed, dmg: L.dmg * p.outgoing('leafStorm'), push: 30 };
    for (let i = 0; i < L.leaves; i++) {
      const k = L.leaves > 1 ? i / (L.leaves - 1) : 0.5;
      const img = this.add.image(p.x, p.y, 'leafstorm').setDepth(9400).setFlipX(p.facing < 0);
      this.seeds.push({
        img, x: p.x + p.facing * (8 - (i % 3) * 10), y: clamp(p.y + (k - 0.5) * 2 * L.spread, GROUND_TOP, GROUND_BOTTOM),
        z: p.z + 10 + (i % 4) * 3, dir: p.facing, life: L.life, speed: L.speed + (i % 3) * 25, atk,
      });
    }
    this.cameras.main.shake(160, 0.006);
  }

  updateSeeds(dt) {
    for (const s of this.seeds) {
      s.x += s.dir * (s.speed || 240) * dt;
      s.life -= dt;
      for (const e of this.enemies) {
        if (!e.alive || e.removed || s.life <= 0) continue;
        if (Math.abs(e.x - s.x) < 10 && Math.abs(e.y - s.y) < 9 && e.z < 24) {
          const r = e.takeHit({ x: s.x - s.dir * 20, y: s.y }, s.atk);
          if (r) {
            this.noteTarget(e);
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

  fireEnemyShot(owner, texture, atk) {
    const img = this.add.image(owner.x, owner.y, texture).setDepth(9400).setFlipX(owner.facing < 0);
    this.enemyShots.push({
      img, x: owner.x + owner.facing * 10, y: owner.y, z: 8, dir: owner.facing,
      speed: atk.speed, life: atk.life, atk: { ...atk, dmg: atk.dmg * (owner.dmgMult || 1) },
    });
  }

  updateEnemyShots(dt) {
    const p = this.player;
    for (const s of this.enemyShots) {
      s.x += s.dir * s.speed * dt;
      s.life -= dt;
      if (s.life > 0 && p.alive && Math.abs(p.x - s.x) < 8 && Math.abs(p.y - s.y) < 7 && p.z < 20) {
        const r = p.takeHit({ x: s.x - s.dir * 20, y: s.y }, s.atk);
        if (r) {
          if (r === 'hit') this.spark(s.x, p.y - 14, 0xe0e0ff);
          s.life = 0;
        }
      }
      s.img.setPosition(Math.round(s.x), Math.round(s.y - s.z)).setDepth(11 + s.y);
      if (s.life <= 0) s.img.destroy();
    }
    this.enemyShots = this.enemyShots.filter((s) => s.life > 0);
  }

  spawnSporeCloud(owner, S) {
    const img = this.add.image(owner.x, owner.y - 6, 'spore').setDepth(10 + owner.y + 2).setAlpha(0);
    this.tweens.add({ targets: img, alpha: 0.9, duration: 200 });
    this.clouds.push({ img, x: owner.x, y: owner.y, life: S.life, tickT: 0, S, owner });
  }

  updateClouds(dt) {
    const p = this.player;
    const ms = dt * 1000;
    for (const c of this.clouds) {
      c.life -= ms;
      c.tickT -= ms;
      c.img.setPosition(Math.round(c.x + Math.sin(this.time.now / 300) * 2), Math.round(c.y - 6));
      if (c.life < 400) c.img.setAlpha(Math.max(0, c.life / 400) * 0.9);
      const inside = Math.abs(p.x - c.x) < c.S.radiusX && Math.abs(p.y - c.y) < c.S.radiusY && p.z < 20;
      if (inside && c.tickT <= 0 && p.alive) {
        c.tickT = c.S.tick;
        p.takeHit({ x: c.x, y: c.y }, { dmg: c.S.dmg * (c.owner.dmgMult || 1), unblockable: true, noStagger: true, owner: c.owner });
      }
      if (c.life <= 0) c.img.destroy();
    }
    this.clouds = this.clouds.filter((c) => c.life > 0);
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
    const live = this.enemies.filter((e) => e.alive && !e.removed && !e.noToken);
    const holders = live.filter((e) => e.token).length;
    if (holders >= MAX_ATTACKERS) return;
    const free = live.filter((e) => !e.token && e.state === 'idle');
    if (!free.length) return;
    const pick = free[Math.floor(Math.random() * free.length)];
    pick.token = true;
    pick.tokenAge = 0;
  }

  // ----- Grunt waves and item choice ---------------------------------------
  startWave(count, level) {
    this.locked = true;
    this.goT = 0;
    this.waveState = 'fighting';
    this.grunt = new Grunt(this, this.camX + 236);
    for (let i = 0; i < count; i++) {
      const fromRight = i % 2 === 0;
      const x = fromRight ? this.camX + VIEW_W + 20 + i * 14 : this.camX - 20 - i * 14;
      const y = GROUND_TOP + 6 + Math.random() * (GROUND_BOTTOM - GROUND_TOP - 12);
      const e = new Poochyena(this, x, y, { level, fromGrunt: true });
      this.enemies.push(e);
    }
  }

  dropItems(x, count = 2, onPicked = null) {
    const ids = rollItems(count);
    const gap = count > 2 ? 34 : 30;
    const cx = clamp(x, this.camX + 40 + gap, this.camX + 280 - gap);
    const y = GROUND_TOP + 22;
    this.onPicked = onPicked || (() => this.gruntItemPicked());
    this.pickups = ids.map((id, i) => new Pickup(this, id, x, GROUND_TOP - 30, cx + (i - (count - 1) / 2) * gap * 2, y));
  }

  takePickup(pk) {
    const p = this.player;
    p.addItem(pk.id);
    this.floatText(p.x, p.y - 44, `GOT ${ITEMS[pk.id].name}!`, '#ffd23f');
    this.pickups.forEach((o) => o.poof());
    this.pickups = [];
    this.hoverPickup = null;
    this.refreshItemRow();
    this.onPicked();
  }

  gruntItemPicked() {
    this.waveState = 'none';
    this.locked = false;
    this.waveIdx++;
    if (this.waveIdx >= WAVES.length) this.time.delayedCall(700, () => this.stageClear());
    else this.goT = 3000;
  }

  updateWaves(dt) {
    const p = this.player;
    if (this.grunt && !this.grunt.removed) this.grunt.update(dt);

    if (this.waveState === 'none') {
      const target = clamp(p.x - 130, 0, WORLD_W - VIEW_W);
      this.camX = Math.max(this.camX, target); // arcade-style: no scrolling back
      const next = WAVES[this.waveIdx];
      if (next && p.x >= next.at) this.startWave(next.count, next.level);
      // Random scenes appear as they come into view
      for (const slot of this.slots) {
        if (!slot.spawned && this.camX + VIEW_W + 30 >= slot.x) { slot.spawned = true; this.spawnScene(slot.x); }
      }
    } else if (this.waveState === 'ace') {
      const left = this.enemies.filter((e) => e.fromAce && e.alive && !e.removed).length;
      if (left === 0) {
        const npc = this.aceNpc;
        this.waveState = 'choosing';
        npc.say('Amazing! Take these!', 1600);
        this.time.delayedCall(700, () => {
          this.dropItems(npc.x, ACE_ITEMS, () => {
            this.waveState = 'none';
            this.locked = false;
            this.goT = 3000;
          });
          npc.leave(400);
        });
      }
    } else if (this.waveState === 'fighting') {
      const left = this.enemies.filter((e) => e.fromGrunt && e.alive && !e.removed).length;
      if (left === 0 && this.grunt && this.grunt.state === 'stand') {
        this.grunt.defeat();
        p.heal(effects.waveHeal(p.items)); // Leftovers
        this.waveState = 'choosing';
      }
    } else if (this.waveState === 'choosing') {
      // Which dropped item is Treecko standing on?
      this.hoverPickup = null;
      for (const pk of this.pickups) {
        pk.update(this.time.now, false);
        if (pk.landed && Math.abs(p.x - pk.x) < 14 && Math.abs(p.y - pk.y) < 10 && p.z < 6) this.hoverPickup = pk;
      }
      if (this.hoverPickup) this.hoverPickup.update(this.time.now, true);
    }
    this.cameras.main.scrollX = Math.round(this.camX);
  }

  // ----- Wild encounters --------------------------------------------------------
  updateWild(dt) {
    if (this.phase !== 'play' || this.waveState === 'choosing' || this.waveState === 'ace') return;
    // Time passes twice as fast between waves, so walking stretches get encounters too
    this.wildT -= dt * 1000 * (this.waveState === 'none' ? 2 : 1);
    if (this.wildT > 0 || this.pendingWild) return;
    this.wildT = Phaser.Math.Between(...WILD.interval);
    const wildAlive = this.enemies.filter((e) => e.wild && e.alive && !e.removed).length;
    if (wildAlive >= WILD.maxAlive) return;

    // Pick a species by the encounter table
    const total = WILD.table.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    const species = WILD.table.find((r) => (roll -= r.weight) < 0).species;

    // Rustle a patch of tall grass first, away from the player
    const p = this.player;
    let x;
    for (let tries = 0; tries < 10; tries++) {
      x = this.camX + 30 + Math.random() * (VIEW_W - 60);
      if (Math.abs(x - p.x) > 50) break;
    }
    const fromTop = Math.random() < 0.5;
    const y = fromTop ? GROUND_TOP - 4 : GROUND_BOTTOM + 4;
    this.pendingWild = { species, x, y, t: 750 };
    this.rustle(x, y);
  }

  rustle(x, y) {
    const mark = text(this, x, y - 20, '!', 8, '#ffd23f').setOrigin(0.5).setDepth(19000);
    this.tweens.add({ targets: mark, y: y - 26, yoyo: true, repeat: 2, duration: 120, onComplete: () => mark.destroy() });
    for (let i = 0; i < 8; i++) {
      const leaf = this.add.image(x + (Math.random() - 0.5) * 14, y, 'leaf').setDepth(10 + y);
      this.tweens.add({
        targets: leaf,
        x: leaf.x + (Math.random() - 0.5) * 24,
        y: y - 8 - Math.random() * 14,
        alpha: 0,
        delay: Math.random() * 400,
        duration: 450,
        onComplete: () => leaf.destroy(),
      });
    }
  }

  updatePendingWild(dt) {
    const w = this.pendingWild;
    if (!w) return;
    w.t -= dt * 1000;
    if (w.t > 0) return;
    this.pendingWild = null;
    const opts = { emerge: true, emergeToY: randomLaneY(), level: Phaser.Math.Between(...WILD.levels) };
    const e = w.species === 'poochyena'
      ? new Poochyena(this, w.x, w.y, { ...opts, wild: true })
      : new WILD_CLASSES[w.species](this, w.x, w.y, opts);
    this.enemies.push(e);
  }

  // ----- Evolution -----------------------------------------------------------
  // Testing aid: ?level=16 starts one EXP short of Lv16, so the first knockout evolves.
  applyTestLevel() {
    // Testing aids: ?items=lucky_egg,metal_coat  ?light=furySwipes  ?heavy=seedBomb
    const p0 = this.player;
    for (const id of (this.params.get('items') || '').split(',')) if (ITEMS[id]) p0.addItem(id);
    for (const slot of ['light', 'heavy']) {
      const id = this.params.get(slot);
      if (MOVES_DEF[id] && MOVES_DEF[id].slot === slot) p0.upgrades[slot] = id;
    }
    if (this.params.get('items')) this.refreshItemRow();
    const want = parseInt(new URLSearchParams(window.location.search).get('level'), 10);
    if (!want || want <= START_LEVEL + 1) return;
    const p = this.player;
    p.level = Math.min(99, want - 1);
    p.exp = expForLevel(want) - 1;
    if (p.level >= 16) { p.evolve('grovyle'); this.evoQueue.push('chooseOnly'); }
    if (p.level >= 36) { p.evolve('sceptile'); p.upgrades.special = 'leafStorm'; }
    p.recalcStats(true);
  }

  queueEvolution(into) {
    if (!this.evoQueue.includes(into)) this.evoQueue.push(into);
  }

  startEvolution(into) {
    const p = this.player;
    const isTouch = document.body.classList.contains('touch');
    this.evolution = {
      into, from: p.form, t: 0, stage: into === 'chooseOnly' ? 'choice' : 'anim', isTouch,
    };
    this.evoOverlay.setAlpha(0);
    this.tweens.add({ targets: this.evoOverlay, alpha: 0.6, duration: 300 });
    p.sprite.setVisible(false);
    p.shadow.setVisible(false);
    this.evoSprite.setTexture(p.form, 0).clearTint().setVisible(true);
    this.evoPanel.setVisible(true);
    this.panel.setVisible(false);
    if (into === 'chooseOnly') this.showUpgradeChoice();
    else this.evoText.setText(`What? ${p.name} is evolving!`);
  }

  showUpgradeChoice() {
    const ev = this.evolution;
    const l = ev.isTouch ? 'L' : 'J';
    const h = ev.isTouch ? 'H' : 'K';
    ev.stage = 'choice';
    this.evoText.setText(
      `${this.player.name} can upgrade a move:\n`
      + `${l}: FURY CUTTER (Light) - each light hit in a row hits harder\n`
      + `${h}: LEAF BLADE (Heavy) - stronger, often critical`,
    );
  }

  updateEvolution(delta) {
    const ev = this.evolution;
    const p = this.player;
    ev.t += delta;
    switch (ev.stage) {
      case 'anim': {
        // Flash between the old and new forms, faster and faster
        const k = Math.min(1, ev.t / 2600);
        const interval = 320 - 280 * k;
        const showNew = Math.floor(ev.t / interval) % 2 === 1;
        this.evoSprite.setTexture(showNew ? ev.into : ev.from, 0).setTintFill(0xffffff);
        if (ev.t > 2600) {
          const oldName = p.name;
          p.evolve(ev.into);
          this.evoSprite.setTexture(ev.into, 0).clearTint();
          this.cameras.main.flash(250, 255, 255, 255);
          this.evoText.setText(`Congratulations! Your ${oldName} evolved into ${p.name}!`);
          ev.stage = 'evolved';
          ev.t = 0;
        }
        break;
      }
      case 'evolved':
        if (ev.t > 1600) {
          if (ev.into === 'grovyle' && !p.upgrades.light && !p.upgrades.heavy) {
            this.showUpgradeChoice();
          } else if (ev.into === 'sceptile') {
            p.upgrades.special = 'leafStorm';
            this.evoText.setText(`${p.name}'s BULLET SEED became LEAF STORM!\nA wide volley of leaves, then Sp. Atk drops for a while.`);
            ev.stage = 'done';
            ev.t = 0;
          } else {
            ev.stage = 'done';
            ev.t = 1000;
          }
        }
        break;
      case 'choice':
        if (input.pressed.light || input.pressed.heavy) {
          const fury = input.pressed.light;
          if (fury) p.upgrades.light = 'furyCutter'; else p.upgrades.heavy = 'leafBlade';
          this.evoText.setText(`${p.name} learned ${fury ? 'FURY CUTTER' : 'LEAF BLADE'}!`);
          ev.stage = 'done';
          ev.t = 0;
        }
        break;
      case 'done':
        if (ev.t > 1400) {
          this.tweens.add({ targets: this.evoOverlay, alpha: 0, duration: 250 });
          this.evoPanel.setVisible(false);
          this.evoSprite.setVisible(false);
          p.sprite.setVisible(true);
          p.shadow.setVisible(true);
          p.invuln = 800;
          this.evolution = null;
        }
        break;
    }
  }

  // ----- Random scenes: Ace Trainer, Trader, Move Tutor -------------------------
  spawnScene(x) {
    const p = this.player;
    const forced = this.params.get('scene');
    const weights = { ...SCENE_WEIGHTS };
    if (!Object.keys(p.items).length) delete weights.trader; // nothing to trade yet
    let kind = forced && weights[forced] !== undefined ? forced : null;
    if (!kind) {
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      kind = Object.keys(weights).find((k) => (roll -= weights[k]) < 0);
    }
    if (kind === 'ace') {
      const pool = ACES[1];
      const forcedAce = pool.find((a) => a.pokemon === this.params.get('ace'));
      const ace = forcedAce || pool[Math.floor(Math.random() * pool.length)];
      const tex = Math.random() < 0.5 ? 'ace_trainer_m' : 'ace_trainer_f';
      this.npcs.push(new Npc(this, 'ace', x, tex, ace));
    } else if (kind === 'trader') {
      this.npcs.push(new Npc(this, 'trader', x, 'trader', { offer: ITEM_IDS[Math.floor(Math.random() * ITEM_IDS.length)] }));
    } else {
      this.npcs.push(new Npc(this, 'tutor', x, 'tutor'));
    }
  }

  updateNpcs(dt) {
    const p = this.player;
    this.hoverNpc = null;
    if (this.waveState === 'none' && !this.menu) {
      for (const n of this.npcs) {
        if (n.available && Math.abs(p.x - n.x) < 22 && p.y < GROUND_TOP + 18 && p.z < 6) this.hoverNpc = n;
      }
    }
    const isTouch = document.body.classList.contains('touch');
    const label = { ace: 'BATTLE', trader: 'TRADE', tutor: 'TALK' };
    for (const n of this.npcs) n.update(dt, n === this.hoverNpc, `${isTouch ? 'L' : 'J'}: ${label[n.kind]}`);
    this.npcs = this.npcs.filter((n) => !n.removed);
  }

  talkTo(npc) {
    if (npc.kind === 'ace') this.startAceBattle(npc);
    else if (npc.kind === 'trader') this.openTrade(npc);
    else this.openTutor(npc);
  }

  startAceBattle(npc) {
    const ace = npc.data;
    npc.available = false;
    npc.say(ace.line, 2200);
    this.aceNpc = npc;
    this.waveState = 'ace';
    this.locked = true;
    this.goT = 0;
    const Cls = ACE_CLASSES[ace.pokemon];
    const e = new Cls(this, this.camX + VIEW_W + 24, randomLaneY(), { level: ace.level });
    e.fromAce = true;
    if (ace.pokemon !== 'shedinja') { e.maxHp *= 2.5; e.hp = e.maxHp; } // mini-boss
    this.enemies.push(e);
    this.noteTarget(e);
    this.lastTargetT = 999999;
  }

  openTrade(npc) {
    const p = this.player;
    const offer = npc.data.offer;
    const owned = ITEM_IDS.filter((id) => p.items[id]);
    this.openMenu({
      title: `TRADER: I'll trade my ${ITEMS[offer].name} for one of your items. (${itemDesc(offer, (p.items[offer] || 0) + 1)})`,
      options: [
        ...owned.map((id) => ({
          label: `${ITEMS[id].name}${p.items[id] > 1 ? ` x${p.items[id]}` : ''}`,
          desc: `Give 1: ${itemDesc(id, p.items[id])}`,
          act: () => {
            p.items[id] -= 1;
            if (!p.items[id]) delete p.items[id];
            p.addItem(offer);
            this.refreshItemRow();
            this.floatText(p.x, p.y - 44, `GOT ${ITEMS[offer].name}!`, '#ffd23f');
            npc.say('Pleasure doing business!');
            npc.leave(1200);
            this.closeMenu();
          },
        })),
        { label: 'NO THANKS', desc: 'Keep your items.', act: () => this.closeMenu() },
      ],
    });
  }

  openTutor(npc) {
    const p = this.player;
    const offer = npc.data.offer || (npc.data.offer = rollTutorOffer(p));
    if (!offer) {
      npc.say('I have nothing to teach you!');
      npc.leave(1500);
      return;
    }
    const mv = MOVES_DEF[offer.move];
    const slotName = offer.slot === 'light' ? 'LIGHT' : 'HEAVY';
    const current = p.upgrades[offer.slot];
    const teach = () => {
      p.upgrades[offer.slot] = offer.move;
      this.floatText(p.x, p.y - 44, `${p.name} learned ${mv.name}!`, '#ffd23f');
      npc.say('Use it well!');
      npc.leave(1200);
      this.closeMenu();
    };
    this.openMenu({
      title: `MOVE TUTOR: I can teach your ${p.name} ${mv.name} for its ${slotName} attack!`,
      options: [
        {
          label: 'TEACH IT',
          desc: `${mv.name} (${mv.type}): ${mv.desc}`,
          act: () => {
            if (!current) { teach(); return; }
            // Overwriting a learned move needs confirming
            this.openMenu({
              title: `This will replace ${MOVES_DEF[current].name} with ${mv.name}. Are you sure?`,
              options: [
                { label: 'YES, REPLACE IT', desc: `${mv.name}: ${mv.desc}`, act: teach },
                { label: 'NO, KEEP IT', desc: `${MOVES_DEF[current].name}: ${MOVES_DEF[current].desc}`, act: () => this.closeMenu() },
              ],
            });
          },
        },
        { label: 'NO THANKS', desc: current ? `Keep ${MOVES_DEF[current].name}.` : 'Keep your moves as they are.', act: () => this.closeMenu() },
      ],
    });
  }

  openMenu(menu) {
    this.menu = { ...menu, idx: 0, scroll: 0, openedAt: this.time.now };
    this.menuPanel.setVisible(true);
    this.panel.setVisible(false);
    this.drawMenu();
  }

  closeMenu() {
    this.menu = null;
    this.menuPanel.setVisible(false);
  }

  drawMenu() {
    const m = this.menu;
    this.menuTitle.setText(m.title);
    if (m.idx < m.scroll) m.scroll = m.idx;
    if (m.idx > m.scroll + 3) m.scroll = m.idx - 3;
    this.menuLines.forEach((t, i) => {
      const o = m.options[m.scroll + i];
      t.setText(o ? o.label : '').setColor(m.scroll + i === m.idx ? '#ffd23f' : '#ffffff');
    });
    this.menuCursor.setY(104 + (m.idx - m.scroll) * 11);
    this.menuDesc.setText(m.options[m.idx].desc || '');
  }

  updateMenu() {
    const m = this.menu;
    if (this.time.now - m.openedAt < 200) return; // don't act on the press that opened it
    if (input.pressed.up) { m.idx = (m.idx + m.options.length - 1) % m.options.length; this.drawMenu(); }
    if (input.pressed.down) { m.idx = (m.idx + 1) % m.options.length; this.drawMenu(); }
    if (input.pressed.light) m.options[m.idx].act();
    else if (input.pressed.heavy) this.closeMenu();
  }

  // ----- Move effects that throw things: Seed Bomb, Rock Slide, Thunder Punch's spark -----
  spawnMove(kind, p, atk) {
    if (kind === 'seedBomb') {
      const img = this.add.image(p.x, p.y, 'seed').setScale(2).setDepth(9400);
      this.specials.push({ kind, img, x: p.x + p.facing * 10, y: p.y, z: 14, vx: p.facing * 70, vz: 150, atk, done: false });
    } else if (kind === 'rockSlide') {
      for (let i = 0; i < 5; i++) {
        const x = p.x + p.facing * (24 + i * 14);
        const y = clamp(p.y + (i % 2 ? 6 : -6), GROUND_TOP, GROUND_BOTTOM);
        const img = this.add.image(x, y - 90, 'rock').setDepth(10 + y);
        this.specials.push({ kind, img, x, y, z: 90 + i * 18, vz: 0, atk, done: false, hitSet: new Set() });
      }
    }
  }

  explode(x, y, atk, radius, depth, hitSet) {
    for (const e of this.enemies) {
      if (!e.alive || e.removed || (hitSet && hitSet.has(e))) continue;
      if (Math.abs(e.x - x) < radius && Math.abs(e.y - y) < depth) {
        const r = e.takeHit({ x: x - sign(e.x - x || 1) * 10, y }, atk);
        if (r) { hitSet?.add(e); this.noteTarget(e); }
        if (r === 'hit') this.player.gainEnergy(PLAYER.energyPerHit);
      }
    }
  }

  updateSpecials(dt) {
    for (const s of this.specials) {
      if (s.kind === 'seedBomb') {
        s.vz -= 520 * dt;
        s.x += s.vx * dt;
        s.z += s.vz * dt;
        if (s.z <= 0) {
          s.done = true;
          this.explode(s.x, s.y, { ...s.atk, knockdown: true }, 28, 13);
          this.spark(s.x, s.y - 8, 0x9cff6a);
          this.spark(s.x + 8, s.y - 4, 0x9cff6a);
          this.cameras.main.shake(80, 0.006);
        }
      } else if (s.kind === 'rockSlide') {
        s.vz -= 900 * dt;
        s.z = Math.max(0, s.z + s.vz * dt);
        if (s.z <= 0) {
          s.done = true;
          this.explode(s.x, s.y, { ...s.atk, knockdown: false, stun: 500, push: 10, dmg: s.atk.dmg * 0.5 }, 12, 10, s.hitSet);
          this.spark(s.x, s.y - 4, 0xc8a878);
        }
      }
      s.img.setPosition(Math.round(s.x), Math.round(s.y - s.z)).setDepth(10 + s.y);
      if (s.done) s.img.destroy();
    }
    this.specials = this.specials.filter((s) => !s.done);
  }

  chainSpark(from, dmg) {
    const next = this.enemies
      .filter((e) => e !== from && e.alive && !e.removed && Math.hypot(e.x - from.x, e.y - from.y) < 80)
      .sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
    if (!next) return;
    const g = this.add.graphics().setDepth(9600);
    g.lineStyle(1, 0xffe040, 1);
    const x0 = from.x, y0 = from.y - 14, x1 = next.x, y1 = next.y - 14;
    g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i < 5; i++) g.lineTo(x0 + ((x1 - x0) * i) / 5, y0 + ((y1 - y0) * i) / 5 + (Math.random() - 0.5) * 8);
    g.lineTo(x1, y1); g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    if (next.takeHit({ x: from.x, y: from.y }, { dmg, stun: 250, push: 6 })) this.noteTarget(next);
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

    // Evolve once nothing is mid-air or mid-knockdown
    if (!this.evolution && this.evoQueue.length && this.phase === 'play'
      && ['idle', 'attack', 'land', 'block', 'hurt', 'special'].includes(this.player.state) && !this.player.airborne) {
      this.player.setState('idle');
      this.startEvolution(this.evoQueue.shift());
    }
    if (this.menu) {
      this.updateMenu();
      this.player.render();
      for (const e of this.enemies) e.render();
      this.updateBackground();
      this.updateHud();
      this.panel.setVisible(false);
      return;
    }
    if (this.evolution) {
      this.updateEvolution(delta);
      for (const e of this.enemies) e.render();
      this.updateBackground();
      this.updateHud();
      this.panel.setVisible(false);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= delta;
    } else {
      if (this.phase !== 'intro') this.player.update(dt);
      for (const e of this.enemies) if (!e.removed) e.update(dt);
      this.enemies = this.enemies.filter((e) => !e.removed);
      this.updateSeeds(dt);
      this.updateEnemyShots(dt);
      this.updateClouds(dt);
      this.updateSpecials(dt);
      if (this.phase === 'play') this.updateNpcs(dt);
      this.updateDirector(dt);
      this.updateWild(dt);
      this.updatePendingWild(dt);
      if (this.phase === 'play') this.updateWaves(dt);
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
