import { getFromStorage } from '@/common/storage'
import { getApiBaseUrl } from '@/services/api'

type GoogleOAuthPurpose = 'signin' | 'calendar'

export type GoogleOAuthResult = {
	url: string
	token: string | null
	googleToken: string | null
	isNewUser: boolean
	connected: string | null
	error: string | null
	email: string | null
}

function readOAuthParams(url: string) {
	const parsedUrl = new URL(url)
	const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''))
	const queryParams = new URLSearchParams(parsedUrl.search)
	const get = (key: string) => hashParams.get(key) || queryParams.get(key)
	return { parsedUrl, get }
}

async function ensureIdentityPermission() {
	const hasPermission = await browser.permissions.contains({
		permissions: ['identity'],
	})

	if (hasPermission) return true

	return browser.permissions.request({
		permissions: ['identity'],
	})
}

export async function launchLiveDashGoogleOAuth(
	purpose: GoogleOAuthPurpose
): Promise<GoogleOAuthResult> {
	const granted = await ensureIdentityPermission()
	if (!granted) throw new Error('Google sign-in permission was not granted.')

	const path = purpose === 'calendar' ? 'google-calendar' : 'google'
	const redirectUri = browser.identity.getRedirectURL(path)
	const appOrigin = new URL(getApiBaseUrl()).origin
	const serverAuthUrl = new URL('/auth/google/start.php', appOrigin)
	serverAuthUrl.searchParams.set('mode', 'extension')
	serverAuthUrl.searchParams.set('scope', purpose === 'calendar' ? 'calendar' : 'profile')
	serverAuthUrl.searchParams.set('extension_redirect_uri', redirectUri)
	serverAuthUrl.searchParams.set('returnUrl', redirectUri)

	if (purpose === 'calendar') {
		const token = await getFromStorage('auth_token')
		if (!token) throw new Error('Sign in before connecting Google Calendar.')
		serverAuthUrl.searchParams.set('user_token', token)
	}

	let redirectUrl = ''
	try {
		redirectUrl = (await browser.identity.launchWebAuthFlow({
			url: serverAuthUrl.toString(),
			interactive: true,
		})) || ''
	} catch (error) {
		throw new Error(
			error instanceof Error && error.message
				? error.message
				: 'Google authorization page could not be loaded.'
		)
	}

	if (!redirectUrl) throw new Error('Google authorization did not return a result.')

	const { get } = readOAuthParams(redirectUrl)
	const appToken =
		get('token') || get('livedash_token') ||
		(get('access_token')?.startsWith('LD_')
			? get('access_token')?.replace(/^LD_/, '') || null
			: null)

	const googleToken = get('access_token') || null

	return {
		url: redirectUrl,
		token: appToken,
		googleToken,
		isNewUser: get('new') === '1',
		connected: get('connected'),
		error: get('livedash_error'),
		email: get('email'),
	}
}
