import { getItemTypeEmoji } from '@/components/market/getItemTypeEmoji'
import { renderBrowserTitlePreview } from '@/components/market/title/title-render-preview'
import Tooltip from '@/components/toolTip'
import type { MarketItem } from '@/services/hooks/market/market.interface'
import { FiEye, FiShoppingBag } from 'react-icons/fi'

interface RenderPreviewProps {
	item: MarketItem
	handlePreviewClick: () => void
}

function IsOwnedBadge() {
	return (
		<div className="absolute z-10 flex gap-1.5 px-2.5 py-1 rounded-full shadow-sm text-emerald-200 bg-black/60 items-center top-2 right-2 backdrop-blur-md ring-1 ring-white/10">
			<FiShoppingBag size={10} />
			<span className="!text-[10px] font-black">Unlocked</span>
		</div>
	)
}

function ThemePreview({ value, accent }: { value: unknown; accent?: string }) {
	const tone = String(value || '').toLowerCase()
	const gradient = tone.includes('dark')
		? 'from-slate-950 via-slate-800 to-cyan-900'
		: tone.includes('icy')
			? 'from-sky-100 via-cyan-200 to-blue-500'
			: tone.includes('light')
				? 'from-white via-sky-100 to-cyan-300'
				: 'from-violet-500 via-indigo-500 to-cyan-400'

	return (
		<div className={`w-full h-full min-h-32 rounded-3xl bg-linear-to-br ${gradient} p-3 overflow-hidden`}>
			<div className="h-full rounded-3xl bg-white/18 backdrop-blur-md ring-1 ring-white/35 p-3 flex flex-col justify-between shadow-inner">
				<div className="flex items-center justify-between gap-2">
					<div className="flex gap-1.5">
						<span className="w-7 h-2 rounded-full bg-white/80" />
						<span className="w-11 h-2 rounded-full bg-white/45" />
					</div>
					<span className="px-2 py-1 text-[9px] font-black text-white rounded-full bg-black/20">{accent || 'Live'}</span>
				</div>
				<div className="grid grid-cols-3 gap-2">
					<span className="h-10 rounded-2xl bg-white/45" />
					<span className="h-10 rounded-2xl bg-white/25" />
					<span className="h-10 rounded-2xl bg-white/35" />
				</div>
			</div>
		</div>
	)
}

export function RenderPreview({ item, handlePreviewClick }: RenderPreviewProps) {
	if (item.previewUrl) {
		return (
			<div className="relative flex items-center flex-1 p-2 border bg-base-200/80 rounded-3xl border-base-300/70 min-h-32">
				<img
					src={item.previewUrl}
					alt="Preview"
					className="object-cover object-center w-full max-w-full rounded-2xl max-h-32 min-h-32"
					loading="lazy"
				/>
				<Tooltip content="View full image" position="bottom" offset={-20}>
					<button
						onClick={handlePreviewClick}
						className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm cursor-pointer"
					>
						<FiEye size={14} />
					</button>
				</Tooltip>
				{item.isOwned ? <IsOwnedBadge /> : null}
			</div>
		)
	}

	if (item.type === 'BROWSER_TITLE') {
		return (
			<div className="relative flex items-center justify-center flex-1 p-3 overflow-hidden border bg-[radial-gradient(circle_at_20%_15%,rgba(45,212,255,.18),transparent_35%),linear-gradient(135deg,rgba(15,23,42,.95),rgba(30,41,59,.88))] rounded-3xl border-white/10 min-h-32">
				{item.isOwned ? <IsOwnedBadge /> : null}
				<div className="scale-95">
					{renderBrowserTitlePreview({
						template: item.meta?.template || item.name,
						className: '!w-80 !max-w-80 scale-90',
					})}
				</div>
			</div>
		)
	}

	if (item.type === 'FONT') {
		return (
			<div className="relative flex items-center justify-center flex-1 p-4 overflow-hidden border bg-base-200/80 rounded-3xl border-base-300/70 min-h-32">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.16),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,.15),transparent_28%)]" />
				{item.isOwned ? <IsOwnedBadge /> : null}
				<div className="relative text-center">
					<div className="text-3xl leading-relaxed text-content" style={{ fontFamily: item.itemValue }}>
						<span className="font-black">LiveDash</span>
						<br />
						<span className="text-xs font-black tracking-[0.22em] uppercase text-muted">{item.meta?.style || 'Font sample'}</span>
					</div>
				</div>
			</div>
		)
	}

	if (item.type === 'THEME') {
		return (
			<div className="relative flex-1 min-h-32">
				{item.isOwned ? <IsOwnedBadge /> : null}
				<ThemePreview value={item.itemValue} accent={item.meta?.accent} />
			</div>
		)
	}

	return (
		<div className="relative flex items-center justify-center flex-1 border border-dashed bg-base-100 rounded-3xl border-base-300 min-h-32">
			{item.isOwned ? <IsOwnedBadge /> : null}
			<span className="text-2xl opacity-50">{getItemTypeEmoji(item.type)}</span>
		</div>
	)
}
