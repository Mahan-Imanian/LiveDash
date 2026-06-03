import { useState } from 'react'
import { FaExternalLinkAlt } from 'react-icons/fa'
import keepItImage from '@/assets/keep-it.png'
import { Button } from './button/button'
import Checkbox from './checkbox'
import Modal from './modal'
import { setToStorage } from '@/common/storage'

interface ExtensionInstalledModalProps {
	show: boolean
	onClose: () => void
	onGetStarted: () => void
}
export function ExtensionInstalledModal({
	show,
	onGetStarted,
}: ExtensionInstalledModalProps) {
	return (
		<Modal
			isOpen={show}
			onClose={() => {}}
			size="sm"
			direction="ltr"
			showCloseButton={false}
			closeOnBackdropClick={false}
		>
			{import.meta.env.FIREFOX ? (
				<StepFirefoxConsent onGetStarted={onGetStarted} />
			) : (
				<StepOne onGetStarted={onGetStarted} />
			)}
		</Modal>
	)
}
interface StepOneProps {
	onGetStarted: () => void
}
const StepOne = ({ onGetStarted }: StepOneProps) => {
	return (
		<>
			<div className="mb-3">
				<h3 className={'mb-0 text-2xl font-bold text-content'}>
					Welcome to LiveDash! 🎉
				</h3>
			</div>

			<div
				className={
					'relative p-1 mt-1 mb-3 border rounded-xl border-content bg-content'
				}
			>
				<div className="flex items-center justify-center">
					<img
						src={keepItImage}
						alt="How to enable the extension"
						className="h-auto max-w-full rounded-lg shadow-xl"
						style={{ maxHeight: '220px' }}
					/>
				</div>
			</div>

			<div
				className={
					'p-3 mb-2 text-content rounded-lg border border-content  bg-content'
				}
			>
				<p className="font-bold text-muted">
					⚠️ To enable the extension, click the "Keep It" button.
				</p>
			</div>

			<Button
				size="md"
				onClick={onGetStarted}
				className="w-full text-base font-light shadow-sm rounded-2xl shadow-primary outline-none!"
				isPrimary={true}
			>
				Get started
			</Button>
		</>
	)
}

interface StepFirefoxConsentProps {
	onGetStarted: () => void
}
const StepFirefoxConsent = ({ onGetStarted }: StepFirefoxConsentProps) => {
	const [allowAnalytics, setAllowAnalytics] = useState(false)
	const [allowIcon, setAllowIcon] = useState(false)

	const handleDecline = () => {
		if (browser.management?.uninstallSelf) {
			// @ts-expect-error
			browser.management.uninstallSelf({
				showConfirmDialog: true,
				dialogMessage:
					'⚠️ Without data permission, the extension cannot function. Do you want to uninstall it? ⚠️',
			})
		}
	}

	const handleConfirm = () => {
		localStorage.setItem('wxt_local:allowAnalytics', String(allowAnalytics))
		localStorage.setItem('wxt_local:allowFaviconService', String(allowIcon))

		onGetStarted()
	}

	return (
		<div className="w-full overflow-clip">
			<h3 className="mb-3 text-2xl font-bold text-content">
				{' '}
				Privacy Notice (Privacy)
			</h3>
			<p className="mb-2 font-semibold">Choose which data can be sent:</p>

			<div className="w-full px-2">
				<ul className="w-full h-32 p-2 mb-2 space-y-1 overflow-y-auto text-xs list-disc list-inside border border-content rounded-2xl">
					<li>Local settings: all settings are stored on your device.</li>
					<li>
						Website icons: the website domain is used to retrieve its icon from Google.
						This requires your analytics consent.
					</li>
					<li>Sync and calendar: enabled only after sign-in.</li>
				</ul>

				<div className="mb-3 space-y-2">
					<label className="flex items-center p-2 text-sm rounded-lg cursor-pointer hover:bg-base-200">
						<Checkbox
							checked={allowAnalytics}
							onChange={() => setAllowAnalytics(!allowAnalytics)}
						/>
						<span className="mr-2">
							Send non-personal technical analytics to improve the extension
						</span>
					</label>

					<label className="flex items-center p-2 text-sm rounded-lg cursor-pointer hover:bg-base-200">
						<Checkbox
							checked={allowIcon}
							onChange={() => setAllowIcon(!allowIcon)}
						/>
						<span className="mr-2">Show bookmark icons</span>
					</label>
				</div>

				<a
					href="https://livedash.codersays.com/privacy"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center justify-center font-medium underline text-primary gap-0.5 mb-2"
				>
					<FaExternalLinkAlt />
					Full privacy policy
				</a>
			</div>

			<div className="flex gap-3 mt-4">
				<Button
					onClick={handleDecline}
					size="md"
					className="flex items-center justify-center w-40 btn btn-error rounded-xl"
				>
					🚫 Remove extension
				</Button>
				<Button
					onClick={handleConfirm}
					size="md"
					className="w-40 btn btn-success rounded-xl"
				>
					✅ Confirm and continue
				</Button>
			</div>
		</div>
	)
}
