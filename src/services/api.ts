import axios, {
	type AxiosError,
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from 'axios'
import { getFromStorage, setToStorage } from '@/common/storage'
import { callEvent } from '@/common/utils/call-event'

const DEFAULT_API_URL = 'https://livedash.codersays.com'

export let API_URL = ''

export function getApiBaseUrl() {
	return (import.meta.env.VITE_API || DEFAULT_API_URL).replace(/\/$/, '')
}

export async function getMainClient(): Promise<AxiosInstance> {
	let instance: AxiosInstance | undefined

	const token = await getFromStorage('auth_token')
	API_URL = getApiBaseUrl()

	instance = axios.create({
		baseURL: API_URL,
		headers: {
			Authorization: token ? `Bearer ${token}` : undefined,
			client: 'livedash-extension',
			version: browser.runtime.getManifest().version,
		},
	})

	if (!instance) {
		throw new Error('API base URL is not defined')
	}

	instance.interceptors.response.use(
		(response: AxiosResponse) => {
			return response
		},
		async (error: AxiosError) => {
			const originalRequest = error.config as InternalAxiosRequestConfig & {
				_retry?: boolean
			}

			const ignoreEndpoints = [
				'/auth/signin',
				'/auth/signup',
				'/auth/otp',
				'/auth/otp/verify',
				'/auth/oauth/google',
			]
			if (
				ignoreEndpoints.some((endpoint) =>
					originalRequest.url?.includes(endpoint)
				)
			) {
				return Promise.reject(error)
			}

			if (error.response?.status === 401 && !originalRequest._retry) {
				originalRequest._retry = true
				try {
					const refresh_token: string | null =
						await getFromStorage('refresh_token')

					if (!refresh_token) {
						return
					}

					const response = await axios.post(`${API_URL}/auth/refresh`, {
						refresh_token,
					})

					const newToken = response.data.data
					if (newToken) {
						await setToStorage('auth_token', newToken)
						originalRequest.headers.Authorization = `Bearer ${newToken}`
					} else {
						callEvent('auth_logout', null)
					}

					return instance(originalRequest)
				} catch (_refreshError) {
					callEvent('auth_logout', null)
				}
			}

			return Promise.reject(error)
		}
	)

	return instance
}

export async function safeAwait<E, T>(promise: Promise<any>): Promise<[E, T]> {
	try {
		const result = await promise
		// @ts-expect-error
		return [null, result as T]
	} catch (error) {
		// @ts-expect-error
		return [error, null]
	}
}
