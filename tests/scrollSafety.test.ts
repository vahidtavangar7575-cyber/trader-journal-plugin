import assert from 'node:assert/strict';
import test from 'node:test';
import { SCROLL_SAFETY_CSS } from '../src/ui/scrollSafety';

void test('account manager, trade body and Khan cockpit each have a vertical scroll owner', () => {
  for (const selector of [
    '.trader-journal-modal-content > .account-manager',
    '.trader-journal-modal-content > .trader-journal-form > .trader-journal-form__body',
    '.trader-journal-modal-content > .khan-cockpit',
  ]) {
    const start = SCROLL_SAFETY_CSS.indexOf(selector);
    assert.notEqual(start, -1, `${selector} missing`);
    const block = SCROLL_SAFETY_CSS.slice(start, SCROLL_SAFETY_CSS.indexOf('}', start) + 1);
    assert.match(block, /min-height:\s*0\s*!important/);
    assert.match(block, /overflow-y:\s*auto\s*!important/);
  }
});

void test('modal content clips overflow so nested scroll owners receive wheel events', () => {
  const selector = '.trader-journal-modal-shell > .modal-content.trader-journal-modal-content';
  const start = SCROLL_SAFETY_CSS.indexOf(selector);
  const block = SCROLL_SAFETY_CSS.slice(start, SCROLL_SAFETY_CSS.indexOf('}', start) + 1);
  assert.match(block, /min-height:\s*0\s*!important/);
  assert.match(block, /overflow:\s*hidden\s*!important/);
});
