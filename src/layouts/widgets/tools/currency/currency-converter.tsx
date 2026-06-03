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
	const abs = Math.abs(value)
	if (abs >= 1_000_000_000) {
		return new Intl.NumberFormat('en-US', {
			notation: 'compact',
			maximumFractionDigits: 4,
		}).format(value)
	}
	return new Intl.NumberFormat('en-US', {
		maximumSignificantDigits: abs >= 1 ? 12 : 10,
		maximumFractionDigits: abs >= 100 ? 4 : abs >= 1 ? 8 : 10,
	}).format(value)
}

function formatUsd(value: number) {
	if (!Number.isFinite(value)) return '$0'
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6,
	}).format(value)
}

const cryptoTone: Record<string, string> = {
	BTC: 'from-orange-400 to-amber-700',
	ETH: 'from-indigo-300 to-blue-700',
	USDT: 'from-emerald-300 to-teal-700',
	BNB: 'from-yellow-300 to-amber-700',
	SOL: 'from-fuchsia-400 to-emerald-400',
	XRP: 'from-slate-300 to-slate-700',
	USDC: 'from-sky-300 to-blue-700',
	DOGE: 'from-yellow-300 to-yellow-700',
	ADA: 'from-blue-400 to-blue-900',
	TRX: 'from-red-400 to-rose-800',
	AVAX: 'from-red-300 to-red-700',
	LINK: 'from-blue-300 to-blue-800',
}

function CryptoIcon({ code }: { code: string }) {
	const tone = cryptoTone[code] || 'from-primary to-secondary'
	const label = code.length > 3 ? code.slice(0, 3) : code
	return (
		<div className={`flex items-center justify-center w-8 h-8 overflow-hidden rounded-full bg-gradient-to-br ${tone} shadow-sm ring-1 ring-white/25 shrink-0`}>
			<span className="text-[10px] font-black tracking-tight text-white drop-shadow-sm">
				{label}
			</span>
		</div>
	)
}

function CryptoChip({ code, name }: { code: string; icon?: string; name?: string }) {
	return (
		<div className="flex items-center gap-2 min-w-0">
			<CryptoIcon code={code} />
			<div className="min-w-0">
				<div className="text-xs font-black leading-tight text-content">{code}</div>
				{name && <div className="text-[9px] leading-tight truncate text-muted max-w-20">{name}</div>}
			</div>
		</div>
	)
}

function getOutputSize(label: string) {
	if (label.length > 22) return 'text-[1.05rem] md:text-[1.4rem]'
	if (label.length > 16) return 'text-[1.25rem] md:text-[1.9rem]'
	if (label.length > 11) return 'text-[1.55rem] md:text-[2.35rem]'
	return 'text-[2rem] md:text-[3rem]'
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
			(supportedCurrencies || []).map((c) => ({
				label: `${c.key} · ${c.label.en}`,
				value: c.key,
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
	const convertedLabel = formatCryptoValue(convertedAmount)

	if (isLoadingSupported)
		return (
			<div className="flex items-center justify-center text-sm h-44 opacity-40">
				Updating crypto rates...
			</div>
		)

	return (
		<div className="flex flex-col w-full gap-3 p-1 select-none">
			<div className="relative flex flex-col gap-5 p-4 overflow-hidden border shadow-sm bg-base-100/80 border-base-300/60 rounded-3xl">
				<div className="absolute inset-x-0 top-0 h-24 pointer-events-none bg-linear-to-b from-primary/10 to-transparent" />

				<div className="relative flex items-center justify-between gap-3">
					<div className="flex flex-col flex-1 min-w-0 gap-2">
						<CryptoChip code={fromCurrency} name={fromCurrencyData?.name.en} />
						<TextInput
							type="number"
							value={amount.toString()}
							onChange={(value) => setAmount(Math.max(Number(value || 0), 0))}
							className="w-full text-3xl md:text-4xl font-black !bg-transparent border-none !p-0 focus:ring-0 text-content tracking-tight"
						/>
					</div>
					<SelectBox
						options={options}
						value={fromCurrency}
						onChange={setFromCurrency}
						className="!w-36 !h-12 !rounded-2xl !bg-base-200/80 border border-base-300 shadow-sm font-bold text-xs"
					/>
				</div>

				<div className="relative flex items-center justify-center h-3">
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

				<div className="relative flex items-start justify-between gap-3">
					<div className="flex flex-col flex-1 min-w-0 gap-2">
						<CryptoChip code={toCurrency} name={toCurrencyData?.name.en} />
						<div className={`w-full max-w-full overflow-hidden whitespace-nowrap font-black leading-none text-primary tabular-nums ${getOutputSize(convertedLabel)}`} title={convertedLabel}>
							{convertedLabel}
						</div>
					</div>
					<SelectBox
						options={options}
						value={toCurrency}
						onChange={setToCurrency}
						className="!w-36 !h-12 !rounded-2xl !bg-base-200/80 border border-primary/20 shadow-sm font-bold text-xs"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-2 px-1 mt-1 sm:grid-cols-2">
				<div className="flex items-center justify-between p-3 border bg-content rounded-2xl border-content">
					<div>
						<div className="text-[9px] font-black uppercase tracking-wider opacity-40">Reference</div>
						<div className="text-xs font-black text-content">1 {fromCurrency}</div>
					</div>
					<div className="text-sm font-black text-right text-primary tabular-nums">
						{formatCryptoValue(pairRate)} {toCurrency}
					</div>
				</div>

				<div className="flex items-center justify-between p-3 border bg-content rounded-2xl border-content">
					<div className="flex items-center gap-2">
						<TbTrendingUp size={16} className="text-primary" />
						<div>
							<div className="text-[9px] font-black uppercase tracking-wider opacity-40">USD price</div>
							<div className="text-xs font-black text-content">{fromCurrency} / {toCurrency}</div>
						</div>
					</div>
					<div className="text-[11px] font-black text-right text-content tabular-nums">
						<div>{fromCurrencyData ? formatUsd(fromCurrencyData.price) : '$0'}</div>
						<div className="opacity-50">{toCurrencyData ? formatUsd(toCurrencyData.price) : '$0'}</div>
					</div>
				</div>
			</div>

			<div className="flex items-start gap-1.5 px-2 text-[10px] font-semibold text-muted/80">
				<TbInfoCircle size={14} className="mt-px shrink-0" />
				<span>Live rates use the LiveDash backend when available and a bundled crypto fallback when offline.</span>
			</div>
		</div>
	)
}
