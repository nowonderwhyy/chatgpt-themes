(() => {
	'use strict';
  
	/*** Constants *************************************************************/
	const SELECTORS = {
	  html: document.documentElement
	};
  
  const DEFAULTS = {
    cosmoTheme: 'glass',
    cosmoNoChatbarHighlight: false,
    cosmoNoChatbarHover: false,
    cosmoIntensity: 'regular',
    cosmoReduceTransparency: false
  };
  
	const THEMES = ['glass', 'mono', 'sunset', 'vapor', 'contrast', 'mocha', 'sakura', 'glacier', 'orchid', 'amethyst', 'gamma', 'midnight', 'nocturne'];
  const INTENSITIES = {
    light: { alpha:.74, blur:10, contrast:1.04 },
    regular: { alpha:.84, blur:12, contrast:1.07 },
    bold: { alpha:.86, blur:14, contrast:1.08 }
  };
  
	/*** State + Storage helpers ***********************************************/
	let state = { ...DEFAULTS };
  
  function applyStateToDOM(previewTheme = null) {
	  const html = SELECTORS.html;
	  const theme = previewTheme ?? state.cosmoTheme;
	  html.setAttribute('data-cosmo-theme', theme);
  
	  const i = INTENSITIES[state.cosmoIntensity] || INTENSITIES.regular;
	  html.style.setProperty('--cosmo-surface-alpha', i.alpha);
	  html.style.setProperty('--cosmo-blur-strength', i.blur + 'px');
	  html.style.setProperty('--cosmo-contrast-boost', i.contrast);
  
	  if (state.cosmoNoChatbarHighlight) html.setAttribute('data-cosmo-no-chatbar-highlight', '');
	  else html.removeAttribute('data-cosmo-no-chatbar-highlight');
  
    if (state.cosmoNoChatbarHover) html.setAttribute('data-cosmo-no-chatbar-hover', '');
    else html.removeAttribute('data-cosmo-no-chatbar-hover');

    if (state.cosmoReduceTransparency) html.setAttribute('data-cosmo-reduce-transparency', '');
    else html.removeAttribute('data-cosmo-reduce-transparency');

    // Collapsed-rail behaviors are now always on via CSS; no flags.
  }
  
  function loadStateOnce() {
    chrome.storage.sync.get({ ...DEFAULTS, cosmoAltTHintShown: false }, (s) => {
      state = { ...state, ...s };
      // Accessibility: enable reduce-transparency by default on Contrast (one-time)
      if (state.cosmoTheme === 'contrast' && !s.cosmoReduceTransparency) {
        state.cosmoReduceTransparency = true;
        chrome.storage.sync.set({ cosmoReduceTransparency: true });
      }
      applyStateToDOM();
      // One-time Alt+T toast hint
      if (!s.cosmoAltTHintShown) {
        showAltTToast();
        chrome.storage.sync.set({ cosmoAltTHintShown: true });
      }
    });
  }
  
	function setThemePersisted(nextTheme) {
	  state.cosmoTheme = nextTheme;
	  chrome.storage.sync.set({ cosmoTheme: nextTheme });
	  applyStateToDOM();
	}
  
	// Live sync when any setting changes
	chrome.storage.onChanged.addListener((changes, area) => {
	  if (area !== 'sync') return;
	  let needsApply = false;
  for (const k of ['cosmoTheme','cosmoNoChatbarHighlight','cosmoNoChatbarHover','cosmoIntensity','cosmoReduceTransparency']) {
      if (changes[k]) {
        state[k] = changes[k].newValue;
        needsApply = true;
      }
    }
	  if (needsApply) applyStateToDOM();
	});
  
	/*** Keep attributes present across SPA/theme class flips ******************/
	// Cache-based reapply instead of storage.get in a loop.
  const rootObserver = new MutationObserver(() => {
    const html = SELECTORS.html;
    // If ChatGPT toggles its root attrs/classes, ensure ours persist
    if (!html.hasAttribute('data-cosmo-theme') ||
        (!state.cosmoNoChatbarHighlight && html.hasAttribute('data-cosmo-no-chatbar-highlight')) ||
        (!state.cosmoNoChatbarHover && html.hasAttribute('data-cosmo-no-chatbar-hover')) ||
        (!state.cosmoReduceTransparency && html.hasAttribute('data-cosmo-reduce-transparency')) ||
        (state.cosmoReduceTransparency && !html.hasAttribute('data-cosmo-reduce-transparency'))
      ) {
      applyStateToDOM();
    }
  });
	rootObserver.observe(SELECTORS.html, { attributes: true, attributeFilter: ['class', 'data-chat-theme'] });
  
  /*** Hotkey: Alt+T (accepts Alt+Shift/Ctrl too, same as before) ************/
	window.addEventListener('keydown', (e) => {
	  const isT = e.code === 'KeyT';
	  const isCombo = e.altKey && isT; // Allow any Alt+T combo
	  if (!isCombo) return;
	  e.stopPropagation();
	  const i = THEMES.indexOf(state.cosmoTheme);
	  const next = THEMES[(i + 1) % THEMES.length];
	  setThemePersisted(next);
	}, true);
  /*** Boot ******************************************************************/
  loadStateOnce();

  /*** Small UI: One-time Alt+T hint *****************************************/
  function showAltTToast() {
    try {
      const el = document.createElement('div');
      el.textContent = 'Tip: Press Alt+T to try other looks';
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: '2147483647',
        background: 'var(--cosmo-card)',
        color: 'var(--cosmo-text)',
        border: '1px solid var(--cosmo-border)',
        borderRadius: '10px',
        padding: '8px 10px',
        boxShadow: 'var(--cosmo-glow-soft)',
        backdropFilter: 'var(--cosmo-blur)'
      });
      document.documentElement.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s ease'; }, 2400);
      setTimeout(() => { el.remove(); }, 2800);
    } catch (_) {}
  }
  })();
  
