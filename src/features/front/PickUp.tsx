import { closeTabs, requestCore, restoreClosed } from '@/lib/browser'
import { emit } from '@/lib/bus'
import { openUrl } from '@/lib/chrome'
import { formatRelative } from '@/lib/format'
import { isJunk } from '@/lib/rank'
import { hostOf } from '@/lib/url'
import { update, useStore } from '@/store/store'
import { Favicon } from '@/ui/controls'
import { Glyph } from '@/ui/Glyph'
import { openMenu } from '@/ui/Menu'
import { toast } from '@/ui/toast'
import { destActions } from '../search/model'
import { useLive } from '../snapshot'

interface Item {
	key: string
	url?: string
	title: string
	meta: string
	glyph?: 'restore' | 'device' | 'switch'
	run: (newTab: boolean) => unknown
	menu?: boolean
}

export function PickUp() {
	const { access, snap } = useLive()
	const asked = useStore((s) => s.ui.asked)

	if (!access) return null

	if (!access.history && !access.tabs) {
		if (asked) return null
		return (
			<section className="col" aria-labelledby="pu-title">
				<h2 className="col-head" id="pu-title">
					Pick up
				</h2>
				<p className="col-lede">
					See the tabs you just closed, pages open on your other devices, and the places you visit
					most — right here.
				</p>
				<div className="col-actions">
					<button
						type="button"
						className="btn"
						onClick={async () => {
							const ok = await requestCore()
							update('ui', (u) => ({ ...u, asked: true }))
							if (ok) emit({ type: 'refresh' })
						}}
					>
						Allow history and tabs
					</button>
					<button
						type="button"
						className="text-btn"
						onClick={() => update('ui', (u) => ({ ...u, asked: true }))}
					>
						Not now
					</button>
				</div>
				<p className="col-fine">Read-only and on this device. Nothing is uploaded.</p>
			</section>
		)
	}

	const now = Date.now()
	const items: Item[] = []
	for (const c of snap?.closed.slice(0, 3) ?? []) {
		items.push({
			key: `c${c.id}`,
			url: c.url,
			title: c.kind === 'window' && c.count > 1 ? `${c.title} and ${c.count - 1} more` : c.title,
			meta: `${c.kind === 'window' && c.count > 1 ? 'window' : 'tab'} closed ${formatRelative(c.at, now)}`,
			glyph: 'restore',
			run: () => restoreClosed(c.id),
		})
	}
	for (const d of snap?.devices.slice(0, 3) ?? []) {
		items.push({
			key: `d${d.url}`,
			url: d.url,
			title: d.title,
			meta: `on ${d.device} · ${formatRelative(d.at, now)}`,
			glyph: 'device',
			run: (nt) => openUrl(d.url, nt),
			menu: true,
		})
	}
	const shown = new Set(items.flatMap((i) => [i.url, `${hostOf(i.url ?? '')}|${i.title}`]))
	const recent = (snap?.dests ?? [])
		.filter(
			(d) =>
				d.tabId === undefined &&
				d.lastVisit > now - 24 * 3_600_000 &&
				d.pinned === undefined &&
				!isJunk(d.url),
		)
		.sort((a, b) => b.lastVisit - a.lastVisit)
		.filter((d) => {
			const k = `${d.host}|${d.title}`
			if (shown.has(d.url) || shown.has(k)) return false
			shown.add(k)
			return true
		})
		.slice(0, Math.max(0, 6 - items.length))
	for (const d of recent) {
		items.push({
			key: `r${d.key}`,
			url: d.url,
			title: d.title,
			meta: `${hostOf(d.url)} · ${formatRelative(d.lastVisit, now)}`,
			run: (nt) => openUrl(d.url, nt),
			menu: true,
		})
	}
	const dups = snap?.duplicates ?? []

	return (
		<section className="col" aria-labelledby="pu-title">
			<h2 className="col-head" id="pu-title">
				Pick up
			</h2>
			{items.length === 0 && dups.length === 0 ? (
				<p className="col-lede col-lede--quiet">
					Nothing to pick up yet. Tabs you close and pages open on your other devices will appear
					here.
				</p>
			) : (
				<ul className="col-list">
					{items.map((it) => (
						<li key={it.key}>
							<button
								type="button"
								className="col-item"
								onClick={(e) => it.run(e.ctrlKey || e.metaKey)}
								onAuxClick={(e) => e.button === 1 && it.run(true)}
								onContextMenu={(e) => {
									if (!it.menu || !it.url) return
									e.preventDefault()
									openMenu(e, destActions(it.url, it.title), `Actions for ${it.title}`)
								}}
							>
								<span className="col-icon" aria-hidden="true">
									{it.url ? (
										<Favicon url={it.url} label={it.title} />
									) : (
										<Glyph name={it.glyph ?? 'restore'} />
									)}
								</span>
								<span className="col-text">
									<span className="col-title">{it.title}</span>
									<span className="col-meta">
										{it.glyph === 'restore' && <Glyph name="restore" size={12} />}
										{it.glyph === 'device' && <Glyph name="device" size={12} />}
										{it.meta}
									</span>
								</span>
							</button>
						</li>
					))}
					{dups.length > 0 && snap && (
						<li>
							<button
								type="button"
								className="col-item"
								onClick={async () => {
									const undo = await closeTabs(dups, snap.tabs)
									toast(`Closed ${dups.length} duplicate ${dups.length === 1 ? 'tab' : 'tabs'}`, {
										undo: () => void undo(),
									})
									emit({ type: 'refresh' })
								}}
							>
								<span className="col-icon" aria-hidden="true">
									<Glyph name="switch" />
								</span>
								<span className="col-text">
									<span className="col-title">
										Close {dups.length} duplicate {dups.length === 1 ? 'tab' : 'tabs'}
									</span>
									<span className="col-meta">{snap.tabs.length} tabs open · undo available</span>
								</span>
							</button>
						</li>
					)}
				</ul>
			)}
		</section>
	)
}
