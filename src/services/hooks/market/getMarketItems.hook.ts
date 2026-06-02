import { useQuery } from '@tanstack/react-query'
import { getMainClient } from '@/services/api'
import { localMarketItems } from '@/services/local/market'
import type { MarketQueryParams, MarketResponse } from './market.interface'

export const useGetMarketItems = (enabled: boolean, params?: MarketQueryParams) => {
	return useQuery<MarketResponse>({
		queryKey: ['getMarketItems', params],
		queryFn: async () => getMarketItems(params),
		retry: 0,
		enabled,
	})
}

export async function getMarketItems(
	params?: MarketQueryParams
): Promise<MarketResponse> {
	try {
		const client = await getMainClient()
		const searchParams = new URLSearchParams()

		if (params?.page) searchParams.append('page', params.page.toString())
		if (params?.limit) searchParams.append('limit', params.limit.toString())
		if (params?.type) searchParams.append('type', params.type)

		const { data } = await client.get<MarketResponse>(
			`/market?${searchParams.toString()}`
		)
		return data
	} catch {
		return localMarketItems
	}
}
