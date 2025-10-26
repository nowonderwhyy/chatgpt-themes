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
	petal:    { label: 'Petal',          tagline: 'Pastel lilac, rose, and blush', colors: ['#d3a6ff', '#ff9ab6'] },
	midnight: { label: 'Midnight',       tagline: 'Deep ocean blues',              colors: ['#5b9dff', '#b598ff'] },
	nocturne: { label: 'Nocturne',       tagline: 'Luminous midnight bloom',      colors: ['#6481ff', '#c18aff'] },
	'nocturne-v2': { label: 'Nocturne V2',   tagline: 'Velvet violet midnight bloom', colors: ['#b476ff', '#ff88da'] },
	'velvet-noir': { label: 'Velvet Noir',  tagline: 'Plum velvet with molten gold', colors: ['#ff4f9d', '#ffb067'] },
	contrast: { label: 'High Contrast',  tagline: 'Maximum legibility',            colors: ['#9ab6ff', '#78e2ff'] },
	'deep-purple': { label: 'Deep Purple',   tagline: 'Dark violet, crisp white text', colors: ['#a78bff', '#e5d4ff'] },
	'dark-sepia': { label: 'Dark Sepia',     tagline: 'Warm brown tones for reading',  colors: ['#d4a574', '#f2e4d0'] },
	burrito: { label: 'Burrito',         tagline: 'Velvet neon bloom',            colors: ['#ff6fce', '#7ad3ff'] }
};

const THEME_COLLECTIONS = [
	{
		id: 'signature',
		title: 'Signature Picks',
		note: 'Balanced looks for everyday chats.',
		items: ['glass', 'mono', 'burrito']
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
		items: ['sakura', 'petal', 'orchid', 'amethyst', 'glacier']
	},
	{
		id: 'nightfall',
		title: 'Nightfall',
		note: 'Moody tones tuned for low-light focus.',
		items: ['midnight', 'nocturne', 'nocturne-v2', 'velvet-noir', 'mocha']
	},
	{
		id: 'access',
		title: 'Accessibility',
		note: 'Extra contrast when the text needs to pop.',
		items: ['contrast', 'deep-purple', 'dark-sepia']
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

const SYNC_WRITE_DELAY = 280;
let lastLocalTheme = null;
let lastSavedOpenCollections = null;
let pendingSyncPayload = null;
let syncWriteTimer = null;
let syncWriteInFlight = false;
const syncedSnapshot = new Map();

function snapshotValue(value) {
	return typeof value === 'string' ? value : JSON.stringify(value);
}

function recordSynced(values) {
	Object.entries(values).forEach(([key, value]) => {
		syncedSnapshot.set(key, snapshotValue(value));
	});
}

function flushSyncUpdate() {
	if (!pendingSyncPayload || syncWriteInFlight) return;
	const payload = pendingSyncPayload;
	pendingSyncPayload = null;
	syncWriteInFlight = true;
	chrome.storage.sync.set(payload, () => {
		syncWriteInFlight = false;
		if (chrome.runtime.lastError) {
			console.warn('[cosmo] sync.set failed', chrome.runtime.lastError);
			setTimeout(() => queueSyncUpdate(payload, { flush: true }), 1500);
			return;
		}
		recordSynced(payload);
		if (pendingSyncPayload) flushSyncUpdate();
	});
}

function queueSyncUpdate(update, { flush = false } = {}) {
	const entries = Object.entries(update).filter(([key, value]) => {
		if (pendingSyncPayload && Object.prototype.hasOwnProperty.call(pendingSyncPayload, key)) return true;
		return syncedSnapshot.get(key) !== snapshotValue(value);
	});
	if (!entries.length) return;
	const patch = Object.fromEntries(entries);
	pendingSyncPayload = { ...(pendingSyncPayload || {}), ...patch };
	if (flush) {
		if (syncWriteTimer) {
			clearTimeout(syncWriteTimer);
			syncWriteTimer = null;
		}
		flushSyncUpdate();
		return;
	}
	if (!syncWriteTimer) {
		syncWriteTimer = setTimeout(() => {
			syncWriteTimer = null;
			flushSyncUpdate();
		}, SYNC_WRITE_DELAY);
	}
}

function persistTheme(theme) {
	if (lastLocalTheme === theme) return;
	lastLocalTheme = theme;
	chrome.storage.local.set({ cosmoTheme: theme });
	queueSyncUpdate({ cosmoTheme: theme });
}

function loadStoredState(callback) {
	const defaults = { cosmoTheme: 'glass', [STORAGE_KEYS.openCollections]: [] };
	chrome.storage.sync.get(defaults, (syncStored) => {
		chrome.storage.local.get(Object.keys(defaults), (localStored) => {
			const hasLocalTheme = Object.prototype.hasOwnProperty.call(localStored, 'cosmoTheme');
			const localOpenKey = Object.prototype.hasOwnProperty.call(localStored, STORAGE_KEYS.openCollections);
			const cosmoTheme = hasLocalTheme ? localStored.cosmoTheme : (syncStored.cosmoTheme ?? defaults.cosmoTheme);
			const openCollections = localOpenKey && Array.isArray(localStored[STORAGE_KEYS.openCollections])
				? localStored[STORAGE_KEYS.openCollections]
				: (Array.isArray(syncStored[STORAGE_KEYS.openCollections]) ? syncStored[STORAGE_KEYS.openCollections] : defaults[STORAGE_KEYS.openCollections]);
			recordSynced({
				cosmoTheme: syncStored.cosmoTheme ?? defaults.cosmoTheme,
				[STORAGE_KEYS.openCollections]: Array.isArray(syncStored[STORAGE_KEYS.openCollections]) ? syncStored[STORAGE_KEYS.openCollections] : defaults[STORAGE_KEYS.openCollections]
			});
			lastLocalTheme = hasLocalTheme ? localStored.cosmoTheme : cosmoTheme;
			lastSavedOpenCollections = JSON.stringify(openCollections);
			if (!hasLocalTheme) chrome.storage.local.set({ cosmoTheme });
			if (!localOpenKey) chrome.storage.local.set({ [STORAGE_KEYS.openCollections]: openCollections });
			callback({ cosmoTheme, openCollections });
		});
	});
}

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
	const ids = getOpenCollectionIds();
	const serialized = JSON.stringify(ids);
	if (serialized === lastSavedOpenCollections) return;
	lastSavedOpenCollections = serialized;
	chrome.storage.local.set({ [STORAGE_KEYS.openCollections]: ids });
	queueSyncUpdate({ [STORAGE_KEYS.openCollections]: ids });
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
	persistTheme(theme);
	updateActiveTheme(theme);
}

function initThemes() {
	if (!accordionRoot) return;

	THEME_COLLECTIONS.forEach(collection => {
		const section = buildCollectionSection(collection);
		if (section) accordionRoot.appendChild(section);
	});

	loadStoredState(({ cosmoTheme, openCollections }) => {
		const storedOpen = Array.isArray(openCollections) ? openCollections : [];
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
		if (area === 'sync') {
			if (changes.cosmoTheme) {
				const next = changes.cosmoTheme.newValue;
				if (typeof next === 'string') {
					recordSynced({ cosmoTheme: next });
					if (lastLocalTheme !== next) chrome.storage.local.set({ cosmoTheme: next });
					updateActiveTheme(next);
				}
			}
			if (changes[STORAGE_KEYS.openCollections]) {
				const nextOpen = Array.isArray(changes[STORAGE_KEYS.openCollections].newValue)
					? changes[STORAGE_KEYS.openCollections].newValue
					: [];
				recordSynced({ [STORAGE_KEYS.openCollections]: nextOpen });
				const serialized = JSON.stringify(nextOpen);
				if (serialized !== lastSavedOpenCollections) {
					lastSavedOpenCollections = serialized;
					chrome.storage.local.set({ [STORAGE_KEYS.openCollections]: nextOpen });
					collectionsMap.forEach(({ details }) => { details.open = nextOpen.includes(details.dataset.collection); });
					persistOpenCollections();
				}
			}
		}
		if (area === 'local') {
			if (changes.cosmoTheme && typeof changes.cosmoTheme.newValue === 'string') {
				lastLocalTheme = changes.cosmoTheme.newValue;
				if (syncedSnapshot.get('cosmoTheme') !== snapshotValue(changes.cosmoTheme.newValue)) {
					queueSyncUpdate({ cosmoTheme: changes.cosmoTheme.newValue });
				}
				updateActiveTheme(changes.cosmoTheme.newValue);
			}
			if (changes[STORAGE_KEYS.openCollections]) {
				const updated = changes[STORAGE_KEYS.openCollections].newValue;
				lastSavedOpenCollections = JSON.stringify(updated);
				if (syncedSnapshot.get(STORAGE_KEYS.openCollections) !== snapshotValue(updated)) {
					queueSyncUpdate({ [STORAGE_KEYS.openCollections]: updated });
				}
			}
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
