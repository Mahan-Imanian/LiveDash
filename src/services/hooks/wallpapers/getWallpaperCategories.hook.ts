import { useQuery } from '@tanstack/react-query'
import type { Category, Wallpaper, WallpaperResponse } from '@/common/wallpaper.interface'
import { getMainClient } from '@/services/api'
import { localWallpaperCategories, localWallpapers } from '@/services/local/wallpapers'

export const useGetWallpaperCategories = () => {
	return useQuery<Category[]>({
		queryKey: ['getWallpaperCategories'],
		queryFn: async () => getWallpaperCategories(),
		retry: 0,
		initialData: localWallpaperCategories,
	})
}

interface CategoryResponse {
	categories: Category[]
	totalPages: number
}

interface GetCategoriesQuery {
	page?: number
	limit?: number
}

export const useGetWallpaperCategoriesPaginated = (
	q: GetCategoriesQuery,
	enabled: boolean = true
) => {
	const queryParams = new URLSearchParams()

	if (q.page) {
		queryParams.append('page', String(q.page))
	}
	if (q.limit) {
		queryParams.append('limit', String(q.limit))
	}

	const endpoint = `/wallpapers/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

	return useQuery<CategoryResponse>({
		queryKey: ['getWallpaperCategoriesPaginated', queryParams.toString()],
		queryFn: async () => {
			try {
				const client = await getMainClient()
				const { data } = await client.get<CategoryResponse>(endpoint)
				return data
			} catch {
				return { categories: localWallpaperCategories, totalPages: 1 }
			}
		},
		retry: 0,
		enabled: enabled,
		staleTime: 1000 * 60 * 5,
		initialData: { categories: localWallpaperCategories, totalPages: 1 },
	})
}

async function getWallpaperCategories(): Promise<Category[]> {
	try {
		const client = await getMainClient()
		const { data } = await client.get<Category[]>('/wallpapers/categories')
		return data
	} catch {
		return localWallpaperCategories
	}
}

interface GetWallpaperQuery {
	market?: boolean
	page?: number
	limit?: number
	categoryId?: string
}
export const useGetWallpapers = (q: GetWallpaperQuery, enabled: boolean) => {
	const queryParams = new URLSearchParams()

	if (q.categoryId) {
		queryParams.append('categoryId', q.categoryId)
	}
	if (q.market) {
		queryParams.append('market', String(q.market))
	}
	if (q.page) {
		queryParams.append('page', String(q.page))
	}
	if (q.limit) {
		queryParams.append('limit', String(q.limit))
	}

	const endpoint = `/wallpapers?${queryParams.toString()}`

	return useQuery<WallpaperResponse>({
		queryKey: ['getWallpapers', queryParams.toString()],
		queryFn: async () => {
			try {
				const client = await getMainClient()
				const { data } = await client.get<WallpaperResponse>(endpoint)
				return data
			} catch {
				return localWallpapers
			}
		},
		retry: 0,
		enabled: enabled,
		staleTime: 1000 * 60 * 5,
		initialData: localWallpapers,
	})
}

export async function getRandomWallpaper(): Promise<Wallpaper | null> {
	try {
		const client = await getMainClient()
		const { data } = await client.get<WallpaperResponse>('/wallpapers?random=true')
		return data.wallpapers[0]
	} catch {
		return localWallpapers.wallpapers[0] || null
	}
}
