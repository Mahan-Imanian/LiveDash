import { useState } from 'react'
import { FiUserCheck } from 'react-icons/fi'
import { Button } from '@/components/button/button'
import { SectionPanel } from '@/components/section-panel'
import { TextInput } from '@/components/text-input'
import Tooltip from '@/components/toolTip'
import { useAuth } from '@/context/auth.context'
import {
	type Friend,
	useHandleFriendRequest,
	useSendFriendRequest,
} from '@/services/hooks/friends/friendService.hook'
import { translateError } from '@/utils/translate-error'
import { FriendsList } from '../../components/friends-List'
import { RemoveFriendButton } from '../../components/remove-button'
import { showToast } from '@/common/toast'

export const FriendRequestsTab = () => {
	const { user } = useAuth()
	const [username, setUsername] = useState('')
	const [translatedError, setTranslatedError] = useState<string | null>(null)
	const { mutate: sendFriendRequest, isPending: isSending } = useSendFriendRequest()

	const { mutate: handleFriendAction, isPending: isProcessing } =
		useHandleFriendRequest()

	const handleSendRequest = () => {
		if (!user?.username) {
			showToast(
				'Set your username in your profile before sending friend requests.',
				'error'
			)
			return
		}
		if (!username.trim()) return

		setTranslatedError(null)

		sendFriendRequest(
			{ username },
			{
				onSuccess: () => {
					setUsername('')
					showToast('Friend request sent successfully', 'success')
					setTranslatedError(null)
				},
				onError: (err) => {
					const message = translateError(err)
					if (typeof message === 'string') {
						showToast(message, 'error')
					} else {
						setTranslatedError(message.username)
					}
				},
			}
		)
	}

	const handleUsernameChange = (value: string) => {
		setUsername(value)
		if (translatedError) {
			setTranslatedError(null)
		}
	}

	const acceptFriend = (friendId: string) => {
		handleFriendAction({
			friendId,
			state: 'accepted',
		})
	}

	const rejectFriend = (friendId: string) => {
		handleFriendAction({
			friendId,
			state: 'rejected',
		})
	}

	const renderFriendActions = (friend: Friend) => (
		<div className="flex space-x-2">
			{!friend.sendByMe ? (
				<>
					<Tooltip content="Accept friend">
						<button
							onClick={() => acceptFriend(friend.id)}
							disabled={isProcessing}
							className="p-2 text-green-500 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20"
						>
							<FiUserCheck size={18} />
						</button>
					</Tooltip>
					<RemoveFriendButton
						friend={friend}
						onClick={() => rejectFriend(friend.id)}
						type="REJECT"
						disabled={isProcessing}
					/>
				</>
			) : (
				<p className={'text-sm text-content opacity-70'}>Sent</p>
			)}
		</div>
	)

	return (
		<div className="space-y-6">
			<SectionPanel title="Manage requests" size="sm">
				<div className="space-y-2">
					<label className={'block text-sm font-medium text-content'}>
						Username
					</label>
					<div className="flex gap-2">
						<TextInput
							type="text"
							value={username}
							onChange={handleUsernameChange}
							placeholder="Enter your friend’s username"
							className="flex-grow min-w-0"
							aria-label="Friend username"
						/>
						<Button
							type="submit"
							disabled={isSending || !username.trim()}
							isPrimary={true}
							size="md"
							className="rounded-md whitespace-nowrap"
							onClick={handleSendRequest}
						>
							{isSending ? 'Sending...' : 'Send request'}
						</Button>
					</div>
					{translatedError && (
						<p className="text-sm text-red-500">{translatedError}</p>
					)}
					{!user?.username && (
						<div
							className={
								'p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700'
							}
						>
							<p className={'text-sm text-content'}>
								Set your username in your
								profile before sending a friend request.
							</p>
						</div>
					)}
				</div>
				<FriendsList
					status="PENDING"
					renderFriendActions={renderFriendActions}
					emptyMessage="No new friend requests"
				/>
			</SectionPanel>
		</div>
	)
}
