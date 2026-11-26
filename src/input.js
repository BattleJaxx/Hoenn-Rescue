// Unified input: keyboard + on-screen touch controls.
// Each frame the game calls input.update(), then reads:
//   input.held.<name>     true while the control is held
//   input.pressed.<name>  true only on the frame it was pressed
// Names: left, right, up, down, light, heavy, jump, special, block, start

const NAMES = ['left', 'right', 'up', 'down', 'light', 'heavy', 'jump', 'special', 'block', 'start'];

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyJ: 'light', KeyZ: 'light',
  KeyK: 'heavy', KeyX: 'heavy',
  Space: 'jump', KeyC: 'jump',
  KeyL: 'special', KeyV: 'special',
  ShiftLeft: 'block', ShiftRight: 'block', KeyI: 'block',
  Enter: 'start',
};

class Input {
  constructor() {
    this.keys = {};    // keyboard state
    this.touch = {};   // touch button state
    this.stick = { x: 0, y: 0 };
    this.held = {};
    this.pressed = {};
    this.prev = {};
    this.latched = new Set(); // presses that happened since the last update (so quick taps are never missed)
    this.anyPressed = false;
    NAMES.forEach((n) => { this.held[n] = false; this.pressed[n] = false; this.prev[n] = false; });

    window.addEventListener('keydown', (e) => {
      const name = KEYMAP[e.code];
      if (name) {
        if (!e.repeat) this.latched.add(name);
        this.keys[name] = true;
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const name = KEYMAP[e.code];
      if (name) { this.keys[name] = false; e.preventDefault(); }
    });
    window.addEventListener('blur', () => { this.keys = {}; });

    this.setupTouch();
  }

  setupTouch() {
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) document.body.classList.add('touch');

    // iOS Safari ignores user-scalable=no and can still zoom on quick repeated taps
    // (e.g. spamming Light) or pinches. Cancelling the touch events themselves stops that;
    // the game reads pointer events, which still fire.
    const noZoom = (e) => { if (e.cancelable) e.preventDefault(); };
    document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) noZoom(e); }, { passive: false });
    document.addEventListener('touchend', noZoom, { passive: false });
    document.addEventListener('dblclick', noZoom, { passive: false });
    for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, noZoom, { passive: false });

    // Buttons
    document.querySelectorAll('#buttons .btn').forEach((el) => {
      const name = el.dataset.btn;
      const down = (e) => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        this.touch[name] = true;
        this.latched.add(name);
        el.classList.add('down');
      };
      const up = (e) => {
        e.preventDefault();
        this.touch[name] = false;
        el.classList.remove('down');
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Analogue-style d-pad: direction from touch position relative to centre
    const pad = document.getElementById('dpad');
    const knob = document.getElementById('dpad-knob');
    if (!pad) return;
    let activeId = null;
    const move = (e) => {
      const r = pad.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2);
      let dy = (e.clientY - cy) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.stick.x = dx;
      this.stick.y = dy;
      knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
    };
    const release = () => {
      activeId = null;
      this.stick.x = 0;
      this.stick.y = 0;
      knob.style.transform = '';
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      activeId = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      move(e);
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === activeId) move(e); });
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
    pad.addEventListener('lostpointercapture', release);

    // Tapping anywhere on the game counts as "start" (title / retry screens)
    document.getElementById('game').addEventListener('pointerdown', () => { this.touch.start = true; this.latched.add('start'); });
    document.getElementById('game').addEventListener('pointerup', () => { this.touch.start = false; });
  }

  update() {
    const DEAD = 0.35;
    const touchDir = {
      left: this.stick.x < -DEAD,
      right: this.stick.x > DEAD,
      up: this.stick.y < -DEAD,
      down: this.stick.y > DEAD,
    };
    this.anyPressed = false;
    NAMES.forEach((n) => {
      const h = !!(this.keys[n] || this.touch[n] || touchDir[n]);
      this.pressed[n] = (h && !this.prev[n]) || this.latched.has(n);
      this.held[n] = h;
      this.prev[n] = h;
      if (this.pressed[n] && !['left', 'right', 'up', 'down'].includes(n)) this.anyPressed = true;
    });
    this.latched.clear();
  }
}

export const input = new Input();
