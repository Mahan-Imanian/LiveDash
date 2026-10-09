import { browser } from 'wxt/browser'
import { getState, update } from '@/store/store'
import type { Closed } from '@/store/types'
import { hasPermission, requestPermission } from './chrome'
import { cleanTitle, type Dest, merge, normalize, rankHome, type Source } from './rank'

export const CORE_PERMS = ['history', 'tabs', 'sessions'] as const

export interface Access {
	history: boolean
	tabs: boolean
	sessions: boolean
	bookmarks: boolean
}

export interface OpenTab {
	id: number
	windowId: number
	url: string
	title: string
	active: boolean
	lastAccessed: number
}

export interface DeviceTab {
	device: string
	url: string
	title: string
	sessionId?: string
	at: number
}

export interface Snapshot {
	dests: Dest[]
	home: Dest[]
	closed: Closed[]
	tabs: OpenTab[]
	duplicates: number[]
	devices: DeviceTab[]
}

const DAY = 86_400_000
const HOURS_TTL = 12 * 3_600_000

export async function readAccess(): Promise<Access> {
	const [history, tabs, sessions, bookmarks] = await Promise.all(
		['history', 'tabs', 'sessions', 'bookmarks'].map((p) => hasPermission({ permissions: [p] })),
	)
	return { history, tabs, sessions, bookmarks }
}

export function requestCore(): Promise<boolean> {
	return requestPermission({ permissions: [...CORE_PERMS] })
}

function titleFor(title: string | undefined, url: string): string {
	const n = normalize(url)
	return cleanTitle(title ?? '', n?.host ?? '', n?.path ?? '')
}

let selfTabId: number | undefined

async function currentTabId(): Promise<number | undefined> {
	if (selfTabId !== undefined) return selfTabId
	try {
		selfTabId = (await browser.tabs.getCurrent())?.id
	} catch {}
	return selfTabId
}

async function openTabs(access: Access): Promise<OpenTab[]> {
	if (!access.tabs) return []
	const me = await currentTabId()
	const all = await browser.tabs.query({})
	return all
		.filter((t) => t.id !== undefined && t.id !== me && t.url && /^https?:/.test(t.url))
		.map((t) => ({
			id: t.id!,
			windowId: t.windowId!,
			url: t.url!,
			title: t.title || t.url!,
			active: !!t.active,
			lastAccessed: (t as { lastAccessed?: number }).lastAccessed ?? 0,
		}))
}

async function closedSessions(access: Access): Promise<Closed[]> {
	if (!access.sessions || !access.tabs) return []
	const list = await browser.sessions.getRecentlyClosed({ maxResults: 10 })
	const out: Closed[] = []
	for (const s of list) {
		const at = (s.lastModified ?? 0) * 1000
		if (s.tab?.sessionId && s.tab.url && /^https?:/.test(s.tab.url)) {
			out.push({
				id: s.tab.sessionId,
				kind: 'tab',
				title: titleFor(s.tab.title, s.tab.url),
				url: s.tab.url,
				count: 1,
				at,
			})
		} else if (s.window?.sessionId) {
			const tabs = (s.window.tabs ?? []).filter((t) => t.url && /^https?:/.test(t.url))
			if (!tabs.length) continue
			out.push({
				id: s.window.sessionId,
				kind: 'window',
				title: titleFor(tabs[0].title, tabs[0].url!),
				url: tabs[0].url,
				count: tabs.length,
				at,
			})
		}
	}
	const seen = new Set<string>()
	return out
		.filter((c) => {
			const k = c.url ?? c.id
			if (seen.has(k)) return false
			seen.add(k)
			return true
		})
		.slice(0, 5)
}

async function history(access: Access): Promise<Source[]> {
	if (access.history) {
		const items = await browser.history.search({
			text: '',
			startTime: Date.now() - 60 * DAY,
			maxResults: 5000,
		})
		return items
			.filter((h) => h.url)
			.map((h) => ({
				url: h.url!,
				title: h.title ?? '',
				visits: h.visitCount ?? 0,
				lastVisit: h.lastVisitTime ?? 0,
			}))
	}
	return []
}

async function refreshHours(dests: Dest[], access: Access): Promise<void> {
	const h = getState().hours
	if (!access.history || Date.now() - h.at < HOURS_TTL) return
	const top = [...dests].sort((a, b) => b.visits - a.visits).slice(0, 40)
	const since = Date.now() - 45 * DAY
	const data: Record<string, number[]> = {}
	await Promise.all(
		top.map(async (d) => {
			const visits = await browser.history.getVisits({ url: d.url }).catch(() => [])
			const hist = Array(24).fill(0)
			for (const v of visits)
				if ((v.visitTime ?? 0) > since) hist[new Date(v.visitTime!).getHours()]++
			data[d.key] = hist
		}),
	)
	update('hours', () => ({ at: Date.now(), data }))
}

export function findDuplicates(tabs: OpenTab[]): number[] {
	const groups = new Map<string, OpenTab[]>()
	for (const t of tabs) {
		const key = t.url.split('#')[0]
		groups.set(key, [...(groups.get(key) ?? []), t])
	}
	const extra: number[] = []
	for (const g of groups.values()) {
		if (g.length < 2) continue
		const keep =
			g.find((t) => t.active) ?? g.reduce((a, b) => (a.lastAccessed >= b.lastAccessed ? a : b))
		for (const t of g) if (t !== keep) extra.push(t.id)
	}
	return extra
}

async function deviceTabs(access: Access): Promise<DeviceTab[]> {
	if (!access.sessions || !access.tabs) return []
	const devices = await browser.sessions.getDevices({ maxResults: 4 })
	const out: DeviceTab[] = []
	for (const d of devices) {
		for (const s of d.sessions ?? []) {
			for (const t of s.window?.tabs ?? (s.tab ? [s.tab] : [])) {
				if (!t.url || !/^https?:/.test(t.url)) continue
				out.push({
					device: d.deviceName,
					url: t.url,
					title: titleFor(t.title, t.url),
					sessionId: t.sessionId,
					at: (s.lastModified ?? 0) * 1000,
				})
			}
		}
	}
	return out.sort((a, b) => b.at - a.at).slice(0, 6)
}

export async function snapshot(access: Access): Promise<Snapshot> {
	const s = getState()
	const [tabs, hist, closed, devices] = await Promise.all([
		openTabs(access).catch(() => []),
		history(access).catch(() => []),
		closedSessions(access).catch(() => []),
		deviceTabs(access).catch(() => []),
	])
	const pins: Source[] = s.shortcuts.map((p, i) => ({ url: p.url, title: p.title, pinned: i }))
	const tabSources: Source[] = tabs.map((t) => ({
		url: t.url,
		title: t.title,
		tabId: t.id,
		windowId: t.windowId,
	}))
	const launched: Source[] = s.launches.map((l) => ({ url: `https://${l.k}`, title: '' }))
	const dests = merge([...pins, ...hist, ...tabSources, ...launched])
	refreshHours(dests, access).catch(() => {})
	const home = rankHome(dests, {
		now: Date.now(),
		launches: s.launches,
		hidden: s.hidden,
		hours: s.hours.data,
	})
	update('cache', () => ({ home, closed, at: Date.now() }))
	return { dests, home, closed, tabs, duplicates: findDuplicates(tabs), devices }
}

export async function importTopSites(): Promise<{ url: string; title: string }[]> {
	const perm = { permissions: ['topSites'] }
	if (!((await hasPermission(perm)) || (await requestPermission(perm)))) return []
	const top = await browser.topSites.get()
	return top
		.filter((t) => /^https?:/.test(t.url))
		.map((t) => ({ url: t.url, title: titleFor(t.title, t.url) }))
}

export async function openAll(urls: string[], groupTitle?: string): Promise<void> {
	const created = []
	for (const [i, url] of urls.entries())
		created.push(await browser.tabs.create({ url, active: i === 0 }))
	if (!groupTitle) return
	const ids = created.map((t) => t.id).filter((id): id is number => id !== undefined)
	if (!ids.length || !(await hasPermission({ permissions: ['tabGroups'] }))) return
	const groupId = await browser.tabs.group({ tabIds: ids as [number, ...number[]] })
	await browser.tabGroups.update(groupId, { title: groupTitle })
}

export async function bookmarkSources(q: string, access: Access): Promise<Source[]> {
	if (!access.bookmarks || q.trim().length < 2) return []
	const found = await browser.bookmarks.search(q).catch(() => [])
	return found
		.filter((b) => b.url)
		.slice(0, 12)
		.map((b) => ({ url: b.url!, title: b.title, bookmark: true }))
}

export function logLaunch(url: string, q: string): void {
	const n = normalize(url)
	if (!n) return
	update('launches', (l) => [
		...l.slice(-399),
		{ k: n.key, q: q.trim().toLowerCase().slice(0, 24), t: Date.now() },
	])
}

async function closeSelf(): Promise<void> {
	const id = await currentTabId()
	if (id !== undefined) await browser.tabs.remove(id).catch(() => {})
	else window.close()
}

export async function switchToTab(tabId: number, windowId: number): Promise<void> {
	await browser.tabs.update(tabId, { active: true })
	await browser.windows.update(windowId, { focused: true }).catch(() => {})
	await closeSelf()
}

export async function restoreClosed(id: string): Promise<void> {
	await browser.sessions.restore(id)
	await closeSelf()
}

export async function closeTabs(ids: number[], tabs: OpenTab[]): Promise<() => Promise<void>> {
	const closing = tabs.filter((t) => ids.includes(t.id))
	await browser.tabs.remove(ids)
	return async () => {
		for (const t of closing)
			await browser.tabs.create({ url: t.url, windowId: t.windowId, active: false }).catch(() => {})
	}
}
