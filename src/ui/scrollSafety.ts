export const TRADER_JOURNAL_SCROLL_CONTRACT = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    width: 'min(1080px, calc(100vw - 28px))',
    maxWidth: 'calc(100vw - 28px)',
    maxHeight: 'calc(100dvh - 28px)',
    minHeight: '0',
    overflow: 'hidden',
  },
  content: {
    display: 'flex',
    flex: '1 1 auto',
    flexDirection: 'column',
    width: '100%',
    minWidth: '0',
    minHeight: '0',
    maxHeight: 'calc(100dvh - 64px)',
    overflowX: 'hidden',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    scrollbarGutter: 'stable both-edges',
  },
} as const;

const NATURAL_FLOW_SELECTORS = [
  '.account-manager',
  '.khan-cockpit',
  '.trader-journal-form',
  '.trader-journal-form__body',
] as const;

/**
 * Enforces one reliable vertical scroll owner for Trader Journal modals without
 * injecting forbidden <style> nodes. Obsidian loads styles.css normally; this
 * runtime guard only neutralizes nested overflow traps that can reappear when a
 * theme or viewport changes sizing.
 */
export function installTraderJournalScrollSafety(): () => void {
  let queued = false;

  const applyAll = () => {
    queued = false;
    const shells = document.querySelectorAll<HTMLElement>('.trader-journal-modal-shell');
    for (const shell of shells) applyScrollContract(shell);
  };

  const queueApply = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(applyAll);
  };

  applyAll();
  const observer = new MutationObserver(queueApply);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}

function applyScrollContract(shell: HTMLElement): void {
  applyStyles(shell, TRADER_JOURNAL_SCROLL_CONTRACT.shell);

  const content = shell.querySelector<HTMLElement>(':scope > .modal-content.trader-journal-modal-content');
  if (!content) return;
  applyStyles(content, TRADER_JOURNAL_SCROLL_CONTRACT.content);

  // The outer .modal-content is the single vertical owner. Nested sections are
  // returned to natural document flow so wheel/trackpad events cannot die in an
  // inner overflow:hidden/max-height combination.
  for (const selector of NATURAL_FLOW_SELECTORS) {
    for (const element of content.querySelectorAll<HTMLElement>(selector)) {
      element.style.setProperty('max-height', 'none');
      element.style.setProperty('min-height', '0');
      element.style.setProperty('overflow-y', 'visible');
      element.style.setProperty('overflow-x', 'visible');
    }
  }

  // Images/tables may be wide, but horizontal scrolling stays local and never
  // blocks the modal's vertical scroll.
  for (const element of content.querySelectorAll<HTMLElement>(
    '.trader-journal-trade-images, .trader-journal-dashboard-adherence, .trader-journal-image-modal-frame',
  )) {
    element.style.setProperty('max-width', '100%');
    element.style.setProperty('min-width', '0');
    element.style.setProperty('overflow-x', 'auto');
  }
}

function applyStyles(element: HTMLElement, styles: Readonly<Record<string, string>>): void {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(toKebabCase(property), value);
  }
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
