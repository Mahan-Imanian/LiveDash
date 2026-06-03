import { useMemo, useState } from 'react'
import { FiCheckCircle, FiGrid, FiLayers, FiShoppingBag, FiSliders } from 'react-icons/fi'
import Analytics from '@/analytics'
import { callEvent } from '@/common/utils/call-event'
import { Pagination } from '@/components/pagination'
import { showToast } from '@/common/toast'
import { useAuth } from '@/context/auth.context'
import type { Theme } from '@/context/theme.context'
import { useGetMarketItems } from '@/services/hooks/market/getMarketItems.hook'
import type { MarketItem, MarketItemType } from '@/services/hooks/market/market.interface'
import { MarketItemCard } from './components/market-item-card'
import { MarketItemPurchaseModal } from './components/market-item-purchase-modal'

const FILTERS: Array<{ value: 'ALL' | MarketItemType; label: string; hint: string }> = [
	{ value: 'ALL', label: 'All', hint: 'Everything' },
	{ value: 'THEME', label: 'Themes', hint: 'Surface' },
	{ value: 'BROWSER_TITLE', label: 'Titles', hint: 'Browser' },
	{ value: 'FONT', label: 'Fonts', hint: 'Typography' },
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

	const counts = useMemo(() => {
		const items = marketData?.items || []
		return {
			all: items.length,
			themes: items.filter((item) => item.type === 'THEME').length,
			titles: items.filter((item) => item.type === 'BROWSER_TITLE').length,
			fonts: items.filter((item) => item.type === 'FONT').length,
		}
	}, [marketData?.items])

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
			<div className="sticky top-0 z-20 mb-4 overflow-hidden border shadow-xl bg-slate-950/90 backdrop-blur-2xl border-white/10 rounded-[2rem] text-white">
				<div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(45,212,255,.35),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(167,139,250,.32),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.08),transparent_50%)]" />
				<div className="relative grid gap-4 p-4 md:grid-cols-[1.1fr_.9fr] md:items-end">
					<div>
						<div className="flex items-center gap-2 mb-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 ring-1 ring-white/15">
								<FiSliders size={18} />
							</div>
							<div>
								<p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200">Personalization Studio</p>
								<h3 className="text-xl font-black tracking-tight">Refine the whole LiveDash surface</h3>
							</div>
						</div>
						<p className="max-w-2xl text-xs font-semibold leading-relaxed text-white/62">
							Apply themes, browser titles, and typography presets from one cleaner marketplace. Every card is usable offline and syncs when the backend is available.
						</p>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<div className="p-3 border rounded-2xl bg-white/8 border-white/10">
							<FiGrid className="mb-2 text-cyan-200" />
							<div className="text-lg font-black tabular-nums">{counts.all}</div>
							<div className="text-[10px] font-bold text-white/45">Items</div>
						</div>
						<div className="p-3 border rounded-2xl bg-white/8 border-white/10">
							<FiLayers className="mb-2 text-violet-200" />
							<div className="text-lg font-black tabular-nums">{counts.themes}</div>
							<div className="text-[10px] font-bold text-white/45">Themes</div>
						</div>
						<div className="p-3 border rounded-2xl bg-white/8 border-white/10">
							<FiCheckCircle className="mb-2 text-emerald-200" />
							<div className="text-lg font-black tabular-nums">Free</div>
							<div className="text-[10px] font-bold text-white/45">Access</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
				{FILTERS.map((filter) => (
					<button
						key={filter.value}
						onClick={() => setActiveFilter(filter.value)}
						className={`group flex min-w-28 flex-col rounded-2xl border px-4 py-3 text-left transition-all shrink-0 ${
							activeFilter === filter.value
								? 'border-primary/50 bg-primary text-white shadow-lg shadow-primary/20'
								: 'border-base-300/70 bg-base-100/80 hover:border-primary/30 hover:bg-base-100'
						}`}
					>
						<span className="text-sm font-black leading-tight">{filter.label}</span>
						<span className={`text-[10px] font-bold ${activeFilter === filter.value ? 'text-white/60' : 'text-muted'}`}>{filter.hint}</span>
					</button>
				))}
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{Array.from({ length: 8 }).map((_, index) => (
						<div key={index} className="p-3 border shadow-sm rounded-[1.75rem] border-base-300 bg-base-100/60">
							<div className="w-full h-32 mb-4 rounded-3xl bg-base-300 animate-pulse" />
							<div className="w-2/3 h-4 mb-2 rounded bg-base-300 animate-pulse" />
							<div className="w-full h-3 mb-4 rounded bg-base-300/50 animate-pulse" />
							<div className="h-10 rounded-2xl bg-base-300 animate-pulse" />
						</div>
					))}
				</div>
			) : filteredItems.length > 0 ? (
				<div className="grid grid-cols-1 gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
				<div className="flex flex-col items-center justify-center h-64 text-center border border-dashed bg-base-100/50 border-base-300 rounded-3xl">
					<FiShoppingBag size={48} className="mb-4 text-muted" />
					<p className="text-lg font-black text-content">No items to show</p>
					<p className="text-sm font-semibold text-muted">Check another category.</p>
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
