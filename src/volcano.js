// Mt. Chimney / Fiery Path Pokémon: Team Magma's grunt Pokémon, wild Pokémon and Tabitha's Camerupt boss.
// All use follower sprites until action sheets are drawn.
import { Enemy, sign, clamp } from './fighters.js';
import { GROUND_TOP, GROUND_BOTTOM, SPRITE_SCALE } from './config.js';

const burn = (total) => ({ total, ms: 3000 });

// Shared: fire a projectile from this enemy
function ember(e, extra = {}) {
  e.scene.fireEnemyShot(e, 'ember', {
    dmg: 5, speed: 150, life: 1.1, stun: 180, push: 12, owner: e, burn: burn(4), ...extra,
  });
}

// ---------------------------------------------------------------------------
// Numel: slow and steady. Ember from range, Tackle up close. Takes turns.
// ---------------------------------------------------------------------------
export class Numel extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'numel', x, y, { name: 'NUMEL', species: 'numel', hp: 30, speed: 34, ...opts });
    this.tackle = { windup: 380, dash: 180, dashSpeed: 130, recovery: 520, dmg: 7, range: 16, depth: 8, stun: 280, push: 24 };
  }

  think(dt, p) {
    const dx = p.x - this.x;
    const adx = Math.abs(dx);
    const lined = Math.abs(p.y - this.y) < 6;
    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        if (!p.alive) break;
        if (this.token) {
          this.tokenAge = (this.tokenAge || 0) + dt * 1000;
          if (adx < 24 && lined) { this.telegraph = true; this.setState('tackleWindup'); }
          else if (adx > 40 && adx < 140 && lined) { this.telegraph = true; this.setState('emberWindup'); }
          else this.moveToward(p.x + (this.x < p.x ? -1 : 1) * 60, p.y, this.cfg.speed, dt);
          if (this.tokenAge > 4000) this.scene.releaseToken(this);
        } else this.hangBack(p, dt, 22);
        break;
      case 'emberWindup':
        if (this.t > 450) { this.telegraph = false; ember(this); this.setState('recover'); }
        break;
      case 'tackleWindup':
        if (this.t > this.tackle.windup) { this.telegraph = false; this.hitSet = new Set(); this.setState('tackle'); }
        break;
      case 'tackle':
        this.x += this.facing * this.tackle.dashSpeed * dt;
        this.moving = true;
        this.scene.enemyHit(this, this.tackle, this.hitSet);
        if (this.t > this.tackle.dash) this.setState('recover');
        break;
      case 'recover':
        if (this.t > 650) { this.scene.releaseToken(this); this.setState('idle'); }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Zubat: flies above the path, flutters erratically, swoops down to bite.
// Leech Life heals it by half the damage dealt.
// ---------------------------------------------------------------------------
export class Zubat extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'zubat', x, y, { name: 'ZUBAT', species: 'zubat', hp: 22, speed: 62, ...opts });
    this.flyZ = 18;
    this.swoop = { windup: 350, dash: 260, dashSpeed: 170, dmg: 6, range: 16, depth: 9, stun: 220, push: 14 };
    this.flutter = Math.random() * 1000;
  }

  physics(dt) {
    // Hovers instead of falling, unless knocked down
    if (['launched', 'down', 'getup', 'dead'].includes(this.state)) return super.physics(dt);
    this.vz = 0;
    const target = this.state === 'swoop' ? 4 : this.flyZ + Math.sin(this.scene.time.now / 180 + this.flutter) * 3;
    this.z += (target - this.z) * Math.min(1, dt * 8);
    this.x += this.vx * dt;
    this.vx *= Math.pow(0.0005, dt);
    this.y = clamp(this.y, GROUND_TOP, GROUND_BOTTOM);
    return this.state === 'emerge' && this.t > 350; // finishes emerging in the air
  }

  think(dt, p) {
    const dx = p.x - this.x;
    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        this.moving = true;
        if (!p.alive) break;
        if (this.token) {
          this.tokenAge = (this.tokenAge || 0) + dt * 1000;
          this.moveToward(p.x + (this.x < p.x ? -1 : 1) * 40, p.y + Math.sin(this.t / 200) * 10, this.cfg.speed, dt);
          if (Math.abs(dx) < 50 && Math.abs(p.y - this.y) < 10) { this.telegraph = true; this.setState('swoopWindup'); }
          if (this.tokenAge > 3500) this.scene.releaseToken(this);
        } else {
          this.paceT += dt * 1000;
          const tx = p.x + (this.x < p.x ? -1 : 1) * (60 + Math.sin(this.paceT / 300) * 25);
          this.moveToward(tx, clamp(p.y + Math.cos(this.paceT / 250) * 20, GROUND_TOP, GROUND_BOTTOM), 40, dt);
        }
        break;
      case 'swoopWindup':
        if (this.t > this.swoop.windup) { this.telegraph = false; this.hitSet = new Set(); this.setState('swoop'); }
        break;
      case 'swoop': {
        this.x += this.facing * this.swoop.dashSpeed * dt;
        this.moving = true;
        const r = this.scene.enemyHit(this, this.swoop, this.hitSet);
        if (r === 'hit') { // Leech Life
          const heal = this.swoop.dmg * this.dmgMult * 0.5;
          this.hp = Math.min(this.maxHp, this.hp + heal);
          this.scene.floatText(this.x, this.y - 40, 'LEECH LIFE', '#9cff6a');
        }
        if (this.t > this.swoop.dash) this.setState('recover');
        break;
      }
      case 'recover':
        this.moving = true;
        if (this.t > 600) { this.scene.releaseToken(this); this.setState('idle'); }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Koffing: floats, puffs Smog clouds. When badly hurt it starts to Self-Destruct!
// ---------------------------------------------------------------------------
export class Koffing extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'koffing', x, y, { name: 'KOFFING', species: 'koffing', hp: 26, speed: 26, ...opts });
    this.noToken = true;
    this.cooldown = 1500;
  }

  physics(dt) {
    if (['launched', 'down', 'getup', 'dead'].includes(this.state)) return super.physics(dt);
    this.vz = 0;
    this.z = 10 + Math.sin(this.scene.time.now / 400) * 2;
    this.x += this.vx * dt;
    this.vx *= Math.pow(0.0005, dt);
    this.y = clamp(this.y, GROUND_TOP, GROUND_BOTTOM);
    return this.state === 'emerge' && this.t > 350; // finishes emerging in the air
  }

  think(dt, p) {
    this.cooldown -= dt * 1000;
    const dx = p.x - this.x;
    if (this.state !== 'selfDestruct' && this.hp < this.maxHp * 0.35 && this.hp > 0) {
      this.scene.floatText(this.x, this.y - 44, 'SELF-DESTRUCT!', '#ff7060');
      this.telegraphColor = 0xff4040;
      this.telegraph = true;
      this.setState('selfDestruct');
      return;
    }
    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        if (!p.alive) break;
        this.moveToward(p.x + (this.x < p.x ? -1 : 1) * 36, p.y, this.cfg.speed, dt);
        if (this.cooldown <= 0 && Math.abs(dx) < 56 && Math.abs(p.y - this.y) < 18) {
          this.scene.spawnHazard(this, { texture: 'smog', life: 2400, radiusX: 26, radiusY: 11, tick: 450, dmg: 3, flat: false });
          this.cooldown = 3600;
        }
        break;
      case 'selfDestruct':
        // Drifts towards you, flashing faster and faster
        this.moveToward(p.x, p.y, 30, dt);
        if (this.t > 1400) {
          this.telegraph = false;
          this.scene.blastPlayer(this.x, this.y, 44, 16, { dmg: 14 * this.dmgMult, knockdown: true }, this);
          this.scene.cameras.main.shake(260, 0.014);
          this.chip(9999);
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Machop: a brawler. Karate Chop (two quick hits) and a sweeping Low Kick.
// ---------------------------------------------------------------------------
export class Machop extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'machop', x, y, { name: 'MACHOP', species: 'machop', hp: 30, speed: 50, ...opts });
    this.chop = { dmg: 5, range: 18, depth: 8, stun: 220, push: 14 };
    this.kick = { dmg: 8, range: 22, depth: 9, knockdown: true };
  }

  think(dt, p) {
    const dx = p.x - this.x;
    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        if (!p.alive) break;
        if (this.token) {
          this.tokenAge = (this.tokenAge || 0) + dt * 1000;
          const there = this.moveToward(p.x + (this.x < p.x ? -1 : 1) * 18, p.y, this.cfg.speed, dt);
          if (there || (Math.abs(dx) < 22 && Math.abs(p.y - this.y) < 5)) {
            this.move = Math.random() < 0.3 ? 'kick' : 'chop';
            this.telegraph = true;
            this.setState('windup');
          }
          if (this.tokenAge > 3000) this.scene.releaseToken(this);
        } else this.hangBack(p, dt, 32);
        break;
      case 'windup':
        if (this.t > (this.move === 'kick' ? 450 : 300)) { this.telegraph = false; this.hitSet = new Set(); this.setState(this.move); }
        break;
      case 'chop':
        if (this.t > 130 && !this.second) { this.second = true; this.hitSet = new Set(); }
        this.showSlash(0.9, 0xff9060);
        this.scene.enemyHit(this, this.chop, this.hitSet);
        if (this.t > 260) { this.second = false; this.setState('recover'); }
        break;
      case 'kick':
        this.showSlash(1.3, 0xff9060);
        this.scene.enemyHit(this, this.kick, this.hitSet);
        if (this.t > 160) this.setState('recover');
        break;
      case 'recover':
        if (this.t > 550) { this.scene.releaseToken(this); this.setState('idle'); }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Torkoal (wild): slow and tough. Withdraws into its shell when you get close,
// and spits Embers.
// ---------------------------------------------------------------------------
export class Torkoal extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'torkoal', x, y, { name: 'TORKOAL', species: 'torkoal', hp: 34, speed: 18, ...opts });
    this.noToken = true;
    this.damageTaken = 0.8;
    this.cooldown = 1800;
    this.shellCooldown = 0;
  }

  think(dt, p) {
    const ms = dt * 1000;
    this.cooldown -= ms;
    this.shellCooldown -= ms;
    const dx = p.x - this.x;
    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        this.damageTaken = 0.8;
        this.tint = null;
        if (!p.alive) break;
        if (Math.abs(dx) < 30 && this.shellCooldown <= 0) {
          this.scene.floatText(this.x, this.y - 40, 'WITHDRAW', '#c8c8c8');
          this.setState('shell');
        } else if (this.cooldown <= 0 && Math.abs(p.y - this.y) < 6 && Math.abs(dx) < 150) {
          this.telegraph = true;
          this.setState('emberWindup');
        } else this.moveToward(p.x + (this.x < p.x ? -1 : 1) * 70, p.y, this.cfg.speed, dt);
        break;
      case 'shell':
        this.damageTaken = 0.25;
        this.tint = 0x909090;
        if (this.t > 1500) { this.shellCooldown = 3500; this.setState('idle'); }
        break;
      case 'emberWindup':
        if (this.t > 500) {
          this.telegraph = false;
          ember(this);
          this.scene.time.delayedCall(160, () => { if (this.alive && !this.removed) ember(this); });
          this.cooldown = 2600;
          this.setState('idle');
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Slugma / Grimer: slow crawlers that leave puddles behind them (lava burns, sludge poisons).
// Slugma spits Embers; Grimer Pounds.
// ---------------------------------------------------------------------------
export class Crawler extends Enemy {
  constructor(scene, key, x, y, opts, kind) {
    super(scene, key, x, y, opts);
    this.kind = kind; // 'lava' | 'sludge'
    this.puddleT = 800;
    this.pound = { windup: 450, dash: 140, dashSpeed: 90, dmg: 7, range: 16, depth: 8, stun: 300, push: 20 };
  }

  think(dt, p) {
    const ms = dt * 1000;
    const dx = p.x - this.x;
    // Leave a puddle behind every so often
    this.puddleT -= ms;
    if (this.puddleT <= 0 && this.alive) {
      this.puddleT = 1400;
      this.scene.spawnHazard(this, {
        texture: this.kind, flat: true, life: 3600, radiusX: 14, radiusY: 5, tick: 500, dmg: 3,
        status: this.kind === 'lava' ? 'burn' : 'poison',
      });
    }
    switch (this.state) {
      case 'idle':
        this.facing = sign(dx);
        if (!p.alive) break;
        if (this.token) {
          this.tokenAge = (this.tokenAge || 0) + ms;
          const lined = Math.abs(p.y - this.y) < 6;
          if (this.kind === 'lava' && lined && Math.abs(dx) > 30 && Math.abs(dx) < 130) { this.telegraph = true; this.setState('spitWindup'); }
          else if (this.kind === 'sludge' && lined && Math.abs(dx) < 22) { this.telegraph = true; this.setState('poundWindup'); }
          else this.moveToward(p.x + (this.x < p.x ? -1 : 1) * (this.kind === 'lava' ? 60 : 16), p.y, this.cfg.speed, dt);
          if (this.tokenAge > 4500) this.scene.releaseToken(this);
        } else this.hangBack(p, dt, this.cfg.speed * 0.7);
        break;
      case 'spitWindup':
        if (this.t > 500) { this.telegraph = false; ember(this); this.setState('recover'); }
        break;
      case 'poundWindup':
        if (this.t > this.pound.windup) { this.telegraph = false; this.hitSet = new Set(); this.setState('pound'); }
        break;
      case 'pound':
        this.x += this.facing * this.pound.dashSpeed * dt;
        this.scene.enemyHit(this, this.pound, this.hitSet);
        if (this.t > this.pound.dash) this.setState('recover');
        break;
      case 'recover':
        if (this.t > 700) { this.scene.releaseToken(this); this.setState('idle'); }
        break;
    }
  }
}

export class Slugma extends Crawler {
  constructor(scene, x, y, opts) {
    super(scene, 'slugma', x, y, { name: 'SLUGMA', species: 'slugma', hp: 24, speed: 20, ...opts }, 'lava');
  }
}

export class Grimer extends Crawler {
  constructor(scene, x, y, opts) {
    super(scene, 'grimer', x, y, { name: 'GRIMER', species: 'grimer', hp: 34, speed: 22, ...opts }, 'sludge');
  }
}

// ---------------------------------------------------------------------------
// Tabitha's Camerupt (stage 2 boss): huge and slow.
//   Take Down: a long telegraphed charge across the lane.
//   Eruption: lava geysers burst under marked spots around you (more of them below half HP).
//   Ember: a spray of three fireballs.
// ---------------------------------------------------------------------------
export class Camerupt extends Enemy {
  constructor(scene, x, y, opts) {
    super(scene, 'camerupt', x, y, { name: 'CAMERUPT', species: 'camerupt', hp: 40, speed: 26, ...opts });
    this.isBoss = true;
    this.size = 1.7;
    this.sprite.setScale(SPRITE_SCALE * this.size);
    this.maxHp *= 3;
    this.hp = this.maxHp;
    this.noToken = true;
    this.cooldown = 1800;
    this.takeDown = { windup: 750, dash: 520, dashSpeed: 230, dmg: 12, range: 30, depth: 12, knockdown: true };
  }

  showSlash(scale, tint) { super.showSlash((scale || 1) * this.size, tint); }

  think(dt, p) {
    const ms = dt * 1000;
    this.cooldown -= ms;
    const dx = p.x - this.x;
    const enraged = this.hp < this.maxHp * 0.5;
    if (enraged && !this.roared) {
      this.roared = true;
      this.scene.floatText(this.x, this.y - 60, 'CAMERUPT is erupting with rage!', '#ff7060');
      this.scene.cameras.main.shake(400, 0.01);
    }
    switch (this.state) {
      case 'idle': {
        this.facing = sign(dx);
        if (!p.alive) break;
        this.moveToward(p.x + (this.x < p.x ? -1 : 1) * 50, p.y, this.cfg.speed, dt);
        if (this.cooldown > 0) break;
        const r = Math.random();
        if (r < 0.4) {
          this.scene.floatText(this.x, this.y - 60, 'ERUPTION!', '#ff7060');
          this.telegraph = true; this.telegraphColor = 0xff4040;
          this.setState('eruption');
        } else if (r < 0.75 && Math.abs(p.y - this.y) < 10) {
          this.scene.floatText(this.x, this.y - 60, 'TAKE DOWN!', '#ffd23f');
          this.telegraph = true; this.telegraphColor = 0xffe070;
          this.setState('takeDownWindup');
        } else {
          this.telegraph = true; this.telegraphColor = 0xff9040;
          this.setState('emberWindup');
        }
        break;
      }
      case 'eruption':
        this.offsetX = Math.floor(this.t / 50) % 2 ? 1 : -1;
        if (this.t > 500) {
          this.telegraph = false;
          // Mark spots around the player; they burst a moment later
          const n = enraged ? 7 : 4;
          const spots = [{ x: p.x, y: p.y }];
          for (let i = 1; i < n; i++) {
            spots.push({ x: p.x + (Math.random() - 0.5) * 140, y: clamp(p.y + (Math.random() - 0.5) * 50, GROUND_TOP, GROUND_BOTTOM) });
          }
          this.scene.spawnGeysers(this, spots, { delay: 900, dmg: 10 * this.dmgMult, radius: 16 });
          this.finish(enraged ? 1300 : 1900);
        }
        break;
      case 'takeDownWindup':
        this.offsetX = -this.facing * 3;
        if (this.t > this.takeDown.windup) { this.telegraph = false; this.hitSet = new Set(); this.setState('takeDown'); }
        break;
      case 'takeDown':
        this.x += this.facing * this.takeDown.dashSpeed * dt;
        this.moving = true;
        this.showSlash(1.2, 0xffb060);
        this.scene.enemyHit(this, this.takeDown, this.hitSet);
        if (this.t > this.takeDown.dash) {
          this.chip(this.maxHp * 0.02); // recoil
          this.scene.cameras.main.shake(120, 0.008);
          this.finish(enraged ? 900 : 1400);
        }
        break;
      case 'emberWindup':
        if (this.t > 450) {
          this.telegraph = false;
          for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 120, () => {
              if (this.alive && !this.removed) ember(this, { dmg: 7, speed: 170 + i * 15 });
            });
          }
          this.finish(1200);
        }
        break;
      case 'recover':
        if (this.t > this.rest) this.setState('idle');
        break;
    }
  }

  finish(rest) {
    this.rest = rest;
    this.cooldown = 400;
    this.setState('recover');
  }
}

export const VOLCANO_CLASSES = {
  numel: Numel, zubat: Zubat, koffing: Koffing, machop: Machop, torkoal: Torkoal, slugma: Slugma, grimer: Grimer, camerupt: Camerupt,
};
