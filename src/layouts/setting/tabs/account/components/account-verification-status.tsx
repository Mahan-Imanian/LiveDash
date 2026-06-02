import { FiMail } from 'react-icons/fi'
import { Button } from '@/components/button/button'
import { SectionPanel } from '@/components/section-panel'

interface AccountVerificationStatusProps {
	sendVerificationMutation: {
		isPending: boolean
	}
	onSendVerificationEmail: () => void
}

export const AccountVerificationStatus = ({
	sendVerificationMutation,
	onSendVerificationEmail,
}: AccountVerificationStatusProps) => {
	return (
		<SectionPanel title="Account verification status" size="xs" delay={0.1}>
			<div className="flex items-center justify-between p-3 border rounded-2xl bg-warning/10 border-warning/20">
				<div className="flex items-center gap-3">
					<FiMail className="text-warning" size={24} />
					<div>
						<p className="text-sm font-medium text-warning">
							Your account is not verified.
						</p>
						<p className="text-xs text-warning/90">
							Check your email or request a new verification email.
						</p>
					</div>
				</div>
				<Button
					onClick={onSendVerificationEmail}
					disabled={sendVerificationMutation.isPending}
					className="px-3 py-2 text-xs transition-colors rounded-2xl text-warning-content bg-warning/80 hover:bg-warning/50"
					size="sm"
				>
					{sendVerificationMutation.isPending ? (
						<>
							<div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
							Sending...
						</>
					) : (
						<>
							<FiMail size={16} />
							Send verification email
						</>
					)}
				</Button>
			</div>
		</SectionPanel>
	)
}
