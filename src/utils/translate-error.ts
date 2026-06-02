const errorTranslations: Record<string, string> = {
	INVALID_PASS_MAIL: 'Email or password is incorrect',
	INVALID_CREDENTIALS: 'Invalid login data',
	EMAIL_ALREADY_EXISTS: 'This email is already registered',
	USER_NOT_FOUND: 'User not found',
	TOKEN_EXPIRED: 'Your session has expired. Sign in again',
	INVALID_TOKEN: 'Invalid authentication token',
	UNAUTHORIZED: 'You do not have permission to access this section',
	FORBIDDEN: 'Access to this section is restricted',
	FORGOT_PASSWORD_REQUEST_LIMIT: 'Password reset request limit reached. Try again later',
	RESET_TOKEN_EXPIRED: 'Password reset link expired. Send a new request',
	INVALID_RESET_TOKEN: 'Invalid password reset link',
	WEAK_PASSWORD: 'Weak password. Use letters, numbers, and symbols',
	PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
	INVALID_EMAIL_FORMAT: 'Invalid email format',
	NAME_REQUIRED: 'Username is required',
	INVALID_INPUTS: 'Invalid input data',
	INTERNAL_SERVER_ERROR: 'Internal server error occurred',
	SERVICE_UNAVAILABLE: 'Service is currently unavailable',
	TOO_MANY_REQUESTS: 'Too many requests. Wait a moment',
	BAD_REQUEST: 'Invalid request',
	NOT_FOUND: 'Requested resource not found',
	ACTIVITY_UPDATE_RATE_LIMIT_EXCEEDED: 'Too many status update requests. Wait a moment',
	CANT_REQUEST_YOURSELF: 'You cannot send a friend request to yourself',
	FRIEND_REQUEST_ALREADY_SENT: 'Friend request already sent',
	FRIEND_REQUEST_ALREADY_EXISTS: 'Friend request already exists',
	FAILED_TO_FETCH_FRIENDS: 'Error fetching friends list',
	FAILED_TO_SEND_REQUEST: 'Error sending friend request',
	FAILED_TO_ACCEPT_REQUEST: 'Error accepting friend request',
	FAILED_TO_REMOVE_FRIEND: 'Error removing friend',
	FRIEND_REQUEST_SENT: 'Friend request sent',
	FRIEND_REQUEST_NOT_FOUND: 'Friend request not found',
	SET_USERNAME_FIRST: 'Set your username first',
	SOURCE_AND_TARGET_LANG_MUST_BE_DIFFERENT: 'Source and target languages cannot be the same',
	TARGET_LANG_CANNOT_BE_AUTO: 'Target language cannot be auto-detect',
	TRANSLATION_FAILED: 'Translation failed',
	FAILED_TO_FETCH_LANGUAGES: 'Error fetching languages list',
	INVALID_LANGUAGE_CODE: 'Invalid language code',
	TEXT_TOO_LONG: 'Text is too long to translate',
	EMPTY_TEXT: 'Text cannot be empty',
	TRANSLATION_QUOTA_EXCEEDED: 'Your translation quota has been exceeded',
	SUCCESS: 'Operation completed successfully',
	WIDGET_NOT_FOUND: 'Widget not found',
	WIDGET_ALREADY_EXISTS: 'This widget has already been added',
	INVALID_WIDGET_POSITION: 'Invalid widget position',
	MAX_WIDGETS_REACHED: 'Maximum number of widgets reached',
	NETWORK_ERROR: 'Network error. Check your internet connection',
	CONNECTION_TIMEOUT: 'Connection timed out. Try again',
	CONNECTION_REFUSED: 'Connection refused. Try again later',
	FIRST_VERIFY_YOUR_ACCOUNT: 'Verify your account first',
	USERNAME_ALREADY_EXISTS: 'This username already exists',
	INVALID_FILE_TYPE: 'Invalid file type',
	NOT_ENOUGH_COINS: 'Not enough LiveCoins',
	INVALID_REFERRAL_CODE: 'Invalid referral code',
	ITEM_ALREADY_EXISTS: 'You already bought this with LiveCoins; no need to buy again',
	INVALID_ID: 'Invalid ID',
	DATE_OUT_OF_RANGE: 'Selected date is outside the allowed range',
	ITEM_NOT_FOUND: 'Item not found',
	TODO_NOT_FOUND: 'Task not found',
	INVALID_OTP_CODE: 'Invalid verification code',
	USE_EMAIL_FOR_OTP: 'Temporarily use email to receive the verification code',
	USE_PHONE_FOR_OTP: 'Temporarily use phone number to receive the verification code',
	INVALID_OCCUPATION_ID: 'Invalid occupation selected',
	ONE_OR_MORE_INVALID_INTEREST_IDS: 'One or more selected interests are invalid',
	TOO_MANY_ATTEMPTS: 'Too many attempts',
	OTP_EXPIRED: 'Code expired',
	INVALID_PHONE_NUMBER_FORMAT: 'Invalid phone number format',
	CANNOT_CHANGE_PHONE_NUMBER: 'You cannot change the phone number',
	SAME_PHONE_NUMBER_ERROR: 'Duplicate phone number',
	PHONE_NUMBER_ALREADY_EXISTS: 'This phone number is already reserved',
	INVALID_VERIFICATION_CODE: 'Invalid verification code',
	CANNOT_CHANGE_EMAIL: 'You cannot change the email',
	SAME_EMAIL_ERROR: 'Duplicate email',
	FIRST_SET_EMAIL: 'You have not set an email yet',
}

const validationTranslations: Record<string, string> = {
	'password must be longer than or equal to 8 characters': 'Password must be at least 8 characters',
	'password must contain at least 1 uppercase letter': 'Password must contain at least one uppercase letter',
	'password must contain at least 1 lowercase letter': 'Password must contain at least one lowercase letter',
	'password must contain at least 1 number': 'Password must contain at least one number',
	'password must contain at least 1 symbol': 'Password must contain at least one symbol, such as @#$%',
	'password must be a string': 'Password must be a string',
	'password should not be empty': 'Password cannot be empty',
	'email must be an email': 'Invalid email format',
	'email should not be empty': 'Email cannot be empty',
	'email must be a string': 'Email must be a string',
	'name should not be empty': 'Username cannot be empty',
	'name must be a string': 'Username must be a string',
	'name must be longer than or equal to 3 characters': 'Username must be at least 3 characters',
	'name must be shorter than or equal to 50 characters': 'Username must be at most 50 characters',
	'widget title should not be empty': 'Widget title cannot be empty',
	'widget position must be valid': 'Invalid widget position',
	'widget size must be valid': 'Invalid widget size',
	'username should not be empty': 'Username cannot be empty',
	'username does not exist': 'This username does not exist',
	'cannot send friend request to yourself': 'You cannot send a friend request to yourself',
	'friend request already sent': 'Friend request already sent',
	'name must be longer than or equal to 2 characters': 'Username is required',
}

export function translateValidationMessage(message: string): string {
	return validationTranslations[message] || message
}

export function translateError(error: any): string | Record<string, string> {
	const defaultMessage = 'An error occurred. Try again'
	if (!error) return defaultMessage

	if (
		error.response?.data?.formValidation &&
		Array.isArray(error.response.data.formValidation)
	) {
		const fieldErrors: Record<string, string> = {}

		error.response.data.formValidation.forEach((validationError: any) => {
			const field = validationError.property
			const messages = Object.values(validationError.constraints || {}) as string[]

			fieldErrors[field] = messages
				.map((message) => translateValidationMessage(message))
				.join(', ')
		})

		return fieldErrors
	}

	if (error.response?.data?.message) {
		const message = error.response.data.message
		return errorTranslations[message] || message
	}

	if (error.message) {
		return errorTranslations[error.message] || error.message
	}

	return defaultMessage
}
