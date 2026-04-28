'use strict';

const COLS = 60;
const ROWS = 30;
const DALEKS_BASE = 10;
const DALEKS_PER_LEVEL = 5;
const DALEKS_MAX = 60;
const SAFE_TP_PER_GAME = 5;
const SCREWDRIVER_PER_LEVEL = 1;
const SCORE_COLLISION = 10;
const SCORE_SCREWDRIVER = 20;
const PLAYER_SAFETY_RADIUS = 3;

function encodePos(x, y) {
  return x + ',' + y;
}

function getDalekCount(level) {
  return Math.min(DALEKS_BASE + (level - 1) * DALEKS_PER_LEVEL, DALEKS_MAX);
}

function initState(overrides = {}) {
  const state = {
    cols: COLS,
    rows: ROWS,
    px: Math.floor(COLS / 2),
    py: Math.floor(ROWS / 2),
    daleks: [],
    scraps: new Set(),
    score: 0,
    level: 1,
    safeTeleports: SAFE_TP_PER_GAME,
    screwdriverUses: SCREWDRIVER_PER_LEVEL,
    phase: 'playing',
    turn: 0,
    highScore: 0,
  };
  return Object.assign(state, overrides);
}

function spawnDaleks(state) {
  const count = getDalekCount(state.level);
  const daleks = [];
  const occupied = new Set();
  occupied.add(encodePos(state.px, state.py));

  let attempts = 0;
  while (daleks.length < count && attempts < 5000) {
    attempts++;
    const x = Math.floor(Math.random() * state.cols);
    const y = Math.floor(Math.random() * state.rows);
    if (Math.abs(x - state.px) <= PLAYER_SAFETY_RADIUS && Math.abs(y - state.py) <= PLAYER_SAFETY_RADIUS) continue;
    const key = encodePos(x, y);
    if (occupied.has(key)) continue;
    occupied.add(key);
    daleks.push({ x, y });
  }
  return daleks;
}

function moveDaleks(state) {
  return state.daleks.map(d => ({
    x: Math.max(0, Math.min(state.cols - 1, d.x + Math.sign(state.px - d.x))),
    y: Math.max(0, Math.min(state.rows - 1, d.y + Math.sign(state.py - d.y))),
  }));
}

function resolveCollisions(newPositions, scraps, px, py) {
  const freq = new Map();
  for (const p of newPositions) {
    const key = encodePos(p.x, p.y);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }

  const newScraps = new Set(scraps);
  let points = 0;
  let playerKilled = false;
  const alive = new Array(newPositions.length).fill(true);

  for (let i = 0; i < newPositions.length; i++) {
    const p = newPositions[i];
    const key = encodePos(p.x, p.y);
    if (freq.get(key) > 1) {
      alive[i] = false;
      newScraps.add(key);
      points += SCORE_COLLISION;
    } else if (scraps.has(key)) {
      alive[i] = false;
      points += SCORE_COLLISION;
    }
  }

  for (let i = 0; i < newPositions.length; i++) {
    if (alive[i] && newPositions[i].x === px && newPositions[i].y === py) {
      playerKilled = true;
    }
  }

  const survivors = newPositions.filter((_, i) => alive[i]);
  return { survivors, newScraps, points, playerKilled };
}

function checkMoveDeath(nx, ny, daleks, scraps) {
  if (scraps.has(encodePos(nx, ny))) return true;
  for (const d of daleks) {
    if (d.x === nx && d.y === ny) return true;
  }
  return false;
}

function getSafeTeleportCandidates(cols, rows, daleks, scraps, excludeX, excludeY) {
  const dalek_set = new Set(daleks.map(d => encodePos(d.x, d.y)));
  const candidates = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x === excludeX && y === excludeY) continue;
      if (scraps.has(encodePos(x, y))) continue;
      if (dalek_set.has(encodePos(x, y))) continue;
      let safe = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dalek_set.has(encodePos(x + dx, y + dy))) { safe = false; break; }
        }
        if (!safe) break;
      }
      if (safe) candidates.push({ x, y });
    }
  }
  return candidates;
}

function applyScrewdriver(daleks, px, py) {
  const killed = [];
  const remaining = [];
  for (const d of daleks) {
    if (Math.abs(d.x - px) <= 1 && Math.abs(d.y - py) <= 1) {
      killed.push(d);
    } else {
      remaining.push(d);
    }
  }
  return { killed, remaining, points: killed.length * SCORE_SCREWDRIVER };
}

const _exports = {
  COLS, ROWS, DALEKS_BASE, DALEKS_PER_LEVEL, DALEKS_MAX,
  SAFE_TP_PER_GAME, SCREWDRIVER_PER_LEVEL, SCORE_COLLISION, SCORE_SCREWDRIVER,
  getDalekCount, initState, spawnDaleks, moveDaleks, resolveCollisions,
  checkMoveDeath, getSafeTeleportCandidates, applyScrewdriver, encodePos,
};

if (typeof module !== 'undefined') module.exports = _exports;
if (typeof window !== 'undefined') Object.assign(window, _exports);
