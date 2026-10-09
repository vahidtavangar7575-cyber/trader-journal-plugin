export type KhanSetupId = 'setup-1' | 'setup-2' | 'setup-3' | 'setup-4' | 'setup-5' | 'setup-6';

export interface KhanDecisionAnswer {
	id: string;
	label: string;
	nextPage: number;
	setSetup?: KhanSetupId;
}

export interface KhanQuestionNode {
	kind: 'question';
	page: number;
	title: string;
	body?: string;
	answers: KhanDecisionAnswer[];
}

export interface KhanInstructionNode {
	kind: 'instruction';
	page: number;
	title: string;
	body?: string;
	continueTo: number;
	setSetup?: KhanSetupId;
}

export interface KhanResultNode {
	kind: 'result';
	page: number;
	title: string;
	body?: string;
	riskPct: number;
	caution?: string;
}

export type KhanDecisionNode = KhanQuestionNode | KhanInstructionNode | KhanResultNode;

export interface KhanDecisionRecord {
	page: number;
	answerId: string;
	answerLabel: string;
}

export interface KhanDecisionSnapshot {
	page: number;
	setup: KhanSetupId | null;
	decisions: KhanDecisionRecord[];
	pages: number[];
}

export interface KhanDecisionResult {
	setup: KhanSetupId;
	riskPct: number;
	resultPage: number;
	pages: number[];
	decisions: KhanDecisionRecord[];
	ruleVersion: string;
	caution?: string;
}
