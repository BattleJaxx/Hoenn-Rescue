import Phaser from 'phaser';
import { VIEW_W, VIEW_H } from './config.js';
import { BootScene, TitleScene, GameScene } from './game.js';
import './input.js';

async function start() {
  // Wait (briefly) for the pixel font so the first frame of text isn't a fallback font
  try {
    await Promise.race([
      document.fonts.load('8px "Press Start 2P"'),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch (e) { /* offline: fall back to monospace */ }

  window.__game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { keyboard: false, mouse: false, touch: false }, // our own input layer handles controls
    scene: [BootScene, TitleScene, GameScene],
  });
}

start();
