import { ItemSelector } from '@/components/item-selector'
import { SectionPanel } from '@/components/section-panel'
import { LuLayers, LuLayoutTemplate } from 'react-icons/lu'
import { useAppearanceSetting } from '@/context/appearance.context'

export function UISelector() {
	const { setUI, ui } = useAppearanceSetting()
	function onClick(item: string) {
		setUI(item as any)
	}

	return (
		<SectionPanel
			title={
				<div className="flex items-center">
					<p>Interface</p>
					<span className="mr-1 text-white badge badge-error badge-xs outline-2 outline-error/20">
						New
					</span>
				</div>
			}
			size="sm"
		>
			<div className="space-y-4">
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted">
						Personalize the extension interface to fit your needs.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<ItemSelector
						isActive={ui === 'ADVANCED'}
						onClick={() => onClick('ADVANCED')}
						label={
							<div className="flex items-center gap-2">
								<LuLayers size={16} className="text-primary/80" />
								<span> Default</span>
							</div>
						}
						description="Everything is visible: tools, widgets, and full layout freedom."
					/>
					<ItemSelector
						isActive={ui === 'SIMPLE'}
						onClick={() => onClick('SIMPLE')}
						label={
							<div className="flex items-center gap-2">
								<LuLayoutTemplate size={16} className="text-primary/80" />
								<span>Simple and clean</span>
							</div>
						}
						description="Clean, fast, and focused for distraction-free use."
					/>
				</div>
			</div>
		</SectionPanel>
	)
}
