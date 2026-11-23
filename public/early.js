try {
	const tint = localStorage.getItem('ld-tint')
	if (tint) document.documentElement.style.setProperty('--tint', tint)
	// Chrome focuses the address bar on a new tab. Reopening the tab once at its
	// own address hands focus to the page, so typing goes into LiveDash.
	if (
		location.pathname.endsWith('/newtab.html') &&
		!new URLSearchParams(location.search).has('f')
	) {
		window.__ldRedirect = true
		chrome.tabs.getCurrent((tab) => {
			if (tab?.id !== undefined)
				chrome.tabs.update(tab.id, { url: chrome.runtime.getURL('newtab.html?f') })
			else window.__ldRedirect = false
		})
	}
} catch {}
