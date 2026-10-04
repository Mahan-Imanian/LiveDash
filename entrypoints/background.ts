import { browser } from 'wxt/browser'
import { defineBackground } from 'wxt/utils/define-background'
import { titleFromUrl, toUrl } from '@/lib/url'
import { parseWhen } from '@/lib/when'
import { defaultFocus, defaultSettings, PREFIX } from '@/store/defaults'
import { MODE_LABEL, remainingMs, settle } from '@/store/focus-logic'
import type { FocusState, Settings, Shortcut, Task } from '@/store/types'

const END = 'focus-end'
const TICK = 'focus-tick'

async function read<T>(key: string, fallback: T, area: 'local' | 'sync' = 'local'): Promise<T> {
	const r = await browser.storage[area].get(PREFIX + key)
	return (r[PREFIX + key] as T) ?? fallback
}

async function settings(): Promise<Settings> {
	const s = await read<Partial<Settings>>('settings', {}, 'sync').catch(
		() => ({}) as Partial<Settings>,
	)
	return {
		...defaultSettings,
		...s,
		focus: { ...defaultSettings.focus, ...s.focus },
	}
}

async function badge(f: FocusState) {
	if (f.status === 'running') {
		const mins = Math.max(1, Math.ceil(remainingMs(f) / 60_000))
		await browser.action.setBadgeBackgroundColor({
			color: f.mode === 'focus' ? '#b33a17' : '#18764a',
		})
		await browser.action.setBadgeText({ text: `${mins}m` })
	} else if (f.status === 'paused') {
		await browser.action.setBadgeBackgroundColor({ color: '#676b72' })
		await browser.action.setBadgeText({ text: '❚❚' })
	} else {
		await browser.action.setBadgeText({ text: '' })
	}
}

async function schedule(f: FocusState) {
	await browser.alarms.clear(END)
	await browser.alarms.clear(TICK)
	if (f.status === 'running' && f.endsAt) {
		await browser.alarms.create(END, { when: f.endsAt })
		await browser.alarms.create(TICK, { periodInMinutes: 1 })
	}
	await badge(f)
}

async function finish() {
	const f = await read<FocusState>('focus', defaultFocus())
	const s = await settings()
	const { state, finished } = settle(f, s)
	if (!finished) return schedule(f)
	await browser.storage.local.set({ [`${PREFIX}focus`]: state })
	if (!s.focus.notify) return
	const allowed = await browser.permissions.contains({ permissions: ['notifications'] })
	if (!allowed) return
	await browser.notifications.create('focus', {
		type: 'basic',
		iconUrl: browser.runtime.getURL('/icon/128.png'),
		title: finished === 'focus' ? 'Focus session complete' : 'Break’s over',
		message:
			finished === 'focus'
				? `Time for a ${MODE_LABEL[state.mode].toLowerCase()}.`
				: 'Ready for another focus session?',
	})
}

async function flash(text: string) {
	await browser.action.setBadgeBackgroundColor({ color: '#146c3d' })
	await browser.action.setBadgeText({ text })
	setTimeout(async () => badge(await read<FocusState>('focus', defaultFocus())), 2500)
}

export default defineBackground(() => {
	browser.runtime.onInstalled.addListener(async ({ reason }) => {
		browser.contextMenus.removeAll(() => {
			browser.contextMenus.create({
				id: 'task',
				title: 'Save “%s” for later in LiveDash',
				contexts: ['selection'],
			})
			browser.contextMenus.create({
				id: 'later',
				title: 'Save page for later in LiveDash',
				contexts: ['page'],
			})
			browser.contextMenus.create({
				id: 'pin',
				title: 'Pin page to LiveDash',
				contexts: ['page'],
			})
			browser.contextMenus.create({
				id: 'pin-link',
				title: 'Pin link to LiveDash',
				contexts: ['link'],
			})
		})
		if (reason === 'install') await browser.tabs.create({ url: 'chrome://newtab' })
		await schedule(await read<FocusState>('focus', defaultFocus()))
	})

	browser.runtime.onStartup.addListener(async () => {
		await finish()
	})

	browser.contextMenus.onClicked.addListener(async (info, tab) => {
		if (info.menuItemId === 'later') {
			const url = toUrl(tab?.url ?? info.pageUrl ?? '')
			if (!url) return
			const tasks = await read<Task[]>('tasks', [])
			if (!tasks.some((t) => t.url === url && !t.done)) {
				const task: Task = {
					id: crypto.randomUUID(),
					title: tab?.title || titleFromUrl(url),
					due: null,
					allDay: false,
					done: false,
					doneAt: null,
					createdAt: Date.now(),
					order: tasks.reduce((m, t) => Math.max(m, t.order), 0) + 1,
					url,
				}
				await browser.storage.local.set({ [`${PREFIX}tasks`]: [...tasks, task] })
			}
			await flash('✓')
			return
		}
		if (info.menuItemId === 'task' && info.selectionText) {
			const text = info.selectionText.trim().slice(0, 500)
			const p = parseWhen(text)
			const tasks = await read<Task[]>('tasks', [])
			const task: Task = {
				id: crypto.randomUUID(),
				title: p.title,
				due: p.due,
				allDay: p.allDay,
				done: false,
				doneAt: null,
				createdAt: Date.now(),
				order: tasks.reduce((m, t) => Math.max(m, t.order), 0) + 1,
			}
			await browser.storage.local.set({ [`${PREFIX}tasks`]: [...tasks, task] })
			await flash('✓')
			return
		}
		const raw = info.menuItemId === 'pin-link' ? info.linkUrl : (tab?.url ?? info.pageUrl)
		const url = raw ? toUrl(raw) : null
		if (!url) return
		const list = await read<Shortcut[]>('shortcuts', [])
		if (!list.some((s) => s.url === url)) {
			const title = info.menuItemId === 'pin' && tab?.title ? tab.title : titleFromUrl(url)
			await browser.storage.local.set({
				[`${PREFIX}shortcuts`]: [...list, { id: crypto.randomUUID(), url, title }],
			})
		}
		await flash('✓')
	})

	browser.storage.onChanged.addListener((changes, area) => {
		const c = changes[`${PREFIX}focus`]
		if (area === 'local' && c) schedule((c.newValue as FocusState) ?? defaultFocus())
	})

	browser.alarms.onAlarm.addListener(async (a) => {
		if (a.name === END) await finish()
		if (a.name === TICK) await badge(await read<FocusState>('focus', defaultFocus()))
	})

	browser.notifications?.onClicked.addListener((id) => {
		browser.notifications.clear(id)
		browser.tabs.create({ url: 'chrome://newtab' })
	})
})
