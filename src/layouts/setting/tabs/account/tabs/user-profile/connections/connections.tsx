import { useEffect, useState } from 'react'
import Analytics from '@/analytics'
import { showToast } from '@/common/toast'
import { useAuth } from '@/context/auth.context'
import { launchLiveDashGoogleOAuth } from '@/services/auth/googleOAuth'
import { getMainClient } from '@/services/api'
import { useGetUserProfile } from '@/services/hooks/user/userService.hook'
import { ConnectionModal } from './components/connection-modal'
import type { Platform } from './components/platform-config.js'
import { PLATFORM_CONFIGS } from './components/platform-data'

export function Connections() {
	const { data: profile, refetch } = useGetUserProfile()
	const { isAuthenticated } = useAuth()

	const [platforms, setPlatforms] = useState<Platform[]>([])
	const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)

	useEffect(() => {
		const initialPlatforms = PLATFORM_CONFIGS.map((config) => ({
			...config,
			connected: false,
			isLoading: false,
		}))
		setPlatforms(initialPlatforms)
	}, [])

	useEffect(() => {
		if (profile?.connections) {
			setPlatforms((prevPlatforms) =>
				prevPlatforms.map((platform) => ({
					...platform,
					connected: profile.connections.includes(platform.id),
				}))
			)
		}
	}, [profile?.connections])

	const handleConnectionClick = (platformId: string) => {
		if (!isAuthenticated || !profile?.verified) {
			return showToast('Sign in before connecting platforms.', 'error')
		}

		const platform = platforms.find((p) => p.id === platformId)
		if (!platform) return showToast('This platform is currently disabled.', 'error')
		if (!platform.isActive && !platform.connected) return showToast('This platform is not ready yet.', 'error')

		setSelectedPlatform(platform)
		setIsModalOpen(true)
		Analytics.event(
			`connection_${platform.id}_${platform.connected ? 'disconnect' : 'connect'}_modal`
		)
	}

	const setPlatformLoading = (id: string, isLoading: boolean) => {
		setPlatforms((prev) =>
			prev.map((p) => (p.id === id ? { ...p, isLoading } : p))
		)
		setSelectedPlatform((prev) =>
			prev && prev.id === id ? { ...prev, isLoading } : prev
		)
	}

	const handleConnectionConfirm = async () => {
		if (!selectedPlatform) return
		const platformId = selectedPlatform.id
		setPlatformLoading(platformId, true)

		try {
			if (selectedPlatform.connected) {
				const api = await getMainClient()
				await api.post(`/${platformId}/disconnect`)
				setPlatforms((prev) =>
					prev.map((p) =>
						p.id === platformId
							? { ...p, connected: false, isLoading: false }
							: p
					)
				)
				await refetch()
				showToast(`${selectedPlatform.name} disconnected.`, 'success')
			} else if (platformId === 'google') {
				const result = await launchLiveDashGoogleOAuth('calendar')
				if (result.error) throw new Error(result.error)
				if (result.connected !== 'google') throw new Error('Google Calendar was not connected.')
				setPlatforms((prev) =>
					prev.map((p) =>
						p.id === platformId
							? { ...p, connected: true, isLoading: false }
							: p
					)
				)
				await refetch()
				showToast('Google Calendar connected.', 'success')
			}
		} catch (error) {
			setPlatformLoading(platformId, false)
			showToast(
				error instanceof Error
					? error.message
					: `Connection error with ${selectedPlatform.name}. Try again.`,
				'error'
			)
		} finally {
			setIsModalOpen(false)
			setSelectedPlatform(null)
		}
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
				{platforms.map((platform) => (
					<div
						key={platform.id}
						onClick={() =>
							(platform.isActive || platform.connected) &&
							handleConnectionClick(platform.id)
						}
						className={`group relative p-3 rounded-2xl border transition-all duration-200 bg-base-100/80 border-base-300/70 shadow-sm hover:shadow-md ${!platform.isActive && !platform.connected ? 'opacity-50' : 'cursor-pointer active:scale-95'}`}
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3 overflow-hidden">
								<div
									className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-2xl ${platform.bgColor} text-white ring-1 ring-base-300/70 bg-base-200`}
								>
									{platform.icon}
								</div>
								<div className="min-w-0 overflow-hidden">
									<h3 className="text-[13px] font-bold text-content truncate">
										{platform.name}
									</h3>
									<p
										className={`text-[10px] font-medium truncate ${platform.connected ? 'text-success' : 'text-muted'}`}
									>
										{platform.connected ? 'Connected' : 'Not connected'}
									</p>
								</div>
							</div>

							<div
								className={`h-8 px-3 flex items-center justify-center rounded-xl text-[10px] font-black shrink-0 transition-all ${
									platform.connected
										? 'bg-error/10 text-error border border-error/20'
										: 'bg-primary text-white shadow-sm'
								} ${!platform.isActive && !platform.connected ? 'bg-base-300! text-muted' : ''}`}
							>
								{platform.isLoading ? (
									<div className="w-3 h-3 border-2 border-current rounded-full animate-spin border-t-transparent" />
								) : platform.connected ? (
									'Disconnect'
								) : (
									'Connect'
								)}
							</div>
						</div>
					</div>
				))}
			</div>

			<ConnectionModal
				platform={selectedPlatform}
				isOpen={isModalOpen}
				onClose={() => {
					setIsModalOpen(false)
					setSelectedPlatform(null)
				}}
				onConfirm={handleConnectionConfirm}
				isLoading={selectedPlatform?.isLoading || false}
			/>
		</div>
	)
}
