try {
	const t = localStorage.getItem('ld-theme')
	const a = localStorage.getItem('ld-accent')
	if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
	if (a && a !== 'ember') document.documentElement.dataset.accent = a
	const tone = localStorage.getItem('ld-tone')
	if (tone) document.documentElement.dataset.tone = tone
	if (
		location.pathname.endsWith('/newtab.html') &&
		!new URLSearchParams(location.search).has('f') &&
		localStorage.getItem('ld-type') !== '0'
	) {
		window.__ldRedirect = true
		chrome.tabs.getCurrent((tab) => {
			if (tab?.id !== undefined)
				chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('newtab.html?f') })
			else window.__ldRedirect = false
		})
	}
} catch {}
