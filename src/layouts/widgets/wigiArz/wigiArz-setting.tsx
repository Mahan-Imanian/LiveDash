import { useState, useEffect } from 'react'
import Analytics from '@/analytics'
import { getFromStorage } from '@/common/storage'
import { defaultCryptoCurrencies, localSupportedCryptos } from '@/services/local/cryptoRates'
import { callEvent } from '@/common/utils/call-event'
import { AuthRequiredModal } from '@/components/auth/AuthRequiredModal'
import { ItemSelector } from '@/components/item-selector'
import { SectionPanel } from '@/components/section-panel'
import { SelectBox } from '@/components/selectbox/selectbox'
import { TextInput } from '@/components/text-input'
import { useAuth } from '@/context/auth.context'
import { CurrencyColorMode } from '@/context/currency.context'
import { WidgetSettingWrapper } from '@/layouts/widgets-settings/widget-settings-wrapper'
import { useGetSupportCurrencies } from '@/services/hooks/currency/getSupportCurrencies.hook'
import { CurrenciesType, type SupportedCurrencies } from './wigiArz-setting.interface'

export function WigiArzSetting() {
	const { data: supportCurrencies } = useGetSupportCurrencies()
	const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([])
	const [currencyColorMode, setCurrencyColorMode] = useState<CurrencyColorMode>(
		CurrencyColorMode.NORMAL
	)
	const [currencyType, setCurrencyType] = useState<string>(CurrenciesType.CRYPTO)
	const [searchQuery, setSearchQuery] = useState('')
	const { isAuthenticated } = useAuth()
	const [showAuthRequired, setShowAuthRequired] = useState(false)

	const toggleCurrency = (currencyKey: string) => {
		const isRemoving = selectedCurrencies.includes(currencyKey)
		const modifiedCurrencySelection = isRemoving
			? selectedCurrencies.filter((key) => key !== currencyKey)
			: [...selectedCurrencies, currencyKey]

		Analytics.event('currency_selection', {
			currency_key: currencyKey,
			action: isRemoving ? 'remove' : 'add',
		})

		if (modifiedCurrencySelection.length > 4 && !isAuthenticated) {
			setShowAuthRequired(true)
			Analytics.event('currency_selection_blocked')
			return
		}

		callEvent('currencies_updated', {
			currencies: modifiedCurrencySelection,
			colorMode: currencyColorMode,
		})
		setSelectedCurrencies(modifiedCurrencySelection)
	}

	const toggleCurrencyColorMode = (mode: CurrencyColorMode) => {
		Analytics.event('currency_color_mode_changed', {
			mode,
		})

		callEvent('currencies_updated', {
			currencies: selectedCurrencies,
			colorMode: mode,
		})

		setCurrencyColorMode(mode)
	}

	const currencyGroups = getCurrencyOptions(
		supportCurrencies.filter((currency) =>
			currencyType !== 'all' ? currency.type === currencyType : true
		)
	)
	const filteredGroups = currencyGroups
		.map((group) => ({
			...group,
			options: group.options.filter((option) =>
				option.label.toLowerCase().includes(searchQuery.toLowerCase())
			),
		}))
		.filter((group) => group.options.length > 0)

	useEffect(() => {
		async function load() {
			const [color, currencies] = await Promise.all([
				getFromStorage('currencyColorMode'),
				getFromStorage('currencies'),
			])

			if (color) {
				setCurrencyColorMode(color)
			}
			const cleanCurrencies = Array.isArray(currencies)
				? currencies.filter((code) => localSupportedCryptos.some((crypto) => crypto.key === code))
				: []
			setSelectedCurrencies(cleanCurrencies.length ? cleanCurrencies : defaultCryptoCurrencies)
		}

		load()
	}, [])

	return (
		<WidgetSettingWrapper>
			<div className={`transition-all duration-300 ease-out`}>
				<SectionPanel title="Price-change color" size="xs">
					<div className="flex flex-row gap-2">
						<ItemSelector
							label="Normal"
							isActive={currencyColorMode === CurrencyColorMode.NORMAL}
							className="w-full"
							onClick={() =>
								toggleCurrencyColorMode(CurrencyColorMode.NORMAL)
							}
						/>
						<ItemSelector
							label="Reverse"
							isActive={currencyColorMode === CurrencyColorMode.X}
							className="w-full"
							onClick={() => toggleCurrencyColorMode(CurrencyColorMode.X)}
						/>
					</div>
				</SectionPanel>

				<SectionPanel title="Currencies" size="xs">
					<div className="flex flex-col gap-1 mb-2">
						<TextInput
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e)}
							placeholder="Search ..."
						/>
						<SelectBox
							options={[
								{ value: CurrenciesType.CRYPTO, label: 'Cryptocurrencies' },
							]}
							value={currencyType as any}
							onChange={(value) => setCurrencyType(value)}
						/>
					</div>

					<div
						className={`px-2 pr-1 overflow-x-hidden overflow-y-auto min-h-64 max-h-64 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent transition-opacity duration-300 ease-out`}
					>
						{filteredGroups.map((group, groupIndex) => (
							<div
								key={groupIndex}
								className={`mb-6 transition-all duration-200 ease-out`}
							>
								<h3
									className={
										'text-sm font-medium mb-3 currency-group-heading'
									}
								>
									{group.label}
								</h3>
								<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
									{group.options.map((option) => {
										const isSelected = selectedCurrencies.includes(
											option.value
										)

										return (
											<div
												key={option.value}
												className={`flex shadow flex-col items-center justify-center gap-1 p-3 border cursor-pointer rounded-2xl 
														transition-all duration-200 ease-out active:scale-98 hover:scale-95
														${isSelected ? 'currency-box-selected border-primary/30 bg-primary/15 text-content' : 'border-base-300/40 bg-content hover:!bg-primary/15'}
													  `}
												onClick={() =>
													toggleCurrency(option.value)
												}
											>
												<div
													className={`font-normal ${isSelected ? 'font-medium' : ''}`}
												>
													{option.label}
												</div>
												<div
													className={`text-xs font-light opacity-70 ${isSelected ? 'opacity-90' : ''}`}
												>
													{option.value}
												</div>
											</div>
										)
									})}
								</div>
							</div>
						))}
					</div>
				</SectionPanel>
			</div>

			{showAuthRequired && (
				<AuthRequiredModal
					message="Guests can select a limited number of currencies to keep performance stable. Sign in to access more currencies and full services."
					title="🔐 Sign in"
					isOpen={showAuthRequired}
					onClose={() => setShowAuthRequired(false)}
				/>
			)}
		</WidgetSettingWrapper>
	)
}

interface Option {
	label: string
	options: {
		value: string
		label: string
	}[]
}
function getCurrencyOptions(supported: SupportedCurrencies): Option[] {
	const keys = Object.keys(supported)

	const isCrypto = keys
		.map((key) => Number(key))
		.filter((index) => supported[index].type === 'crypto')

	return [
		{
			label: '🪙 Popular cryptocurrencies',
			options: isCrypto.map((index) => ({
				value: supported[index].key,
				label: supported[index].label.en || supported[index].label.fa,
				labelEn: supported[index].key,
			})),
		},
	]
}
