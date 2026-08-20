import assert from 'node:assert/strict';
import test from 'node:test';
import { TemporaryAttachmentRegistry } from '../src/ui/traderJournal/TemporaryAttachmentRegistry';

void test('deletes an attachment that finishes after cleanup was requested', async () => {
	const deletedPaths: string[] = [];
	const registry = new TemporaryAttachmentRegistry(async (attachmentPath) => {
		deletedPaths.push(attachmentPath);
	});

	await registry.requestCleanup();
	const retained = await registry.track('Trading/_attachments/late.png');

	assert.equal(retained, false);
	assert.deepEqual(deletedPaths, ['Trading/_attachments/late.png']);
	assert.deepEqual(registry.getTrackedPaths(), []);
});

void test('waits for a failed commit before cleaning temporary attachments', async () => {
	const deletedPaths: string[] = [];
	const registry = new TemporaryAttachmentRegistry(async (attachmentPath) => {
		deletedPaths.push(attachmentPath);
	});

	await registry.track('Trading/_attachments/trade.png');
	registry.beginCommit();
	assert.deepEqual(await registry.requestCleanup(), []);
	assert.deepEqual(deletedPaths, []);

	assert.deepEqual(await registry.failCommit(), []);
	assert.deepEqual(deletedPaths, ['Trading/_attachments/trade.png']);
	assert.deepEqual(registry.getTrackedPaths(), []);
});

void test('never deletes committed attachments during modal cleanup', async () => {
	const deletedPaths: string[] = [];
	const registry = new TemporaryAttachmentRegistry(async (attachmentPath) => {
		deletedPaths.push(attachmentPath);
	});

	await registry.track('Trading/_attachments/committed.png');
	registry.beginCommit();
	registry.commit();
	assert.deepEqual(await registry.requestCleanup(), []);

	assert.deepEqual(deletedPaths, []);
	assert.deepEqual(registry.getTrackedPaths(), []);
});

void test('retains failed deletions so cleanup can retry them', async () => {
	let attemptCount = 0;
	const registry = new TemporaryAttachmentRegistry(async () => {
		attemptCount += 1;
		if (attemptCount === 1) {
			throw new Error('Trash failed');
		}
	});

	await registry.track('Trading/_attachments/retry.png');
	assert.equal((await registry.cleanup()).length, 1);
	assert.deepEqual(registry.getTrackedPaths(), ['Trading/_attachments/retry.png']);
	assert.deepEqual(await registry.cleanup(), []);
	assert.deepEqual(registry.getTrackedPaths(), []);
});
