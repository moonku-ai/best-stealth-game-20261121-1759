// Game state: screens, the run, and one simulation step.
//
// Screens (a stack of one, per game-ui-ux: only the top screen takes input):
//   title -> playing -> paused -> playing
//   playing -> levelComplete -> (next level | victory)
//   playing -> gameOver -> title
//
// The run: 3 levels, 3 lives shared across them. Each level asks for its 3
// artifacts; the exit opens only once all are pocketed. Score: 500 per
// artifact, 1000 for finishing a level, a time bonus against par, and 300
// for finishing a level without ever raising the alarm.

import {
  TILE,
  PLAYER_SNEAK_SPEED,
  PLAYER_RUN_SPEED,
  NOISE_RUN_RADIUS,
  NOISE_COIN_RADIUS,
  COIN_THROW_RANGE,
  COINS_START,
  LIVES_START,
} from './config.js';
import { LEVELS } from './levels.js';
import { makeGuard, updateGuard, hearNoise, anyChasing, maxDetection, pointBlockedForBody } from './guard.js';
import { findTiles, tileCenter, pointBlocked } from './stealth.js';
import { moveVector, wasPressed, wasClicked } from './input.js';
import { ensureAudio, setMuted, sfx } from './audio.js';

export function makeGame() {
  return {
    screen: 'title', // title | playing | paused | levelComplete | gameOver | victory
    levelIndex: 0,
    lives: LIVES_START,
    coins: COINS_START,
    score: 0,
    totalTime: 0,
    levelTime: 0,
    alarmedThisLevel: false,
    muted: false,
    // Per-level state, rebuilt by loadLevel().
    grid: null,
    level: null,
    player: null,
    guards: [],
    artifacts: [], // {x, y, taken}
    coinPickups: [], // {x, y, taken}
    exit: null, // {x, y, open}
    coinsInFlight: [], // {x, y, tx, ty, t, dur}
    noiseRings: [], // {x, y, r, maxR, alpha}
    particles: [], // {x, y, vx, vy, life, maxLife, color, size}
    shake: 0, // trauma 0..1, decays; the renderer turns it into an offset
    hitStop: 0, // seconds of frozen time left (game-feel tier: large events)
    flash: 0, // red vignette strength after being caught
    message: '', // centre-screen toast
    messageTimer: 0,
    levelStats: null, // {time, score, stars, alarmed} shown on levelComplete
    stepTimer: 0, // footstep cadence
    runNoiseTimer: 0,
  };
}

export function loadLevel(game, index) {
  const level = LEVELS[index];
  const grid = level.map.slice();
  const start = findTiles(grid, 'P')[0];
  const exitTile = findTiles(grid, 'E')[0];
  game.level = level;
  game.grid = grid;
  game.levelIndex = index;
  game.levelTime = 0;
  game.alarmedThisLevel = false;
  game.coinsInFlight = [];
  game.noiseRings = [];
  game.particles = [];
  game.shake = 0;
  game.hitStop = 0;
  game.flash = 0;
  const sp = tileCenter(start.col, start.row);
  game.player = {
    x: sp.x,
    y: sp.y,
    facing: 0,
    moving: false,
    sneaking: false,
    running: false,
    radius: 13,
  };
  game.guards = level.guards.map(makeGuard);
  game.artifacts = findTiles(grid, 'A').map((t) => ({ ...tileCenter(t.col, t.row), taken: false }));
  game.coinPickups = findTiles(grid, 'o').map((t) => ({ ...tileCenter(t.col, t.row), taken: false }));
  const ep = tileCenter(exitTile.col, exitTile.row);
  game.exit = { x: ep.x, y: ep.y, open: false };
}

export function artifactsLeft(game) {
  return game.artifacts.filter((a) => !a.taken).length;
}

export function startRun(game) {
  game.lives = LIVES_START;
  game.coins = COINS_START;
  game.score = 0;
  game.totalTime = 0;
  loadLevel(game, 0);
  game.screen = 'playing';
}

export function nextLevel(game) {
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = 'victory';
    return;
  }
  loadLevel(game, game.levelIndex + 1);
  game.screen = 'playing';
}

// Stars for a finished level: 3 under par with no alarm, 2 under par + 50%,
// else 1. A level finished with the alarm raised never earns 3 stars.
function starsFor(game) {
  if (game.alarmedThisLevel) return game.levelTime <= game.level.parSeconds ? 2 : 1;
  if (game.levelTime <= game.level.parSeconds) return 3;
  if (game.levelTime <= game.level.parSeconds * 1.5) return 2;
  return 1;
}

function finishLevel(game) {
  const timeBonus = Math.max(0, Math.round(600 - game.levelTime * 5));
  const quietBonus = game.alarmedThisLevel ? 0 : 300;
  const gained = 1000 + timeBonus + quietBonus;
  game.score += gained;
  game.levelStats = {
    time: game.levelTime,
    score: gained,
    stars: starsFor(game),
    alarmed: game.alarmedThisLevel,
    total: game.score,
  };
  game.screen = 'levelComplete';
  sfx.levelClear();
  burst(game, game.exit.x, game.exit.y, '#39d98a', 26);
}

// A small burst of particles (game-feel: medium tier on pickups, large on wins).
export function burst(game, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 120;
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  game.shake = Math.min(1, game.shake + (n >= 20 ? 0.45 : 0.18));
}

// The tile under the player: shadow, lamplight or plain — it shapes how
// fast guards spot the player.
export function playerLight(game) {
  const col = Math.floor(game.player.x / TILE);
  const row = Math.floor(game.player.y / TILE);
  const ch = game.grid[row] ? game.grid[row][col] : '#';
  return { inShadow: ch === 'S', inLampLight: ch === 'L' };
}

function movePlayer(game, input, dt) {
  const mv = moveVector(input);
  const p = game.player;
  const sneaking = input.keys.has('sneak');
  const moving = mv.x !== 0 || mv.y !== 0;
  p.sneaking = sneaking && moving;
  p.running = moving && !sneaking;
  p.moving = moving;
  if (!moving) return;
  const speed = sneaking ? PLAYER_SNEAK_SPEED : PLAYER_RUN_SPEED;
  const step = speed * dt;
  const nx = p.x + mv.x * step;
  const ny = p.y + mv.y * step;
  if (!pointBlockedForBody(game.grid, nx, p.y)) p.x = nx;
  if (!pointBlockedForBody(game.grid, p.x, ny)) p.y = ny;
  p.facing = Math.atan2(mv.y, mv.x);

  // Footsteps: a soft tick on a cadence that follows the pace.
  game.stepTimer -= dt;
  if (game.stepTimer <= 0) {
    sfx.step(sneaking);
    game.stepTimer = sneaking ? 0.42 : 0.3;
  }
  // Running is loud: every 0.45s it rings a noise guards can hear.
  if (p.running) {
    game.runNoiseTimer -= dt;
    if (game.runNoiseTimer <= 0) {
      game.runNoiseTimer = 0.45;
      game.noiseRings.push({ x: p.x, y: p.y, r: 8, maxR: NOISE_RUN_RADIUS, alpha: 0.5 });
      hearNoise(game.guards, p.x, p.y, NOISE_RUN_RADIUS);
    }
  }
}

function throwCoin(game, tx, ty) {
  if (game.coins <= 0) {
    game.message = 'No coins left — find more on the floor';
    game.messageTimer = 1.6;
    return;
  }
  const p = game.player;
  const dist = Math.hypot(tx - p.x, ty - p.y);
  if (dist > COIN_THROW_RANGE) {
    // Clamp the landing point to the throw range.
    tx = p.x + ((tx - p.x) / dist) * COIN_THROW_RANGE;
    ty = p.y + ((ty - p.y) / dist) * COIN_THROW_RANGE;
  }
  if (pointBlocked(game.grid, tx, ty)) return;
  game.coins -= 1;
  game.coinsInFlight.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx, ty, t: 0, dur: 0.35 });
  sfx.coinThrow();
}

function updateCoinsInFlight(game, dt) {
  for (let i = game.coinsInFlight.length - 1; i >= 0; i--) {
    const c = game.coinsInFlight[i];
    c.t += dt;
    const k = Math.min(1, c.t / c.dur);
    // Lerp from the throw point, with a little arc on top.
    c.x = c.sx + (c.tx - c.sx) * k;
    c.y = c.sy + (c.ty - c.sy) * k - Math.sin(k * Math.PI) * 26; // little arc
    if (k >= 1) {
      game.coinsInFlight.splice(i, 1);
      game.noiseRings.push({ x: c.tx, y: c.ty, r: 8, maxR: NOISE_COIN_RADIUS, alpha: 0.7 });
      hearNoise(game.guards, c.tx, c.ty, NOISE_COIN_RADIUS);
      sfx.coinLand();
    }
  }
}

function updatePlaying(game, input, dt) {
  game.levelTime += dt;
  game.totalTime += dt;
  if (game.messageTimer > 0) game.messageTimer -= dt;

  // Hit-stop freezes the simulation for a beat after being caught.
  if (game.hitStop > 0) {
    game.hitStop -= dt;
    return;
  }

  movePlayer(game, input, dt);

  // Mouse click throws a coin toward the click.
  const click = wasClicked(input);
  if (click) throwCoin(game, click.x, click.y);
  updateCoinsInFlight(game, dt);

  // Pickups: artifacts and coins.
  const p = game.player;
  for (const a of game.artifacts) {
    if (!a.taken && Math.hypot(a.x - p.x, a.y - p.y) < 26) {
      a.taken = true;
      game.score += 500;
      sfx.pickup();
      burst(game, a.x, a.y, '#ffd75e', 12);
      if (artifactsLeft(game) === 0) {
        game.exit.open = true;
        game.message = 'All artifacts found — reach the green exit!';
        game.messageTimer = 2.5;
        sfx.unlock();
      } else {
        game.message = `Artifact ${3 - artifactsLeft(game)} of 3`;
        game.messageTimer = 1.4;
      }
    }
  }
  for (const c of game.coinPickups) {
    if (!c.taken && Math.hypot(c.x - p.x, c.y - p.y) < 24) {
      c.taken = true;
      game.coins += 2;
      sfx.pickup();
      burst(game, c.x, c.y, '#f5b942', 8);
    }
  }

  // Guards see, chase, search — and catch.
  const light = playerLight(game);
  const events = { spotted: false, caught: false };
  const playerState = {
    x: p.x,
    y: p.y,
    sneaking: p.sneaking,
    running: p.running,
    inShadow: light.inShadow,
    inLampLight: light.inLampLight,
  };
  for (const guard of game.guards) {
    const before = guard.detection;
    updateGuard(game.grid, guard, playerState, dt, events);
    if (before < 0.55 && guard.detection >= 0.55 && guard.state === 'suspicious') sfx.suspicious();
  }
  if (events.spotted && !game.alarmedThisLevel) {
    game.alarmedThisLevel = true;
    game.message = 'SPOTTED! Break line of sight!';
    game.messageTimer = 2;
    game.shake = Math.min(1, game.shake + 0.5);
    sfx.alarm();
  }
  if (events.caught) {
    game.lives -= 1;
    game.flash = 1;
    game.hitStop = 0.12;
    game.shake = 1;
    sfx.caught();
    if (game.lives <= 0) {
      game.screen = 'gameOver';
    } else {
      // The attempt restarts: same level, guards and player back to start.
      loadLevel(game, game.levelIndex);
      game.message = `Caught! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left`;
      game.messageTimer = 2;
    }
    return;
  }

  // Exit: only open once every artifact is pocketed.
  if (game.exit.open && Math.hypot(game.exit.x - p.x, game.exit.y - p.y) < 28) {
    finishLevel(game);
    return;
  }

  // Particles, rings, shake and flash decay in real time.
  updateFx(game, dt);
}

function updateFx(game, dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const pt = game.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    if (pt.life <= 0) game.particles.splice(i, 1);
  }
  for (let i = game.noiseRings.length - 1; i >= 0; i--) {
    const r = game.noiseRings[i];
    r.r += 260 * dt;
    r.alpha -= dt * 0.9;
    if (r.r >= r.maxR || r.alpha <= 0) game.noiseRings.splice(i, 1);
  }
  game.shake = Math.max(0, game.shake - dt * 1.4);
  game.flash = Math.max(0, game.flash - dt * 1.2);
}

// One frame of the game. Returns nothing; the renderer reads the state.
export function updateGame(game, input, dt) {
  if (game.screen === 'title') {
    ensureAudio();
    if (wasPressed(input, 'confirm')) {
      sfx.click();
      startRun(game);
    }
    return;
  }
  if (game.screen === 'playing') {
    if (wasPressed(input, 'pause')) {
      game.screen = 'paused';
      sfx.click();
      return;
    }
    if (wasPressed(input, 'mute')) {
      game.muted = !game.muted;
      setMuted(game.muted);
    }
    if (wasPressed(input, 'restart')) {
      loadLevel(game, game.levelIndex);
      game.message = 'Level restarted';
      game.messageTimer = 1.4;
      return;
    }
    updatePlaying(game, input, dt);
    return;
  }
  if (game.screen === 'paused') {
    if (wasPressed(input, 'pause') || wasPressed(input, 'confirm')) {
      game.screen = 'playing';
      sfx.click();
    }
    if (wasPressed(input, 'restart')) {
      loadLevel(game, game.levelIndex);
      game.screen = 'playing';
    }
    return;
  }
  if (game.screen === 'levelComplete') {
    if (wasPressed(input, 'confirm')) {
      sfx.click();
      nextLevel(game);
    }
    return;
  }
  if (game.screen === 'gameOver' || game.screen === 'victory') {
    if (wasPressed(input, 'confirm')) {
      sfx.click();
      game.screen = 'title';
    }
  }
}

export { anyChasing, maxDetection };
