import { KHAN_RULES, KHAN_RULE_VERSION, KHAN_START_PAGE } from './rules';
import type {
	KhanDecisionResult,
	KhanDecisionSnapshot,
	KhanQuestionNode,
	KhanSetupId,
} from './types';

const SETUP_START_PAGES: Record<KhanSetupId, number> = {
	'setup-1': 2,
	'setup-2': 18,
	'setup-3': 24,
	'setup-4': 37,
	'setup-5': 41,
	'setup-6': 51,
};

export function createKhanDecisionSnapshot(): KhanDecisionSnapshot {
	return createSnapshot(KHAN_START_PAGE, null);
}

export function createKhanDecisionSnapshotForSetup(setup: KhanSetupId): KhanDecisionSnapshot {
	return createSnapshot(SETUP_START_PAGES[setup], setup);
}

function createSnapshot(page: number, setup: KhanSetupId | null): KhanDecisionSnapshot {
	if (!KHAN_RULES[page]) {
		throw new Error(`Khan decision page ${page} is not defined.`);
	}
	return {
		page,
		setup,
		decisions: [],
		pages: [page],
		history: [],
	};
}

export function getKhanDecisionNode(snapshot: KhanDecisionSnapshot) {
	const node = KHAN_RULES[snapshot.page];
	if (!node) {
		throw new Error(`Khan decision page ${snapshot.page} is not defined.`);
	}
	return node;
}

export function answerKhanDecision(
	snapshot: KhanDecisionSnapshot,
	answerId: string,
): KhanDecisionSnapshot {
	const node = getKhanDecisionNode(snapshot);
	if (node.kind !== 'question') {
		throw new Error(`Khan decision page ${snapshot.page} does not accept an answer.`);
	}

	const answer = node.answers.find((item) => item.id === answerId);
	if (!answer) {
		throw new Error(`Unknown answer ${answerId} for Khan decision page ${snapshot.page}.`);
	}
	assertTargetExists(answer.nextPage, node);

	return {
		page: answer.nextPage,
		setup: answer.setSetup ?? snapshot.setup,
		decisions: [
			...snapshot.decisions,
			{ page: node.page, answerId: answer.id, answerLabel: answer.label },
		],
		pages: [...snapshot.pages, answer.nextPage],
		history: [
			...snapshot.history,
			{ page: snapshot.page, setup: snapshot.setup, decisionCount: snapshot.decisions.length },
		],
	};
}

export function continueKhanDecision(snapshot: KhanDecisionSnapshot): KhanDecisionSnapshot {
	const node = getKhanDecisionNode(snapshot);
	if (node.kind !== 'instruction') {
		throw new Error(`Khan decision page ${snapshot.page} is not an instruction page.`);
	}
	assertTargetExists(node.continueTo, node);

	return {
		...snapshot,
		page: node.continueTo,
		setup: node.setSetup ?? snapshot.setup,
		pages: [...snapshot.pages, node.continueTo],
		history: [
			...snapshot.history,
			{ page: snapshot.page, setup: snapshot.setup, decisionCount: snapshot.decisions.length },
		],
	};
}

export function backKhanDecision(snapshot: KhanDecisionSnapshot): KhanDecisionSnapshot {
	const checkpoint = snapshot.history.at(-1);
	if (!checkpoint) {
		return snapshot;
	}

	return {
		page: checkpoint.page,
		setup: checkpoint.setup,
		decisions: snapshot.decisions.slice(0, checkpoint.decisionCount),
		pages: snapshot.pages.slice(0, -1),
		history: snapshot.history.slice(0, -1),
	};
}

export function getKhanDecisionResult(snapshot: KhanDecisionSnapshot): KhanDecisionResult | null {
	const node = getKhanDecisionNode(snapshot);
	if (node.kind !== 'result') {
		return null;
	}
	if (!snapshot.setup) {
		throw new Error(`Khan result page ${snapshot.page} was reached without a setup.`);
	}

	return {
		setup: snapshot.setup,
		riskPct: node.riskPct,
		resultPage: node.page,
		pages: snapshot.pages,
		decisions: snapshot.decisions,
		ruleVersion: KHAN_RULE_VERSION,
		...(node.caution ? { caution: node.caution } : {}),
	};
}

export function validateKhanRuleGraph(): string[] {
	const errors: string[] = [];
	for (const node of Object.values(KHAN_RULES)) {
		if (node.kind === 'question') {
			if (node.answers.length === 0) {
				errors.push(`Page ${node.page} has no answers.`);
			}
			for (const answer of node.answers) {
				if (!KHAN_RULES[answer.nextPage]) {
					errors.push(`Page ${node.page} answer ${answer.id} targets missing page ${answer.nextPage}.`);
				}
			}
		} else if (node.kind === 'instruction' && !KHAN_RULES[node.continueTo]) {
			errors.push(`Page ${node.page} targets missing page ${node.continueTo}.`);
		}
	}
	return errors;
}

function assertTargetExists(targetPage: number, source: KhanQuestionNode | { page: number }): void {
	if (!KHAN_RULES[targetPage]) {
		throw new Error(`Khan decision page ${source.page} targets missing page ${targetPage}.`);
	}
}
