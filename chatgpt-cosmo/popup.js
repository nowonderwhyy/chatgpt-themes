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

function buildThemeButton(theme){
	const btn = document.createElement('button');
	btn.className = 'theme-card';
	btn.setAttribute('role','radio');
	btn.setAttribute('aria-checked','false');
	btn.setAttribute('data-theme', theme);
	btn.style.setProperty('--a1', THEME_COLORS[theme][0]);
	btn.style.setProperty('--a2', THEME_COLORS[theme][1]);
	btn.tabIndex = -1;

	const sw = document.createElement('span');
	sw.className = 'swatch';
	const name = document.createElement('span');
	name.className = 'name';
	name.textContent = theme === 'mono' ? 'Mono' : (theme === 'vapor' ? 'Vapor' : (theme === 'contrast' ? 'High Contrast' : theme.charAt(0).toUpperCase()+theme.slice(1)));

	btn.appendChild(sw);
	btn.appendChild(name);
	btn.addEventListener('click', () => setTheme(theme));

	return btn;
}

function updateActiveTheme(theme){
	Array.from(document.getElementById('themes').children).forEach(el => {
		const active = el.getAttribute('data-theme') === theme;
		el.setAttribute('aria-checked', active ? 'true' : 'false');
		el.tabIndex = active ? 0 : -1;
	});
}

function setTheme(theme){
	chrome.storage.sync.set({ cosmoTheme: theme });
	updateActiveTheme(theme);
}

function initThemes(){
	const container = document.getElementById('themes');
	THEMES.forEach(t => container.appendChild(buildThemeButton(t)));
	chrome.storage.sync.get({ cosmoTheme: 'nebula' }, ({ cosmoTheme }) => updateActiveTheme(cosmoTheme));
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'sync' && changes.cosmoTheme) updateActiveTheme(changes.cosmoTheme.newValue);
	});
}

document.addEventListener('DOMContentLoaded', () => {
    initThemes();
    // Chatbar highlight/hover toggles removed from popup by request.
});


