import { useEffect } from 'react'
import Analytics from '@/analytics'
import { Button } from '@/components/button/button'
import Modal from '@/components/modal'
import { showToast } from '@/common/toast'

interface Prop {
	showRequireNotificationModal: boolean
	setShowRequireNotificationModal: (value: boolean) => void
	startPomodoro: () => void
}
export function RequestNotificationModal({
	showRequireNotificationModal,
	setShowRequireNotificationModal,
	startPomodoro,
}: Prop) {
	useEffect(() => {
		if (showRequireNotificationModal)
			Analytics.event('view_request_notification_modal')
	}, [showRequireNotificationModal])

	async function onRequestPermission() {
		try {
			const perm = await Notification.requestPermission()
			if (perm === 'granted') {
				showToast('Notifications enabled successfully.', 'success')
				setShowRequireNotificationModal(false)
				startPomodoro()
				Analytics.event('grant_notification_permission')
			} else {
				showToast('Enable notifications to start.', 'error')
				Analytics.event('deny_notification_permission')
			}
		} catch {
			showToast('Error requesting notification permission.', 'error')
		}
	}

	return (
		<Modal
			isOpen={showRequireNotificationModal}
			onClose={() => setShowRequireNotificationModal(false)}
			size="sm"
			title="Enable notifications"
			direction="ltr"
		>
			<div className="p-4 max-h-[80vh] overflow-y-auto">
				<article className="pb-4 border-b blog-post border-content animate-fade-in animate-slide-up">
					{/* Type badge and title */}
					<div className="flex items-start justify-between mb-3">
						<h3 className="text-xl font-bold text-content">
							We want to remind you.
						</h3>
					</div>

					<div className="media-container">
						<div className="my-2 overflow-hidden rounded-lg shadow-md">
							<img
								src={
									'https://cdn.livedash.eu/extension/pomodoroTimer-notification.png'
								}
								alt={'Notification preview'}
								className="object-cover w-full h-auto"
							/>
							<p className="p-2 text-xs text-center text-muted bg-content/30">
								Notification preview you will receive
							</p>
						</div>
					</div>

					{/* Content */}
					<div className="mt-2">
						<p className="leading-relaxed text-justify text-muted">
							To remind you, we need notifications enabled.
							This helps prevent missing timers or important reminders.
							This helps you avoid missing timers or important reminders.
						</p>
					</div>
				</article>

				{/* Actions */}
				<div className="flex gap-3 mt-2">
					<Button
						onClick={() => {
							setShowRequireNotificationModal(false)
						}}
						className="flex-1 px-4 py-2 text-sm font-medium transition-colors border rounded-2xl border-content text-content"
						size="md"
					>
						Not now
					</Button>
					<Button
						isPrimary={true}
						size="md"
						onClick={onRequestPermission}
						className="flex-1 px-4 py-2 text-sm font-medium text-white transition-colors rounded-2xl"
					>
						Enable notifications
					</Button>
				</div>
			</div>
		</Modal>
	)
}
