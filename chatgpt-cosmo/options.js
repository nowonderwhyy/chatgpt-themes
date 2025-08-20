const radios = document.querySelectorAll('input[name="t"]');

chrome.storage.sync.get({ cosmoTheme: "nebula" }, ({ cosmoTheme }) => {
	const match = Array.from(radios).find(r => r.value === cosmoTheme);
	if (match) match.checked = true;
});

radios.forEach(r => r.addEventListener("change", () => {
	chrome.storage.sync.set({ cosmoTheme: r.value });
}));


