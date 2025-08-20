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
	window.addEventListener('keydown', (e) => {
		const isCombo =
			(e.altKey && !e.ctrlKey && !e.shiftKey && e.code === 'KeyT') ||
			(e.altKey && e.shiftKey && e.code === 'KeyT') ||
			(e.altKey && e.ctrlKey && e.code === 'KeyT');
		if (!isCombo) return;
		e.stopPropagation();
		chrome.storage.sync.get({cosmoTheme:'nebula'}, ({cosmoTheme}) => {
			const i = THEMES.indexOf(cosmoTheme);
			const next = THEMES[(i + 1) % THEMES.length];
			chrome.storage.sync.set({cosmoTheme: next});
			document.documentElement.setAttribute('data-cosmo-theme', next);
		});
	}, true);
})();

(function addComposerMenuTheme(){
	const THEMES = ["nebula","glass","mono","sunset","vapor","contrast"];
	const PLUS = 'button[data-testid="composer-plus-btn"]';

	const s = document.createElement('style');
	s.textContent = `
		#cosmo-menu-theme{
			display:flex; align-items:center; justify-content:space-between;
			gap:10px; padding:10px; margin-top:6px;
			border-top:1px solid var(--cosmo-border);
		}
		#cosmo-menu-theme .swatches{ display:flex; gap:8px; }
		#cosmo-menu-theme .swatches button{
			width:18px;height:18px;border-radius:999px; border:1px solid var(--cosmo-border);
			background: linear-gradient(135deg, var(--cosmo-accent-1), var(--cosmo-accent-2));
			box-shadow: var(--cosmo-glow); cursor:pointer; padding:0;
		}
		#cosmo-menu-theme .label{ font-size:12px; color:var(--cosmo-subtle); }
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
		label.textContent = 'Theme';

		const swatches = document.createElement('div');
		swatches.className = 'swatches';
		THEMES.forEach(t => {
			const b = document.createElement('button');
			b.title = t;
			b.addEventListener('click', () => {
				chrome.storage.sync.set({ cosmoTheme: t });
				document.documentElement.setAttribute('data-cosmo-theme', t);
			});
			b.addEventListener('pointerenter', () => document.documentElement.setAttribute('data-cosmo-theme', t));
			b.addEventListener('pointerleave', () => chrome.storage.sync.get({cosmoTheme:'nebula'}, ({cosmoTheme}) =>
				document.documentElement.setAttribute('data-cosmo-theme', cosmoTheme)));
			swatches.appendChild(b);
		});

		row.appendChild(label);
		row.appendChild(swatches);
		menu.appendChild(row);
	}

	document.addEventListener('click', (e) => {
		if (e.target.closest(PLUS)) setTimeout(inject, 0);
	});
})();

