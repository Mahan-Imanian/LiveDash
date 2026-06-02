import type { Wallpaper } from '@/common/wallpaper.interface'
import Analytics from '../../../../../analytics'

const MAX_FILE_SIZE = 6 * 1024 * 1024 // 6MB

interface UseWallpaperUploadProps {
	onWallpaperChange: (wallpaper: Wallpaper) => void
}

export function useWallpaperUpload({ onWallpaperChange }: UseWallpaperUploadProps) {
	const processFile = (file: File) => {
		const isImage = file.type.startsWith('image/')
		const isVideo = file.type.startsWith('video/')

		if (!isImage && !isVideo) {
			alert('DashLive')
			return
		}

		if (file.size > MAX_FILE_SIZE) {
			alert(
				`DashLive6 DashLive: ${(file.size / (1024 * 1024)).toFixed(1)} DashLive`
			)
			return
		}

		const reader = new FileReader()
		reader.onload = () => {
			const newCustomWallpaper: Wallpaper = {
				id: 'custom-wallpaper',
				type: isImage ? 'IMAGE' : 'VIDEO',
				previewSrc: '',
				src: reader.result as string,
				name: isImage ? 'DashLive' : 'DashLive',
				isCustom: true,
			}

			onWallpaperChange(newCustomWallpaper)

			Analytics.event('custom_wallpaper_selected')
		}

		reader.readAsDataURL(file)
	}

	return { processFile }
}
