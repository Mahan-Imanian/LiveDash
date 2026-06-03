import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import toast from 'react-hot-toast'
import { FaArrowDownLong, FaArrowUpLong } from 'react-icons/fa6'
import { MdDragIndicator } from 'react-icons/md'
import Analytics from '@/analytics'
import { getFromStorage, setToStorage } from '@/common/storage'
import { showToast } from '@/common/toast'
import { CurrencyColorMode } from '@/context/currency.context'
import {
	type FetchedCurrency,
	useGetCurrencyByCode,
} from '@/services/hooks/currency/getCurrencyByCode.hook'
import { GetPrice } from '../utils/getPrice'
import { CurrencyModalComponent } from './currency-modal'

interface CurrencyBoxProps {
	code: string
	currencyColorMode: CurrencyColorMode | null
	dragHandle?: React.HTMLAttributes<HTMLDivElement>
}

function formatUsd(value: number) {
	if (!Number.isFinite(value)) return '$0'
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6,
	}).format(value)
}

export const CurrencyBox = ({
	code,
	currencyColorMode,
	dragHandle,
}: CurrencyBoxProps) => {
	const { data, dataUpdatedAt } = useGetCurrencyByCode(code, {
		refetchInterval: null,
	})

	const [currency, setCurrency] = useState<FetchedCurrency | null>(null)
	const [priceChange, setPriceChange] = useState(0)
	const [isModalOpen, setIsModalOpen] = useState(false)

	const prevPriceRef = useRef<number | null>(null)

	useEffect(() => {
		async function load() {
			const storedCurrency = await getFromStorage(`currency:${code}`)
			if (storedCurrency) setCurrency(storedCurrency)
		}
		load()
	}, [code])

	useEffect(() => {
		if (data) {
			setCurrency(data)
			setToStorage(`currency:${code}`, data)
		}
		const event = new Event('fetched-data')
		window.dispatchEvent(event)
	}, [data, dataUpdatedAt, code])

	useEffect(() => {
		if (currency?.price && prevPriceRef.current !== currency.price) {
			prevPriceRef.current = currency.price
			if (currency.changePercentage) {
				const changeAmount = (currency.changePercentage / 100) * currency.price
				setPriceChange(changeAmount)
			}
		}
	}, [currency?.price, currency?.changePercentage])

	function toggleCurrencyModal() {
		if (currency?.url && currency?.isSponsored) {
			showToast('Opening sponsor site...', 'success')
			setTimeout(() => {
				toast.dismiss()
				Analytics.event('currency_sponsor', {
					currency: currency.name.en,
					url: currency.url,
				})

				if (currency.url) window.open(currency.url, '_blank')
			}, 1000)
		} else {
			setIsModalOpen(!isModalOpen)
		}
	}

	const isPositive = (currency?.changePercentage || 0) >= 0
	const priceChangeColor =
		currencyColorMode === CurrencyColorMode.NORMAL
			? `${isPositive ? 'text-green-500' : 'text-red-500'}`
			: `${isPositive ? 'text-green-500' : 'text-red-500'}`

	return (
		<>
			<div
				className="flex items-center justify-between w-full min-w-0 gap-3 px-3 py-2.5 rounded-2xl cursor-pointer bg-base-100/75 border border-base-300/60 hover:border-primary/30 hover:bg-base-100 transition-all duration-200 shadow-sm"
				onClick={() => toggleCurrencyModal()}
				dir="ltr"
			>
				<div className="flex items-center min-w-0 gap-x-2.5">
					{dragHandle && (
						<div
							{...dragHandle}
							className="flex items-center justify-center w-4 h-4 transition-colors cursor-grab active:cursor-grabbing text-muted hover:bg-primary/10 rounded-lg"
						>
							<MdDragIndicator size={14} />
						</div>
					)}
					<div className="relative flex items-center justify-center w-9 h-9 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/15 shadow-[0_8px_20px_rgba(15,23,42,.18)] shrink-0">
						<div className="absolute inset-0 rounded-full bg-linear-to-br from-white/20 via-transparent to-black/35" />
						{currency?.icon ? (
							<img
								src={currency.icon}
								alt={currency?.name?.en || code}
								className="relative object-contain w-7 h-7 drop-shadow"
							/>
						) : (
							<span className="relative text-[10px] font-black text-white">{code.slice(0, 2)}</span>
						)}
					</div>
					<div className="flex flex-col min-w-0">
						<span className="block text-sm font-black leading-tight truncate text-content">
							{code}
						</span>
						<span className="block text-[10px] font-bold leading-tight truncate text-muted max-w-24">
							{currency?.name?.en || 'Crypto'}
						</span>
					</div>
				</div>

				<div className="flex items-center min-w-0 gap-2">
					<div className="flex flex-col items-end min-w-0 pr-1">
						<span className="max-w-full overflow-hidden text-sm font-black text-right whitespace-nowrap text-ellipsis text-content tabular-nums">
							{currency ? formatUsd(currency.price) : '-'}
						</span>
						<span className="text-[10px] font-bold text-muted tabular-nums">
							{currency ? GetPrice(code, currency).label : '-'}
						</span>
					</div>
					{priceChange !== 0 && (
						<span className={`text-xs ${priceChangeColor}`}>
							{isPositive ? (
								<FaArrowUpLong className="inline" />
							) : (
								<FaArrowDownLong className="inline" />
							)}
						</span>
					)}
				</div>
			</div>
			{currency && !currency.url && (
				<CurrencyModalComponent
					code={code}
					currencyColorMode={currencyColorMode}
					currency={currency}
					priceChange={priceChange}
					imgMainColor="#38bdf8"
					isModalOpen={isModalOpen}
					toggleCurrencyModal={toggleCurrencyModal}
					key={code}
				/>
			)}
		</>
	)
}
