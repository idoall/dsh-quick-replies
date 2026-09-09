/**
 * dsh-quick-replies — plugin-owned stylesheet (single `<style data-plugin-css>`).
 *
 * Every selector is prefixed `dsh-qr-` (flat class namespace — no global
 * button/div resets, no generic `_root`). Colors ride host design tokens
 * (`--dsw-*`, `--dsh-*`) with conservative fallbacks, so dark/light themes and
 * font scaling keep working without a second stylesheet.
 */
export const QR_CSS = `
/* Design tokens live on BOTH the dock and the dialog portal root: the dialog
   is rendered via createPortal to document.body, so tokens defined only on
   .dsh-qr-dock would never reach it and every var(--qr-*) would fail. */
.dsh-qr-dock, .dsh-qr-overlay {
  --qr-fg: var(--dsw-alias-label-primary, #24292f);
  --qr-fg-dim: var(--dsw-alias-label-tertiary, #656d76);
  --qr-bg: var(--dsw-specific-tip, var(--dsw-alias-bg-module, rgba(127,127,127,0.06)));
  --qr-bg-hover: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.12));
  --qr-border: var(--dsw-alias-border-l1, rgba(140,140,150,0.22));
  --qr-accent: var(--dsw-alias-state-business-primary, #2f6fed);
  --qr-danger: var(--dsw-alias-state-danger, #d1242f);
  --qr-ok: var(--dsw-alias-state-success, #1a7f37);
  --qr-shadow: var(--dsw-alias-shadow-l2, 0 12px 32px rgba(0,0,0,0.18));
}
.dsh-qr-dock {
  box-sizing: border-box;
  /* Same geometry as host conversation.input.dock siblings (queue / todo /
     goal): clearance on the outside, dock-inset as inner padding. Do not
     special-case a 720px breakpoint — Chrome iPhone emulation is 390px wide
     but does not enable dsh-mobile, so a phone-only override would make this
     bar wider than the composer card. */
  width: calc(100% - 2 * var(--dsh-composer-side-clearance, 16px) - 2 * var(--dsh-composer-dock-inset, 8px));
  max-width: calc(var(--dsh-composer-card-max-width, 840px) - 2 * var(--dsh-composer-dock-inset, 8px));
  margin: 0 auto;
  padding: 0 var(--dsh-composer-dock-inset, 8px);
  color: var(--qr-fg);
  font-family: var(--dsw-font-family, inherit);
}
.dsh-qr-dock *, .dsh-qr-dock *::before, .dsh-qr-dock *::after { box-sizing: border-box; }

/* --- collapsed one-row bar: match host queue/todo docks (36px header + 2px pad) --- */
.dsh-qr-collapsed {
  min-height: 40px;
  height: 40px;
  max-height: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 12px;
  border: 1px solid var(--qr-border);
  border-radius: 12px;
  background: var(--qr-bg);
}
.dsh-qr-header {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 0 0;
  margin: 0;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--qr-fg);
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.dsh-qr-header:focus-visible, .dsh-qr-icon-button:focus-visible, .dsh-qr-send:focus-visible,
.dsh-qr-row-button:focus-visible, .dsh-qr-primary:focus-visible, .dsh-qr-danger:focus-visible,
.dsh-qr-text-button:focus-visible, .dsh-qr-toggle:focus-visible, .dsh-qr-chip:focus-visible, .dsh-qr-close:focus-visible {
  outline: 2px solid var(--qr-accent);
  outline-offset: -2px;
}
.dsh-qr-chevron {
  flex: none;
  width: 14px;
  height: 14px;
  display: grid;
  place-items: center;
  color: var(--qr-fg-dim);
}
.dsh-qr-chevron svg { display: block; }

/* --- expanded zone --- */
.dsh-qr-expanded {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--qr-border);
  border-radius: 12px;
  background: var(--qr-bg);
}
.dsh-qr-controls {
  flex: none;
  min-height: 36px;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px 2px 12px;
}
.dsh-qr-title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 24px;
  color: var(--qr-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}
.dsh-qr-icon-button {
  flex: none;
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  color: var(--qr-fg-dim);
  background: none;
  border: none;
  border-radius: 999px;
  padding: 0;
  cursor: pointer;
  font: inherit;
  font-size: 16px;
  line-height: 1;
}
.dsh-qr-icon-button:hover:not(:disabled),
.dsh-qr-icon-button:active:not(:disabled) { background: var(--qr-bg-hover); }
.dsh-qr-icon-button:disabled, .dsh-qr-send:disabled, .dsh-qr-primary:disabled, .dsh-qr-danger:disabled,
.dsh-qr-row-button:disabled, .dsh-qr-text-button:disabled { cursor: default; opacity: 0.45; }

/* --- chip list --- */
.dsh-qr-list {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  padding: 0 6px 6px;
  list-style: none;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: flex-start;
}
.dsh-qr-list-item { flex: 0 0 auto; max-width: 100%; min-width: 0; }
.dsh-qr-send {
  max-width: 100%;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--qr-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--qr-bg) 88%, white 0%);
  background: var(--qr-bg);
  color: var(--qr-fg);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  transition: background 120ms ease;
}
.dsh-qr-send:hover:not(:disabled) { background: var(--qr-bg-hover); }
.dsh-qr-send-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- status / notes --- */
.dsh-qr-status {
  flex: none;
  font-size: 12px;
  line-height: 18px;
  color: var(--qr-fg-dim);
  padding: 0 12px 6px;
  overflow-wrap: anywhere;
}
.dsh-qr-status[aria-live] { min-height: 18px; }
.dsh-qr-status-error { color: var(--qr-danger); }
.dsh-qr-status-ok { color: var(--qr-ok); }
.dsh-qr-empty-note { padding: 0 12px 10px; font-size: 12px; color: var(--qr-fg-dim); }

/* --- dialog --- */
/* The dialog is createPortal'd to document.body, outside .dsh-qr-dock, so the
   dock-scoped box-sizing reset never reached it. Reset on the portal root. */
.dsh-qr-overlay, .dsh-qr-overlay *, .dsh-qr-overlay *::before, .dsh-qr-overlay *::after {
  box-sizing: border-box;
}
.dsh-qr-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-scrim, var(--dsh-scrim, rgba(8, 9, 12, 0.45)));
}
.dsh-qr-sheet {
  /* NOTE: keep the closing parens balanced — a missing ")" here makes the
     CSS parser drop every rule after .dsh-qr-sheet (head/body/foot/manage…). */
  width: min(680px, calc(100vw - 2 * max(12px, env(safe-area-inset-left)) - 2 * max(12px, env(safe-area-inset-right))));
  max-height: min(720px, calc(100dvh - 2 * max(12px, env(safe-area-inset-top)) - 2 * max(12px, env(safe-area-inset-bottom))));
  display: flex;
  flex-direction: column;
  /* Follow the HOST theme token, never the OS media query: the host theme and
     the system setting are independent switches, and forcing a dark sheet via
     prefers-color-scheme can yield dark-bg + dark-text when the host is light. */
  background: var(--dsw-alias-bg-base, Canvas);
  color: var(--qr-fg);
  border-radius: 16px;
  box-shadow: var(--qr-shadow);
  overflow: hidden;
}
.dsh-qr-sheet-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 10px 12px 10px 16px;
  border-bottom: 1px solid var(--qr-border);
}
.dsh-qr-sheet-title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-qr-close {
  flex: none;
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--qr-fg-dim);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.dsh-qr-close:hover:not(:disabled) { background: var(--qr-bg-hover); color: var(--qr-fg); }
.dsh-qr-sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  -webkit-overflow-scrolling: touch;
}
.dsh-qr-sheet-foot {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--qr-border);
}
.dsh-qr-notice {
  flex: 1 1 100%;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 18px;
}
.dsh-qr-notice-conflict { background: color-mix(in srgb, var(--qr-danger) 12%, transparent); color: var(--qr-danger); }
.dsh-qr-notice-error { background: color-mix(in srgb, var(--qr-danger) 12%, transparent); color: var(--qr-danger); }
.dsh-qr-notice-ok { background: color-mix(in srgb, var(--qr-ok) 12%, transparent); color: var(--qr-ok); }

.dsh-qr-manage-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 4px 0;
  border-bottom: 1px solid var(--qr-border);
  min-width: 0;
}
.dsh-qr-manage-row:last-child { border-bottom: none; }
.dsh-qr-manage-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 20px;
}
.dsh-qr-row-actions {
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 2px;
}
.dsh-qr-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  color: var(--qr-fg-dim);
  border: 1px solid var(--qr-border);
  border-radius: 999px;
  background: none;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 120ms ease, color 120ms ease;
}
.dsh-qr-chip:hover:not(:disabled) { background: var(--qr-bg-hover); }
.dsh-qr-chip-on { color: var(--qr-ok); border-color: color-mix(in srgb, var(--qr-ok) 50%, transparent); }
.dsh-qr-chip-off { color: var(--qr-fg-dim); }
.dsh-qr-row-button {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 8px;
  background: none;
  color: var(--qr-fg-dim);
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
}
.dsh-qr-row-button:hover:not(:disabled) { background: var(--qr-bg-hover); color: var(--qr-fg); }
.dsh-qr-row-button-danger:hover { color: var(--qr-danger); }
.dsh-qr-empty {
  color: var(--qr-fg-dim);
  font-size: 13px;
  padding: 16px 4px;
}

.dsh-qr-form-field { margin: 0 0 16px; min-width: 0; }
.dsh-qr-form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 18px;
  color: var(--qr-fg);
}
.dsh-qr-input, .dsh-qr-textarea {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font: inherit;
  font-size: 14px;
  color: var(--qr-fg);
  background: rgba(127, 127, 127, 0.06);
  background: color-mix(in srgb, var(--qr-fg) 3.5%, transparent);
  border: 1px solid var(--qr-border);
  border-radius: 8px;
  padding: 9px 10px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.dsh-qr-input:hover, .dsh-qr-textarea:hover { border-color: var(--qr-fg-dim); }
.dsh-qr-input:focus, .dsh-qr-textarea:focus {
  border-color: var(--qr-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(47, 111, 237, 0.18);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--qr-accent) 22%, transparent);
}
.dsh-qr-textarea { resize: vertical; min-height: 110px; line-height: 1.45; }
.dsh-qr-char-count { font-size: 12px; color: var(--qr-fg-dim); text-align: right; margin-top: 6px; }
.dsh-qr-field-error { font-size: 12px; color: var(--qr-danger); margin-top: 4px; }
.dsh-qr-hint { font-size: 12px; color: var(--qr-fg-dim); margin-top: 4px; }
.dsh-qr-toggle-row { display: flex; align-items: center; gap: 8px; font-size: 13px; min-height: 44px; }
.dsh-qr-toggle-row label { cursor: pointer; line-height: 20px; }
/* Custom-drawn checkbox: 44px hit area stays, the visible box is a centered
   20px square so the checkmark aligns with the text baseline regardless of
   how each browser paints a scaled native control. */
.dsh-qr-toggle {
  appearance: none;
  -webkit-appearance: none;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  flex: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}
.dsh-qr-toggle::before {
  content: "";
  grid-area: 1 / 1;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--qr-border);
  border-radius: 6px;
  box-sizing: border-box;
  transition: border-color 120ms ease, background-color 120ms ease;
}
.dsh-qr-toggle:hover::before { border-color: var(--qr-fg-dim); }
.dsh-qr-toggle:checked::before { border-color: var(--qr-accent); background-color: var(--qr-accent); }
.dsh-qr-toggle:checked::after {
  content: "";
  grid-area: 1 / 1;
  width: 11px;
  height: 6px;
  margin-top: -2px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg);
}

.dsh-qr-primary, .dsh-qr-danger, .dsh-qr-text-button {
  min-height: 36px;
  border-radius: 8px;
  padding: 6px 14px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: background 120ms ease, border-color 120ms ease, filter 120ms ease;
}
.dsh-qr-primary { background: var(--qr-accent); color: #fff; }
.dsh-qr-primary:hover:not(:disabled) { filter: brightness(1.06); }
.dsh-qr-primary:active:not(:disabled) { filter: brightness(0.94); }
.dsh-qr-danger { background: transparent; border: 1px solid var(--qr-danger); color: var(--qr-danger); }
.dsh-qr-danger:hover:not(:disabled) {
  background: rgba(209, 36, 47, 0.10);
  background: color-mix(in srgb, var(--qr-danger) 10%, transparent);
}
.dsh-qr-text-button { background: none; color: var(--qr-fg); border: 1px solid var(--qr-border); }
.dsh-qr-text-button:hover:not(:disabled) { border-color: var(--qr-fg-dim); background: var(--qr-bg-hover); }
/* Footer cluster: secondary actions grouped on the left, primary CTA stays right. */
.dsh-qr-foot-cluster {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  min-width: 0;
}
.dsh-qr-storage-note { font-size: 12px; color: var(--qr-danger); margin: 8px 0 0; }
.dsh-qr-confirm-bar { display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
.dsh-qr-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }

@media (max-width: 640px) {
  .dsh-qr-sheet {
    width: calc(100vw - 2 * max(12px, env(safe-area-inset-left)) - 2 * max(12px, env(safe-area-inset-right)));
    max-height: calc(100dvh - 2 * max(12px, env(safe-area-inset-top)) - 2 * max(12px, env(safe-area-inset-bottom)));
    border-radius: 12px;
  }
  .dsh-qr-textarea { min-height: 72px; }
}
`
