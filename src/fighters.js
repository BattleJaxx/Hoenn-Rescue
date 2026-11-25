import {
  SPRITE_SCALE, FEET_Y, GROUND_TOP, GROUND_BOTTOM, WORLD_W, GRAVITY,
  PLAYER, ATTACKS, POOCHYENA,
} from './config.js';
import { input } from './input.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sign = (v) => (v < 0 ? -1 : 1);

// Follower sprite frames: 0-1 facing down, 2-3 facing up, 4-5 side (facing left)
const SIDE_A = 4;
const SIDE_B = 5;

// ---------------------------------------------------------------------------
// Base fighter: position on the beat 'em up plane (x, y = depth, z = height)
// ---------------------------------------------------------------------------
export class Fighter {
  constructor(scene, key, x, y, hp, name) {
    this.scene = scene;
    this.name = name;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.facing = 1;
    this.hp = hp;
    this.maxHp = hp;
    this.state = 'idle';
    this.t = 0;
    this.flash = 0;
    this.invuln = 0;
    this.offsetX = 0;
    this.walkT = 0;
    this.moving = false;
    this.removed = false;

    this.shadow = scene.add.image(x, y, 'shadow').setDepth(5).setScale(1.1, 1);
    this.sprite = scene.add.sprite(x, y, key, SIDE_A)
      .setOrigin(0.5, FEET_Y)
      .setScale(SPRITE_SCALE);
    this.slash = scene.add.image(x, y, 'slash').setVisible(false).setOrigin(0.2, 0.5);
  }

  setState(s) {
    this.state = s;
    this.t = 0;
  }

  get airborne() { return this.z > 0 || this.vz > 0; }
  get alive() { return this.hp > 0; }

  // Gravity, knockback sliding and landing. Returns true on the frame it lands.
  physics(dt) {
    let landed = false;
    if (this.airborne) {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        this.vz = 0;
        landed = true;
      }
    }
    this.x += this.vx * dt;
    if (!this.airborne) this.vx *= Math.pow(0.0005, dt); // ground friction
    if (Math.abs(this.vx) < 2) this.vx = 0;
    this.y = clamp(this.y, GROUND_TOP, GROUND_BOTTOM);
    return landed;
  }

  // Called when an attack connects. Returns 'hit', 'blocked' or null (ignored).
  takeHit(src, atk) {
    if (!this.alive || this.invuln > 0) return null;
    if (['launched', 'down', 'getup', 'dead'].includes(this.state)) return null;

    const dir = sign(this.x - src.x); // direction we get pushed

    if (this.state === 'block' && this.facing === -dir) {
      this.hp = Math.max(1, this.hp - 1); // chip damage, can't kill
      this.vx = dir * 50;
      this.blockFlash = 80;
      this.scene.sfxBlock(this);
      return 'blocked';
    }

    this.hp = Math.max(0, this.hp - atk.dmg);
    this.flash = 90;
    this.facing = -dir;

    if (this.hp <= 0 || atk.knockdown || this.airborne) {
      this.vx = dir * 95;
      this.vz = 150;
      this.z = Math.max(this.z, 1);
      this.setState('launched');
    } else {
      this.vx = dir * (atk.push || 20) * 3;
      this.stun = atk.stun || 250;
      this.setState('hurt');
    }
    this.onHurt?.();
    return 'hit';
  }

  // Shared handling of hurt / knockdown / get-up. Returns true if it handled this frame.
  updateDamageStates(dt, landed) {
    const ms = dt * 1000;
    switch (this.state) {
      case 'hurt':
        if (this.t > this.stun) this.setState('idle');
        return true;
      case 'launched':
        if (landed) {
          this.scene.cameras.main.shake(60, 0.004);
          this.setState(this.alive ? 'down' : 'dead');
        }
        return true;
      case 'down':
        if (this.t > 650) this.setState('getup');
        return true;
      case 'getup':
        if (this.t > 260) {
          this.invuln = 700;
          this.setState('idle');
        }
        return true;
      case 'dead':
        return true;
      default:
        return false;
    }
  }

  tickTimers(dt) {
    const ms = dt * 1000;
    this.t += ms;
    this.flash = Math.max(0, this.flash - ms);
    this.blockFlash = Math.max(0, (this.blockFlash || 0) - ms);
    this.invuln = Math.max(0, this.invuln - ms);
  }

  render() {
    const s = this.sprite;
    // Walk cycle on side frames
    let frame = SIDE_A;
    if (this.moving) {
      this.walkT += this.scene.frameDt;
      frame = Math.floor(this.walkT / 130) % 2 === 0 ? SIDE_A : SIDE_B;
    }
    s.setFrame(frame);
    s.setFlipX(this.facing > 0);
    s.setPosition(Math.round(this.x + this.offsetX), Math.round(this.y - this.z));
    s.setDepth(10 + this.y);

    // Pose for knockdowns
    let angle = 0;
    if (this.state === 'launched') angle = -this.facing * 35;
    if (this.state === 'down' || this.state === 'dead') angle = -this.facing * 90;
    if (this.state === 'getup') angle = -this.facing * 45;
    s.setAngle(angle);

    // Tints: white flash on hit, blue on block
    if (this.flash > 0) s.setTintFill(0xffffff);
    else if (this.blockFlash > 0) s.setTintFill(0x9fc4ff);
    else if (this.state === 'block') s.setTint(0x9fc4ff);
    else if (this.telegraph) s.setTint(Math.floor(this.t / 60) % 2 ? 0xffe070 : 0xffffff);
    else s.clearTint();

    // Blink while invulnerable after getting up, or while fading out when dead
    let alpha = 1;
    if (this.invuln > 0) alpha = Math.floor(this.invuln / 70) % 2 ? 0.4 : 1;
    if (this.fade !== undefined) alpha = Math.floor(this.fade / 60) % 2 ? 0.2 : 1;
    s.setAlpha(alpha);

    // Shadow shrinks as we go higher
    const sh = clamp(1.1 - this.z / 120, 0.5, 1.1);
    this.shadow.setPosition(Math.round(this.x), Math.round(this.y)).setScale(sh, 1);
  }

  showSlash(scale) {
    this.slash
      .setVisible(true)
      .setScale(scale || 1)
      .setFlipX(this.facing < 0)
      .setOrigin(this.facing > 0 ? 0.2 : 0.8, 0.5)
      .setPosition(Math.round(this.x + this.facing * 8), Math.round(this.y - this.z - 14))
      .setDepth(11 + this.y);
  }

  hideSlash() { this.slash.setVisible(false); }

  destroy() {
    this.removed = true;
    this.sprite.destroy();
    this.shadow.destroy();
    this.slash.destroy();
  }
}

// ---------------------------------------------------------------------------
// Player: Treecko
// ---------------------------------------------------------------------------
export class Player extends Fighter {
  constructor(scene, x, y) {
    super(scene, 'treecko', x, y, PLAYER.hp, 'TREECKO');
    this.energy = 0;
    this.queued = null;
  }

  startAttack(name) {
    this.atkName = name;
    this.atk = ATTACKS[name];
    this.hitSet = new Set();
    this.queued = null;
    this.setState('attack');
  }

  update(dt) {
    this.tickTimers(dt);
    const landed = this.physics(dt);
    this.moving = false;
    this.offsetX = 0;
    this.hideSlash();
    this.clampToScreen();

    if (this.updateDamageStates(dt, landed)) return;

    const I = input;
    const dirX = (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0);
    const dirY = (I.held.down ? 1 : 0) - (I.held.up ? 1 : 0);

    switch (this.state) {
      case 'idle':
      case 'walk': {
        if (I.pressed.special && this.energy >= PLAYER.specialCost) {
          this.energy -= PLAYER.specialCost;
          this.seedsFired = 0;
          this.setState('special');
          break;
        }
        if (I.pressed.light) { this.startAttack('light1'); break; }
        if (I.pressed.heavy) { this.startAttack('heavy'); break; }
        if (I.pressed.jump) {
          this.vz = PLAYER.jumpVel;
          this.vx = dirX * PLAYER.speedX;
          this.z = 1;
          this.airAtk = null;
          this.setState('jump');
          break;
        }
        if (I.held.block) { this.setState('block'); break; }
        if (dirX) this.facing = dirX;
        this.x += dirX * PLAYER.speedX * dt;
        this.y += dirY * PLAYER.speedY * dt;
        this.moving = dirX !== 0 || dirY !== 0;
        break;
      }

      case 'block':
        if (!I.held.block) this.setState('idle');
        break;

      case 'jump': {
        if (!this.airAtk && (I.pressed.light || I.pressed.heavy)) {
          this.airAtk = I.pressed.heavy ? 'jumpHeavy' : 'jumpLight';
          this.hitSet = new Set();
        }
        if (this.airAtk) {
          const atk = ATTACKS[this.airAtk];
          this.showSlash(this.airAtk === 'jumpHeavy' ? 1.4 : 1.1);
          this.offsetX = this.facing * 3;
          this.scene.meleeHit(this, atk, this.hitSet);
        }
        if (landed) {
          this.vx = 0;
          this.setState('land');
        }
        break;
      }

      case 'land':
        if (this.t > 90) this.setState('idle');
        break;

      case 'attack': {
        const a = this.atk;
        if (I.pressed.light) this.queued = 'light';
        const tActive = a.startup;
        const tRecover = a.startup + a.active;
        const tEnd = tRecover + a.recovery;
        if (this.t < tActive) {
          this.offsetX = -this.facing * (this.atkName === 'heavy' ? 3 : 1); // wind-up
        } else if (this.t < tRecover) {
          this.offsetX = this.facing * a.lunge;
          this.showSlash(a.slashScale);
          this.scene.meleeHit(this, a, this.hitSet);
        } else {
          this.offsetX = this.facing * Math.max(0, a.lunge - (this.t - tRecover) / 30);
          // Light chain: L, L, L
          const next = { light1: 'light2', light2: 'light3' }[this.atkName];
          if (this.queued === 'light' && next) { this.startAttack(next); break; }
        }
        if (this.t >= tEnd) this.setState('idle');
        break;
      }

      case 'special': {
        // Bullet Seed: a burst of four seeds
        const times = [90, 160, 230, 300];
        while (this.seedsFired < times.length && this.t >= times[this.seedsFired]) {
          this.scene.fireSeed(this);
          this.seedsFired++;
        }
        this.offsetX = -this.facing * (this.seedsFired % 2);
        if (this.t > 480) this.setState('idle');
        break;
      }
    }

    this.clampToScreen();
  }

  // Keep Treecko on screen and inside the world
  clampToScreen() {
    const cam = this.scene.camX;
    this.x = clamp(this.x, Math.max(10, cam + 10), Math.min(WORLD_W - 10, cam + 310));
    this.y = clamp(this.y, GROUND_TOP, GROUND_BOTTOM);
  }

  gainEnergy(n) {
    this.energy = Math.min(PLAYER.energyMax, this.energy + n);
  }
}

// ---------------------------------------------------------------------------
// Enemy: Team Aqua Poochyena (rusher)
// ---------------------------------------------------------------------------
export class Poochyena extends Fighter {
  constructor(scene, x, y) {
    super(scene, 'poochyena', x, y, POOCHYENA.hp, 'POOCHYENA');
    this.token = false;
    this.slotY = (Math.random() - 0.5) * 30;
    this.slotX = 54 + Math.random() * 30;
    this.paceT = Math.random() * 1000;
    this.setState('enter');
  }

  onHurt() {
    this.telegraph = false;
    this.scene.releaseToken(this);
  }

  update(dt) {
    this.tickTimers(dt);
    const landed = this.physics(dt);
    this.moving = false;
    this.offsetX = 0;
    this.hideSlash();

    if (this.state === 'dead') {
      this.fade = (this.fade || 0) + dt * 1000;
      if (this.fade > 700) this.destroy();
      return;
    }
    // Once on screen, stay on screen (the player can't scroll back to reach them)
    if (this.state !== 'enter') {
      const cam = this.scene.camX;
      this.x = clamp(this.x, cam + 8, cam + 312);
    }
    if (this.updateDamageStates(dt, landed)) return;

    const p = this.scene.player;
    const B = POOCHYENA.bite;
    const dx = p.x - this.x;
    const side = this.x < p.x ? -1 : 1; // which side of the player we're on

    const moveToward = (tx, ty, speed) => {
      const ddx = tx - this.x;
      const ddy = ty - this.y;
      const d = Math.hypot(ddx, ddy);
      if (d < 2) return true;
      const step = Math.min(d, speed * dt);
      this.x += (ddx / d) * step;
      this.y += (ddy / d) * step;
      this.moving = true;
      return false;
    };

    switch (this.state) {
      case 'enter': {
        // Run in from off-screen
        const cam = this.scene.camX;
        this.facing = sign(dx);
        moveToward(clamp(this.x, cam + 30, cam + 290), this.y, POOCHYENA.speed);
        if (this.x > cam + 24 && this.x < cam + 296) this.setState('idle');
        break;
      }

      case 'idle': {
        this.facing = sign(dx);
        if (!p.alive) {
          this.paceT += dt * 1000;
          break;
        }
        if (this.token) {
          // Close in and line up for a bite
          const tx = p.x + side * 20;
          const ty = p.y;
          const there = moveToward(tx, ty, POOCHYENA.speed);
          if (there || (Math.abs(dx) < 24 && Math.abs(p.y - this.y) < 5)) {
            this.telegraph = true;
            this.setState('windup');
          }
          this.tokenAge = (this.tokenAge || 0) + dt * 1000;
          if (this.tokenAge > 3000) this.scene.releaseToken(this); // gave up
        } else {
          // Wait at a distance, pacing back and forth
          this.paceT += dt * 1000;
          const pace = Math.sin(this.paceT / 500) * 8;
          const tx = p.x + side * (this.slotX + pace);
          const ty = clamp(p.y + this.slotY, GROUND_TOP, GROUND_BOTTOM);
          moveToward(tx, ty, POOCHYENA.waitSpeed);
        }
        break;
      }

      case 'windup':
        this.offsetX = -this.facing * 2;
        if (this.t > B.windup) {
          this.telegraph = false;
          this.hitSet = new Set();
          this.setState('bite');
        }
        break;

      case 'bite':
        this.x += this.facing * B.dashSpeed * dt;
        this.moving = true;
        this.showSlash(0.8);
        this.scene.enemyHit(this, B, this.hitSet);
        if (this.t > B.dash) this.setState('recover');
        break;

      case 'recover':
        if (this.t > B.recovery) {
          this.scene.releaseToken(this);
          this.setState('idle');
        }
        break;
    }
  }
}
