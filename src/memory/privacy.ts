/**
 * Pages LiveDash never keeps, whatever the user's settings say: banking and
 * payments, health, mail and chat, sign-in and account pages. Matching is on the
 * address only, so it runs before a page's text is ever read.
 */

const HOST_WORDS = [
	'bank',
	'banking',
	'credit',
	'paypal',
	'venmo',
	'revolut',
	'stripe',
	'brokerage',
	'invest',
	'trading',
	'crypto',
	'wallet',
	'health',
	'medical',
	'patient',
	'clinic',
	'hospital',
	'pharmacy',
	'mychart',
	'therapy',
	'insurance',
	'tax',
	'irs',
	'hmrc',
	'login',
	'signin',
	'auth',
	'sso',
	'accounts',
	'id',
	'mail',
	'webmail',
	'outlook',
	'proton',
]

const HOSTS = [
	'mail.google.com',
	'docs.google.com',
	'drive.google.com',
	'calendar.google.com',
	'web.whatsapp.com',
	'web.telegram.org',
	'messenger.com',
	'discord.com',
	'app.slack.com',
	'teams.microsoft.com',
	'onedrive.live.com',
	'icloud.com',
	'dropbox.com',
	'1password.com',
	'bitwarden.com',
	'lastpass.com',
	'wise.com',
	'chase.com',
	'wellsfargo.com',
	'bankofamerica.com',
	'citi.com',
	'capitalone.com',
	'americanexpress.com',
	'hsbc.com',
	'barclays.co.uk',
	'coinbase.com',
	'binance.com',
	'robinhood.com',
	'fidelity.com',
	'schwab.com',
	'vanguard.com',
]

const PATHS =
	/\/(login|log-in|signin|sign-in|signup|sign-up|logout|auth|oauth|sso|account|accounts|billing|checkout|cart|payment|payments|password|settings|profile|inbox|messages|admin|wp-admin)(\/|$|\?)/i

export type Reason = 'not-web' | 'sensitive-site' | 'private-page' | 'paused'

/** Why a page must not be kept, or null when it may be. */
export function neverKeep(rawUrl: string, paused: string[] = []): Reason | null {
	let u: URL
	try {
		u = new URL(rawUrl)
	} catch {
		return 'not-web'
	}
	if (u.protocol !== 'https:') return 'not-web'
	const host = u.hostname.replace(/^www\./, '')
	if (paused.some((p) => host === p || host.endsWith(`.${p}`))) return 'paused'
	if (HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return 'sensitive-site'
	const labels = host.split('.').slice(0, -1)
	const parts = labels.flatMap((l) => l.split('-'))
	if (parts.some((p) => HOST_WORDS.includes(p))) return 'sensitive-site'
	if (labels.some((l) => /bank|health|medic|pharma|insur/.test(l))) return 'sensitive-site'
	if (PATHS.test(u.pathname)) return 'private-page'
	if (u.username || u.password) return 'private-page'
	return null
}

export function siteOf(rawUrl: string): string {
	try {
		return new URL(rawUrl).hostname.replace(/^www\./, '')
	} catch {
		return ''
	}
}

/** The address a page is stored under: no fragment, no tracking parameters. */
export function pageKey(rawUrl: string): string {
	try {
		const u = new URL(rawUrl)
		u.hash = ''
		for (const k of [...u.searchParams.keys()])
			if (/^(utm_|fbclid|gclid|mc_|ref$|ref_src|igshid|si$)/.test(k)) u.searchParams.delete(k)
		return u.toString()
	} catch {
		return rawUrl
	}
}

/** "Partial index - Wikipedia" becomes "Partial index" when the suffix names the site. */
export function cleanTitle(title: string, site: string): string {
	const t = title.replace(/\s+/g, ' ').trim()
	const m = /^(.{3,}?)\s+[-|–—·:]\s+([^-|–—·:]{2,40})$/.exec(t)
	if (!m) return t
	const tail = m[2].toLowerCase().replace(/[^a-z0-9]/g, '')
	const host = site.toLowerCase().replace(/[^a-z0-9]/g, '')
	return tail && host.includes(tail) ? m[1] : t
}
