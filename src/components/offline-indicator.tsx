import { TbCloudOff } from 'react-icons/tb'

type OfflineIndicatorMode = 'badge' | 'status' | 'notification'

interface OfflineIndicatorProps {
	mode: OfflineIndicatorMode
	message?: string
}

export const OfflineIndicator = ({ mode, message }: OfflineIndicatorProps) => {
	if (mode === 'badge') {
		return (
			<div className="absolute flex items-center justify-center w-5 h-5 border-2 rounded-full -top-2 -right-2 offline-indicator-badge">
				<TbCloudOff className="text-xs text-white" />
			</div>
		)
	}

	if (mode === 'status') {
		return (
			<div className="text-xs mt-1 py-0.5 px-2 rounded border offline-indicator-status inline-flex items-center gap-1">
				<TbCloudOff className="text-xs" />
				<span className="font-light">{message || 'Offline mode'}</span>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-2 p-3 text-sm font-bold border rounded-lg bg-error/20 text-error border-error/20">
			<TbCloudOff className="flex-shrink-0 text-lg" />
			<p>
				{message ||
					'User data was loaded from local storage. Check your internet connection.'}
			</p>
		</div>
	)
}
