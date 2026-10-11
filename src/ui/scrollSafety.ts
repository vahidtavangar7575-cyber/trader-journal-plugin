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
    document.querySelectorAll<HTMLElement>('.trader-journal-modal-shell').forEach((shell) => {
      applyScrollContract(shell);
    });
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
  shell.setCssStyles(TRADER_JOURNAL_SCROLL_CONTRACT.shell);

  const content = shell.querySelector<HTMLElement>(':scope > .modal-content.trader-journal-modal-content');
  if (!content) return;
  content.setCssStyles(TRADER_JOURNAL_SCROLL_CONTRACT.content);

  // The outer .modal-content is the single vertical owner. Nested sections are
  // returned to natural document flow so wheel/trackpad events cannot die in an
  // inner overflow:hidden/max-height combination.
  NATURAL_FLOW_SELECTORS.forEach((selector) => {
    content.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.setCssStyles({
        maxHeight: 'none',
        minHeight: '0',
        overflowY: 'visible',
        overflowX: 'visible',
      });
    });
  });

  // Images/tables may be wide, but horizontal scrolling stays local and never
  // blocks the modal's vertical scroll.
  content.querySelectorAll<HTMLElement>(
    '.trader-journal-trade-images, .trader-journal-dashboard-adherence, .trader-journal-image-modal-frame',
  ).forEach((element) => {
    element.setCssStyles({
      maxWidth: '100%',
      minWidth: '0',
      overflowX: 'auto',
    });
  });
}
