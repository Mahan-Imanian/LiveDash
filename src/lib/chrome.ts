import { browser } from 'wxt/browser'

export const FETCH_TIMEOUT_MS = 10_000

export const isPopup = () => document.documentElement.dataset.surface === 'popup'

export function faviconUrl(pageUrl: string, size = 32): string {
	const u = new URL((browser.runtime.getURL as (p: string) => string)('/_favicon/'))
	u.searchParams.set('pageUrl', pageUrl)
	u.searchParams.set('size', String(size))
	return u.toString()
}

export async function openUrl(url: string, newTab = false): Promise<void> {
	if (isPopup() || newTab) {
		await browser.tabs.create({ url, active: !newTab || isPopup() })
		if (isPopup()) window.close()
		return
	}
	window.location.assign(url)
}

export async function searchWeb(
	text: string,
	newTab = false,
	engineUrlOverride?: string | null,
): Promise<void> {
	if (engineUrlOverride) {
		await openUrl(engineUrlOverride, newTab)
		return
	}
	await browser.search.query({ text, disposition: isPopup() || newTab ? 'NEW_TAB' : 'CURRENT_TAB' })
	if (isPopup()) window.close()
}

export async function hasPermission(p: {
	permissions?: string[]
	origins?: string[]
}): Promise<boolean> {
	try {
		return await browser.permissions.contains(
			p as Parameters<typeof browser.permissions.contains>[0],
		)
	} catch {
		return false
	}
}

export async function requestPermission(p: {
	permissions?: string[]
	origins?: string[]
}): Promise<boolean> {
	try {
		return await browser.permissions.request(p as Parameters<typeof browser.permissions.request>[0])
	} catch {
		return false
	}
}

export async function removePermission(p: {
	permissions?: string[]
	origins?: string[]
}): Promise<boolean> {
	try {
		return await browser.permissions.remove(p as Parameters<typeof browser.permissions.remove>[0])
	} catch {
		return false
	}
}
