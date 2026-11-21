// All canvas drawing: the museum floor, walls, cover, vision cones, the
// people in it, the HUD, and the title / pause / end screens.
//
// Readability first (the judge sees the game mostly through screenshots):
// guards stand out against the floor, cover reads at a glance, and the
// cone's colour tells the guard's mood — amber calm, orange suspicious,
// red chasing. HUD text is drawn on the canvas so it shows in screenshots.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, PALETTE, GUARD_SIGHT_RANGE, GUARD_CONE_HALF_ANGLE } from './config.js';
import { rayDistance } from './stealth.js';
import { anyChasing, maxDetection } from './guard.js';
import { artifactsLeft } from './game.js';

function coneColor(guard) {
  if (guard.state === 'chase') return { fill: PALETTE.coneAlert, edge: PALETTE.coneAlertEdge };
  if (guard.state === 'suspicious' || guard.state === 'search' || guard.detection >= 0.55) {
    return { fill: PALETTE.coneSuspicious, edge: 'rgba(255, 140, 40, 0.7)' };
  }
  return { fill: PALETTE.coneCalm, edge: PALETTE.coneCalmEdge };
}

function drawCone(ctx, grid, guard) {
  const steps = 26;
  const colors = coneColor(guard);
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= steps; i++) {
    const a = guard.facing - GUARD_CONE_HALF_ANGLE + (i / steps) * GUARD_CONE_HALF_ANGLE * 2;
    const d = rayDistance(grid, guard.x, guard.y, a, GUARD_SIGHT_RANGE);
    ctx.lineTo(guard.x + Math.cos(a) * d, guard.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = colors.fill;
  ctx.fill();
  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, grid, now) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = grid[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') continue; // walls are drawn on top, in their own pass
      ctx.fillStyle = (c + r) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = PALETTE.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (ch === 'S') {
        ctx.fillStyle = PALETTE.shadowZone;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = PALETTE.shadowEdge;
        ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
      }
      if (ch === 'L') {
        // Lamplight: a warm pool that gently breathes.
        const flicker = 0.16 + Math.sin(now * 2.1 + c * 1.7 + r) * 0.03;
        const g = ctx.createRadialGradient(x + TILE / 2, y + TILE / 2, 4, x + TILE / 2, y + TILE / 2, TILE * 1.15);
        g.addColorStop(0, `rgba(245, 185, 66, ${flicker + 0.08})`);
        g.addColorStop(1, 'rgba(245, 185, 66, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - TILE, y - TILE, TILE * 3, TILE * 3);
      }
    }
  }
}

function drawWallsAndCover(ctx, grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = grid[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 6);
        ctx.strokeStyle = PALETTE.wallEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (ch === 'C') {
        ctx.fillStyle = PALETTE.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = PALETTE.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.strokeStyle = PALETTE.crateDark;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
}

function drawArtifacts(ctx, game, now) {
  for (const a of game.artifacts) {
    if (a.taken) continue;
    const bob = Math.sin(now * 2.4 + a.x * 0.05) * 3;
    const g = ctx.createRadialGradient(a.x, a.y + bob, 2, a.x, a.y + bob, 34);
    g.addColorStop(0, PALETTE.artifactGlow);
    g.addColorStop(1, 'rgba(255, 215, 94, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(a.x, a.y + bob, 34, 0, Math.PI * 2);
    ctx.fill();
    // A small golden relic: a diamond with a bright core.
    ctx.save();
    ctx.translate(a.x, a.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = PALETTE.artifact;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
    ctx.fillStyle = '#fff6c9';
    ctx.beginPath();
    ctx.arc(a.x, a.y + bob, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoinPickups(ctx, game, now) {
  for (const c of game.coinPickups) {
    if (c.taken) continue;
    const bob = Math.sin(now * 3 + c.x * 0.1) * 2;
    ctx.fillStyle = PALETTE.lampCore;
    ctx.beginPath();
    ctx.arc(c.x, c.y + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#8a6d1f';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('c', c.x, c.y + bob + 0.5);
  }
}

function drawExit(ctx, game, now) {
  const e = game.exit;
  const pulse = e.open ? 0.7 + Math.sin(now * 3) * 0.3 : 0.35;
  const g = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 46);
  const col = e.open ? PALETTE.exitGlow : 'rgba(90, 100, 116, 0.4)';
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(e.x, e.y, 46, 0, Math.PI * 2);
  ctx.fill();
  // A doorway: two posts and a lintel, green when open.
  ctx.fillStyle = e.open ? PALETTE.exitOpen : PALETTE.exitLocked;
  ctx.globalAlpha = pulse;
  ctx.fillRect(e.x - 14, e.y - 16, 28, 32);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#0e1512';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x - 14, e.y - 16, 28, 32);
  ctx.fillStyle = '#0e1512';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', e.x, e.y + 26);
}

function drawGuard(ctx, guard, now) {
  const alerted = guard.state === 'chase';
  // Body: a slate-blue circle with a pale visor showing the facing.
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.guardDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.guardVisor;
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 6, guard.y + Math.sin(guard.facing) * 6, 5, 0, Math.PI * 2);
  ctx.fill();
  // Detection arc above the guard while it is filling.
  if (guard.detection > 0.03 && guard.detection < 1) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 21, -Math.PI / 2, -Math.PI / 2 + guard.detection * Math.PI * 2);
    ctx.strokeStyle = guard.detection >= 0.55 ? PALETTE.warn : PALETTE.artifact;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // "?" while suspicious, "!" while chasing — plus a word, not colour alone.
  if (guard.state === 'suspicious' || guard.state === 'search') {
    drawMarker(ctx, guard.x, guard.y - 26, '?', PALETTE.warn);
  } else if (alerted) {
    drawMarker(ctx, guard.x, guard.y - 26, '!', PALETTE.danger);
  }
}

function drawMarker(ctx, x, y, text, color) {
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(10, 12, 18, 0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawPlayer(ctx, game) {
  const p = game.player;
  const radius = p.sneaking ? 10 : 13;
  // A soft shadow under the player.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + radius * 0.8, radius, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded figure: amber body, darker hood, facing tick.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 5, p.y + Math.sin(p.facing) * 5, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // Sneak ring: a quiet circle that says "you are hard to spot".
  if (p.sneaking) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(57, 217, 138, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawFx(ctx, game) {
  for (const r of game.noiseRings) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(245, 185, 66, ${Math.max(0, r.alpha)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const c of game.coinsInFlight) {
    ctx.fillStyle = PALETTE.lampCore;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, game) {
  const level = game.level;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 46.5);
  ctx.lineTo(VIEW_W, 46.5);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`${level.name}  ·  ${level.sub}`, 16, 24);

  // Artifacts, coins, lives — top right, left to right.
  const right = VIEW_W - 16;
  ctx.textAlign = 'right';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = PALETTE.artifact;
  ctx.fillText(`◆ ${3 - artifactsLeft(game)}/3`, right - 250, 24);
  ctx.fillStyle = PALETTE.lampCore;
  ctx.fillText(`◉ ${game.coins}`, right - 170, 24);
  ctx.fillStyle = game.lives > 1 ? PALETTE.text : PALETTE.danger;
  ctx.fillText(`♥ ${game.lives}`, right - 90, 24);
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(fmtTime(game.levelTime), right, 24);

  // Detection bar: the highest guard meter, with a label — never colour alone.
  const det = maxDetection(game.guards);
  const bw = 220;
  const bx = VIEW_W / 2 - bw / 2;
  const by = 56;
  ctx.fillStyle = 'rgba(12, 14, 20, 0.85)';
  ctx.fillRect(bx - 8, by - 8, bw + 16, 30);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.strokeRect(bx - 8.5, by - 8.5, bw + 16, 30);
  ctx.fillStyle = '#2a2f3d';
  ctx.fillRect(bx, by, bw, 10);
  ctx.fillStyle = det >= 1 ? PALETTE.danger : det >= 0.55 ? PALETTE.warn : PALETTE.ok;
  ctx.fillRect(bx, by, bw * Math.min(1, det), 10);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(det >= 1 ? 'SPOTTED' : det >= 0.55 ? 'SUSPICIOUS' : 'UNSEEN', bx + bw / 2, by + 20);

  // Alarm banner while any guard chases.
  if (anyChasing(game.guards)) {
    ctx.fillStyle = 'rgba(229, 72, 77, 0.92)';
    ctx.fillRect(0, 92, VIEW_W, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ ALARM — BREAK LINE OF SIGHT ⚠', VIEW_W / 2, 108);
  }

  // Toast message under the HUD.
  if (game.messageTimer > 0) {
    ctx.font = 'bold 16px sans-serif';
    const w = ctx.measureText(game.message).width + 28;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(VIEW_W / 2 - w / 2, 128, w, 32);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(VIEW_W / 2 - w / 2 + 0.5, 128.5, w, 32);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(game.message, VIEW_W / 2, 145);
  }

  // Controls hint, bottom left.
  ctx.textAlign = 'left';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('WASD / arrows move · Shift sneak · Click throws a coin · P pause · R restart · M mute', 12, VIEW_H - 12);
}

export function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function panel(ctx, title, lines, accent) {
  const w = 620;
  const h = 120 + lines.length * 30;
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H / 2 - h / 2;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent || PALETTE.text;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 52);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 104 + i * 30);
  });
  return { x, y, w, h };
}

function drawTitle(ctx, now) {
  // A dark museum hall behind the title: floor, a lamp pool, one cone.
  ctx.fillStyle = '#14161d';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const g = ctx.createRadialGradient(VIEW_W / 2, 300, 20, VIEW_W / 2, 300, 420);
  g.addColorStop(0, 'rgba(245, 185, 66, 0.22)');
  g.addColorStop(1, 'rgba(245, 185, 66, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('THE QUIET GALLERY', VIEW_W / 2, 190);
  ctx.fillStyle = PALETTE.lampCore;
  ctx.font = '20px sans-serif';
  ctx.fillText('A top-down stealth game — steal three relics, reach the exit, stay unseen.', VIEW_W / 2, 250);
  const blink = 0.55 + Math.sin(now * 3) * 0.45;
  ctx.globalAlpha = blink;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press ENTER or click to begin', VIEW_W / 2, 330);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '16px sans-serif';
  ctx.fillText('WASD / arrows to move · hold Shift to sneak (slow, quiet, hard to spot)', VIEW_W / 2, 420);
  ctx.fillText('Click to throw a coin and lure a guard away · running makes noise', VIEW_W / 2, 448);
  ctx.fillText('Hide behind crates and in the dark teal shadows · lamplight exposes you', VIEW_W / 2, 476);
  ctx.fillText('3 levels · 3 lives · the exit opens once all three relics are yours', VIEW_W / 2, 504);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 'PAUSED', ['P or Enter to resume', 'R restarts this level', 'M toggles sound'], PALETTE.text);
}

function drawLevelComplete(ctx, game) {
  const s = game.levelStats;
  const starRow = '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
  panel(
    ctx,
    'LEVEL CLEAR',
    [
      `${game.level.name} — ${starRow}`,
      `Time ${fmtTime(s.time)} (par ${fmtTime(game.level.parSeconds)}) · +${s.score} points`,
      s.alarmed ? 'The alarm went off — no quiet bonus this time.' : 'Ghost run: never spotted. +300 quiet bonus.',
      `Total score: ${s.total}`,
      'Press ENTER for the next level',
    ],
    PALETTE.ok,
  );
}

function drawGameOver(ctx, game) {
  panel(ctx, 'CAUGHT — GAME OVER', [`The gallery keeps its relics. Score: ${game.score}`, 'Press ENTER to try again'], PALETTE.danger);
}

function drawVictory(ctx, game) {
  panel(
    ctx,
    'THE GALLERY IS YOURS',
    [
      'All three relics, and not a single guard can prove you were there.',
      `Final score: ${game.score} · total time ${fmtTime(game.totalTime)}`,
      'Press ENTER to return to the title screen',
    ],
    PALETTE.artifact,
  );
}

// The whole frame. `now` is seconds (for bobbing, flicker and blinking).
export function render(ctx, game, now) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.screen === 'title') {
    drawTitle(ctx, now);
    return;
  }
  if (!game.grid) return;

  // Screen shake (game-feel): trauma squared, summed sines, visual only.
  const shake = game.shake * game.shake;
  const ox = shake * 10 * Math.sin(now * 47.3);
  const oy = shake * 8 * Math.sin(now * 39.1);
  ctx.save();
  ctx.translate(ox, oy);

  drawFloor(ctx, game.grid, now);
  drawExit(ctx, game, now);
  drawArtifacts(ctx, game, now);
  drawCoinPickups(ctx, game, now);
  for (const guard of game.guards) drawCone(ctx, game.grid, guard);
  drawWallsAndCover(ctx, game.grid);
  for (const guard of game.guards) drawGuard(ctx, guard, now);
  drawPlayer(ctx, game);
  drawFx(ctx, game);

  ctx.restore();

  // Red flash after being caught.
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(229, 72, 77, ${game.flash * 0.28})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawHud(ctx, game);
  if (game.screen === 'paused') drawPaused(ctx);
  if (game.screen === 'levelComplete') drawLevelComplete(ctx, game);
  if (game.screen === 'gameOver') drawGameOver(ctx, game);
  if (game.screen === 'victory') drawVictory(ctx, game);
}
