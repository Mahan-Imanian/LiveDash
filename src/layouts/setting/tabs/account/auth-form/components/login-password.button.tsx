import Analytics from '@/analytics'
import { FiLock } from 'react-icons/fi'

type LoginPasswordButtonProps = {
	setShowPasswordForm: (show: boolean) => void
}

const LoginPasswordButton: React.FC<LoginPasswordButtonProps> = ({
	setShowPasswordForm,
}) => {
	const handleShowPasswordForm = () => {
		setShowPasswordForm(true)
		Analytics.event('auth_method_changed_to_password')
	}

	return (
		<button
			type="button"
			onClick={handleShowPasswordForm}
			className="group min-h-12 px-4 py-3 rounded-2xl text-sm font-semibold shadow-md hover:shadow-lg w-full flex items-center justify-center border-2 border-content bg-content hover:bg-base-200 transition-all duration-200 gap-2 cursor-pointer active:scale-95"
		>
			<FiLock className="flex-shrink-0 w-4 h-4 transition-all duration-200 md:w-5 md:h-5 group-hover:scale-110" />
			<span className="transition-all duration-200 group-hover:scale-105 whitespace-normal text-center leading-snug text-base-content/80 group-hover:text-base-content">
				Sign in with password
			</span>
		</button>
	)
}

export default LoginPasswordButton
