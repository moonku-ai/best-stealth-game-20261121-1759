// Bootstrap: canvas, input, the main loop, and the ?shot= screenshot mode.
//
// Normal play runs at requestAnimationFrame with a clamped delta so a tab
// that was hidden cannot jump the simulation. In shot mode the game is
// staged once and rendered a single frame, so a screenshot is deterministic.

import { VIEW_W, VIEW_H } from './config.js';
import { makeGame, updateGame } from './game.js';
import { makeInput, endFrame } from './input.js';
import { render } from './render.js';
import { stageShot, isShotMode } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const input = makeInput(canvas);

// Expose a tiny debug hook: the screenshot script waits for this flag.
window.__gameReady = false;

if (isShotMode(params)) {
  const game = stageShot(params.get('shot'));
  // Render a couple of frames so fonts and gradients settle, then freeze.
  let frames = 0;
  function shotFrame(t) {
    render(ctx, game, 2.6); // blink phase where "Press ENTER" is fully lit
    frames += 1;
    if (frames < 3) requestAnimationFrame(shotFrame);
    else window.__gameReady = true;
  }
  requestAnimationFrame(shotFrame);
} else {
  const game = makeGame();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updateGame(game, input, dt);
    render(ctx, game, now / 1000);
    endFrame(input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__gameReady = true;
}
