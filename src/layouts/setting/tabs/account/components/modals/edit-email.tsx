import Modal from '@/components/modal'

interface Prop {
	show: boolean
	onClose: (type: 'success' | 'cancel') => void
	currentValue?: string
}
export function ChangeEmailModal({ show, onClose }: Prop) {
	const onCloseHandler = () => {
		onClose('cancel')
	}

	return (
		<Modal isOpen={show} onClose={onCloseHandler} title="Add email">
			<div></div>
		</Modal>
	)
}
