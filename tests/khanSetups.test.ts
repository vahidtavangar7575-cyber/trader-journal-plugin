import assert from 'node:assert/strict';
import test from 'node:test';
import { KHAN_SETUP_NAMES } from '../src/khan/rules';

void test('registers all six Khan Presentation setups', () => {
	const setupIds = Object.keys(KHAN_SETUP_NAMES);
	assert.deepEqual(setupIds, ['setup-1', 'setup-2', 'setup-3', 'setup-4', 'setup-5', 'setup-6']);
	assert.equal(new Set(Object.values(KHAN_SETUP_NAMES)).size, 6);
});
