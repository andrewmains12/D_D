'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  getDalekCount, initState, moveDaleks, resolveCollisions,
  checkMoveDeath, getSafeTeleportCandidates, applyScrewdriver,
  encodePos, DALEKS_MAX,
} = require('./daleks.js');

test('getDalekCount scales with level', () => {
  assert.equal(getDalekCount(1), 10);
  assert.equal(getDalekCount(2), 15);
  assert.equal(getDalekCount(3), 20);
});

test('getDalekCount is capped at DALEKS_MAX', () => {
  assert.equal(getDalekCount(100), DALEKS_MAX);
  assert.equal(getDalekCount(11), DALEKS_MAX);
});

test('Dalek moves diagonally toward player', () => {
  const state = initState({ px: 5, py: 5, daleks: [{ x: 2, y: 2 }], scraps: new Set() });
  const moved = moveDaleks(state);
  assert.deepEqual(moved[0], { x: 3, y: 3 });
});

test('Dalek on same row moves orthogonally', () => {
  const state = initState({ px: 5, py: 3, daleks: [{ x: 2, y: 3 }], scraps: new Set() });
  const moved = moveDaleks(state);
  assert.deepEqual(moved[0], { x: 3, y: 3 });
});

test('Dalek on same column moves orthogonally', () => {
  const state = initState({ px: 3, py: 8, daleks: [{ x: 3, y: 3 }], scraps: new Set() });
  const moved = moveDaleks(state);
  assert.deepEqual(moved[0], { x: 3, y: 4 });
});

test('Daleks clamp to board boundaries', () => {
  const state = initState({ px: 0, py: 0, daleks: [{ x: 0, y: 0 }], scraps: new Set() });
  const moved = moveDaleks(state);
  assert.ok(moved[0].x >= 0 && moved[0].x < state.cols);
  assert.ok(moved[0].y >= 0 && moved[0].y < state.rows);
});

test('Two Daleks converging become scrap and award 20 pts', () => {
  // Player at (5,28) far below; A at (4,5), B at (6,5)
  // A: dx=+1, dy=+1 → (5,6); B: dx=-1, dy=+1 → (5,6). Both land on (5,6).
  const state = initState({ px: 5, py: 28, daleks: [{ x: 4, y: 5 }, { x: 6, y: 5 }], scraps: new Set() });
  const newPositions = moveDaleks(state);
  assert.deepEqual(newPositions[0], { x: 5, y: 6 });
  assert.deepEqual(newPositions[1], { x: 5, y: 6 });
  const { survivors, newScraps, points } = resolveCollisions(newPositions, state.scraps, state.px, state.py);
  assert.equal(survivors.length, 0);
  assert.ok(newScraps.has('5,6'));
  assert.equal(points, 20);
});

test('Three Daleks converging on same cell awards 30 pts', () => {
  // Three daleks arranged so they all move to (5,5)
  const newPositions = [{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }];
  const { survivors, points } = resolveCollisions(newPositions, new Set(), 20, 20);
  assert.equal(survivors.length, 0);
  assert.equal(points, 30);
});

test('Dalek walking into existing scrap becomes scrap, awards 10 pts', () => {
  const scraps = new Set(['5,5']);
  const newPositions = [{ x: 5, y: 5 }];
  const { survivors, points } = resolveCollisions(newPositions, scraps, 10, 10);
  assert.equal(survivors.length, 0);
  assert.equal(points, 10);
});

test('Surviving Dalek is returned in survivors', () => {
  const newPositions = [{ x: 3, y: 3 }, { x: 8, y: 8 }];
  const { survivors } = resolveCollisions(newPositions, new Set(), 20, 20);
  assert.equal(survivors.length, 2);
});

test('Dalek landing on player sets playerKilled but Dalek survives', () => {
  // A Dalek that walks onto the player kills the player but is not itself destroyed
  const newPositions = [{ x: 10, y: 10 }];
  const { playerKilled, survivors } = resolveCollisions(newPositions, new Set(), 10, 10);
  assert.equal(playerKilled, true);
  assert.equal(survivors.length, 1);
});

test('checkMoveDeath returns true when moving onto scrap', () => {
  const scraps = new Set(['6,5']);
  assert.equal(checkMoveDeath(6, 5, [], scraps), true);
});

test('checkMoveDeath returns true when moving onto Dalek', () => {
  const daleks = [{ x: 6, y: 5 }];
  assert.equal(checkMoveDeath(6, 5, daleks, new Set()), true);
});

test('checkMoveDeath returns false for empty cell', () => {
  assert.equal(checkMoveDeath(6, 5, [{ x: 7, y: 5 }], new Set(['8,5'])), false);
});

test('Safe teleport candidates exclude Dalek-adjacent cells', () => {
  const daleks = [{ x: 30, y: 15 }];
  const candidates = getSafeTeleportCandidates(60, 30, daleks, new Set(), 0, 0);
  for (const c of candidates) {
    const adjToDalek = Math.abs(c.x - 30) <= 1 && Math.abs(c.y - 15) <= 1;
    assert.equal(adjToDalek, false, `Candidate (${c.x},${c.y}) is adjacent to Dalek`);
  }
});

test('Safe teleport candidates exclude scrap cells', () => {
  const scraps = new Set(['10,10']);
  const candidates = getSafeTeleportCandidates(60, 30, [], scraps, 0, 0);
  const hasScrap = candidates.some(c => c.x === 10 && c.y === 10);
  assert.equal(hasScrap, false);
});

test('Safe teleport candidates exclude player current position', () => {
  const candidates = getSafeTeleportCandidates(60, 30, [], new Set(), 5, 5);
  const hasPlayer = candidates.some(c => c.x === 5 && c.y === 5);
  assert.equal(hasPlayer, false);
});

test('applyScrewdriver kills adjacent Daleks only', () => {
  const daleks = [{ x: 4, y: 4 }, { x: 4, y: 6 }, { x: 10, y: 10 }];
  const { killed, remaining, points } = applyScrewdriver(daleks, 5, 5);
  assert.equal(killed.length, 2);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].x, 10);
  assert.equal(points, 40);
});

test('applyScrewdriver awards 20 pts per Dalek', () => {
  const daleks = [{ x: 5, y: 5 }];
  const { points } = applyScrewdriver(daleks, 5, 5);
  assert.equal(points, 20);
});

test('applyScrewdriver with no adjacent Daleks returns empty killed', () => {
  const daleks = [{ x: 20, y: 20 }];
  const { killed, remaining, points } = applyScrewdriver(daleks, 5, 5);
  assert.equal(killed.length, 0);
  assert.equal(remaining.length, 1);
  assert.equal(points, 0);
});

test('encodePos produces unique keys', () => {
  const keys = new Set();
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      keys.add(encodePos(x, y));
    }
  }
  assert.equal(keys.size, 100);
});
