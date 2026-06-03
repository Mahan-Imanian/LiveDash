import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFromStorage } from '@/common/storage'
import { getMainClient } from '@/services/api'

export interface TrendItem {
	title: string
	searchCount: string
}

export interface RecommendedSubSite {
	name: string
	url: string | null
	icon: string
	priority: number
}

export interface RecommendedSite {
	name: string
	title: string
	url: string | null
	icon: string
	priority: number
	subSites?: RecommendedSubSite[]
}

export interface SearchBoxResponse {
	trends: TrendItem[]
	recommendedSites: RecommendedSite[]
}

async function fetchTrends(region = 'US', limit = 10): Promise<SearchBoxResponse> {
	const client = await getMainClient()

	try {
		const response = await client.get<SearchBoxResponse>('/extension/searchbox', {
			params: {
				region,
				limit,
			},
		})
		return response.data
	} catch {
		return {
			trends: [],
			recommendedSites: [
				{ name: 'Google', title: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/s2/favicons?domain=google.com&sz=64', priority: 1 },
				{ name: 'ChatGPT', title: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=64', priority: 2 },
				{ name: 'Gmail', title: 'Gmail', url: 'https://mail.google.com', icon: 'https://www.google.com/s2/favicons?domain=gmail.com&sz=64', priority: 3 },
				{ name: 'WhatsApp', title: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '/live-assets/social/whatsapp.svg', priority: 4 },
			],
		}
	}
}

export function useGetTrends(
	options: {
		region?: string
		limit?: number
		refetchInterval?: number | null
		enabled?: boolean
	} = {}
) {
	const [initialData, setInitialData] = useState<any>(undefined)

	useEffect(() => {
		;(async () => {
			const stored = await getFromStorage('recommended_sites')
			if (stored?.length) {
				setInitialData({
					recommendedSites: stored,
					trends: [],
				})
			}
		})()
	}, [])

	const { region = 'US', limit = 10, refetchInterval = null, enabled = true } = options
	return useQuery<SearchBoxResponse>({
		queryKey: ['getTrends', region, limit],
		queryFn: () => fetchTrends(region, limit),
		refetchInterval: refetchInterval || false,
		enabled,
		initialData,
	})
}
