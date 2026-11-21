// Shared constants for The Quiet Gallery — a top-down stealth game.
// One tile is 40px; every level is a 32 x 18 grid that fits the 1280 x 720 canvas.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const VIEW_W = COLS * TILE; // 1280
export const VIEW_H = ROWS * TILE; // 720

// Player movement, pixels per second. Walking (not sneaking) is fast but loud;
// sneaking is slow and quiet.
export const PLAYER_SNEAK_SPEED = 85;
export const PLAYER_RUN_SPEED = 210;

// Guard movement, pixels per second.
export const GUARD_PATROL_SPEED = 58;
export const GUARD_CHASE_SPEED = 132;
export const GUARD_SEARCH_SPEED = 88;

// Vision: how far a guard sees, and how wide the cone is (half-angle, radians).
export const GUARD_SIGHT_RANGE = 265;
export const GUARD_CONE_HALF_ANGLE = Math.PI / 5.2; // ~35 degrees each side

// Detection meter: fills 0..1. Base fill per second at point blank, scaled by
// distance, stance, light and movement (see stealth.js).
export const DETECT_BASE_RATE = 1.15;
export const DETECT_DECAY_RATE = 0.55;
export const SUSPICIOUS_AT = 0.55; // guard turns and investigates
export const SPOTTED_AT = 1.0; // full alarm, guard chases

// Noise: running feet and thrown coins are heard inside these radii (pixels).
export const NOISE_RUN_RADIUS = 115;
export const NOISE_COIN_RADIUS = 165;
export const COIN_THROW_RANGE = 340;
export const COINS_START = 3;

// Catch: a chasing guard this close to the player ends the attempt.
export const CATCH_DISTANCE = 22;
export const LIVES_START = 3;

// Palette — a night museum: charcoal floors, warm lamplight, teal shadow.
export const PALETTE = {
  floorA: '#232833',
  floorB: '#262c3a',
  floorLine: '#1c2029',
  wall: '#3d4557',
  wallTop: '#565f77',
  wallEdge: '#171a21',
  crate: '#7a5a34',
  crateDark: '#5d4426',
  crateEdge: '#a97e4a',
  shadowZone: '#162e2e',
  shadowEdge: '#1e4040',
  lampGlow: 'rgba(245, 185, 66, 0.20)',
  lampCore: '#f5b942',
  artifact: '#ffd75e',
  artifactGlow: 'rgba(255, 215, 94, 0.45)',
  exitLocked: '#5a6474',
  exitOpen: '#39d98a',
  exitGlow: 'rgba(57, 217, 138, 0.35)',
  player: '#f2c14e',
  playerDark: '#c99a2e',
  guard: '#7f96c4',
  guardDark: '#54688f',
  guardVisor: '#dfe8ff',
  coneCalm: 'rgba(245, 185, 66, 0.16)',
  coneCalmEdge: 'rgba(245, 185, 66, 0.55)',
  coneSuspicious: 'rgba(255, 140, 40, 0.28)',
  coneAlert: 'rgba(229, 72, 77, 0.30)',
  coneAlertEdge: 'rgba(229, 72, 77, 0.8)',
  text: '#eef1f6',
  textDim: '#9aa3b5',
  panel: 'rgba(12, 14, 20, 0.88)',
  panelEdge: '#4a5265',
  danger: '#e5484d',
  warn: '#ff8c28',
  ok: '#39d98a',
};
