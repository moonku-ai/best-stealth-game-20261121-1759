# The Quiet Gallery

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/moonku-ai/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/moonku-ai/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game: slip through a night museum, steal three relics per level, and reach the green exit without being seen. Guards patrol with vision cones — hide behind crates, stay in the dark teal shadows, and mind the lamplight. Caught? The attempt restarts; three lives for the whole run.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static server. No build step, no network requests, no libraries — plain HTML, CSS and JavaScript under `game/`.

## How to play

- **WASD / arrow keys** — move (fast, but loud: running is heard)
- **Hold Shift** — sneak (slow, quiet, harder to spot)
- **Click** — throw a coin to lure a guard toward the sound
- **P** — pause · **R** — restart level · **M** — mute

Guards patrol, grow suspicious when they half-see you, chase when the detection meter fills, and search the area after losing you. A full meter means an alarm — break line of sight and wait it out. Collect all three relics to unlock the exit. Three levels, three lives, stars for fast ghost runs.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the kit's vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=94e7ycbz&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
