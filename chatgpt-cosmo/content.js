(() => {
	'use strict';
  
	/*** Constants *************************************************************/
	const SELECTORS = {
	  html: document.documentElement,
	  plusBtn: 'button[data-testid="composer-plus-btn"]', // verified in page DOM
	  roleMenu: '[role="menu"]'
	};
  
	const DEFAULTS = {
	  cosmoTheme: 'nebula',
	  cosmoNoChatbarHighlight: false,
	  cosmoNoChatbarHover: false
	};
  
	const THEMES = ['nebula', 'glass', 'mono', 'sunset', 'vapor', 'contrast', 'mocha'];
  
	const THEME_COLORS = {
	  nebula:   ['#6a5cff', '#00c2ff'],
	  glass:    ['#6f7cff', '#9be7ff'],
	  mono:     ['#4a86ff', '#7dd3fc'],
	  sunset:   ['#ff7a59', '#ffd38a'],
	  vapor:    ['#8a63d2', '#34d5d5'],
	  contrast: ['#9ab6ff', '#78e2ff'],
	  mocha:    ['#8b5e3c', '#f3e9dc']
	};
  
	/*** State + Storage helpers ***********************************************/
	let state = { ...DEFAULTS };
  
	function applyStateToDOM(previewTheme = null) {
	  const html = SELECTORS.html;
	  const theme = previewTheme ?? state.cosmoTheme;
	  html.setAttribute('data-cosmo-theme', theme);
  
	  if (state.cosmoNoChatbarHighlight) html.setAttribute('data-cosmo-no-chatbar-highlight', '');
	  else html.removeAttribute('data-cosmo-no-chatbar-highlight');
  
	  if (state.cosmoNoChatbarHover) html.setAttribute('data-cosmo-no-chatbar-hover', '');
	  else html.removeAttribute('data-cosmo-no-chatbar-hover');
	}
  
	function loadStateOnce() {
	  chrome.storage.sync.get(DEFAULTS, (s) => {
		state = { ...state, ...s };
		applyStateToDOM();
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
	  for (const k of ['cosmoTheme','cosmoNoChatbarHighlight','cosmoNoChatbarHover']) {
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
		  (!state.cosmoNoChatbarHover && html.hasAttribute('data-cosmo-no-chatbar-hover'))) {
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
  
	/*** Composer "+" menu swatch injection ************************************/
	// Style for swatches
	(function injectSwatchCSS() {
	  const s = document.createElement('style');
	  s.textContent = `
		#cosmo-menu-theme{ display:flex; align-items:center; justify-content:space-between;
		  gap:10px; padding:10px; margin-top:6px; border-top:1px solid var(--cosmo-border); }
		#cosmo-menu-theme .label{ font-size:12px; color:var(--cosmo-subtle); margin-right:6px; }
		#cosmo-menu-theme .swatches{ display:flex; gap:8px; flex-wrap:wrap; }
		#cosmo-menu-theme .swatches button[role="radio"]{
		  width:20px;height:20px;border-radius:999px; border:1px solid var(--cosmo-border);
		  background: linear-gradient(135deg, var(--a1), var(--a2));
		  box-shadow: var(--cosmo-glow); cursor:pointer; padding:0; position:relative;
		}
		#cosmo-menu-theme .swatches button[role="radio"]:focus-visible{
		  outline:none; box-shadow: 0 0 0 2px color-mix(in oklab, var(--a2) 45%, transparent);
		}
		#cosmo-menu-theme .swatches button[role="radio"][aria-checked="true"]::after{
		  content:""; position:absolute; inset:-3px; border-radius:inherit;
		  box-shadow: 0 0 0 2px color-mix(in oklab, var(--a2) 55%, transparent);
		}`;
	  (document.head || document.documentElement).appendChild(s);
	})();
  
	function buildThemeRow(menuEl) {
	  if (menuEl.querySelector('#cosmo-menu-theme')) return;
  
	  const row = document.createElement('div');
	  row.id = 'cosmo-menu-theme';
  
	  const label = document.createElement('span');
	  label.className = 'label';
	  label.id = 'cosmo-theme-label';
	  label.textContent = 'Theme';
  
	  const swatches = document.createElement('div');
	  swatches.className = 'swatches';
	  swatches.setAttribute('role','radiogroup');
	  swatches.setAttribute('aria-labelledby','cosmo-theme-label');
  
	  const frag = document.createDocumentFragment();
  
	  const updateActive = (theme) => {
		for (const el of swatches.children) {
		  const isActive = el.getAttribute('data-theme') === theme;
		  el.setAttribute('aria-checked', isActive ? 'true' : 'false');
		  el.tabIndex = isActive ? 0 : -1;
		}
	  };
  
	  const onHover = (t) => SELECTORS.html.setAttribute('data-cosmo-theme', t);
	  const onLeave = () => SELECTORS.html.setAttribute('data-cosmo-theme', state.cosmoTheme);
  
	  for (const t of THEMES) {
		const b = document.createElement('button');
		b.setAttribute('role','radio');
		b.setAttribute('aria-checked','false');
		b.setAttribute('aria-label', t[0].toUpperCase() + t.slice(1));
		b.setAttribute('data-theme', t);
		const [a1, a2] = THEME_COLORS[t];
		b.style.setProperty('--a1', a1);
		b.style.setProperty('--a2', a2);
		b.tabIndex = -1;
		b.addEventListener('click', () => setThemePersisted(t));
		b.addEventListener('pointerenter', () => onHover(t));
		b.addEventListener('pointerleave', onLeave);
		frag.appendChild(b);
	  }
  
	  swatches.appendChild(frag);
	  swatches.addEventListener('keydown', (e) => {
		const radios = Array.from(swatches.querySelectorAll('[role="radio"]'));
		const currentIndex = radios.findIndex(el => el.getAttribute('aria-checked') === 'true' || el === document.activeElement);
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
		  e.preventDefault(); radios[(currentIndex + 1 + radios.length) % radios.length].focus();
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
		  e.preventDefault(); radios[(currentIndex - 1 + radios.length) % radios.length].focus();
		} else if (e.key === 'Enter' || e.key === ' ') {
		  e.preventDefault(); const f = document.activeElement;
		  if (f && f.getAttribute('role') === 'radio') setThemePersisted(f.getAttribute('data-theme'));
		}
	  });
  
	  row.appendChild(label);
	  row.appendChild(swatches);
	  menuEl.appendChild(row);
  
	  // Initialize the active ring from cached state and keep in sync
	  updateActive(state.cosmoTheme);
	  chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'sync' && changes.cosmoTheme) updateActive(changes.cosmoTheme.newValue);
	  });
	}
  
	function tryInjectIntoLatestMenu() {
	  const menus = Array.from(document.querySelectorAll(SELECTORS.roleMenu));
	  if (!menus.length) return;
	  buildThemeRow(menus.at(-1));
	}
  
	// Listen for clicks on the composer "+" and then watch for the menu to mount
	document.addEventListener('click', (e) => {
	  const target = e.target instanceof Element ? e.target : null;
	  if (!target || !target.closest(SELECTORS.plusBtn)) return;
  
	  const obs = new MutationObserver(() => {
		tryInjectIntoLatestMenu();
	  });
	  obs.observe(document.body, { childList: true, subtree: true });
	  // Fallback in case the menu appears very quickly
	  setTimeout(() => { tryInjectIntoLatestMenu(); obs.disconnect(); }, 150);
	  // Disconnect once injection succeeds
	  const once = new MutationObserver(() => {
		const injected = document.querySelector('#cosmo-menu-theme');
		if (injected) { obs.disconnect(); once.disconnect(); }
	  });
	  once.observe(document.body, { childList: true, subtree: true });
	});
  
	/*** Boot ******************************************************************/
	loadStateOnce();
  })();
  