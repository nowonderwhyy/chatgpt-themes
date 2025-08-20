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

(function addHeaderThemeSwitcher(){
	const THEMES = ["nebula","glass","mono","sunset","vapor","contrast"];

	// Insert styles for trigger + popover
	const style = document.createElement("style");
	style.textContent = `
		#cosmo-trigger{
			width:18px;height:18px;border-radius:999px;cursor:pointer;
			border:1px solid var(--cosmo-border); box-shadow:var(--cosmo-glow);
			background: linear-gradient(135deg, var(--cosmo-accent-1), var(--cosmo-accent-2));
			margin-left:8px; flex:0 0 auto; opacity:.95;
		}
		#cosmo-pop{
			position:absolute; top:calc(100% + 8px); right:0; z-index:99999;
			display:flex; gap:8px; padding:8px;
			background:var(--cosmo-card); border:1px solid var(--cosmo-border);
			backdrop-filter:var(--cosmo-blur); border-radius:12px; box-shadow:var(--cosmo-glow);
			visibility:hidden; opacity:0; transform:translateY(-4px);
			transition:opacity .12s ease, transform .12s ease, visibility .12s steps(1,end);
		}
		#cosmo-pop[open]{ visibility:visible; opacity:1; transform:translateY(0) }
		#cosmo-pop button{
			width:22px;height:22px;border-radius:999px;border:1px solid var(--cosmo-border);
			box-shadow:var(--cosmo-glow); cursor:pointer; padding:0;
			background: linear-gradient(135deg, var(--cosmo-accent-1), var(--cosmo-accent-2));
		}
	`;
	(document.head || document.documentElement).appendChild(style);

	function mount(){
		const header = document.querySelector('#page-header') || document.querySelector('header');
		const modelBtn = document.querySelector('button[data-testid="model-switcher-dropdown-button"], [id*="model-switcher"] button, button[aria-haspopup="menu"][aria-expanded]');
		if (!header || document.getElementById('cosmo-trigger')) return;

		const host = document.createElement('div');
		host.style.position = 'relative';
		host.style.display = 'flex';
		host.style.alignItems = 'center';

		const trigger = document.createElement('button');
		trigger.id = 'cosmo-trigger';
		trigger.title = 'Change theme';

		const pop = document.createElement('div');
		pop.id = 'cosmo-pop';

		THEMES.forEach(t => {
			const b = document.createElement('button');
			b.title = t;
			b.addEventListener('click', () => {
				chrome.storage.sync.set({ cosmoTheme: t });
				document.documentElement.setAttribute('data-cosmo-theme', t);
				pop.removeAttribute('open');
			});
			b.addEventListener('pointerenter', () => document.documentElement.setAttribute('data-cosmo-theme', t));
			b.addEventListener('pointerleave', () => {
				chrome.storage.sync.get({cosmoTheme:'nebula'}, ({cosmoTheme}) =>
					document.documentElement.setAttribute('data-cosmo-theme', cosmoTheme));
			});
			pop.appendChild(b);
		});

		trigger.addEventListener('click', (e) => {
			e.stopPropagation();
			pop.toggleAttribute('open');
		});
		document.addEventListener('click', () => pop.removeAttribute('open'));
		document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pop.removeAttribute('open'); });

		host.appendChild(trigger);
		host.appendChild(pop);

		if (modelBtn && modelBtn.parentElement) {
			modelBtn.parentElement.insertBefore(host, modelBtn.nextSibling);
		} else {
			host.style.position = 'absolute';
			host.style.top = '12px'; host.style.right = '56px';
			header.style.position = 'relative';
			header.appendChild(host);
		}
	}

	const ready = () => (document.body ? mount() : requestAnimationFrame(ready));
	ready();
	const mo = new MutationObserver(() => mount());
	mo.observe(document.documentElement, { childList:true, subtree:true });
})();


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

