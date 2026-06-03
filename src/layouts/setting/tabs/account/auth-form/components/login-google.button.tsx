import { useState } from 'react'
import type { AxiosError } from 'axios'
import Analytics from '@/analytics'
import { IconLoading } from '@/components/loading/icon-loading'
import { setToStorage } from '@/common/storage'
import { showToast } from '@/common/toast'
import { callEvent } from '@/common/utils/call-event'
import { sleep } from '@/common/utils/timeout'
import { useAuth } from '@/context/auth.context'
import { launchLiveDashGoogleOAuth } from '@/services/auth/googleOAuth'
import { safeAwait } from '@/services/api'
import {
	type AuthResponse,
	useGoogleSignIn,
} from '@/services/hooks/auth/authService.hook'
import { translateError } from '@/utils/translate-error'

export default function LoginGoogleButton() {
	const { login } = useAuth()
	const [isLoading, setIsLoading] = useState(false)
	const googleSignInMutation = useGoogleSignIn()

	const finishLogin = async (token: string, isNewUser: boolean) => {
		await setToStorage('refresh_token', token)
		if (isNewUser) {
			callEvent('openWizardModal')
			await sleep(300)
		}
		login(token)
		callEvent('openProfile', 'profile')
	}

	const loginGoogle = async () => {
		Analytics.event('auth_method_changed_to_google')
		setIsLoading(true)
		try {
			const result = await launchLiveDashGoogleOAuth('signin')
			if (result.error) {
				showToast(`Google sign-in failed: ${result.error}`, 'error')
				return
			}

			if (result.token) {
				await finishLogin(result.token, result.isNewUser)
				return
			}

			if (result.googleToken) {
				const [err, response] = await safeAwait<AxiosError, AuthResponse>(
					googleSignInMutation.mutateAsync({
						token: result.googleToken,
						referralCode: undefined,
					})
				)

				if (err) {
					showToast(translateError(err) as string, 'error')
					return
				}

				await finishLogin(response.data, response.isNewUser || false)
				return
			}

			showToast('Google sign-in did not return a LiveDash token.', 'error')
		} catch (error) {
			showToast(
				error instanceof Error
					? error.message
					: 'Google authorization page could not be loaded.',
				'error'
			)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<button
			type="button"
			onClick={loginGoogle}
			disabled={isLoading}
			className="group min-h-13 px-4 py-3.5 rounded-2xl text-sm font-semibold shadow-md hover:shadow-lg w-full flex items-center justify-center border border-base-300/80 bg-base-100/90 hover:bg-base-200 transition-all duration-200 gap-3 cursor-pointer active:scale-95 disabled:opacity-70"
		>
			<div className="relative flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm ring-1 ring-black/5">
				{isLoading ? (
					<IconLoading className="!h-4 !w-4 md:!h-5 md:!w-5" />
				) : (
					<img
						src="/live-assets/google.svg"
						alt=""
						aria-hidden="true"
						className="w-5 h-5 transition-all duration-200 group-hover:scale-110"
					/>
				)}
			</div>
			<span className="min-w-0 leading-snug text-center whitespace-normal text-base-content group-hover:text-primary">
				{isLoading ? 'Opening Google...' : 'Continue with Google'}
			</span>
		</button>
	)
}
