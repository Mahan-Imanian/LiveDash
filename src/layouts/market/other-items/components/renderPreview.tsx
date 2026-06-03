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
		<div className="absolute z-10 flex gap-1 px-2 py-1 rounded-full shadow-sm text-success bg-black/75 items-center top-2 right-2 backdrop-blur-md">
			<FiShoppingBag size={10} />
			<span className="!text-[10px] font-bold">Unlocked</span>
		</div>
	)
}

function ThemePreview({ value }: { value: unknown }) {
	const tone = String(value || '').toLowerCase()
	const gradient = tone.includes('dark')
		? 'from-slate-950 via-slate-800 to-cyan-900'
		: tone.includes('icy')
			? 'from-sky-100 via-cyan-200 to-blue-400'
			: tone.includes('glass')
				? 'from-indigo-200/80 via-white/70 to-cyan-300/80'
				: 'from-violet-500 via-indigo-500 to-cyan-400'

	return (
		<div className={`w-full h-full min-h-28 rounded-2xl bg-linear-to-br ${gradient} p-3 overflow-hidden`}>
			<div className="h-full rounded-2xl bg-white/20 backdrop-blur-md ring-1 ring-white/30 p-3 flex flex-col justify-between">
				<div className="flex gap-1.5">
					<span className="w-6 h-2 rounded-full bg-white/70" />
					<span className="w-10 h-2 rounded-full bg-white/40" />
				</div>
				<div className="grid grid-cols-3 gap-2">
					<span className="h-8 rounded-xl bg-white/45" />
					<span className="h-8 rounded-xl bg-white/25" />
					<span className="h-8 rounded-xl bg-white/35" />
				</div>
			</div>
		</div>
	)
}

export function RenderPreview({ item, handlePreviewClick }: RenderPreviewProps) {
	if (item.previewUrl) {
		return (
			<div className="relative flex items-center flex-1 p-2 border bg-base-200/80 rounded-2xl border-base-300/70 min-h-28">
				<img
					src={item.previewUrl}
					alt="Preview"
					className="object-cover object-center w-full max-w-full rounded-xl max-h-28 min-h-28"
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
			<div className="relative flex items-center justify-center flex-1 p-3 overflow-hidden border bg-base-200/80 rounded-2xl border-base-300/70 min-h-28">
				{item.isOwned ? <IsOwnedBadge /> : null}
				{renderBrowserTitlePreview({
					template: item.meta?.template || item.name,
					className: '!w-80 !max-w-80 scale-90',
				})}
			</div>
		)
	}

	if (item.type === 'FONT') {
		return (
			<div className="relative flex items-center justify-center flex-1 p-3 overflow-hidden border bg-base-200/80 rounded-2xl border-base-300/70 min-h-28">
				{item.isOwned ? <IsOwnedBadge /> : null}
				<div className="text-center">
					<div className="text-2xl leading-relaxed text-content" style={{ fontFamily: item.itemValue }}>
						<span className="font-black">LiveDash</span>
						<br />
						<span className="text-xs font-semibold tracking-[0.22em] uppercase text-muted">Font sample</span>
					</div>
				</div>
			</div>
		)
	}

	if (item.type === 'THEME') {
		return (
			<div className="relative flex-1 min-h-28">
				{item.isOwned ? <IsOwnedBadge /> : null}
				<ThemePreview value={item.itemValue} />
			</div>
		)
	}

	return (
		<div className="relative flex items-center justify-center flex-1 border border-dashed bg-base-100 rounded-2xl border-base-300 min-h-28">
			{item.isOwned ? <IsOwnedBadge /> : null}
			<span className="text-2xl opacity-50">{getItemTypeEmoji(item.type)}</span>
		</div>
	)
}
