// The Quiet Gallery — a top-down stealth game for make.fun's
// "Make the best stealth game" bounty (best-stealth-game-20261121-1759).
//
// This program hands the entry in. It runs on Node 22 with the standard
// library only: it copies this repository's game/ and screenshots/ into the
// grader's /output and writes /output/dossier.json with the kit's vendored
// make.fun library, so the judge reads exactly the game that was built.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The game itself is plain static files under game/ (game/index.html plus
// its ES modules, no library, no network request), playable in desktop
// Chrome with keyboard and mouse. Serve it locally with `node serve.ts`,
// then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps (from the kit's RULES.txt): the dossier text is capped at
// 160 KiB; the other caps only refuse an entry the scorer would refuse —
// more than 4 screenshots or one over 256 KiB, more than 993 files in game/
// or 48 MiB of game files in all, or a path under game/ over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
