import assert from 'node:assert/strict';
import test from 'node:test';
import { KHAN_SETUP_IDS } from '../src/khan/setups';
import { KHAN_SETUP_NAMES } from '../src/khan/rules';

void test('registers all six Khan Presentation setups', () => {
	assert.deepEqual(KHAN_SETUP_IDS, ['setup-1', 'setup-2', 'setup-3', 'setup-4', 'setup-5', 'setup-6']);
	assert.equal(new Set(KHAN_SETUP_IDS.map((id) => KHAN_SETUP_NAMES[id])).size, 6);
});
