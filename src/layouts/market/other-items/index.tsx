import { useMemo, useState } from 'react'
import { FiShoppingBag, FiSliders } from 'react-icons/fi'
import Analytics from '@/analytics'
import { callEvent } from '@/common/utils/call-event'
import { Pagination } from '@/components/pagination'
import { useAuth } from '@/context/auth.context'
import type { Theme } from '@/context/theme.context'
import { useGetMarketItems } from '@/services/hooks/market/getMarketItems.hook'
import type { MarketItem, MarketItemType } from '@/services/hooks/market/market.interface'
import { MarketItemCard } from './components/market-item-card'
import { MarketItemPurchaseModal } from './components/market-item-purchase-modal'
import { showToast } from '@/common/toast'

const FILTERS: Array<{ value: 'ALL' | MarketItemType; label: string }> = [
	{ value: 'ALL', label: 'All' },
	{ value: 'THEME', label: 'Themes' },
	{ value: 'BROWSER_TITLE', label: 'Titles' },
	{ value: 'FONT', label: 'Fonts' },
]

export function MarketOtherItems() {
	const { user, isAuthenticated, refetchUser } = useAuth()
	const [currentPage, setCurrentPage] = useState(1)
	const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null)
	const [showPurchaseModal, setShowPurchaseModal] = useState(false)
	const [activeFilter, setActiveFilter] = useState<'ALL' | MarketItemType>('ALL')

	const { data: marketData, isLoading, refetch } = useGetMarketItems(true, {
		limit: 24,
		page: currentPage,
	})

	const filteredItems = useMemo(() => {
		const items = marketData?.items || []
		return items
			.filter((item) => activeFilter === 'ALL' || item.type === activeFilter)
			.sort((a, b) => Number(b.isOwned) - Number(a.isOwned))
	}, [marketData?.items, activeFilter])

	const handlePurchaseClick = (item: MarketItem) => {
		if (!isAuthenticated) {
			Analytics.event('market_item_purchase_unauthenticated')
			showToast('Sign in to unlock personalization items.', 'error')
			return
		}

		setSelectedItem(item)
		setShowPurchaseModal(true)
	}

	const handlePurchaseSuccess = (item: MarketItem) => {
		setShowPurchaseModal(false)
		setSelectedItem(null)
		refetchUser()
		refetch()

		if (item.type === 'BROWSER_TITLE') {
			callEvent('browser_title_change', {
				id: item.id,
				name: item.name,
				template: item.itemValue as string,
			})
		}
		if (item.type === 'THEME') callEvent('theme_change', item.itemValue as Theme)
		if (item.type === 'FONT') callEvent('font_change', item.itemValue as string)
	}

	const onNextPage = () => {
		setCurrentPage(currentPage + 1)
		Analytics.event('market_other_items_next_page')
	}

	const onPrevPage = () => {
		setCurrentPage(currentPage - 1)
		Analytics.event('market_other_items_prev_page')
	}

	return (
		<>
			<div className="sticky top-0 z-20 p-2 mb-3 border shadow-sm bg-base-100/90 backdrop-blur-xl border-base-300/70 rounded-3xl">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary/10 text-primary">
							<FiSliders size={18} />
						</div>
						<div>
							<h3 className="text-sm font-black text-content">Personalization</h3>
							<p className="text-[10px] font-semibold text-muted">Unlock a polished desktop-grade setup.</p>
						</div>
					</div>
					<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
						{FILTERS.map((filter) => (
							<button
								key={filter.value}
								onClick={() => setActiveFilter(filter.value)}
								className={`px-3 py-2 rounded-2xl text-[10px] font-black transition-all shrink-0 ${
									activeFilter === filter.value
										? 'bg-primary text-white shadow-sm'
										: 'bg-base-200 text-muted hover:text-primary hover:bg-primary/10'
								}`}
							>
								{filter.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{Array.from({ length: 8 }).map((_, index) => (
						<div key={index} className="p-3 border shadow-sm rounded-3xl border-base-300 bg-base-100/60">
							<div className="w-full h-28 mb-4 rounded-2xl bg-base-300 animate-pulse" />
							<div className="w-2/3 h-4 mb-2 rounded bg-base-300 animate-pulse" />
							<div className="w-full h-3 mb-4 rounded bg-base-300/50 animate-pulse" />
							<div className="h-10 rounded-2xl bg-base-300 animate-pulse" />
						</div>
					))}
				</div>
			) : filteredItems.length > 0 ? (
				<div className="grid grid-cols-1 gap-3 pb-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredItems.map((item) => (
						<MarketItemCard
							key={item.id}
							item={item}
							onPurchase={() => handlePurchaseClick(item)}
							isAuthenticated={isAuthenticated}
						/>
					))}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center h-64 text-center">
					<FiShoppingBag size={48} className="mb-4 text-muted" />
					<p className="text-lg font-medium text-content">No items to show</p>
					<p className="text-sm text-muted">Check another category.</p>
				</div>
			)}

			<Pagination
				currentPage={currentPage}
				totalPages={marketData?.totalPages || 1}
				onNextPage={onNextPage}
				onPrevPage={onPrevPage}
				isLoading={isLoading}
			/>
			<MarketItemPurchaseModal
				isOpen={showPurchaseModal}
				onClose={() => setShowPurchaseModal(false)}
				item={selectedItem}
				onPurchaseSuccess={handlePurchaseSuccess}
				userCoins={user?.coins || 0}
			/>
		</>
	)
}
