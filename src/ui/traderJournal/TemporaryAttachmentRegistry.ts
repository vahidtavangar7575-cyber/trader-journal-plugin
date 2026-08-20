export type DeleteTemporaryAttachment = (attachmentPath: string) => Promise<void>;

type AttachmentState = 'temporary' | 'committing' | 'committed';

export class TemporaryAttachmentRegistry {
	private readonly attachmentPaths = new Set<string>();
	private state: AttachmentState = 'temporary';
	private cleanupRequested = false;

	constructor(private readonly deleteAttachment: DeleteTemporaryAttachment) {}

	activate(): void {
		this.cleanupRequested = false;
	}

	async track(attachmentPath: string): Promise<boolean> {
		this.attachmentPaths.add(attachmentPath);
		if (!this.cleanupRequested) {
			return true;
		}

		await this.remove(attachmentPath);
		return false;
	}

	async remove(attachmentPath: string): Promise<void> {
		if (!this.attachmentPaths.has(attachmentPath)) {
			return;
		}

		await this.deleteAttachment(attachmentPath);
		this.attachmentPaths.delete(attachmentPath);
	}

	async rollback(attachmentPaths: string[]): Promise<unknown[]> {
		return this.deletePaths(attachmentPaths);
	}

	beginCommit(): void {
		this.state = 'committing';
	}

	commit(): void {
		this.state = 'committed';
		this.attachmentPaths.clear();
	}

	async failCommit(): Promise<unknown[]> {
		this.state = 'temporary';
		return this.cleanupRequested ? this.cleanup() : [];
	}

	async requestCleanup(): Promise<unknown[]> {
		this.cleanupRequested = true;
		return this.state === 'temporary' ? this.cleanup() : [];
	}

	async cleanup(): Promise<unknown[]> {
		return this.deletePaths([...this.attachmentPaths]);
	}

	getTrackedPaths(): string[] {
		return [...this.attachmentPaths];
	}

	private async deletePaths(attachmentPaths: string[]): Promise<unknown[]> {
		const results = await Promise.allSettled(attachmentPaths.map((attachmentPath) => this.remove(attachmentPath)));
		const errors: unknown[] = [];
		for (const result of results) {
			if (result.status === 'rejected') {
				errors.push(result.reason as unknown);
			}
		}
		return errors;
	}
}
