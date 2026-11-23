import { type Browser, browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { addReading, forgetAll, forgetPage, forgetSince, forgetSite, savePage } from '@/memory/db'
import { cleanTitle, neverKeep, pageKey, siteOf } from '@/memory/privacy'
import { loadSettings, type Message, ORIGINS } from '@/memory/settings'

const SCRIPT_ID = 'reader'
const SCRIPT_FILE = '/content-scripts/reader.js'

async function hasAccess(): Promise<boolean> {
	return browser.permissions.contains({ origins: ORIGINS }).catch(() => false)
}

/** Keeps the page reader registered exactly while remembering is on and allowed. */
async function sync(injectOpenTabs = false): Promise<void> {
	const on = (await loadSettings()).remember && (await hasAccess())
	const existing = await browser.scripting
		.getRegisteredContentScripts({ ids: [SCRIPT_ID] })
		.catch(() => [])
	if (on && !existing.length) {
		await browser.scripting.registerContentScripts([
			{
				id: SCRIPT_ID,
				js: [SCRIPT_FILE],
				matches: ORIGINS,
				runAt: 'document_idle',
				persistAcrossSessions: true,
			},
		])
	}
	if (!on && existing.length) await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] })
	if (on && injectOpenTabs) {
		const tabs = await browser.tabs.query({ url: ORIGINS })
		for (const t of tabs) {
			if (t.id === undefined || t.incognito || t.discarded) continue
			browser.scripting
				.executeScript({ target: { tabId: t.id }, files: [SCRIPT_FILE] })
				.catch(() => {})
		}
	}
}

async function handle(
	m: Message,
	tab: Browser.tabs.Tab | undefined,
	fromPage: boolean,
): Promise<unknown> {
	if ((m.type === 'ld-start' || m.type === 'ld-forget') && !fromPage) return
	if (m.type === 'ld-start') return sync(true)
	if (m.type === 'ld-forget') {
		const now = Date.now()
		if (m.scope === 'page' && m.value) return forgetPage(pageKey(m.value))
		if (m.scope === 'site' && m.value) return forgetSite(m.value)
		if (m.scope === 'hour') return forgetSince(now - 3_600_000)
		if (m.scope === 'day') return forgetSince(now - 86_400_000)
		if (m.scope === 'all') return forgetAll()
		return
	}
	// Page messages come only from the reader in a normal tab.
	if (!tab || tab.incognito) return
	const s = await loadSettings()
	if (!s.remember) return
	const url = pageKey(m.url)
	if (neverKeep(url, s.paused)) return
	if (m.type === 'ld-page') {
		const paras = m.paras.filter((p) => typeof p === 'string').slice(0, 4000)
		const title = cleanTitle(String(m.title || '').slice(0, 300), siteOf(url)) || siteOf(url)
		return savePage({ url, site: siteOf(url), title, paras, at: Date.now() })
	}
	if (m.type === 'ld-read') return addReading(url, Number(m.ms) || 0)
}

export default defineBackground(() => {
	browser.runtime.onInstalled.addListener(async ({ reason }) => {
		await sync()
		if (reason === 'install') await browser.tabs.create({ url: 'chrome://newtab' })
	})
	browser.runtime.onStartup.addListener(() => {
		sync()
	})
	browser.permissions.onAdded.addListener(() => {
		sync(true)
	})
	browser.permissions.onRemoved.addListener(() => {
		sync()
	})
	browser.storage.onChanged.addListener((_c, area) => {
		if (area === 'sync') sync()
	})
	browser.runtime.onMessage.addListener((raw, sender, reply) => {
		// Only this extension's own pages and its reader may talk to it.
		if (sender.id !== browser.runtime.id) return
		const m = raw as Message
		handle(m, sender.tab, !!sender.url?.startsWith(browser.runtime.getURL('/')))
			.then(() => reply({ ok: true }))
			.catch((e) => reply({ ok: false, error: String(e) }))
		return true
	})
})
