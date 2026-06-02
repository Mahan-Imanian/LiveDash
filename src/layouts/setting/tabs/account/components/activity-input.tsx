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
				`Activity status cannot exceed ${ACTIVITY_MAX_LENGTH} characters.`,
				'error'
			)
			return
		}

		updateActivity(
			{ activity: activityText || undefined },
			{
				onSuccess: () => {
					showToast('Status updated successfully.', 'success')
				},
				onError: (error) => {
					const content = translateError(error)
					if (typeof content === 'string') {
						showToast(content, 'error')
					} else {
						showToast(
							'Error updating status. Try again.',
							'error'
						)
					}
				},
			}
		)
	}

	return (
		<SectionPanel title="Activity status" size="xs">
			<div className="flex flex-col p-2 space-y-3 transition-colors rounded-lg">
				<p className={'text-xs text-content font-light opacity-80'}>
					Your activity status is shown to your friends. Maximum{' '}
					{ACTIVITY_MAX_LENGTH} characters)
				</p>
				<div className="flex flex-col gap-2">
					<TextInput
						id="activity"
						placeholder="Example: ⚒️ Working"
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
							{isUpdatingActivity ? 'Saving...' : 'Save status'}
						</Button>
					</div>
				</div>
			</div>
		</SectionPanel>
	)
}
