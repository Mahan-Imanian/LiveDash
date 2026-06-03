import type React from 'react'
import type { FetchedCurrency } from '@/services/hooks/currency/getCurrencyByCode.hook'

export interface GetPriceResult {
	price: number
	label: string | React.ReactNode
}

function formatUsd(value: number) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: value >= 1 ? 2 : 4,
		maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6,
	}).format(value)
}

export function GetPrice(_code: string, currency: FetchedCurrency): GetPriceResult {
	return {
		price: currency.price,
		label: formatUsd(currency.price),
	}
}
