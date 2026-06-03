import { motion } from 'framer-motion'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { TbArrowsUpDown, TbInfoCircle, TbTrendingUp } from 'react-icons/tb'
import { SelectBox } from '@/components/selectbox/selectbox'
import { useGetCurrencyByCode } from '@/services/hooks/currency/getCurrencyByCode.hook'
import { useGetSupportCurrencies } from '@/services/hooks/currency/getSupportCurrencies.hook'

function formatCryptoValue(value: number) {
	if (!Number.isFinite(value) || value === 0) return '0'
	const abs = Math.abs(value)
	if (abs >= 1_000_000) {
		return new Intl.NumberFormat('en-US', {
			notation: 'compact',
			maximumFractionDigits: 3,
		}).format(value)
	}
	if (abs >= 1000) {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 3,
		}).format(value)
	}
	if (abs >= 1) {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 5,
		}).format(value)
	}
	return new Intl.NumberFormat('en-US', {
		maximumSignificantDigits: 6,
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

function CryptoIcon({ code, icon }: { code: string; icon?: string }) {
	return (
		<div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-base-100/90 shadow-[0_8px_18px_rgba(0,0,0,0.18)] ring-1 ring-white/20">
			{icon ? (
				<img
					src={icon}
					alt={code}
					className="h-7 w-7 object-contain"
					loading="lazy"
					onError={(event) => {
						event.currentTarget.style.display = 'none'
					}}
				/>
			) : (
				<span className="text-[10px] font-black text-primary">{code.slice(0, 3)}</span>
			)}
		</div>
	)
}

function CurrencyPanel({
	label,
	code,
	name,
	icon,
	options,
	onChange,
	children,
}: {
	label: string
	code: string
	name?: string
	icon?: string
	options: Array<{ label: string; value: string }>
	onChange: (value: string) => void
	children: React.ReactNode
}) {
	return (
		<div className="min-w-0 rounded-[1.45rem] border border-white/8 bg-[#11131c]/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
			<div className="flex min-w-0 items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2.5">
					<CryptoIcon code={code} icon={icon} />
					<div className="min-w-0">
						<div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/55">
							{label}
						</div>
						<div className="mt-1 flex min-w-0 items-baseline gap-1.5">
							<span className="text-sm font-black leading-none text-white">{code}</span>
							{name && <span className="max-w-[5.8rem] truncate text-[9px] font-bold text-white/38">{name}</span>}
						</div>
					</div>
				</div>
				<SelectBox
					options={options}
					value={code}
					onChange={onChange}
					className="!h-9 !w-[5.2rem] !rounded-2xl !border-white/6 !bg-black/28 !text-xs !font-black text-white"
				/>
			</div>
			{children}
		</div>
	)
}

export const CurrencyConverter: React.FC = () => {
	const [fromCurrency, setFromCurrency] = useState<string>('BTC')
	const [toCurrency, setToCurrency] = useState<string>('ETH')
	const [amountText, setAmountText] = useState<string>('1')
	const [convertedAmount, setConvertedAmount] = useState<number>(0)
	const [isSwapping, setIsSwapping] = useState<boolean>(false)

	const { data: supportedCurrencies, isLoading: isLoadingSupported } = useGetSupportCurrencies()
	const { data: fromCurrencyData } = useGetCurrencyByCode(fromCurrency, { refetchInterval: null })
	const { data: toCurrencyData } = useGetCurrencyByCode(toCurrency, { refetchInterval: null })

	const options = useMemo(
		() =>
			(supportedCurrencies || []).map((currency) => ({
				label: currency.key,
				value: currency.key,
			})),
		[supportedCurrencies]
	)

	const amount = Number(amountText || 0)

	useEffect(() => {
		if (fromCurrencyData && toCurrencyData && Number.isFinite(amount) && amount >= 0) {
			setConvertedAmount((amount * fromCurrencyData.price) / Math.max(toCurrencyData.price, 0.00000001))
		}
	}, [fromCurrencyData, toCurrencyData, amount])

	const handleSwap = () => {
		setIsSwapping(true)
		setFromCurrency(toCurrency)
		setToCurrency(fromCurrency)
		setTimeout(() => setIsSwapping(false), 260)
	}

	const pairRate =
		fromCurrencyData && toCurrencyData
			? fromCurrencyData.price / Math.max(toCurrencyData.price, 0.00000001)
			: 0

	if (isLoadingSupported) {
		return <div className="flex h-44 items-center justify-center text-sm opacity-40">Updating crypto rates...</div>
	}

	return (
		<div className="flex h-[17.2rem] w-full min-w-0 flex-col gap-2 overflow-hidden p-1 select-none" dir="ltr">
			<div className="relative flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#080a11]/88 p-2 shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
				<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-primary/18 to-transparent" />

				<CurrencyPanel
					label="From"
					code={fromCurrency}
					icon={fromCurrencyData?.icon}
					name={fromCurrencyData?.name.en}
					options={options}
					onChange={setFromCurrency}
				>
					<input
						type="number"
						min="0"
						value={amountText}
						onChange={(event) => setAmountText(event.target.value)}
						className="mt-2 h-9 w-full min-w-0 bg-transparent text-[clamp(1.65rem,9vw,2.55rem)] font-black leading-none tracking-tight text-white outline-none tabular-nums placeholder:text-white/20"
						placeholder="0"
					/>
				</CurrencyPanel>

				<div className="relative flex h-7 shrink-0 items-center justify-center">
					<div className="absolute inset-x-6 h-px bg-white/8" />
					<button
						onClick={handleSwap}
						className="relative z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-primary/35 bg-[#11131c] text-white shadow-lg transition-all hover:scale-105 hover:text-primary active:scale-90"
					>
						<motion.div animate={{ rotate: isSwapping ? 180 : 0 }}>
							<TbArrowsUpDown size={18} />
						</motion.div>
					</button>
				</div>

				<CurrencyPanel
					label="To"
					code={toCurrency}
					icon={toCurrencyData?.icon}
					name={toCurrencyData?.name.en}
					options={options}
					onChange={setToCurrency}
				>
					<div className="mt-2 flex h-9 w-full min-w-0 items-center">
						<div className="w-full min-w-0 whitespace-nowrap text-[clamp(1.45rem,8vw,2.35rem)] font-black leading-none tracking-tight text-primary tabular-nums">
							{formatCryptoValue(convertedAmount)}
						</div>
					</div>
				</CurrencyPanel>
			</div>

			<div className="grid h-14 shrink-0 grid-cols-2 gap-2">
				<div className="min-w-0 rounded-2xl border border-white/8 bg-[#11131c]/88 p-2">
					<div className="text-[8px] font-black uppercase tracking-wider text-white/35">Reference</div>
					<div className="mt-1 min-w-0 text-[11px] font-black text-primary tabular-nums">
						1 {fromCurrency} = {formatCryptoValue(pairRate)} {toCurrency}
					</div>
				</div>

				<div className="min-w-0 rounded-2xl border border-white/8 bg-[#11131c]/88 p-2">
					<div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-white/35">
						<TbTrendingUp size={12} className="text-primary" /> USD price
					</div>
					<div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-black text-white/85 tabular-nums">
						<span>{formatUsd(fromCurrencyData?.price ?? 0)}</span>
						<span className="text-white/45">{formatUsd(toCurrencyData?.price ?? 0)}</span>
					</div>
				</div>
			</div>

			<div className="flex h-5 shrink-0 items-center gap-1.5 px-2 text-[9px] font-semibold text-muted/70">
				<TbInfoCircle size={12} className="shrink-0" />
				<span className="truncate">Rates use LiveDash Cloud with offline crypto fallback.</span>
			</div>
		</div>
	)
}
