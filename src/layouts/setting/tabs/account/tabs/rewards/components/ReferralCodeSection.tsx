import { Button } from '@/components/button/button'
import { SectionPanel } from '@/components/section-panel'
import { showToast } from '@/common/toast'

interface ReferralCodeSectionProps {
	code: string
	className?: string
}

export const ReferralCodeSection = ({ code, className }: ReferralCodeSectionProps) => {
	const handleCopyCode = async () => {
		try {
			await navigator.clipboard.writeText(code)
			showToast('Referral code copied.', 'success')
		} catch (error) {
			console.error('Failed to copy code:', error)
			showToast('Error copying code', 'error')
		}
	}

	return (
		<SectionPanel
			title={
				<div className="flex items-center gap-2">
					<span>Your referral code</span>
				</div>
			}
			size="sm"
		>
			<div className="space-y-2">
				<div
					className={`flex items-center justify-between p-4 bg-base-200 rounded-2xl ${className}`}
				>
					<div>
						<p className="mb-1 text-sm text-muted">Referral code</p>
						<p
							className="font-mono text-lg font-semibold cursor-pointer text-content hover:underline"
							onClick={handleCopyCode}
						>
							{code}
						</p>
					</div>
					<Button
						onClick={handleCopyCode}
						size="sm"
						className="rounded-2xl"
						isPrimary={true}
					>
						Copy code
					</Button>
				</div>
				<p className="flex text-sm text-muted gap-0.5 items-center">
					Use this code to invite friends and both of you will receive LiveCoin
					.{' '}
				</p>
			</div>
		</SectionPanel>
	)
}
