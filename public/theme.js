try {
	const t = localStorage.getItem('ld-theme')
	const a = localStorage.getItem('ld-accent')
	if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
	if (a && a !== 'ember') document.documentElement.dataset.accent = a
} catch {}
