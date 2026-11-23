import { browser } from 'wxt/browser'
import { defineContentScript } from 'wxt/utils/define-content-script'
import { neverKeep, pageKey } from '@/memory/privacy'
import { KEY, type Message, merge } from '@/memory/settings'
import { HEADING } from '@/memory/text'

/**
 * Reads the visible text of a page after it has been looked at for a while,
 * and reports how long it was read. Registered only after the user turns
 * remembering on and grants access to sites.
 */

const DWELL_MS = 8_000
const SKIP =
	'nav,header,footer,aside,form,dialog,menu,[role=navigation],[role=banner],[role=contentinfo],[role=complementary],[aria-hidden=true],[hidden],.sr-only'
const BLOCKS = 'p,li,h1,h2,h3,h4,blockquote,pre,dd,td,figcaption'

function extract(): string[] {
	const root =
		document.querySelector('article') ?? document.querySelector('main,[role=main]') ?? document.body
	const out: string[] = []
	let chars = 0
	for (const el of root.querySelectorAll<HTMLElement>(BLOCKS)) {
		if (el.closest(SKIP) && !el.closest('article,main')) continue
		if (el.parentElement?.closest(BLOCKS)) continue
		if (!el.checkVisibility?.()) continue
		const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
		const heading = /^H[1-4]$/.test(el.tagName)
		if (heading ? text.length < 3 || text.length > 160 : text.length < 40) continue
		out.push(heading ? HEADING + text : text)
		chars += text.length
		if (chars > 120_000) break
	}
	return out
}

function hasPrivateFields(): boolean {
	return !!document.querySelector(
		'input[type=password], input[autocomplete="cc-number"], input[autocomplete="one-time-code"]',
	)
}

export default defineContentScript({
	matches: ['https://*/*'],
	registration: 'runtime',
	runAt: 'document_idle',
	async main() {
		if (browser.extension.inIncognitoContext) return
		const raw = (await browser.storage.sync.get(KEY))[KEY]
		const settings = merge(raw)
		if (!settings.remember) return

		let url = pageKey(location.href)
		let visibleSince = document.visibilityState === 'visible' ? Date.now() : 0
		let read = 0
		let sent = false

		const send = (m: Message) => browser.runtime.sendMessage(m).catch(() => {})
		const allowed = () => !neverKeep(url, settings.paused) && !hasPrivateFields()

		const flush = () => {
			if (visibleSince) read += Date.now() - visibleSince
			visibleSince = document.visibilityState === 'visible' ? Date.now() : 0
			if (sent && read > 1000) {
				send({ type: 'ld-read', url, ms: read })
				read = 0
			}
		}

		const capture = () => {
			if (sent || !allowed()) return
			const paras = extract()
			if (paras.filter((p) => !p.startsWith(HEADING)).length < 2) return
			sent = true
			send({ type: 'ld-page', url, title: document.title.trim(), paras })
		}

		const tick = setInterval(() => {
			const now = pageKey(location.href)
			if (now !== url) {
				flush()
				url = now
				sent = false
				read = 0
			}
			const seen = read + (visibleSince ? Date.now() - visibleSince : 0)
			if (!sent && seen >= DWELL_MS) capture()
		}, 2000)

		document.addEventListener('visibilitychange', flush)
		addEventListener('pagehide', () => {
			flush()
			clearInterval(tick)
		})
	},
})
