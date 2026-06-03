import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FaArrowDownLong, FaArrowUpLong } from 'react-icons/fa6'
import { MdDragIndicator } from 'react-icons/md'
import Analytics from '@/analytics'
import { getFromStorage, setToStorage } from '@/common/storage'
import { CurrencyColorMode } from '@/context/currency.context'
import { useGetImageMainColor } from '@/hooks/useGetImageMainColor'
import {
	type FetchedCurrency,
	useGetCurrencyByCode,
} from '@/services/hooks/currency/getCurrencyByCode.hook'
import { GetPrice } from '../utils/getPrice'
import { CurrencyModalComponent } from './currency-modal'
import { showToast } from '@/common/toast'

interface CurrencyBoxProps {
	code: string
	currencyColorMode: CurrencyColorMode | null
	dragHandle?: React.HTMLAttributes<HTMLDivElement>
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

	const imgMainColor = useGetImageMainColor(currency?.icon)
	const iconTone = useMemo(() => {
		const tones: Record<string, string> = {
			BTC: 'from-orange-400 to-amber-700', ETH: 'from-indigo-300 to-blue-700', USDT: 'from-emerald-300 to-teal-700',
			BNB: 'from-yellow-300 to-amber-700', SOL: 'from-fuchsia-400 to-emerald-400', XRP: 'from-slate-300 to-slate-700',
			USDC: 'from-sky-300 to-blue-700', DOGE: 'from-yellow-300 to-yellow-700', ADA: 'from-blue-400 to-blue-900',
			TRX: 'from-red-400 to-rose-800', AVAX: 'from-red-300 to-red-700', LINK: 'from-blue-300 to-blue-800',
		}
		return tones[code] || 'from-primary to-secondary'
	}, [code])

	useEffect(() => {
		async function load() {
			const currency = await getFromStorage(`currency:${code}`)
			if (currency) {
				setCurrency(currency)
			}
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
	}, [dataUpdatedAt])

	useEffect(() => {
		if (currency?.price) {
			if (prevPriceRef.current !== currency.price) {
				prevPriceRef.current = currency.price
				if (currency.changePercentage) {
					const changeAmount =
						(currency.changePercentage / 100) * currency.rialPrice
					setPriceChange(changeAmount)
				}
			}
		}
	}, [currency?.price])

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

	const priceChangeColor =
		currencyColorMode === CurrencyColorMode.NORMAL
			? `${priceChange > 0 ? 'text-red-500' : 'text-green-500'}`
			: `${priceChange > 0 ? 'text-green-500' : 'text-red-500'}`

	return (
		<>
			<div
				className={`flex items-center justify-between gap-2 py-2 rounded-xl cursor-pointer 
				bg-base-300 opacity-100 hover:!bg-gray-500/10
				transition-all duration-200 ease-in-out
				transform`}
				onClick={() => toggleCurrencyModal()}
				dir="ltr"
			>
				<div className="flex  gap-x-2.5 max-w-full items-center">
					<div className="flex items-center">
						{dragHandle && (
							<div
								{...dragHandle}
								className="flex items-center justify-center w-4 h-4 transition-colors cursor-grab active:cursor-grabbing text-muted hover:bg-primary/10"
							>
								<MdDragIndicator size={14} />
							</div>
						)}
						<div className={`flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br ${iconTone} shadow-sm ring-1 ring-white/20 shrink-0`}>
							<span className="text-[8px] font-black tracking-tight text-white">
								{code.slice(0, 3)}
							</span>
						</div>
					</div>
					<div className="flex items-center min-w-0 space-x-2 text-sm font-medium">
						<span className="block text-sm font-bold truncate text-content">
							{code}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-baseline gap-2 pr-2">
						<span className={'text-sm font-bold text-content'}>
							{currency ? GetPrice(code, currency).label : '-'}
						</span>
						{priceChange !== 0 && (
							<span className={`text-xs ${priceChangeColor}`}>
								{priceChange > 0 ? (
									<FaArrowUpLong className="inline" />
								) : (
									<FaArrowDownLong className="inline" />
								)}
							</span>
						)}
					</div>
				</div>
			</div>
			{currency && !currency.url && (
				<CurrencyModalComponent
					code={code}
					currencyColorMode={currencyColorMode}
					currency={currency}
					priceChange={priceChange}
					imgMainColor={imgMainColor}
					isModalOpen={isModalOpen}
					toggleCurrencyModal={toggleCurrencyModal}
					key={code}
				/>
			)}
		</>
	)
}
