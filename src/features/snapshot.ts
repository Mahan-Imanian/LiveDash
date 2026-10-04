import { useEffect, useSyncExternalStore } from 'react'
import { browser } from 'wxt/browser'
import { type Access, readAccess, type Snapshot, snapshot } from '@/lib/browser'
import { on } from '@/lib/bus'

interface Live {
	access: Access | null
	snap: Snapshot | null
}

let live: Live = { access: null, snap: null }
let pending: Promise<void> | null = null
let started = false
const listeners = new Set<() => void>()

function set(next: Live) {
	live = next
	for (const l of listeners) l()
}

export function refreshSnapshot(): Promise<void> {
	pending ??= (async () => {
		try {
			const access = await readAccess()
			set({ access, snap: live.snap })
			set({ access, snap: await snapshot(access) })
		} finally {
			pending = null
		}
	})()
	return pending
}

function start() {
	if (started) return
	started = true
	refreshSnapshot()
	document.addEventListener('visibilitychange', () => !document.hidden && refreshSnapshot())
	browser.permissions.onAdded.addListener(() => refreshSnapshot())
	browser.permissions.onRemoved.addListener(() => refreshSnapshot())
	on((e) => e.type === 'refresh' && refreshSnapshot())
}

export function useLive(): Live {
	useEffect(start, [])
	return useSyncExternalStore(
		(l) => {
			listeners.add(l)
			return () => listeners.delete(l)
		},
		() => live,
	)
}
