import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateGoalPace, getPeriodBounds } from '../lib/calculations.ts';

test('uses Monday through Sunday for weekly goals', () => {
  assert.deepEqual(getPeriodBounds('week', '2026-09-02'), {
    start: '2026-08-31', end: '2026-09-06', asOf: '2026-09-02', startLabel: 'Aug 31', endLabel: 'Sep 6',
  });
});

test('calculates target and remaining pace using calendar days', () => {
  const result = calculateGoalPace({ goal: 70, current: 20, start: '2026-08-31', end: '2026-09-06', asOf: '2026-09-02' });
  assert.equal(result.totalDays, 7);
  assert.equal(result.elapsedDays, 3);
  assert.equal(result.remainingDays, 4);
  assert.equal(result.targetProgress, 30);
  assert.equal(result.aheadBehind, -10);
  assert.equal(result.remaining, 50);
  assert.equal(result.requiredPerDay, 12.5);
  assert.equal(result.catchUpPerDay, 12.5);
});

test('handles leap years and ahead-of-pace progress', () => {
  const bounds = getPeriodBounds('year', '2024-01-01');
  const result = calculateGoalPace({ goal: 3660, current: 20, ...bounds });
  assert.equal(result.totalDays, 366);
  assert.equal(result.targetProgress, 10);
  assert.equal(result.aheadBehind, 10);
  assert.equal(result.catchUpPerDay, result.requiredPerDay);
});

test('never reports negative remaining work after goal completion', () => {
  const result = calculateGoalPace({ goal: 100, current: 120, start: '2026-09-01', end: '2026-09-30', asOf: '2026-09-30' });
  assert.equal(result.remaining, 0);
  assert.equal(result.remainingDays, 0);
  assert.equal(result.requiredPerDay, 0);
});
