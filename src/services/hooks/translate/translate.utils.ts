import type { TranslateValidationResult } from './translate.types'

export function validateLanguageCode(
	code: string,
	availableLanguages: string[]
): TranslateValidationResult {
	if (!availableLanguages.includes(code)) {
		return {
			isValid: false,
			error: 'INVALID_LANGUAGE_CODE',
		}
	}

	return { isValid: true }
}

export function getLanguageDisplayName(code: string): string {
	const languageNames: Record<string, string> = {
		auto: 'Auto',
		en: 'English',
		fa: 'Persian',
		ar: 'Arabic',
		fr: 'Français',
		de: 'Deutsch',
		es: 'Español',
		it: 'Italiano',
		ru: 'Русский',
		tr: 'Türkçe',
		zh: '中文',
		ja: '日本語',
		ko: '한국어',
		hi: 'हिन्दी',
		ur: 'Urdu',
	}

	return languageNames[code] || code.toUpperCase()
}
