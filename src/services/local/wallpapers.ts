import type { Category, WallpaperResponse } from '@/common/wallpaper.interface'

export const localWallpaperCategories: Category[] = [
	{
		id: 'local-gradients',
		name: 'Signature gradients',
		slug: 'signature-gradients',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
]

export const localWallpapers: WallpaperResponse = {
	totalPages: 1,
	wallpapers: [
		{
			id: 'aurora-blue',
			name: 'Aurora Blue',
			type: 'IMAGE',
			src: '/live-assets/wallpapers/aurora-blue.svg',
			previewSrc: '/live-assets/wallpapers/aurora-blue.svg',
			isOwned: true,
			categoryId: 'local-gradients',
		},
		{
			id: 'midnight-orbit',
			name: 'Midnight Orbit',
			type: 'IMAGE',
			src: '/live-assets/wallpapers/midnight-orbit.svg',
			previewSrc: '/live-assets/wallpapers/midnight-orbit.svg',
			isOwned: true,
			categoryId: 'local-gradients',
		},
		{
			id: 'glass-sunrise',
			name: 'Glass Sunrise',
			type: 'IMAGE',
			src: '/live-assets/wallpapers/glass-sunrise.svg',
			previewSrc: '/live-assets/wallpapers/glass-sunrise.svg',
			isOwned: true,
			categoryId: 'local-gradients',
		},
		{
			id: 'northern-grid',
			name: 'Northern Grid',
			type: 'IMAGE',
			src: '/live-assets/wallpapers/northern-grid.svg',
			previewSrc: '/live-assets/wallpapers/northern-grid.svg',
			isOwned: true,
			categoryId: 'local-gradients',
		},
	],
}
