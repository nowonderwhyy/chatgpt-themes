(function () {
	const html = document.documentElement;

	// Read saved theme (default 'nebula')
	chrome.storage.sync.get({ cosmoTheme: "nebula" }, ({ cosmoTheme }) => {
		html.setAttribute("data-cosmo-theme", cosmoTheme);
	});

	// Keep attribute present across SPA navs/attribute changes
	const observer = new MutationObserver(() => {
		if (!html.hasAttribute("data-cosmo-theme")) {
			chrome.storage.sync.get({ cosmoTheme: "nebula" }, ({ cosmoTheme }) => {
				html.setAttribute("data-cosmo-theme", cosmoTheme);
			});
		}
	});

	observer.observe(html, { attributes: true, attributeFilter: ["class", "data-chat-theme"] });
 
	// Live update when options change theme
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === "sync" && changes.cosmoTheme) {
			document.documentElement.setAttribute("data-cosmo-theme", changes.cosmoTheme.newValue);
		}
	});
})();

// Removed header theme switcher to restrict theme controls to the composer '+' menu only.



(function hotkeyCycle(){
	const THEMES = ["nebula","glass","mono","sunset","vapor","contrast"];
	const THEMES_MOCHA = ["nebula","glass","mono","sunset","vapor","contrast","mocha"];
	window.addEventListener('keydown', (e) => {
		const isCombo =
			(e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyT') ||
			(e.altKey && e.shiftKey && e.code === 'KeyT') ||
			(e.altKey && e.ctrlKey && e.code === 'KeyT');
		if (!isCombo) return;
		e.stopPropagation();
		chrome.storage.sync.get({cosmoTheme:'nebula'}, ({cosmoTheme}) => {
			const list = THEMES_MOCHA;
			const i = list.indexOf(cosmoTheme);
			const next = list[(i + 1) % list.length];
			chrome.storage.sync.set({cosmoTheme: next});
			document.documentElement.setAttribute('data-cosmo-theme', next);
		});
	}, true);
})();


(function addComposerMenuTheme(){
	const THEMES = ["nebula","glass","mono","sunset","vapor","contrast","mocha"];
	const PLUS = 'button[data-testid="composer-plus-btn"]';
	const THEME_COLORS = {
		nebula:   ["#6a5cff", "#00c2ff"],
		glass:    ["#6f7cff", "#9be7ff"],
		mono:     ["#4a86ff", "#7dd3fc"],
		sunset:   ["#ff7a59", "#ffd38a"],
		vapor:    ["#8a63d2", "#34d5d5"],
		contrast: ["#9ab6ff", "#78e2ff"],
		mocha:    ["#8b5e3c", "#f3e9dc"]
	};

	const s = document.createElement('style');
	s.textContent = `
		#cosmo-menu-theme{
			display:flex; align-items:center; justify-content:space-between;
			gap:10px; padding:10px; margin-top:6px;
			border-top:1px solid var(--cosmo-border);
		}
		#cosmo-menu-theme .label{ font-size:12px; color:var(--cosmo-subtle); margin-right:6px; }
		#cosmo-menu-theme .swatches{ display:flex; gap:8px; flex-wrap:wrap; }
		#cosmo-menu-theme .swatches button[role="radio"]{
			width:20px;height:20px;border-radius:999px; border:1px solid var(--cosmo-border);
			background: linear-gradient(135deg, var(--a1), var(--a2));
			box-shadow: var(--cosmo-glow); cursor:pointer; padding:0; position:relative;
		}
		#cosmo-menu-theme .swatches button[role="radio"]:focus-visible{ outline:none; box-shadow: 0 0 0 2px color-mix(in oklab, var(--a2) 45%, transparent); }
		#cosmo-menu-theme .swatches button[role="radio"][aria-checked="true"]::after{
			content:""; position:absolute; inset:-3px; border-radius:inherit;
			box-shadow: 0 0 0 2px color-mix(in oklab, var(--a2) 55%, transparent);
		}
	`;
	(document.head || document.documentElement).appendChild(s);

	function inject(){
		const menus = Array.from(document.querySelectorAll('[role="menu"]'));
		if (!menus.length) return;
		const menu = menus.at(-1);
		if (!menu || menu.querySelector('#cosmo-menu-theme')) return;

		const row = document.createElement('div');
		row.id = 'cosmo-menu-theme';

		const label = document.createElement('span');
		label.className = 'label';
		label.id = 'cosmo-theme-label';
		label.textContent = 'Theme';

		const swatches = document.createElement('div');
		swatches.className = 'swatches';
		swatches.setAttribute('role', 'radiogroup');
		swatches.setAttribute('aria-labelledby', 'cosmo-theme-label');

		function updateActive(theme){
			Array.from(swatches.children).forEach((el) => {
				const isActive = el.getAttribute('data-theme') === theme;
				el.setAttribute('aria-checked', isActive ? 'true' : 'false');
				el.tabIndex = isActive ? 0 : -1;
			});
		}

		function setTheme(theme){
			chrome.storage.sync.set({ cosmoTheme: theme });
			document.documentElement.setAttribute('data-cosmo-theme', theme);
			updateActive(theme);
		}

		THEMES.forEach(t => {
			const b = document.createElement('button');
			b.setAttribute('role', 'radio');
			b.setAttribute('aria-checked', 'false');
			b.setAttribute('aria-label', t.charAt(0).toUpperCase() + t.slice(1));
			b.setAttribute('data-theme', t);
			b.title = t;
			const colors = THEME_COLORS[t];
			b.style.setProperty('--a1', colors[0]);
			b.style.setProperty('--a2', colors[1]);
			b.tabIndex = -1;
			b.addEventListener('click', () => setTheme(t));
			b.addEventListener('pointerenter', () => document.documentElement.setAttribute('data-cosmo-theme', t));
			b.addEventListener('pointerleave', () => chrome.storage.sync.get({cosmoTheme:'nebula'}, ({cosmoTheme}) =>
				document.documentElement.setAttribute('data-cosmo-theme', cosmoTheme)));
			swatches.appendChild(b);
		});

		swatches.addEventListener('keydown', (e) => {
			const radios = Array.from(swatches.querySelectorAll('[role="radio"]'));
			const currentIndex = radios.findIndex(el => el.getAttribute('aria-checked') === 'true' || el === document.activeElement);
			if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
				e.preventDefault();
				const next = radios[(currentIndex + 1 + radios.length) % radios.length];
				next.focus();
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
				e.preventDefault();
				const prev = radios[(currentIndex - 1 + radios.length) % radios.length];
				prev.focus();
			} else if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				const focused = document.activeElement;
				if (focused && focused.getAttribute('role') === 'radio') {
					setTheme(focused.getAttribute('data-theme'));
				}
			}
		});

		row.appendChild(label);
		row.appendChild(swatches);
		menu.appendChild(row);

		// initialize active ring
		chrome.storage.sync.get({cosmoTheme:'nebula'}, ({cosmoTheme}) => updateActive(cosmoTheme));

		// keep in sync with external changes
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area === 'sync' && changes.cosmoTheme) updateActive(changes.cosmoTheme.newValue);
		});
	}

	document.addEventListener('click', (e) => {
		if (e.target.closest(PLUS)) setTimeout(inject, 0);
	});
})();
// No runtime DOM tweaks needed anymore; CSS handles initial composer layout.