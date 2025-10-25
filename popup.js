// Catalog metadata powers the reorganized popup layout
const THEME_META = {
	glass:    { label: 'Glass',          tagline: 'Cinematic clarity default',     colors: ['#6f7cff', '#9be7ff'] },
	mono:     { label: 'Mono',           tagline: 'Icy blues, functional chrome',  colors: ['#4a86ff', '#7dd3fc'] },
	vapor:    { label: 'Vapor',          tagline: 'Aurora neon drift',             colors: ['#b38aff', '#52f5ff'] },
	sunset:   { label: 'Sunset',         tagline: 'Warm twilight gradients',       colors: ['#ff7a59', '#ffd38a'] },
	gamma:    { label: 'Gamma Doppler',  tagline: 'Iridescent doppler flux',      colors: ['#3cff9f', '#7cfff0'] },
	sakura:   { label: 'Sakura',         tagline: 'Serene blush and apricot',      colors: ['#ff7ab6', '#ffd3a3'] },
	orchid:   { label: 'Orchid',         tagline: 'Lavender haze highlight',       colors: ['#7E6BFF', '#c3b8ff'] },
	amethyst: { label: 'Amethyst',       tagline: 'Deep violet with soft bloom',   colors: ['#4d35ac', '#b8a6ff'] },
	glacier:  { label: 'Glacier',        tagline: 'Icy teal clarity',              colors: ['#7de3ff', '#b7ffd8'] },
	mocha:    { label: 'Mocha',          tagline: 'Toasted cocoa warmth',          colors: ['#8b5e3c', '#f3e9dc'] },
	midnight: { label: 'Midnight',       tagline: 'Deep ocean blues',              colors: ['#5b9dff', '#b598ff'] },
	nocturne: { label: 'Nocturne',       tagline: 'Luminous midnight bloom',      colors: ['#6481ff', '#c18aff'] },
	contrast: { label: 'High Contrast',  tagline: 'Maximum legibility',            colors: ['#9ab6ff', '#78e2ff'] }
};

const THEME_COLLECTIONS = [
	{
		id: 'signature',
		title: 'Signature Picks',
		note: 'Balanced looks for everyday chats.',
		items: ['glass', 'mono']
	},
	{
		id: 'vivid',
		title: 'Vivid Energy',
		note: 'Bold gradients for a punchy interface.',
		items: ['vapor', 'sunset', 'gamma']
	},
	{
		id: 'pastel',
		title: 'Pastel Drift',
		note: 'Soft, calming palettes that stay out of the way.',
		items: ['sakura', 'orchid', 'amethyst', 'glacier']
	},
	{
		id: 'nightfall',
		title: 'Nightfall',
		note: 'Moody tones tuned for low-light focus.',
		items: ['midnight', 'nocturne', 'mocha']
	},
	{
		id: 'access',
		title: 'Accessibility',
		note: 'Extra contrast when the text needs to pop.',
		layout: 'single',
		items: ['contrast']
	}
];

const STORAGE_KEYS = {
	openCollections: 'cosmoOpenCollections'
};

const COLLECTION_LOOKUP = THEME_COLLECTIONS.reduce((acc, collection) => {
	collection.items.forEach(theme => { acc[theme] = collection.id; });
	return acc;
}, {});

let currentTheme = 'glass';

const accordionRoot = document.getElementById('theme-accordion');
const activeThemeLabel = document.getElementById('active-theme-label');
const collectionsMap = new Map();
let isBootstrapping = true;

function buildThemeButton(theme) {
	const meta = THEME_META[theme];
	if (!meta) return document.createComment(`Unknown theme: ${theme}`);

	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 'theme-card';
	btn.setAttribute('role', 'radio');
	btn.setAttribute('aria-checked', 'false');
	btn.dataset.theme = theme;
	btn.style.setProperty('--a1', meta.colors[0]);
	btn.style.setProperty('--a2', meta.colors[1]);
	btn.tabIndex = -1;

	const header = document.createElement('div');
	header.className = 'theme-card__header';
	const labelWrap = document.createElement('div');
	labelWrap.className = 'theme-card__label';

	const name = document.createElement('span');
	name.className = 'theme-card__name';
	name.textContent = meta.label;
	const hint = document.createElement('span');
	hint.className = 'theme-card__hint';
	hint.textContent = meta.tagline;

	labelWrap.append(name, hint);
	const swatch = document.createElement('span');
	swatch.className = 'theme-card__swatch';

	header.append(labelWrap, swatch);
	btn.append(header);
	btn.addEventListener('click', () => setTheme(theme));

	return btn;
}

function markActiveTheme(theme) {
	document.querySelectorAll('.theme-card').forEach(el => {
		const active = el.dataset.theme === theme;
		el.setAttribute('aria-checked', active ? 'true' : 'false');
		el.tabIndex = active ? 0 : -1;
	});
}

function formatThemeLabel(theme) {
	return THEME_META[theme]?.label ?? theme.charAt(0).toUpperCase() + theme.slice(1);
}

function updateActiveThemeLabel(theme) {
	if (!activeThemeLabel) return;
	activeThemeLabel.textContent = formatThemeLabel(theme);
}

function ensureCollectionOpen(collectionId) {
	const entry = collectionsMap.get(collectionId);
	if (!entry) return;
	if (!entry.details.open) entry.details.open = true;
}

function getOpenCollectionIds() {
	return Array.from(collectionsMap.entries())
		.filter(([, { details }]) => details.open)
		.map(([id]) => id);
}

function persistOpenCollections() {
	if (isBootstrapping) return;
	chrome.storage.sync.set({ [STORAGE_KEYS.openCollections]: getOpenCollectionIds() });
}

function buildCollectionSection(collection) {
	const details = document.createElement('details');
	details.className = 'collection';
	details.dataset.collection = collection.id;

	const summary = document.createElement('summary');
	summary.className = 'collection-summary';
	summary.setAttribute('aria-expanded', 'false');

	const title = document.createElement('span');
	title.className = 'collection-summary__title';
	title.textContent = collection.title;

	const note = document.createElement('span');
	note.className = 'collection-summary__note';
	note.textContent = collection.note;

	summary.append(title, note);

	const grid = document.createElement('div');
	grid.className = 'collection-grid';
	if (collection.layout) grid.classList.add(`collection-grid--${collection.layout}`);
	grid.setAttribute('role', 'radiogroup');
	grid.setAttribute('aria-label', `${collection.title} themes`);

	collection.items.forEach(theme => grid.appendChild(buildThemeButton(theme)));

	const body = document.createElement('div');
	body.className = 'collection-body';
	body.appendChild(grid);

	details.append(summary, body);
	details.addEventListener('toggle', () => {
		summary.setAttribute('aria-expanded', details.open ? 'true' : 'false');
		persistOpenCollections();
	});

	collectionsMap.set(collection.id, { details, grid, summary, body });
	return details;
}

function updateActiveTheme(theme, { syncCollection = true } = {}) {
	currentTheme = theme;
	updateActiveThemeLabel(theme);
	markActiveTheme(theme);
	const collectionId = COLLECTION_LOOKUP[theme];
	collectionsMap.forEach(({ details }) => {
		if (details.dataset.collection === collectionId) details.dataset.activeTheme = 'true';
		else details.removeAttribute('data-active-theme');
	});
	if (collectionId) ensureCollectionOpen(collectionId);
	if (!syncCollection) return;
	persistOpenCollections();
}

function setTheme(theme) {
	chrome.storage.sync.set({ cosmoTheme: theme });
	updateActiveTheme(theme);
}

function initThemes() {
	if (!accordionRoot) return;

	THEME_COLLECTIONS.forEach(collection => {
		const section = buildCollectionSection(collection);
		if (section) accordionRoot.appendChild(section);
	});

	chrome.storage.sync.get({ cosmoTheme: 'glass', [STORAGE_KEYS.openCollections]: [] }, (stored) => {
		const cosmoTheme = stored.cosmoTheme;
		const storedOpen = Array.isArray(stored[STORAGE_KEYS.openCollections]) ? stored[STORAGE_KEYS.openCollections] : [];
		const defaultCollection = COLLECTION_LOOKUP[cosmoTheme] ?? THEME_COLLECTIONS[0].id;
		const toOpen = storedOpen.length ? storedOpen : [defaultCollection];
		toOpen.forEach(ensureCollectionOpen);
		updateActiveTheme(cosmoTheme, { syncCollection: false });
		const activeCollection = COLLECTION_LOOKUP[cosmoTheme];
		if (activeCollection) ensureCollectionOpen(activeCollection);
		isBootstrapping = false;
		persistOpenCollections();
	});

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'sync' && changes.cosmoTheme) {
			updateActiveTheme(changes.cosmoTheme.newValue);
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	initThemes();
	// Reduce Transparency toggle
	const rt = document.getElementById('reduce-transparency');
	if (!rt) return;
	chrome.storage.sync.get({ cosmoReduceTransparency: false }, ({ cosmoReduceTransparency }) => {
		rt.checked = !!cosmoReduceTransparency;
	});
	rt.addEventListener('change', () => {
		chrome.storage.sync.set({ cosmoReduceTransparency: rt.checked });
	});
});


