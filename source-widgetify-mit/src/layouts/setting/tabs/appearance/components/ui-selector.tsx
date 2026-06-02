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
					<p>DashLiveWorkDashLive</p>
					<span className="mr-1 text-white badge badge-error badge-xs outline-2 outline-error/20">
						DashLive</span>
				</div>
			}
			size="sm"
		>
			<div className="space-y-4">
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted">
						Appearance DashLive‌DashLive</p>
				</div>

				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<ItemSelector
						isActive={ui === 'ADVANCED'}
						onClick={() => onClick('ADVANCED')}
						label={
							<div className="flex items-center gap-2">
								<LuLayers size={16} className="text-primary/80" />
								<span> agoDashLive</span>
							</div>
						}
						description="DashLiveMay‌DashLiveToolsDashLive DashDashLive‌DashLive"
					/>
					<ItemSelector
						isActive={ui === 'SIMPLE'}
						onClick={() => onClick('SIMPLE')}
						label={
							<div className="flex items-center gap-2">
								<LuLayoutTemplate size={16} className="text-primary/80" />
								<span>DashLive</span>
							</div>
						}
						description="DashLive‌DashLiveMayMay."
					/>
				</div>
			</div>
		</SectionPanel>
	)
}
