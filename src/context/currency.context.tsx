import React, { createContext, useEffect, useState } from 'react'
import { getFromStorage, setToStorage } from '@/common/storage'
import { listenEvent } from '@/common/utils/call-event'
import { defaultCryptoCurrencies, localSupportedCryptos } from '@/services/local/cryptoRates'

export interface StoreContext {
	selectedCurrencies: Array<string>
	setSelectedCurrencies: (currencies: Array<string>) => void
	currencyColorMode: CurrencyColorMode | null
	setCurrencyColorMode: (mode: CurrencyColorMode) => void
	reorderCurrencies: (currencies: Array<string>) => void
}

export enum CurrencyColorMode {
	NORMAL = 'NORMAL',
	X = 'X',
}

export const currencyContext = createContext<StoreContext>({
	selectedCurrencies: [],
	setSelectedCurrencies: () => {},
	currencyColorMode: null,
	setCurrencyColorMode: () => {},
	reorderCurrencies: () => {},
})

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [selectedCurrencies, setSelectedCurrencies] = useState<string[] | null>(null)
	const [currencyColorMode, setCurrencyColorMode] = useState<CurrencyColorMode | null>(
		null
	)

	useEffect(() => {
		async function load() {
			const [storedCurrencies, currencyColorMode] = await Promise.all([
				getFromStorage('currencies'),
				getFromStorage('currencyColorMode'),
			])
			const cleanCurrencies = Array.isArray(storedCurrencies)
				? storedCurrencies.filter((code) => localSupportedCryptos.some((crypto) => crypto.key === code))
				: []
			setSelectedCurrencies(cleanCurrencies.length ? cleanCurrencies : defaultCryptoCurrencies)
			setCurrencyColorMode(currencyColorMode || CurrencyColorMode.NORMAL)
		}

		const listen = listenEvent(
			'currencies_updated',
			(data: { currencies: string[]; colorMode: CurrencyColorMode }) => {
				setSelectedCurrencies(data.currencies)
				setCurrencyColorMode(data.colorMode)
			}
		)

		load()
		return () => {
			listen()
		}
	}, [])

	useEffect(() => {
		async function save() {
			await setToStorage('currencies', selectedCurrencies || [])
		}
		if (Array.isArray(selectedCurrencies)) save()
	}, [selectedCurrencies])

	useEffect(() => {
		async function save() {
			if (currencyColorMode) {
				await setToStorage('currencyColorMode', currencyColorMode)
			}
		}

		save()
	}, [currencyColorMode])

	const reorderCurrencies = (currencies: Array<string>) => {
		setSelectedCurrencies(currencies)
	}

	return (
		<currencyContext.Provider
			value={{
				selectedCurrencies: selectedCurrencies ?? [],
				setSelectedCurrencies,
				setCurrencyColorMode,
				currencyColorMode,
				reorderCurrencies,
			}}
		>
			{children}
		</currencyContext.Provider>
	)
}

export function useCurrencyStore(): StoreContext {
	const context = React.useContext(currencyContext)
	if (!context) {
		throw new Error('useStore must be used within a StoreProvider')
	}

	return context
}
