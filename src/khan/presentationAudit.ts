import { KHAN_RULES } from './rules';

/**
 * Source-of-truth navigation audit extracted from the actual internal hyperlinks in
 * Presentation - Copy.pdf (58 pages). Navigation/home/back buttons are excluded;
 * only the content decision links are listed here.
 *
 * Important: a few routes look surprising when read as prose (for example page 37
 * yes -> page 53, and page 18 bearish -> page 16), but they are the destinations
 * encoded by the user's Presentation. We deliberately lock the engine to the file
 * instead of silently "correcting" Khan's/user's graph from our own interpretation.
 */
export const PRESENTATION_DECISION_TARGETS: Readonly<Record<number, readonly number[]>> = {
  1: [2, 24, 37, 51, 41],
  2: [3, 18],
  3: [4, 11],
  4: [5, 8],
  5: [6, 7],
  8: [9, 10],
  11: [12, 15],
  12: [13, 14],
  15: [16, 17],
  18: [16, 19],
  19: [20, 21],
  20: [22, 23],
  21: [22, 23],
  24: [25, 32],
  25: [26, 27],
  26: [28, 29],
  27: [30, 31],
  28: [34, 35],
  29: [34, 35],
  30: [35, 36],
  31: [35, 36],
  32: [25],
  33: [34, 35],
  37: [38, 53],
  38: [39, 40],
  41: [42, 43],
  42: [44, 45],
  43: [46, 47],
  44: [48, 49],
  45: [49, 50],
  46: [48, 49],
  47: [49, 50],
  51: [52, 53],
  52: [2],
  53: [54, 55],
  54: [56, 57],
  55: [57, 58],
};

/** Result cards that contain a clickable continuation in the PDF. They are kept
 * separate from the decision graph because a result is already a valid execution
 * endpoint in the journal. The UI may expose these as "continue from source". */
export const PRESENTATION_RESULT_CONTINUATIONS: Readonly<Record<number, number>> = {
  48: 44,
  49: 44,
  50: 44,
  56: 2,
  57: 2,
  58: 2,
};

export const PRESENTATION_EXPECTED_RISK: Readonly<Record<number, number>> = {
  6: 0.1,
  7: 0.2,
  9: 0.2,
  10: 0.5,
  13: 0.2,
  14: 0.5,
  16: 0.5,
  17: 1,
  22: 0.2,
  23: 0.5,
  34: 0.2,
  35: 0.5,
  36: 1,
  39: 0.1,
  40: 0.2,
  48: 0.1,
  49: 0.2,
  50: 0.5,
  56: 0.1,
  57: 0.2,
  58: 0.5,
};

export function validatePresentationAlignment(): string[] {
  const errors: string[] = [];

  for (const [rawPage, expected] of Object.entries(PRESENTATION_DECISION_TARGETS)) {
    const page = Number(rawPage);
    const node = KHAN_RULES[page];
    if (!node) {
      errors.push(`Presentation page ${page} is missing from KHAN_RULES.`);
      continue;
    }
    const actual = node.kind === 'question'
      ? node.answers.map((answer) => answer.nextPage)
      : node.kind === 'instruction'
        ? [node.continueTo]
        : [];
    if (!sameNumberSet(actual, expected)) {
      errors.push(`Presentation page ${page}: expected targets ${expected.join(',')} but engine has ${actual.join(',') || 'none'}.`);
    }
  }

  for (const [rawPage, expectedRisk] of Object.entries(PRESENTATION_EXPECTED_RISK)) {
    const page = Number(rawPage);
    const node = KHAN_RULES[page];
    if (!node || node.kind !== 'result') {
      errors.push(`Presentation result page ${page} is missing or is not a result node.`);
      continue;
    }
    if (node.riskPct !== expectedRisk) {
      errors.push(`Presentation page ${page}: expected risk ${expectedRisk}% but engine has ${node.riskPct}%.`);
    }
  }

  return errors;
}

function sameNumberSet(actual: readonly number[], expected: readonly number[]): boolean {
  if (actual.length !== expected.length) return false;
  const a = [...actual].sort((x, y) => x - y);
  const b = [...expected].sort((x, y) => x - y);
  return a.every((value, index) => value === b[index]);
}
