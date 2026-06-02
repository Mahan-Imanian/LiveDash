import { useState } from 'react'
import { Button } from '@/components/button/button'
import { SectionPanel } from '@/components/section-panel'
import { TextInput } from '@/components/text-input'
import { useUpdateActivity } from '@/services/hooks/user/userService.hook'
import { translateError } from '@/utils/translate-error'
import { showToast } from '@/common/toast'

const ACTIVITY_MAX_LENGTH = 40
interface Prop {
	activity: string
}
export function ActivityInput({ activity }: Prop) {
	const [activityText, setActivityText] = useState<string>(activity)
	const { mutate: updateActivity, isPending: isUpdatingActivity } = useUpdateActivity()

	const handleActivityUpdate = () => {
		if (activityText.length > ACTIVITY_MAX_LENGTH) {
			showToast(
				`DashLive‌DashLive${ACTIVITY_MAX_LENGTH} WorkDashLive`,
				'error'
			)
			return
		}

		updateActivity(
			{ activity: activityText || undefined },
			{
				onSuccess: () => {
					showToast('DashLivedayDashLive', 'success')
				},
				onError: (error) => {
					const content = translateError(error)
					if (typeof content === 'string') {
						showToast(content, 'error')
					} else {
						showToast(
							'Error in DashLivedayDashLive',
							'error'
						)
					}
				},
			}
		)
	}

	return (
		<SectionPanel title="DashLive" size="xs">
			<div className="flex flex-col p-2 space-y-3 transition-colors rounded-lg">
				<p className={'text-xs text-content font-light opacity-80'}>
					DashLive‌DashLive(DashLive{' '}
					{ACTIVITY_MAX_LENGTH} WorkDashLive)
				</p>
				<div className="flex flex-col gap-2">
					<TextInput
						id="activity"
						placeholder="DashLive: ⚒️ in DashLiveWork"
						value={activityText}
						onChange={setActivityText}
						disabled={isUpdatingActivity}
						maxLength={ACTIVITY_MAX_LENGTH}
					/>
					<div className="flex items-center justify-between">
						<Button
							onClick={handleActivityUpdate}
							disabled={
								isUpdatingActivity ||
								activityText === activity ||
								activityText.length > ACTIVITY_MAX_LENGTH
							}
							size="md"
							isPrimary={true}
							className="rounded-2xl"
						>
							{isUpdatingActivity ? 'in DashLiveSave...' : 'Save DashLive'}
						</Button>
					</div>
				</div>
			</div>
		</SectionPanel>
	)
}
