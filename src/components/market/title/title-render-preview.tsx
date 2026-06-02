import { IoMdClose } from 'react-icons/io'

interface Prop {
	template: string
	className?: string
}
export function renderBrowserTitlePreview(item: Prop) {
	return (
		<div
			className={`flex items-center justify-between w-40 p-1.5 text-xs font-medium border shadow-sm text-content bg-content border-content rounded-t-md max-w-40 ${item.className || ''} font-sans`}
		>
			<div className="flex items-center gap-1">
				<IoMdClose />
			</div>
			<div className="flex items-center gap-1">
				<span className="text-[10px] truncate" dir="ltr">
					{item.template}
				</span>
				<img src="./icons/icon16.png" alt="Icon" className="w-4 h-4" />
			</div>
		</div>
	)
}
