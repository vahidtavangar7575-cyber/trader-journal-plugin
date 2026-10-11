const SCROLL_SAFETY_STYLE_ID = 'trader-journal-scroll-safety';

export const SCROLL_SAFETY_CSS = `
/* Trader Journal scroll contract -------------------------------------------------
   Every plugin modal has exactly one vertical scroll owner. Approved visual styles
   stay untouched; this layer only fixes sizing, overflow and responsive access. */
.trader-journal-modal-shell {
  display: flex !important;
  flex-direction: column !important;
  width: min(1080px, calc(100vw - 28px));
  max-width: calc(100vw - 28px) !important;
  height: min(920px, calc(100vh - 28px));
  max-height: calc(100vh - 28px) !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

@supports (height: 100dvh) {
  .trader-journal-modal-shell {
    height: min(920px, calc(100dvh - 28px));
    max-height: calc(100dvh - 28px) !important;
  }
}

.trader-journal-modal-shell > .modal-title,
.trader-journal-modal-shell > .modal-close-button { flex: 0 0 auto; }

.trader-journal-modal-shell > .modal-content.trader-journal-modal-content {
  display: flex !important; flex: 1 1 auto !important; flex-direction: column !important;
  width: 100% !important; min-width: 0 !important; min-height: 0 !important;
  max-height: none !important; overflow: hidden !important; overscroll-behavior: contain;
}

.trader-journal-modal-content > .account-manager {
  flex: 1 1 auto !important; width: 100%; min-width: 0; min-height: 0 !important;
  max-height: none !important; overflow-x: hidden !important; overflow-y: auto !important;
  scrollbar-gutter: stable both-edges; overscroll-behavior: contain; padding-bottom: 28px;
}

.trader-journal-modal-content > .trader-journal-form {
  display: flex !important; flex: 1 1 auto !important; flex-direction: column !important;
  width: 100%; min-width: 0 !important; min-height: 0 !important; max-height: none !important;
  overflow: hidden !important;
}

.trader-journal-modal-content > .trader-journal-form > .trader-journal-form__body {
  flex: 1 1 auto !important; min-height: 0 !important; max-height: none !important;
  overflow-x: hidden !important; overflow-y: auto !important; scrollbar-gutter: stable both-edges;
  overscroll-behavior: contain; padding-bottom: 28px;
}

.trader-journal-modal-content > .trader-journal-form > .trader-journal-form__actions {
  position: sticky; bottom: 0; z-index: 30; flex: 0 0 auto; margin: 0;
}

.trader-journal-modal-content > .khan-cockpit {
  flex: 1 1 auto !important; min-width: 0 !important; min-height: 0 !important;
  max-height: none !important; overflow-x: hidden !important; overflow-y: auto !important;
  scrollbar-gutter: stable both-edges; overscroll-behavior: contain; padding-bottom: 20px;
}

.trader-journal-scroll-x,
.trader-journal-trade-images,
.trader-journal-dashboard-adherence,
.trader-journal-image-modal-frame {
  max-width: 100%; min-width: 0; overflow-x: auto; overscroll-behavior-inline: contain;
}

.trader-journal-modal-shell img { max-width: 100%; height: auto; }
.trader-journal-modal-shell input,
.trader-journal-modal-shell select,
.trader-journal-modal-shell textarea,
.trader-journal-modal-shell button { max-width: 100%; }

@media (max-width: 760px), (max-height: 700px) {
  .trader-journal-modal-shell {
    width: calc(100vw - 12px) !important; max-width: calc(100vw - 12px) !important;
    height: calc(100vh - 12px) !important; max-height: calc(100vh - 12px) !important;
  }
  @supports (height: 100dvh) {
    .trader-journal-modal-shell { height: calc(100dvh - 12px) !important; max-height: calc(100dvh - 12px) !important; }
  }
}
`;

export function installTraderJournalScrollSafety(): () => void {
  document.getElementById(SCROLL_SAFETY_STYLE_ID)?.remove();
  const style = document.createElement('style');
  style.id = SCROLL_SAFETY_STYLE_ID;
  style.textContent = SCROLL_SAFETY_CSS;
  document.head.appendChild(style);
  return () => style.remove();
}
