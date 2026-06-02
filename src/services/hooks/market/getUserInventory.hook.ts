import { useQuery } from '@tanstack/react-query'
import { getMainClient } from '@/services/api'
import { localUserInventory } from '@/services/local/market'
import type { MarketQueryParams, UserInventoryResponse } from './market.interface'

export const useGetUserInventory = (enabled: boolean, params?: MarketQueryParams) => {
	return useQuery<UserInventoryResponse>({
		queryKey: ['getUserInventory', params],
		queryFn: async () => getUserInventory(params),
		retry: 0,
		enabled,
	})
}

export async function getUserInventory(
	params?: MarketQueryParams
): Promise<UserInventoryResponse> {
	try {
		const client = await getMainClient()
		const searchParams = new URLSearchParams()

		if (params?.page) searchParams.append('page', params.page.toString())
		if (params?.limit) searchParams.append('limit', params.limit.toString())
		if (params?.type) searchParams.append('type', params.type)

		const { data } = await client.get(
			`/market/@me/inventory?${searchParams.toString()}`
		)
		return data
	} catch {
		return localUserInventory
	}
}
