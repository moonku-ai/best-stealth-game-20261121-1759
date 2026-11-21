// Pure stealth math: line of sight, vision cones and the detection rate.
// No DOM, no canvas here, so Node can import this file and unit-test it.
//
// A level grid is an array of strings. Tiles that block sight and movement:
//   '#' wall, 'C' crate. Everything else ('.', 'S', 'L', 'P', 'G', 'A', 'E', 'o')
//   is walkable floor.

import { TILE, COLS, ROWS, DETECT_BASE_RATE } from './config.js';

export function isBlocker(ch) {
  return ch === '#' || ch === 'C';
}

export function tileAt(grid, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return grid[row][col];
}

export function isBlockedTile(grid, col, row) {
  return isBlocker(tileAt(grid, col, row));
}

// Pixel point -> is the tile under it a blocker?
export function pointBlocked(grid, x, y) {
  return isBlockedTile(grid, Math.floor(x / TILE), Math.floor(y / TILE));
}

// Segment from (x0,y0) to (x1,y1): true when no blocker tile lies between them.
// Samples along the segment in small steps; step 6px is far below a tile.
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true;
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointBlocked(grid, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// Distance a ray from (x,y) along `angle` travels before hitting a blocker
// or reaching `maxDist`. Used to draw a vision cone that hugs the walls.
export function rayDistance(grid, x, y, angle, maxDist) {
  const step = 6;
  for (let d = step; d <= maxDist; d += step) {
    if (pointBlocked(grid, x + Math.cos(angle) * d, y + Math.sin(angle) * d)) {
      return d;
    }
  }
  return maxDist;
}

// Smallest absolute difference between two angles, 0..PI.
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Can this guard see the player right now? Returns { seen, distance, angle }.
// `guard` needs { x, y, facing }; `player` needs { x, y }.
export function canSee(grid, guard, player, range, halfAngle) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return { seen: false, distance, angle: 0 };
  const angle = Math.atan2(dy, dx);
  if (angleDiff(angle, guard.facing) > halfAngle) {
    return { seen: false, distance, angle };
  }
  if (!hasLineOfSight(grid, guard.x, guard.y, player.x, player.y)) {
    return { seen: false, distance, angle };
  }
  return { seen: true, distance, angle };
}

// How fast the detection meter fills (per second) while the guard sees the
// player. Close is fast; sneaking, shadow and standing still slow it down;
// lamplight and running speed it up.
export function detectionRate(seen, distance, range, opts) {
  if (!seen) return 0;
  const closeness = 1 - (distance / range) * 0.55; // 1.0 point blank .. 0.45 at edge
  let rate = DETECT_BASE_RATE * Math.max(0.15, closeness);
  if (opts.sneaking) rate *= 0.55;
  if (opts.inShadow) rate *= 0.45;
  if (opts.inLampLight) rate *= 1.35;
  if (opts.running) rate *= 1.15;
  return rate;
}

// A seeded RNG (mulberry32) so screenshot scenes and level flourishes are
// deterministic when a seed is given.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Flood fill from (col,row) over walkable tiles; returns a Set of "col,row".
// Used to prove every artifact and the exit are reachable from the start.
export function reachableTiles(grid, startCol, startRow) {
  const seen = new Set();
  const queue = [[startCol, startRow]];
  const key = (c, r) => c + ',' + r;
  while (queue.length > 0) {
    const [c, r] = queue.pop();
    const k = key(c, r);
    if (seen.has(k)) continue;
    if (isBlockedTile(grid, c, r)) continue;
    seen.add(k);
    queue.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  return seen;
}

// Find all tiles holding `ch` in a grid; returns [{col,row}] in scan order.
export function findTiles(grid, ch) {
  const out = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === ch) out.push({ col: c, row: r });
    }
  }
  return out;
}

// Pixel centre of a tile.
export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}
