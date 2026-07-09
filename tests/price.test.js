const test = require('node:test');
const assert = require('node:assert');
const { calculatePrice } = require('../app');

test('calculates price correctly for exact whole hours', () => {
  const result = calculatePrice('2026-06-30T10:00', '2026-06-30T12:00', 1);
  assert.strictEqual(result.billableHours, 2);
  assert.strictEqual(result.totalPrice, 2);
});

test('rounds up partial hours to next whole hour', () => {
  const result = calculatePrice('2026-06-30T10:00', '2026-06-30T10:30', 1);
  assert.strictEqual(result.billableHours, 1);
  assert.strictEqual(result.totalPrice, 1);
});

test('applies minimum 1 hour charge for very short rides', () => {
  const result = calculatePrice('2026-06-30T10:00', '2026-06-30T10:05', 2);
  assert.strictEqual(result.billableHours, 1);
  assert.strictEqual(result.totalPrice, 2);
});

test('scales correctly with different hourly rates', () => {
  const result = calculatePrice('2026-06-30T10:00', '2026-06-30T13:00', 3);
  assert.strictEqual(result.billableHours, 3);
  assert.strictEqual(result.totalPrice, 9);
});

test('returns error when end time is before start time', () => {
  const result = calculatePrice('2026-06-30T12:00', '2026-06-30T10:00', 1);
  assert.ok(result.error);
});

test('returns error for invalid date input', () => {
  const result = calculatePrice('not-a-date', '2026-06-30T10:00', 1);
  assert.ok(result.error);
});
