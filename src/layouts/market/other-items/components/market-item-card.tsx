import { FiCheck, FiShoppingCart } from 'react-icons/fi'
import { Button } from '@/components/button/button'
import { ItemPrice } from '@/components/item-price/item-price'
import { getItemTypeEmoji } from '@/components/market/getItemTypeEmoji'
import { Theme } from '@/context/theme.context'
import type { MarketItem, MarketItemType } from '@/services/hooks/market/market.interface'
import { showToast } from '@/common/toast'
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
			return 'Font'
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
		<div className="group relative flex flex-col h-full overflow-hidden border shadow-sm bg-base-100/85 rounded-3xl p-3 border-base-300/70 hover:border-primary/40 hover:shadow-xl transition-all duration-300">
			<div className="absolute inset-x-0 top-0 h-24 pointer-events-none bg-linear-to-b from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
			<div className="relative flex items-start justify-between px-1 mb-3">
				<div className="flex flex-col min-w-0 overflow-hidden">
					<h3 className="text-sm font-black truncate transition-colors text-content group-hover:text-primary">
						{item.name}
					</h3>
					<span className="text-[10px] text-muted/70 mt-0.5 font-bold uppercase tracking-wider">
						{getItemTypeLabel(item.type)}
					</span>
				</div>
				<span className="flex items-center justify-center w-8 h-8 text-lg transition-transform rounded-2xl bg-base-200 ring-1 ring-base-300/70 group-hover:scale-110">
					{getItemTypeEmoji(item.type)}
				</span>
			</div>

			<div className="relative flex-1 mb-3 overflow-hidden rounded-2xl min-h-28">
				<RenderPreview item={item} handlePreviewClick={handlePreviewClick} />
			</div>

			{item.description && (
				<p className="px-1 mb-4 text-[11px] leading-relaxed text-muted/85 line-clamp-2 min-h-8">
					{item.description}
				</p>
			)}

			<div className="flex items-center justify-between pt-3 mt-auto border-t border-base-200/70">
				<div className="origin-left scale-95">
					<ItemPrice price={item.price} />
				</div>

				{isOwned ? (
					<div className="flex items-center h-9 gap-1.5 px-3 border bg-success/10 text-success rounded-2xl border-success/20 text-[11px] font-black">
						<FiCheck size={14} />
						<span>Unlocked</span>
					</div>
				) : (
					<Button
						size="sm"
						onClick={onPurchaseButtonClick}
						disabled={isOwned}
						className="h-9 px-4 rounded-2xl text-xs font-black transition-all bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-sm"
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
