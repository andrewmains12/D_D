# CLAUDE.md

This repo contains two unrelated things: D&D character sheets (PCGen format) and a browser-based Daleks game.

## Daleks Game

A recreation of the classic BSD Unix Daleks game. Playable on desktop and mobile.

**Live URL:** https://andrewmains12.github.io/D_D/

**Files:**
- `daleks.js` — all game logic; no DOM dependencies; exports via `module.exports` (Node) and `window` (browser)
- `daleks.html` — full game UI; loads `daleks.js` via `<script src="daleks.js">`
- `daleks.test.js` — 21 unit tests using Node's built-in `node:test` module

**Run tests:** `node --test daleks.test.js`

**Deploy:** The `gh-pages` branch serves `index.html` + `daleks.js` to GitHub Pages. To redeploy after changes, push updated files to `gh-pages` (use `mcp__github__push_files` targeting `andrewmains12/D_D` branch `gh-pages`).

### Game rules

- 60×30 grid. Player is `@`, Daleks are `+`, scrap heaps are `*`.
- Each turn: player moves one step (8 directions or wait), then all Daleks move one step toward the player (`Math.sign` of delta).
- Daleks that land on the same cell, or on an existing scrap heap, are destroyed and become scrap (+10 pts each).
- Player dies if they step onto a Dalek/scrap, or if a Dalek steps onto them.
- Clear all Daleks → next level. Each level adds 5 more Daleks (base 10, max 60).
- Special actions: unsafe teleport (`T`), safe teleport (`S`, 5 per game), sonic screwdriver/bomb (`B`, 1 per level, kills adjacent Daleks for +20 pts each).
- High score persisted in `localStorage`.

### Architecture

`daleks.js` exports these pure functions (no side effects, no DOM):

| Function | Purpose |
|---|---|
| `initState(overrides)` | Create a fresh game state object |
| `spawnDaleks(state)` | Return array of Dalek positions for current level |
| `moveDaleks(state)` | Return array of proposed new Dalek positions (does not mutate) |
| `resolveCollisions(newPositions, scraps, px, py)` | Returns `{ survivors, newScraps, points, playerKilled }` |
| `checkMoveDeath(nx, ny, daleks, scraps)` | Returns true if the player would die moving to (nx, ny) |
| `getSafeTeleportCandidates(cols, rows, daleks, scraps, ex, ey)` | Returns cells with no adjacent Daleks |
| `applyScrewdriver(daleks, px, py)` | Returns `{ killed, remaining, points }` for adjacent Daleks |
| `getDalekCount(level)` | Returns Dalek count for a given level |
| `encodePos(x, y)` | Returns `"x,y"` string key used in the scraps Set |

The turn loop in `daleks.html` is: `tryMove` → `advanceTurn` → `moveDaleks` + `resolveCollisions` → `render`.

Scrap positions are stored as a `Set<"x,y">` for O(1) lookup. Daleks are a plain array iterated each turn.

### Key constants (daleks.js)

```
COLS=60, ROWS=30
DALEKS_BASE=10, DALEKS_PER_LEVEL=5, DALEKS_MAX=60
SAFE_TP_PER_GAME=5, SCREWDRIVER_PER_LEVEL=1
SCORE_COLLISION=10, SCORE_SCREWDRIVER=20
PLAYER_SAFETY_RADIUS=3  (Daleks spawn at least 3 cells away from player)
```

---

## D&D Character Sheets

PCGen (`.pcg`) files for a Pathfinder "Curse of the Crimson Throne" campaign. Open with [PCGen](https://pcgen.org/).

- `Leo Camerri.pcg` — main character sheet (rogue, level 9)
- `my_crimson/` — custom campaign data (extra abilities, languages)
