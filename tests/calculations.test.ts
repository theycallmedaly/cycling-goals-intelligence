import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateGoalPace, getPeriodBounds } from '../lib/calculations.ts';

test('uses Monday through Sunday for weekly goals', () => {
  assert.deepEqual(getPeriodBounds('week', '2026-09-02'), {
    start: '2026-08-31', end: '2026-09-06', asOf: '2026-09-02', startLabel: 'Aug 31', endLabel: 'Sep 6',
  });
});

test('uses the rider-selected start day for weekly goals', () => {
  assert.deepEqual(getPeriodBounds('week', '2026-09-02', 0), {
    start: '2026-08-30', end: '2026-09-05', asOf: '2026-09-02', startLabel: 'Aug 30', endLabel: 'Sep 5',
  });
  assert.deepEqual(getPeriodBounds('week', '2026-09-02', 3), {
    start: '2026-09-02', end: '2026-09-08', asOf: '2026-09-02', startLabel: 'Sep 2', endLabel: 'Sep 8',
  });
});

test('calculates target and remaining pace using calendar days', () => {
  const result = calculateGoalPace({ goal: 70, current: 20, start: '2026-08-31', end: '2026-09-06', asOf: '2026-09-02' });
  assert.equal(result.totalDays, 7);
  assert.equal(result.elapsedDays, 3);
  assert.equal(result.remainingDays, 5);
  assert.equal(result.targetProgress, 30);
  assert.equal(result.aheadBehind, -10);
  assert.equal(result.remaining, 50);
  assert.equal(result.requiredPerDay, 10);
  assert.equal(result.catchUpToday, 20);
});

test('matches Strava annual pace at midnight and after a ride', () => {
  const bounds = getPeriodBounds('year', '2026-01-01');
  const midnight = calculateGoalPace({ goal: 365, current: 0, ...bounds });
  assert.equal(midnight.targetProgress, 1);
  assert.equal(midnight.aheadBehind, -1);
  assert.equal(midnight.catchUpToday, 2);

  const afterRide = calculateGoalPace({ goal: 365, current: 2, ...bounds });
  assert.equal(afterRide.aheadBehind, 1);
});

test('reports on pace Jan 2 and a two-mile catch-up ride Jan 3', () => {
  const jan2 = calculateGoalPace({ goal: 365, current: 2, ...getPeriodBounds('year', '2026-01-02') });
  assert.equal(jan2.aheadBehind, 0);

  const jan3 = calculateGoalPace({ goal: 365, current: 2, ...getPeriodBounds('year', '2026-01-03') });
  assert.ok(Math.abs(jan3.aheadBehind - (-1)) < 1e-9);
  assert.ok(Math.abs(jan3.catchUpToday - 2) < 1e-9);
});

test('spreads a day-45 deficit over every remaining day', () => {
  const day45 = calculateGoalPace({ goal: 365, current: 35, ...getPeriodBounds('year', '2026-02-14') });
  assert.equal(day45.elapsedDays, 45);
  assert.equal(day45.remainingDays, 321);
  assert.equal(day45.remaining, 330);
  assert.ok(Math.abs(day45.requiredPerDay - (330 / 321)) < 1e-9);
  assert.ok(Math.abs(day45.catchUpToday - 11) < 1e-9);
});

test('removes blocked dates from the available riding-day pace', () => {
  const result = calculateGoalPace({
    goal: 100,
    current: 20,
    start: '2026-09-01',
    end: '2026-09-10',
    asOf: '2026-09-05',
    blockedDates: ['2026-09-05', '2026-09-07', '2026-09-07', '2026-10-01'],
  });
  assert.equal(result.remainingDays, 6);
  assert.equal(result.blockedDays, 2);
  assert.equal(result.rideDaysRemaining, 4);
  assert.equal(result.requiredPerDay, 20);
});

test('never reports negative remaining work after goal completion', () => {
  const result = calculateGoalPace({ goal: 100, current: 120, start: '2026-09-01', end: '2026-09-30', asOf: '2026-09-30' });
  assert.equal(result.remaining, 0);
  assert.equal(result.remainingDays, 1);
  assert.equal(result.requiredPerDay, 0);
  assert.equal(result.catchUpToday, 0);
});
