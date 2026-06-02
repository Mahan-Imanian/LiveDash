import { FiInfo } from 'react-icons/fi'
import Analytics from '@/analytics'
import { Button } from '@/components/button/button'
import Modal from '@/components/modal'

interface PlatformModalProps {
	isOpen: boolean
	onClose: () => void
	platform: {
		name: string
		link: string
	}
}

export function PlatformModal({ isOpen, onClose, platform }: PlatformModalProps) {
	const handleOpenLink = () => {
		window.open(platform.link, '_blank', 'noopener,noreferrer')
	}

	useEffect(() => {
		if (isOpen) {
			Analytics.event('open_translate_platform_modal')
		}
	}, [isOpen])

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size="sm"
			direction="rtl"
			closeOnBackdropClick={true}
			showCloseButton={true}
		>
			<div className="space-y-4 text-center">
				<div className="flex justify-center">
					<div className="flex items-center justify-center rounded-full w-14 h-14 bg-info/10">
						<div className="text-info">
							<FiInfo size={24} />
						</div>
					</div>
				</div>

				<h3 className="text-lg font-semibold text-content">Privacy DashLiveMay</h3>

				<div className="space-y-2 text-sm leading-relaxed text-content/80">
					<p>
						DashLivein DashLiveMay DashLiveMay DashLive{' '}
						<button
							onClick={handleOpenLink}
							className="font-medium text-blue-400 underline cursor-pointer hover:text-blue-500"
						>
							{platform.name}
						</button>{' '}
						DashLive‌DashLive</p>
					<p className="text-xs text-content/60">
						DashLive‌DashLive(DashLiveSign inDashLive) DashLiveMay DashLiveyear DashLive‌DashLive</p>
				</div>

				<div className="pt-2">
					<Button
						onClick={onClose}
						size="md"
						className="w-full text-white border-none bg-primary hover:bg-primary/90 rounded-2xl"
					>
						DashLive</Button>
				</div>
			</div>
		</Modal>
	)
}
