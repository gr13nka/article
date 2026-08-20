/*
 * Article theme control.
 *
 * The entire theming mechanism is one attribute on <html>:
 *
 *   absent            -> follow the operating system
 *   data-theme="light"-> force light
 *   data-theme="dark" -> force dark
 *
 * tokens.css maps that attribute to `color-scheme`, and every semantic token
 * is declared with light-dark(), so the palette follows automatically. No
 * component, and nothing else in this file, ever needs to know which theme is
 * active or what any colour resolves to.
 */

export const THEME_KEY = 'art-theme';
export const THEME_MODES = ['system', 'light', 'dark'];

/*
 * Inline this in <head>, BEFORE any stylesheet, to stop the first paint
 * happening in the wrong theme. It is exported as a string rather than kept
 * in a file because a module import is async by definition and therefore
 * always too late — the flash has already happened by the time it resolves.
 */
export const NO_FLASH_SNIPPET = `(function(){try{var m=localStorage.getItem('${THEME_KEY}');if(m==='light'||m==='dark')document.documentElement.setAttribute('data-theme',m);}catch(e){}})();`;

const apply = (mode) => {
  const root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
  else root.removeAttribute('data-theme');
};

/**
 * Wire up theme control. Returns a handle; call `set` or `cycle` from a
 * toggle control, and read `resolved` when you need to know what the user is
 * actually looking at (e.g. to swap a sun/moon icon) — which is the only
 * legitimate reason to ask.
 *
 * @param {{ onChange?: (mode: string, resolved: 'light'|'dark') => void }} [options]
 */
export function initTheme({ onChange } = {}) {
  let mode = 'system';
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (THEME_MODES.includes(stored)) mode = stored;
  } catch (e) { /* private browsing — fall back to system, don't break the page */ }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const resolved = () => (mode === 'system' ? (media.matches ? 'dark' : 'light') : mode);
  const notify = () => onChange?.(mode, resolved());

  const set = (next) => {
    if (!THEME_MODES.includes(next)) return;
    mode = next;
    try {
      if (mode === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* not fatal: the choice just won't survive a reload */ }
    apply(mode);
    notify();
  };

  // Only matters while mode is 'system', but staying subscribed is cheaper
  // than tearing the listener down and rebuilding it on every change.
  media.addEventListener('change', () => { if (mode === 'system') notify(); });

  apply(mode);
  notify();

  return {
    set,
    cycle: () => set(THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]),
    get mode() { return mode; },
    get resolved() { return resolved(); },
  };
}
