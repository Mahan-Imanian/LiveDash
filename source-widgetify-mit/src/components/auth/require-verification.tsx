import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { MdOutlineVerifiedUser } from 'react-icons/md'
import { callEvent } from '@/common/utils/call-event'
import { useAuth } from '@/context/auth.context'
import { Button } from '../button/button'

interface RequireVerificationProps {
	children: ReactNode
	fallback?: ReactNode
	mode?: 'block' | 'preview'
}

export const RequireVerification = ({
	children,
	fallback,
	mode = 'block',
}: RequireVerificationProps) => {
	const { user, isLoadingUser } = useAuth()
	const handleVerificationClick = () => {
		callEvent('openProfile')
	}
	if (isLoadingUser) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<div className="w-10 h-10 mx-auto border-t-2 border-b-2 rounded-full animate-spin border-primary"></div>
					<p className="mt-2">in DashLive</p>
				</div>
			</div>
		)
	}

	if (!!user?.email && !user?.verified) {
		if (mode === 'preview') {
			return (
				<div className="relative w-full h-full overflow-hidden">
					<div className="w-full h-full px-2 py-1 pointer-events-none opacity-60">
						{children}
					</div>
					<div
						className={
							'absolute inset-0 p-2 flex flex-col items-center justify-center gap-y-2 bg-base-300/5 backdrop-blur-xs rounded-xl'
						}
					>
						<MdOutlineVerifiedUser size={20} className="text-success/80" />
						<h3 className="text-lg font-semibold">DashLive</h3>
						<p className={'text-xs text-content text-center'}>
							DashLiveAccount DashLive</p>
					</div>
				</div>
			)
		}

		return fallback ? (
			fallback
		) : (
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className={
					'flex h-full flex-col items-center justify-center p-4 text-center rounded-md text-content'
				}
			>
				<h3 className="mb-2 text-xl font-semibold">DashLive</h3>
				<p className={'text-xs mb-4 text-content text-center'}>
					DashLiveAccount DashLive</p>
				<Button onClick={handleVerificationClick} size="sm">
					DashLive</Button>
			</motion.div>
		)
	}

	return <>{children}</>
}
