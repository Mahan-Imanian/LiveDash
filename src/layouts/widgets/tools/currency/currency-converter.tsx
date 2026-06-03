import { motion } from 'framer-motion'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { TbArrowsUpDown, TbInfoCircle, TbTrendingUp } from 'react-icons/tb'
import { SelectBox } from '@/components/selectbox/selectbox'
import { TextInput } from '@/components/text-input'
import { useGetCurrencyByCode } from '@/services/hooks/currency/getCurrencyByCode.hook'
import { useGetSupportCurrencies } from '@/services/hooks/currency/getSupportCurrencies.hook'

function formatCryptoValue(value: number) {
	if (!Number.isFinite(value)) return '0'
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 6 : 8,
	}).format(value)
}

function formatUsd(value: number) {
	if (!Number.isFinite(value)) return '$0'
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: value >= 1 ? 2 : 4,
		maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6,
	}).format(value)
}

function CryptoChip({ code, icon, name }: { code: string; icon?: string; name?: string }) {
	return (
		<div className="flex items-center min-w-0 gap-2.5">
			<div className="relative flex items-center justify-center w-10 h-10 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/15 shadow-[0_10px_24px_rgba(15,23,42,.22)] shrink-0">
				<div className="absolute inset-0 rounded-full bg-linear-to-br from-white/20 via-transparent to-black/30" />
				{icon ? (
					<img src={icon} alt="" className="relative object-contain w-8 h-8 drop-shadow" />
				) : (
					<span className="relative text-[11px] font-black text-white">{code.slice(0, 2)}</span>
				)}
			</div>
			<div className="min-w-0 leading-none">
				<div className="text-sm font-black text-content">{code}</div>
				{name && <div className="mt-1 text-[10px] font-bold truncate text-muted max-w-28">{name}</div>}
			</div>
		</div>
	)
}

export const CurrencyConverter: React.FC = () => {
	const [fromCurrency, setFromCurrency] = useState<string>('BTC')
	const [toCurrency, setToCurrency] = useState<string>('ETH')
	const [amount, setAmount] = useState<number>(1)
	const [convertedAmount, setConvertedAmount] = useState<number>(0)
	const [isSwapping, setIsSwapping] = useState<boolean>(false)

	const { data: supportedCurrencies, isLoading: isLoadingSupported } =
		useGetSupportCurrencies()
	const { data: fromCurrencyData } = useGetCurrencyByCode(fromCurrency, {
		refetchInterval: null,
	})
	const { data: toCurrencyData } = useGetCurrencyByCode(toCurrency, {
		refetchInterval: null,
	})

	const options = useMemo(
		() =>
			(supportedCurrencies || []).map((currency) => ({
				label: currency.key,
				value: currency.key,
			})),
		[supportedCurrencies]
	)

	useEffect(() => {
		if (fromCurrencyData && toCurrencyData && amount >= 0) {
			const converted =
				(amount * fromCurrencyData.price) / Math.max(toCurrencyData.price, 0.00000001)
			setConvertedAmount(converted)
		}
	}, [fromCurrencyData, toCurrencyData, amount])

	const handleSwap = () => {
		setIsSwapping(true)
		setFromCurrency(toCurrency)
		setToCurrency(fromCurrency)
		setTimeout(() => setIsSwapping(false), 300)
	}

	const pairRate =
		fromCurrencyData && toCurrencyData
			? fromCurrencyData.price / Math.max(toCurrencyData.price, 0.00000001)
			: 0

	if (isLoadingSupported)
		return (
			<div className="flex items-center justify-center text-sm h-44 opacity-40">
				Updating crypto rates...
			</div>
		)

	return (
		<div className="flex flex-col w-full min-w-0 gap-3 p-1 select-none">
			<div className="relative flex flex-col min-w-0 gap-5 p-4 overflow-hidden border shadow-sm bg-base-100/85 border-base-300/60 rounded-3xl">
				<div className="absolute inset-x-0 top-0 h-24 pointer-events-none bg-linear-to-b from-primary/12 to-transparent" />

				<div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] gap-3 items-start">
					<div className="flex flex-col min-w-0 gap-2">
						<CryptoChip code={fromCurrency} icon={fromCurrencyData?.icon} name={fromCurrencyData?.name.en} />
						<TextInput
							type="number"
							value={amount.toString()}
							onChange={(value) => setAmount(Math.max(Number(value || 0), 0))}
							className="w-full min-w-0 text-[clamp(1.7rem,5vw,3rem)] font-black !bg-transparent border-none !p-0 focus:ring-0 text-content tracking-tight tabular-nums"
						/>
					</div>
					<SelectBox
						options={options}
						value={fromCurrency}
						onChange={setFromCurrency}
						className="!w-28 !h-12 !rounded-2xl !bg-base-200/90 border border-base-300 shadow-sm font-black text-xs"
					/>
				</div>

				<div className="relative flex items-center justify-center h-3 min-w-0">
					<div className="absolute inset-x-3 h-px bg-base-300/70" />
					<button
						onClick={handleSwap}
						className="relative z-10 flex items-center justify-center transition-all border rounded-full shadow-lg cursor-pointer bg-base-100 w-11 h-11 border-primary/20 text-content hover:text-primary active:scale-90 hover:scale-105"
					>
						<motion.div animate={{ rotate: isSwapping ? 180 : 0 }}>
							<TbArrowsUpDown size={20} />
						</motion.div>
					</button>
				</div>

				<div className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_7rem] gap-3 items-start">
					<div className="flex flex-col min-w-0 gap-2">
						<CryptoChip code={toCurrency} icon={toCurrencyData?.icon} name={toCurrencyData?.name.en} />
						<div className="w-full min-w-0 overflow-x-auto overflow-y-hidden text-[clamp(1.65rem,5vw,3rem)] font-black leading-tight whitespace-nowrap text-primary tabular-nums no-scrollbar">
							{formatCryptoValue(convertedAmount)}
						</div>
					</div>
					<SelectBox
						options={options}
						value={toCurrency}
						onChange={setToCurrency}
						className="!w-28 !h-12 !rounded-2xl !bg-base-200/90 border border-primary/20 shadow-sm font-black text-xs"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-2 px-1 mt-1 sm:grid-cols-2">
				<div className="flex items-center justify-between gap-3 p-3 border bg-content rounded-2xl border-content">
					<div className="min-w-0">
						<div className="text-[9px] font-black uppercase tracking-wider opacity-40">Reference</div>
						<div className="text-xs font-black truncate text-content">1 {fromCurrency}</div>
					</div>
					<div className="min-w-0 overflow-x-auto text-sm font-black text-right text-primary tabular-nums whitespace-nowrap no-scrollbar">
						{formatCryptoValue(pairRate)} {toCurrency}
					</div>
				</div>

				<div className="flex items-center justify-between gap-3 p-3 border bg-content rounded-2xl border-content">
					<div className="flex items-center min-w-0 gap-2">
						<TbTrendingUp size={16} className="text-primary shrink-0" />
						<div className="min-w-0">
							<div className="text-[9px] font-black uppercase tracking-wider opacity-40">USD price</div>
							<div className="text-xs font-black truncate text-content">{fromCurrency} / {toCurrency}</div>
						</div>
					</div>
					<div className="text-[11px] font-black text-right text-content tabular-nums shrink-0">
						<div>{fromCurrencyData ? formatUsd(fromCurrencyData.price) : '$0'}</div>
						<div className="opacity-50">{toCurrencyData ? formatUsd(toCurrencyData.price) : '$0'}</div>
					</div>
				</div>
			</div>

			<div className="flex items-start gap-1.5 px-2 text-[10px] font-semibold text-muted/80">
				<TbInfoCircle size={14} className="mt-px shrink-0" />
				<span>Live rates use the LiveDash backend when available and bundled crypto rates when offline.</span>
			</div>
		</div>
	)
}
