const THEMES = ["nebula","glass","mono","sunset","vapor","contrast","mocha"];
const THEME_COLORS = {
	nebula:   ["#6a5cff", "#00c2ff"],
	glass:    ["#6f7cff", "#9be7ff"],
	mono:     ["#4a86ff", "#7dd3fc"],
	sunset:   ["#ff7a59", "#ffd38a"],
	vapor:    ["#8a63d2", "#34d5d5"],
	contrast: ["#9ab6ff", "#78e2ff"],
	mocha:    ["#8b5e3c", "#f3e9dc"]
};

const container = document.getElementById('themes');

function makeCard(theme){
	const card = document.createElement('button');
	card.className = 'theme-card';
	card.setAttribute('role', 'radio');
	card.setAttribute('aria-checked', 'false');
	card.setAttribute('data-theme', theme);
	card.style.setProperty('--a1', THEME_COLORS[theme][0]);
	card.style.setProperty('--a2', THEME_COLORS[theme][1]);
	card.tabIndex = -1;

	const swatch = document.createElement('span');
	swatch.className = 'swatch';
	const name = document.createElement('span');
	name.className = 'name';
	name.textContent = theme === 'mono' ? 'Mono' : (theme === 'vapor' ? 'Vapor' : (theme === 'contrast' ? 'High Contrast' : theme.charAt(0).toUpperCase()+theme.slice(1)));

	card.appendChild(swatch);
	card.appendChild(name);

	card.addEventListener('click', () => setTheme(theme));
	card.addEventListener('keydown', (e) => {
		const cards = Array.from(container.querySelectorAll('[role="radio"]'));
		const i = cards.indexOf(card);
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); cards[(i+1)%cards.length].focus(); }
		if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); cards[(i-1+cards.length)%cards.length].focus(); }
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTheme(theme); }
	});

	return card;
}

function updateActive(theme){
	Array.from(container.children).forEach(el => {
		const active = el.getAttribute('data-theme') === theme;
		el.setAttribute('aria-checked', active ? 'true' : 'false');
		el.tabIndex = active ? 0 : -1;
		if (active) el.focus();
	});
}

function setTheme(theme){
	chrome.storage.sync.set({ cosmoTheme: theme });
	updateActive(theme);
}

// Build grid
THEMES.forEach(t => container.appendChild(makeCard(t)));

// Initialize selection
chrome.storage.sync.get({ cosmoTheme: 'nebula' }, ({ cosmoTheme }) => updateActive(cosmoTheme));

// Keep in sync if changed from elsewhere
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === 'sync' && changes.cosmoTheme) updateActive(changes.cosmoTheme.newValue);
});


