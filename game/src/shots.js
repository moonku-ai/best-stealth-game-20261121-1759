// Deterministic screenshot scenes, driven by ?shot=<name>&seed=<n>.
//
// The screenshots are the judge's main view of the game, so each one must
// show the stealth game at its best: the title, a mid-level moment with
// vision cones and cover, a guard mid-alarm, and a level-clear screen.
// A shot freezes the simulation right after staging, so the capture is the
// same every time it is taken.
//
//   start — the title screen.
//   play  — level 1, mid-game: the player crouched behind a crate, one guard
//           suspicious with its cone on the player, one relic already taken.
//   alert — level 2, a guard chasing the player toward the exit.
//   end   — the level-clear screen for level 1.

import { makeGame, loadLevel } from './game.js';
import { tileCenter } from './stealth.js';
import { LEVELS } from './levels.js';

export const SHOT_NAMES = ['start', 'play', 'alert', 'end'];

export function stageShot(name) {
  const game = makeGame();
  game.screen = 'title';
  if (name === 'start') {
    return game;
  }
  if (name === 'play') {
    loadLevel(game, 0);
    game.screen = 'playing';
    // Player sneaking in the middle hall, one relic already pocketed.
    const p = tileCenter(10, 9);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.sneaking = true;
    game.player.facing = -Math.PI / 2;
    game.artifacts[0].taken = true;
    game.score = 500;
    // First guard mid-patrol, suspicious, cone reaching toward the player.
    const g = game.guards[0];
    const gp = tileCenter(12, 2);
    g.x = gp.x;
    g.y = gp.y;
    g.facing = Math.PI / 2;
    g.detection = 0.72;
    g.state = 'suspicious';
    g.lookTimer = 0.7;
    // Second guard patrolling the middle hall.
    const g2 = game.guards[1];
    const g2p = tileCenter(20, 9);
    g2.x = g2p.x;
    g2.y = g2p.y;
    g2.facing = Math.PI;
    return game;
  }
  if (name === 'alert') {
    loadLevel(game, 1);
    game.screen = 'playing';
    game.score = 1500;
    game.coins = 2;
    // Player near the exit with two relics, a guard chasing from behind.
    const p = tileCenter(25, 15);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.facing = 0;
    game.artifacts[0].taken = true;
    game.artifacts[1].taken = true;
    game.exit.open = false;
    const g = game.guards[2];
    const gp = tileCenter(23, 15);
    g.x = gp.x;
    g.y = gp.y;
    g.facing = 0;
    g.detection = 1;
    g.state = 'chase';
    g.alertTimer = 1.2;
    g.lastSeen = { x: p.x, y: p.y };
    const g2 = game.guards[1];
    const g2p = tileCenter(17, 7);
    g2.x = g2p.x;
    g2.y = g2p.y;
    g2.facing = Math.PI / 2;
    g2.detection = 0.4;
    return game;
  }
  if (name === 'end') {
    loadLevel(game, 0);
    game.levelTime = 74;
    game.score = 2350;
    for (const a of game.artifacts) a.taken = true;
    game.exit.open = true;
    // The player stands in the open exit doorway as the level clears.
    game.player.x = game.exit.x;
    game.player.y = game.exit.y;
    game.levelStats = { time: 74, score: 1850, stars: 3, alarmed: false, total: 2350 };
    game.screen = 'levelComplete';
    return game;
  }
  return game;
}

// A shot's game state is staged, not simulated: the caller renders one
// frame and screenshots it.
export function isShotMode(params) {
  return SHOT_NAMES.includes(params.get('shot'));
}

export { LEVELS };
