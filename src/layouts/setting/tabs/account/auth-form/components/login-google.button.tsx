import { IconLoading } from '@/components/loading/icon-loading'
import { useAuth } from '@/context/auth.context'
import { useState } from 'react'
import { getApiBaseUrl } from '@/services/api'
import { showToast } from '@/common/toast'
import Analytics from '@/analytics'
import { callEvent } from '@/common/utils/call-event'
import { sleep } from '@/common/utils/timeout'

export default function LoginGoogleButton() {
	const { login } = useAuth()
	const [isLoading, setIsLoading] = useState(false)

	const loginGoogle = async () => {
		Analytics.event('auth_method_changed_to_google')
		setIsLoading(true)
		try {
			const hasIdentityPermission = await browser.permissions.contains({
				permissions: ['identity'],
			})

			if (!hasIdentityPermission) {
				const granted = await browser.permissions.request({
					permissions: ['identity'],
				})

				if (!granted) {
					showToast('Google sign-in needs browser identity permission.', 'error')
					return
				}
			}

			const redirectUri = browser.identity.getRedirectURL('google')
			const serverAuthUrl = new URL('/auth/google/start.php', getApiBaseUrl())
			serverAuthUrl.searchParams.set('redirect_uri', redirectUri)

			const redirectUrl = await browser.identity.launchWebAuthFlow({
				url: serverAuthUrl.toString(),
				interactive: true,
			})

			if (!redirectUrl) {
				showToast('Google sign-in was cancelled.', 'error')
				return
			}

			const parsedUrl = new URL(redirectUrl)
			const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''))
			const queryParams = new URLSearchParams(parsedUrl.search)
			const appToken = hashParams.get('token') || queryParams.get('token')
			const error = hashParams.get('error') || queryParams.get('error')
			const isNewUser = hashParams.get('new') === '1' || queryParams.get('new') === '1'

			if (error) {
				showToast(decodeURIComponent(error), 'error')
				return
			}

			if (!appToken) {
				showToast('Google sign-in did not return a LiveDash session.', 'error')
				return
			}

			if (isNewUser) {
				callEvent('openWizardModal')
				await sleep(300)
			}

			login(appToken)
		} catch {
			showToast('Google sign-in could not be completed. Check the LiveDash backend Google OAuth configuration.', 'error')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<button
			type="button"
			onClick={loginGoogle}
			disabled={isLoading}
			className="group px-4 md:px-8 py-2.5 md:py-3 rounded-2xl text-sm md:text-base font-medium shadow-md hover:shadow-lg w-full flex items-center justify-center border-2 border-content bg-content hover:bg-base-200 transition-all duration-200 gap-1.5 md:gap-2 cursor-pointer active:scale-95 group"
		>
			<div className="relative flex items-center justify-center flex-shrink-0">
				{isLoading ? (
					<IconLoading className="!h-4 !w-4 md:!h-5 md:!w-5" />
				) : (
					<img
						src="/live-assets/google.svg"
						alt=""
						aria-hidden="true"
						className="w-4 h-4 transition-all duration-200 md:w-5 md:h-5 group-hover:scale-110 group-hover:rotate-3"
					/>
				)}
			</div>
			<span className="transition-all duration-200 group-hover:scale-105 whitespace-nowrap text-base-content/80 group-hover:text-base-content">
				{isLoading ? 'Processing...' : 'Sign in with Google'}
			</span>
		</button>
	)
}
