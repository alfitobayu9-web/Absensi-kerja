import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOvertime,
  calculateWorkMinutes,
  jakartaDate,
  normalizeName,
} from '../server/attendance.js';

test('working eight hours exactly does not count as overtime', () => {
  assert.deepEqual(calculateOvertime(480), {
    overtimeMinutes: 0,
    bonusAmount: 0,
  });
});

test('working more than eight hours earns a fixed bonus once', () => {
  assert.deepEqual(calculateOvertime(600), {
    overtimeMinutes: 120,
    bonusAmount: 25000,
  });
});

test('work duration uses whole minutes and never becomes negative', () => {
  assert.equal(calculateWorkMinutes('2026-10-05T01:00:00.000Z', '2026-10-05T09:01:59.000Z'), 481);
  assert.equal(calculateWorkMinutes('2026-10-05T09:00:00.000Z', '2026-10-05T08:59:00.000Z'), 0);
});

test('attendance date uses Jakarta local time across the UTC day boundary', () => {
  assert.equal(jakartaDate(new Date('2026-10-05T16:59:00.000Z')), '2026-10-05');
  assert.equal(jakartaDate(new Date('2026-10-05T17:00:00.000Z')), '2026-10-06');
});

test('employee names are compared without case or repeated-space differences', () => {
  assert.equal(normalizeName('  Budi   Santoso '), normalizeName('budi santoso'));
});
