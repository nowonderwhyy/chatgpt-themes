// Theme groups for categorized popup sections
const THEME_GROUPS = [
    { id: 'signature', title: 'Signature', items: ["glass","mono"] },
    { id: 'vibrant',   title: 'Vibrant',   items: ["vapor","sunset","gamma"] },
    { id: 'pastel',    title: 'Pastel',    items: ["sakura","orchid","amethyst","glacier"] },
    { id: 'classics',  title: 'Classics',  items: ["mocha","midnight","nocturne"] },
    { id: 'access',    title: 'Accessibility', items: ["contrast"] }
];
const THEME_COLORS = {
	glass:    ["#6f7cff", "#9be7ff"],
	mono:     ["#4a86ff", "#7dd3fc"],
	sunset:   ["#ff7a59", "#ffd38a"],
	vapor:    ["#8a63d2", "#34d5d5"],
	contrast: ["#9ab6ff", "#78e2ff"],
	mocha:    ["#8b5e3c", "#f3e9dc"],
	sakura:   ["#ff7ab6", "#ffd3a3"],
	glacier:  ["#7de3ff", "#b7ffd8"],
	orchid:   ["#7E6BFF", "#c3b8ff"],
	amethyst: ["#4d35ac", "#b8a6ff"],
	gamma:    ["#2cff91", "#9dffd0"],
	midnight: ["#5b9dff", "#b598ff"],
	nocturne: ["#6f56ff", "#a97dff"]
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
    name.textContent = theme === 'mono' ? 'Mono'
        : theme === 'vapor' ? 'Vapor'
        : theme === 'contrast' ? 'High Contrast'
        : theme === 'gamma' ? 'Gamma Doppler'
        : theme.charAt(0).toUpperCase()+theme.slice(1);

	btn.appendChild(sw);
	btn.appendChild(name);
	btn.addEventListener('click', () => setTheme(theme));

	return btn;
}

function updateActiveTheme(theme){
	// Update across all groups
	document.querySelectorAll('#theme-groups .theme-card').forEach(el => {
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
	const groupsRoot = document.getElementById('theme-groups');
	THEME_GROUPS.forEach(group => {
		const section = document.createElement('section');
		section.className = 'theme-group';
		// header
		const header = document.createElement('div');
		header.className = 'group-header';
		const title = document.createElement('div');
		title.className = 'group-title';
		title.textContent = group.title;
		header.appendChild(title);
		section.appendChild(header);
		// grid
		const grid = document.createElement('div');
		grid.className = 'themes-grid';
		grid.setAttribute('role','radiogroup');
		grid.setAttribute('aria-label', `${group.title} themes`);
		group.items.forEach(t => grid.appendChild(buildThemeButton(t)));
		section.appendChild(grid);
		groupsRoot.appendChild(section);
	});

	chrome.storage.sync.get({ cosmoTheme: 'glass' }, ({ cosmoTheme }) => updateActiveTheme(cosmoTheme));
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'sync' && changes.cosmoTheme) updateActiveTheme(changes.cosmoTheme.newValue);
	});
}

document.addEventListener('DOMContentLoaded', () => {
    initThemes();
    // Reduce Transparency toggle
    const rt = document.getElementById('reduce-transparency');
    chrome.storage.sync.get({ cosmoReduceTransparency: false }, ({ cosmoReduceTransparency }) => {
        rt.checked = !!cosmoReduceTransparency;
    });
    rt.addEventListener('change', () => {
        chrome.storage.sync.set({ cosmoReduceTransparency: rt.checked });
    });
});


