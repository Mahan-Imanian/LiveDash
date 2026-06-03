import type { FetchedCurrency } from '@/services/hooks/currency/getCurrencyByCode.hook'
import type { SupportedCurrencies } from '@/services/hooks/currency/getSupportCurrencies.hook'

type CryptoMeta = {
	key: string
	name: string
	price: number
	eur: number
	change: number
}

export const localCryptoMeta: CryptoMeta[] = [
	{ key: 'BTC', name: 'Bitcoin', price: 68420, eur: 62980, change: 1.8 },
	{ key: 'ETH', name: 'Ethereum', price: 3720, eur: 3425, change: 1.2 },
	{ key: 'USDT', name: 'Tether', price: 1, eur: 0.92, change: 0.01 },
	{ key: 'BNB', name: 'BNB', price: 612, eur: 563, change: 0.7 },
	{ key: 'SOL', name: 'Solana', price: 164, eur: 151, change: -0.4 },
	{ key: 'XRP', name: 'XRP', price: 0.62, eur: 0.57, change: 0.9 },
	{ key: 'USDC', name: 'USD Coin', price: 1, eur: 0.92, change: 0.02 },
	{ key: 'DOGE', name: 'Dogecoin', price: 0.16, eur: 0.15, change: 1.4 },
	{ key: 'ADA', name: 'Cardano', price: 0.48, eur: 0.44, change: -0.6 },
	{ key: 'TRX', name: 'TRON', price: 0.12, eur: 0.11, change: 0.3 },
	{ key: 'AVAX', name: 'Avalanche', price: 37.5, eur: 34.5, change: 1.1 },
	{ key: 'LINK', name: 'Chainlink', price: 17.2, eur: 15.8, change: 0.5 },
]

export const defaultCryptoCurrencies = ['BTC', 'ETH', 'SOL', 'BNB']

export const localSupportedCryptos: SupportedCurrencies = localCryptoMeta.map((item) => ({
	key: item.key,
	type: 'crypto',
	country: 'Global',
	label: {
		fa: item.name,
		en: item.name,
	},
	changePercentage: item.change,
}))

export function getLocalCryptoCurrency(code: string): FetchedCurrency {
	const normalized = code.toUpperCase()
	const item = localCryptoMeta.find((crypto) => crypto.key === normalized) || localCryptoMeta[0]
	const now = Date.now()
	const priceHistory = Array.from({ length: 14 }, (_, index) => {
		const dayOffset = 13 - index
		const wave = Math.sin(index * 0.9) * 0.018
		const drift = (index - 6) * 0.002
		return {
			price: Number((item.price * (1 + wave + drift)).toFixed(item.price < 2 ? 4 : 2)),
			createdAt: new Date(now - dayOffset * 86400000).toISOString().slice(0, 10),
		}
	})

	return {
		name: {
			fa: item.name,
			en: item.name,
		},
		icon: `/live-assets/crypto/${item.key.toLowerCase()}.svg`,
		price: item.price,
		rialPrice: item.eur,
		changePercentage: item.change,
		priceHistory,
		type: 'crypto',
		url: null,
		useDollar: true,
		isSponsored: false,
	}
}
