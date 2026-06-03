import { FiCheck, FiLock, FiShoppingCart } from 'react-icons/fi'
import { Button } from '@/components/button/button'
import { ItemPrice } from '@/components/item-price/item-price'
import { getItemTypeEmoji } from '@/components/market/getItemTypeEmoji'
import { showToast } from '@/common/toast'
import { Theme } from '@/context/theme.context'
import type { MarketItem, MarketItemType } from '@/services/hooks/market/market.interface'
import { RenderPreview } from './renderPreview'

interface MarketItemCardProps {
	item: MarketItem
	onPurchase: () => void
	isAuthenticated: boolean
	isOwned?: boolean
}

const SUPPORTED_TYPES: MarketItemType[] = ['BROWSER_TITLE', 'THEME', 'FONT']

const getItemTypeLabel = (type: string) => {
	switch (type) {
		case 'BROWSER_TITLE':
			return 'Browser title'
		case 'FONT':
			return 'Typography'
		case 'THEME':
			return 'Theme'
		default:
			return type
	}
}

export function MarketItemCard({ item, onPurchase, isAuthenticated }: MarketItemCardProps) {
	const canAfford = isAuthenticated
	const isOwned = item.isOwned

	const handlePreviewClick = () => {
		if (item.previewUrl) window.open(item.previewUrl, '_blank')
	}

	let needUpgrade = !SUPPORTED_TYPES.includes(item.type)
	if (
		!needUpgrade &&
		item.itemValue &&
		item.type === 'THEME' &&
		!Object.values(Theme).includes(item.itemValue as Theme)
	) {
		needUpgrade = true
	}

	function onPurchaseButtonClick() {
		if (needUpgrade) {
			showToast('Extension update required.', 'error')
			return
		}
		onPurchase()
	}

	return (
		<div className="group relative flex h-full min-h-[365px] flex-col overflow-hidden border bg-base-100/90 rounded-[1.75rem] p-3.5 border-base-300/70 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-2xl hover:shadow-primary/10">
			<div className="absolute inset-x-0 top-0 h-28 pointer-events-none bg-linear-to-b from-primary/12 via-primary/4 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
			<div className="relative flex items-start justify-between gap-3 mb-3">
				<div className="flex flex-col min-w-0 overflow-hidden">
					<div className="flex items-center gap-2 mb-1.5">
						<span className="flex items-center justify-center w-8 h-8 text-lg transition-transform rounded-2xl bg-base-200 ring-1 ring-base-300/70 group-hover:scale-110">
							{getItemTypeEmoji(item.type)}
						</span>
						<span className="px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] rounded-full bg-primary/10 text-primary">
							{getItemTypeLabel(item.type)}
						</span>
					</div>
					<h3 className="text-base font-black leading-tight transition-colors text-content group-hover:text-primary">
						{item.name}
					</h3>
				</div>
				{isOwned ? (
					<div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-success/10 text-success ring-1 ring-success/20 shrink-0">
						<FiCheck size={16} />
					</div>
				) : (
					<div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-base-200 text-muted ring-1 ring-base-300/70 shrink-0">
						<FiLock size={15} />
					</div>
				)}
			</div>

			<div className="relative mb-3 overflow-hidden rounded-3xl min-h-32">
				<RenderPreview item={item} handlePreviewClick={handlePreviewClick} />
			</div>

			{item.description && (
				<p className="px-1 mb-4 text-[11px] leading-relaxed text-muted/90 line-clamp-3 min-h-12">
					{item.description}
				</p>
			)}

			<div className="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-base-200/80">
				<ItemPrice price={item.price} className="px-2 py-1 rounded-xl bg-base-200/60" />

				{isOwned ? (
					<div className="flex items-center h-10 gap-1.5 px-3 border bg-success/10 text-success rounded-2xl border-success/20 text-[11px] font-black">
						<FiCheck size={14} />
						<span>Unlocked</span>
					</div>
				) : (
					<Button
						size="sm"
						onClick={onPurchaseButtonClick}
						disabled={isOwned}
						className="h-10 px-4 rounded-2xl text-xs font-black transition-all bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-sm"
					>
						<div className="flex items-center gap-1.5">
							<FiShoppingCart size={14} />
							<span>{canAfford ? 'Unlock' : 'Sign in'}</span>
						</div>
					</Button>
				)}
			</div>
		</div>
	)
}
