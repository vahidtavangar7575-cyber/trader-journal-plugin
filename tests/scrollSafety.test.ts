import assert from 'node:assert/strict';
import test from 'node:test';
import { TRADER_JOURNAL_SCROLL_CONTRACT } from '../src/ui/scrollSafety';

void test('modal shell clips outer overflow and stays inside the viewport', () => {
  assert.equal(TRADER_JOURNAL_SCROLL_CONTRACT.shell.overflow, 'hidden');
  assert.equal(TRADER_JOURNAL_SCROLL_CONTRACT.shell.minHeight, '0');
  assert.match(TRADER_JOURNAL_SCROLL_CONTRACT.shell.maxHeight, /100dvh/);
});

void test('modal content is the single reliable vertical scroll owner', () => {
  assert.equal(TRADER_JOURNAL_SCROLL_CONTRACT.content.minHeight, '0');
  assert.equal(TRADER_JOURNAL_SCROLL_CONTRACT.content.overflowY, 'auto');
  assert.equal(TRADER_JOURNAL_SCROLL_CONTRACT.content.overflowX, 'hidden');
  assert.match(TRADER_JOURNAL_SCROLL_CONTRACT.content.maxHeight, /100dvh/);
});
