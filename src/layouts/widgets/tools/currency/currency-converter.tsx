import { motion } from 'framer-motion'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { TbArrowsUpDown, TbInfoCircle, TbTrendingUp } from 'react-icons/tb'
import { SelectBox } from '@/components/selectbox/selectbox'
import { useGetCurrencyByCode } from '@/services/hooks/currency/getCurrencyByCode.hook'
import { useGetSupportCurrencies } from '@/services/hooks/currency/getSupportCurrencies.hook'

function formatCryptoValue(value: number) {
	if (!Number.isFinite(value)) return '0'
	if (value === 0) return '0'
	const abs = Math.abs(value)
	if (abs >= 1_000_000) {
		return new Intl.NumberFormat('en-US', {
			notation: 'compact',
			maximumFractionDigits: 4,
		}).format(value)
	}
	if (abs >= 1) {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: abs >= 1000 ? 2 : 6,
		}).format(value)
	}
	return Number(value.toPrecision(8)).toString()
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
	return icon ? (
		<img
			src={icon}
			alt=""
			className="object-contain w-8 h-8 shrink-0"
			loading="lazy"
		/>
	) : (
		<div className="flex items-center justify-center w-8 h-8 text-[10px] font-black text-white rounded-full bg-primary shrink-0">
			{code.slice(0, 2)}
		</div>
	)
}

function CurrencyRow({
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
		<div className="min-w-0 rounded-3xl border border-base-300/70 bg-base-100/90 p-3 shadow-sm">
			<div className="mb-2 flex min-w-0 items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<CryptoIcon code={code} icon={icon} />
					<div className="min-w-0 leading-none">
						<div className="text-[9px] font-black uppercase tracking-[0.18em] text-muted/70">
							{label}
						</div>
						<div className="mt-1 flex min-w-0 items-baseline gap-1.5">
							<span className="text-sm font-black text-content">{code}</span>
							{name && (
								<span className="max-w-28 truncate text-[10px] font-bold text-muted">
									{name}
								</span>
							)}
						</div>
					</div>
				</div>
				<SelectBox
					options={options}
					value={code}
					onChange={onChange}
					className="!h-10 !w-[6.2rem] !rounded-2xl !bg-base-200/95 !text-xs !font-black text-content border border-base-300/80"
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

	const amount = Number(amountText || 0)

	useEffect(() => {
		if (fromCurrencyData && toCurrencyData && Number.isFinite(amount) && amount >= 0) {
			const converted =
				(amount * fromCurrencyData.price) /
				Math.max(toCurrencyData.price, 0.00000001)
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
			<div className="flex h-44 items-center justify-center text-sm opacity-40">
				Updating crypto rates...
			</div>
		)

	return (
		<div className="flex w-full min-w-0 flex-col gap-3 p-1 select-none" dir="ltr">
			<div className="relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-[1.7rem] border border-base-300/70 bg-content/80 p-2 shadow-sm">
				<div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-primary/12 to-transparent" />

				<CurrencyRow
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
						className="h-11 w-full min-w-0 bg-transparent px-0 text-[clamp(1.6rem,7vw,2.6rem)] font-black leading-none tracking-tight text-content outline-none tabular-nums placeholder:text-muted/40"
						placeholder="0"
					/>
				</CurrencyRow>

				<div className="relative flex h-8 items-center justify-center">
					<div className="absolute inset-x-5 h-px bg-base-300/80" />
					<button
						onClick={handleSwap}
						className="relative z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-base-100 text-content shadow-lg transition-all hover:scale-105 hover:text-primary active:scale-90"
					>
						<motion.div animate={{ rotate: isSwapping ? 180 : 0 }}>
							<TbArrowsUpDown size={19} />
						</motion.div>
					</button>
				</div>

				<CurrencyRow
					label="To"
					code={toCurrency}
					icon={toCurrencyData?.icon}
					name={toCurrencyData?.name.en}
					options={options}
					onChange={setToCurrency}
				>
					<div className="flex h-11 w-full min-w-0 items-center overflow-hidden">
						<div className="w-full min-w-0 truncate text-[clamp(1.25rem,6vw,2.35rem)] font-black leading-none tracking-tight text-primary tabular-nums">
							{formatCryptoValue(convertedAmount)}
						</div>
					</div>
				</CurrencyRow>
			</div>

			<div className="grid grid-cols-1 gap-2 px-0.5 sm:grid-cols-2">
				<div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-content bg-content p-3">
					<div className="min-w-0">
						<div className="text-[9px] font-black uppercase tracking-wider opacity-40">
							Reference
						</div>
						<div className="truncate text-xs font-black text-content">1 {fromCurrency}</div>
					</div>
					<div className="min-w-0 truncate text-right text-sm font-black text-primary tabular-nums">
						{formatCryptoValue(pairRate)} {toCurrency}
					</div>
				</div>

				<div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-content bg-content p-3">
					<div className="flex min-w-0 items-center gap-2">
						<TbTrendingUp size={16} className="shrink-0 text-primary" />
						<div className="min-w-0">
							<div className="text-[9px] font-black uppercase tracking-wider opacity-40">
								USD price
							</div>
							<div className="truncate text-xs font-black text-content">
								{fromCurrency} / {toCurrency}
							</div>
						</div>
					</div>
					<div className="shrink-0 text-right text-[11px] font-black text-content tabular-nums">
						<div>{fromCurrencyData ? formatUsd(fromCurrencyData.price) : '$0'}</div>
						<div className="opacity-50">{toCurrencyData ? formatUsd(toCurrencyData.price) : '$0'}</div>
					</div>
				</div>
			</div>

			<div className="flex items-start gap-1.5 px-2 text-[10px] font-semibold text-muted/80">
				<TbInfoCircle size={14} className="mt-px shrink-0" />
				<span>Rates use LiveDash Cloud when available and bundled crypto rates offline.</span>
			</div>
		</div>
	)
}
