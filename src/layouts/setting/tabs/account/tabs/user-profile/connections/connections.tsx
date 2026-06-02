import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Analytics from '@/analytics'
import { getMainClient } from '@/services/api'
import { useGetUserProfile } from '@/services/hooks/user/userService.hook'
import { ConnectionModal } from './components/connection-modal'
import type { Platform } from './components/platform-config.js'
import { PLATFORM_CONFIGS } from './components/platform-data'
import { showToast } from '@/common/toast'

export function Connections() {
	const { data: profile } = useGetUserProfile()
	const queryClient = useQueryClient()

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
		if (!profile?.verified) {
			return showToast('Verify your account first.', 'error')
		}

		const platform = platforms.find((p) => p.id === platformId)
		if (!platform) {
			return showToast('This platform is currently disabled.', 'error')
		}

		if (!platform.isActive && !platform.connected) {
			return showToast('This platform is not ready yet.', 'error')
		}

		setSelectedPlatform(platform)
		setIsModalOpen(true)
		Analytics.event(
			`connection_${platform.id}_${platform.connected ? 'disconnect' : 'connect'}_modal`
		)
	}

	const setPlatformLoading = (platformId: string, isLoading: boolean) => {
		setPlatforms((prev) =>
			prev.map((p) => (p.id === platformId ? { ...p, isLoading } : p))
		)
		setSelectedPlatform((prev) =>
			prev?.id === platformId ? { ...prev, isLoading } : prev
		)
	}

	const requestIdentityPermission = async () => {
		const hasIdentityPermission = await browser.permissions.contains({
			permissions: ['identity'],
		})

		if (hasIdentityPermission) return true

		return browser.permissions.request({
			permissions: ['identity'],
		})
	}

	const connectGoogle = async () => {
		const granted = await requestIdentityPermission()
		if (!granted) {
			showToast('Google Calendar connection needs browser identity permission.', 'error')
			return false
		}

		const api = await getMainClient()
		const redirectUri = browser.identity.getRedirectURL('google-connect')
		const { data } = await api.post('/google/connect', { redirectUri })

		if (!data?.url) {
			showToast('Google Calendar connection URL was not returned.', 'error')
			return false
		}

		const redirectUrl = await browser.identity.launchWebAuthFlow({
			url: data.url,
			interactive: true,
		})

		if (!redirectUrl) {
			showToast('Google Calendar connection was cancelled.', 'error')
			return false
		}

		const parsedUrl = new URL(redirectUrl)
		const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''))
		const queryParams = new URLSearchParams(parsedUrl.search)
		const connected = hashParams.get('connected') || queryParams.get('connected')
		const error = hashParams.get('error') || queryParams.get('error')

		if (error) {
			showToast(decodeURIComponent(error), 'error')
			return false
		}

		if (connected !== '1') {
			showToast('Google Calendar did not confirm the connection.', 'error')
			return false
		}

		return true
	}

	const handleConnectionConfirm = async () => {
		if (!selectedPlatform) return

		setPlatformLoading(selectedPlatform.id, true)

		try {
			if (selectedPlatform.connected) {
				const api = await getMainClient()
				await api.post(`/${selectedPlatform.id}/disconnect`)

				setPlatforms((prev) =>
					prev.map((p) =>
						p.id === selectedPlatform.id
							? { ...p, connected: false, isLoading: false }
							: p
					)
				)

				await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
				showToast(`Connection to ${selectedPlatform.name} was disconnected.`, 'success')
			} else {
				const connected =
					selectedPlatform.id === 'google'
						? await connectGoogle()
						: false

				if (!connected) {
					setPlatformLoading(selectedPlatform.id, false)
					return
				}

				setPlatforms((prev) =>
					prev.map((p) =>
						p.id === selectedPlatform.id
							? { ...p, connected: true, isLoading: false }
							: p
					)
				)

				await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
				showToast(`Connection to ${selectedPlatform.name} was completed.`, 'success')
			}
		} catch {
			setPlatformLoading(selectedPlatform.id, false)

			showToast(
				`Connection error with ${selectedPlatform.name}. Try again.`,
				'error'
			)
		}

		setIsModalOpen(false)
		setSelectedPlatform(null)
	}

	const handleModalClose = () => {
		setIsModalOpen(false)
		setSelectedPlatform(null)
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-2 mt-3 sm:grid-cols-2">
				{platforms.map((platform) => (
					<div
						key={platform.id}
						onClick={() =>
							(platform.isActive || platform.connected) &&
							handleConnectionClick(platform.id)
						}
						className={`group relative p-2.5 rounded-2xl border transition-all duration-200 bg-base-200 border-base-300
                ${
							platform.connected ? '' : ' hover:bg-base-200/40'
						} ${!platform.isActive && !platform.connected ? 'opacity-50' : 'cursor-pointer active:scale-95'}`}
					>
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2.5 overflow-hidden">
								<div
									className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-lg ${platform.bgColor} text-white`}
								>
									{platform.icon}
								</div>
								<div className="overflow-hidden">
									<h3 className="text-[13px] font-bold text-content truncate">
										{platform.name}
									</h3>
									<p
										className={`text-[10px]  font-medium truncate ${platform.connected ? 'text-success' : 'text-muted'}`}
									>
										{platform.connected ? 'Connected' : 'Not connected'}
									</p>
								</div>
							</div>

							<div
								className={`h-7 px-3 flex items-center justify-center rounded-lg text-[10px] font-black shrink-0 transition-all
                    ${
									platform.connected
										? 'bg-error/10 text-error'
										: 'bg-primary text-white'
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
				onClose={handleModalClose}
				onConfirm={handleConnectionConfirm}
				isLoading={selectedPlatform?.isLoading || false}
			/>
		</div>
	)
}
