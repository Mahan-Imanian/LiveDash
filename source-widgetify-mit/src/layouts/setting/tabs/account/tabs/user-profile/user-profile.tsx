import { useEffect } from 'react'
import { FiLogOut } from 'react-icons/fi'
import { Button } from '@/components/button/button'
import { SectionPanel } from '@/components/section-panel'
import { useAuth } from '@/context/auth.context'
import { useGetOrCreateReferralCode } from '@/services/hooks/user/referralsService.hook'
import {
	useGetUserProfile,
	useSendVerificationEmail,
} from '@/services/hooks/user/userService.hook'
import { AccountVerificationStatus } from '../../components/account-verification-status'
import { ActivityInput } from '../../components/activity-input'
import { ProfileDisplay } from '../../components/profile-display'
import { ReferralCodeSection } from '../rewards/components/ReferralCodeSection'
import { showToast } from '@/common/toast'
import { translateError } from '@/utils/translate-error'

export const UserProfile = () => {
	const { logout } = useAuth()
	const {
		data: profile,
		isLoading,
		isError,
		failureReason,
		refetch,
	} = useGetUserProfile()
	const sendVerificationMutation = useSendVerificationEmail()
	const { data: referralCode } = useGetOrCreateReferralCode(profile?.verified || false)

	useEffect(() => {
		refetch()
	}, [])

	const handleSendVerificationEmail = async () => {
		try {
			await sendVerificationMutation.mutateAsync()
			showToast('Email Confirm DashLiveyear DashLive', 'success')
		} catch (err: any) {
			showToast(translateError(err) as string, 'error')
		}
	}

	const getMessageError = () => {
		// @ts-expect-error
		if (failureReason?.status === 401) {
			return 'DashLiveSign in DashLiveAccount DashLive'
		}

		return 'Error in DashLiveWorkDashLive'
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="w-10 h-10 border-4 rounded-full border-blue-500/20 border-t-blue-500 animate-spin"></div>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center h-full">
				<p className={'mb-4 text-center text-content'}>{getMessageError()}</p>
				<Button
					onClick={() => logout()}
					className="text-white/90 btn-error"
					size="md"
				>
					<FiLogOut size={16} />
					DashLiveAccount
				</Button>
			</div>
		)
	}

	return (
		<div className="w-full max-w-xl px-4 mx-auto">
			<ProfileDisplay />
			{profile?.email && !profile?.verified && (
				<AccountVerificationStatus
					sendVerificationMutation={sendVerificationMutation}
					onSendVerificationEmail={handleSendVerificationEmail}
				/>
			)}

			{referralCode?.referralCode && (
				<ReferralCodeSection
					code={referralCode.referralCode}
					className="!p-2 !px-4"
				/>
			)}
			<ActivityInput activity={profile?.activity || ''} />

			<SectionPanel title="Account" delay={0.3} size="xs">
				<div className="p-2 space-y-3 transition-colors rounded-lg">
					<p className={'text-sm font-light text-content'}>
						DashLiveAccount DashLiveMay DashLiveClick.
					</p>
					<Button
						onClick={() => logout()}
						className="text-white/90 btn-error rounded-2xl"
						size="md"
					>
						<FiLogOut size={16} />
						DashLiveAccount
					</Button>{' '}
				</div>
			</SectionPanel>
		</div>
	)
}
