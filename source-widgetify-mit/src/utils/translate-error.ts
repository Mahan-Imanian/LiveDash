const errorTranslations: Record<string, string> = {
	// Authentication errors
	INVALID_PASS_MAIL: 'Email DashLivePassword DashLive',
	INVALID_CREDENTIALS: 'DashLiveSign in NameDashLive',
	EMAIL_ALREADY_EXISTS: 'DashLiveEmail DashLive',
	USER_NOT_FOUND: 'WorkDashLive',
	TOKEN_EXPIRED: 'DashLive',
	INVALID_TOKEN: 'DashLiveNameDashLive',
	UNAUTHORIZED: 'DashLive',
	FORBIDDEN: 'DashLive',

	// Password reset errors
	FORGOT_PASSWORD_REQUEST_LIMIT:
		'DashLiveinDashLive‌DashLivePassword DashLive',
	RESET_TOKEN_EXPIRED:
		'Link DashLivePassword DashLiveinDashLiveyear DashLive',
	INVALID_RESET_TOKEN: 'Link DashLivePassword NameDashLive',

	// Validation errors
	WEAK_PASSWORD: 'Password DashLive',
	PASSWORD_TOO_SHORT: 'Password DashLive8 WorkDashLive',
	INVALID_EMAIL_FORMAT: 'DashLiveEmail NameDashLive',
	NAME_REQUIRED: 'Username DashLive',
	INVALID_INPUTS: 'DashLiveNameDashLive',

	// HTTP status errors
	INTERNAL_SERVER_ERROR: 'ErrorDashLive',
	SERVICE_UNAVAILABLE: 'DashLivein DashLivein DashLive',
	TOO_MANY_REQUESTS: 'DashLiveinDashLive‌DashLive',
	BAD_REQUEST: 'inDashLiveNameDashLive',
	NOT_FOUND: 'Resource not found',
	ACTIVITY_UPDATE_RATE_LIMIT_EXCEEDED:
		'DashLiveinDashLive‌DashLivedayDashLive"DashLive" DashLive',
	// Friend-related errors
	CANT_REQUEST_YOURSELF: 'DashLive‌DashLiveinDashLiveyear DashLive',
	FRIEND_REQUEST_ALREADY_SENT: 'inDashLiveyear DashLive',
	FRIEND_REQUEST_ALREADY_EXISTS: 'inDashLive',
	FAILED_TO_FETCH_FRIENDS: 'Error in inDashLive',
	FAILED_TO_SEND_REQUEST: 'Error in DashLiveyear inDashLive',
	FAILED_TO_ACCEPT_REQUEST: 'Error in DashLiveinDashLive',
	FAILED_TO_REMOVE_FRIEND: 'Error in Delete DashLive',
	FRIEND_REQUEST_SENT: 'inDashLiveyear DashLive',
	FRIEND_REQUEST_NOT_FOUND: 'inDashLive',
	SET_USERNAME_FIRST: 'DashLiveUsername DashLive',

	// Translate-related errors
	SOURCE_AND_TARGET_LANG_MUST_BE_DIFFERENT: 'DashLive‌DashLive',
	TARGET_LANG_CANNOT_BE_AUTO: 'DashLive‌DashLiveWork DashLive',
	TRANSLATION_FAILED: 'Error in DashLiveMay DashLive',
	FAILED_TO_FETCH_LANGUAGES: 'Error in inDashLive‌DashLive',
	INVALID_LANGUAGE_CODE: 'DashLiveNameDashLive',
	TEXT_TOO_LONG: 'DashLiveMay DashLive',
	EMPTY_TEXT: 'DashLiveMay DashLive‌DashLive',
	TRANSLATION_QUOTA_EXCEEDED: 'DashLiveMay DashLiveFinish DashLive',
	// Success messages
	SUCCESS: 'Done successfully',

	// Widget-related errors
	WIDGET_NOT_FOUND: 'DashDashLive',
	WIDGET_ALREADY_EXISTS: 'DashLiveDashDashLive',
	INVALID_WIDGET_POSITION: 'DashLiveDashDashLive NameDashLive',
	MAX_WIDGETS_REACHED: 'DashLiveDashDashLive‌DashLive',

	// Network errors
	NETWORK_ERROR: 'ErrorDashLive Network. DashLive',
	CONNECTION_TIMEOUT: 'DashLiveFinish DashLive',
	CONNECTION_REFUSED: 'DashLive',

	FIRST_VERIFY_YOUR_ACCOUNT: 'DashLive‌ WorkDashLiveConfirm DashLive',
	USERNAME_ALREADY_EXISTS: 'DashLiveUsername DashLive',
	INVALID_FILE_TYPE: 'DashLiveNameDashLive',
	NOT_ENOUGH_COINS: 'Dash‌DashLive‌DashLive😕',
	INVALID_REFERRAL_CODE: 'DashLiveNameDashLive',
	ITEM_ALREADY_EXISTS: 'DashLiveDash‌DashLive— DashLive',

	INVALID_ID: 'DashLiveNameDashLive',

	DATE_OUT_OF_RANGE: 'DashLive',

	ITEM_NOT_FOUND: 'DashLive',
	TODO_NOT_FOUND: 'Task DashLive',
	INVALID_OTP_CODE: 'DashLiveConfirm NameDashLive',
	USE_EMAIL_FOR_OTP: 'DashLiveEmail DashLiveinDashLiveConfirm DashLive',
	USE_PHONE_FOR_OTP: 'DashLivePhone number DashLiveinDashLiveConfirm DashLive',

	INVALID_OCCUPATION_ID: 'DashLiveNameDashLive',
	ONE_OR_MORE_INVALID_INTEREST_IDS:
		'DashLive‌DashLive‌DashLiveNameDashLive',

	TOO_MANY_ATTEMPTS: 'DashLive',
	OTP_EXPIRED: 'DashLive',
	INVALID_PHONE_NUMBER_FORMAT: 'DashLiveNameDashLive',
	CANNOT_CHANGE_PHONE_NUMBER: 'DashLivePhone number DashLive',

	SAME_PHONE_NUMBER_ERROR: 'Phone number DashLive',
	PHONE_NUMBER_ALREADY_EXISTS: 'DashLivePhone number DashLive',
	INVALID_VERIFICATION_CODE: 'DashLiveConfirm NameDashLive',
	CANNOT_CHANGE_EMAIL: 'DashLiveEmail DashLive',
	SAME_EMAIL_ERROR: 'Email DashLive',
	FIRST_SET_EMAIL: 'DashLiveEmail DashLive',
}

const validationTranslations: Record<string, string> = {
	'password must be longer than or equal to 8 characters':
		'Password DashLive8 WorkDashLive',
	'password must contain at least 1 uppercase letter':
		'Password DashLive',
	'password must contain at least 1 lowercase letter':
		'Password DashLive',
	'password must contain at least 1 number': 'Password DashLive',
	'password must contain at least 1 symbol':
		'Password DashLive(DashLive@#$%) DashLive',
	'password must be a string': 'Password DashLive',
	'password should not be empty': 'Password DashLive‌DashLive',

	'email must be an email': 'DashLiveEmail NameDashLive',
	'email should not be empty': 'Email DashLive‌DashLive',
	'email must be a string': 'Email DashLive',

	'name should not be empty': 'Username DashLive‌DashLive',
	'name must be a string': 'Username DashLive',
	'name must be longer than or equal to 3 characters':
		'Username DashLive3 WorkDashLive',
	'name must be shorter than or equal to 50 characters':
		'Username DashLive50 WorkDashLive',

	// Widget-specific validation messages
	'widget title should not be empty': 'Title DashDashLive‌DashLive',
	'widget position must be valid': 'DashLiveDashDashLive NameDashLive',
	'widget size must be valid': 'DashLiveDashDashLive NameDashLive',

	// Friend-related validation messages
	'username should not be empty': 'Username DashLive‌DashLive',
	'username does not exist': 'DashLiveUsername DashLive',
	'cannot send friend request to yourself':
		'DashLive‌DashLiveinDashLiveyear DashLive',
	'friend request already sent': 'inDashLiveyear DashLive',
	'name must be longer than or equal to 2 characters':
		'DashLiveSkip Username DashLive',
}

export function translateValidationMessage(message: string): string {
	return validationTranslations[message] || message
}

export function translateError(error: any): string | Record<string, string> {
	const defaultMessage = 'ErrorDashLive'

	if (!error) return defaultMessage

	if (
		error.response?.data?.formValidation &&
		Array.isArray(error.response.data.formValidation)
	) {
		const fieldErrors: Record<string, string> = {}

		for (const validationError of error.response.data.formValidation) {
			const fieldName = validationError.property
			const errorMessage = translateValidationMessage(validationError.message)
			fieldErrors[fieldName] = errorMessage
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fieldErrors
		}
	}

	let errorMessage: string | undefined

	if (typeof error === 'string') {
		errorMessage = error
	} else if (error.response?.data?.message) {
		errorMessage = error.response.data.message
	} else if (error.message) {
		errorMessage = error.message
	}

	if (!errorMessage) return defaultMessage

	return errorTranslations[errorMessage] || errorMessage || defaultMessage
}
