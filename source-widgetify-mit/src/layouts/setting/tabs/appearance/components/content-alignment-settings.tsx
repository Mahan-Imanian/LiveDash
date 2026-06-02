import { ItemSelector } from '@/components/item-selector'
import { SectionPanel } from '@/components/section-panel'
import { useAppearanceSetting } from '@/context/appearance.context'

export function ContentAlignmentSettings() {
	const { contentAlignment, setContentAlignment, ui } = useAppearanceSetting()
	if (ui === 'SIMPLE') return null
	return (
		<SectionPanel title="Settings DashLive" delay={0.3} size="sm">
			<div className={`space-y-3`}>
				<p className="text-xs text-muted">DashLive</p>
				<div className="flex gap-3">
					<ItemSelector
						isActive={contentAlignment === 'center'}
						onClick={() => setContentAlignment('center')}
						label="DashLive"
						key="center"
						className="w-1/2"
						description="DashLivein DashLive‌DashLive"
					/>
					<ItemSelector
						isActive={contentAlignment === 'top'}
						onClick={() => setContentAlignment('top')}
						label="DashLive"
						key="top"
						className="w-1/2"
						description="DashLivein DashLive‌DashLive"
					/>
				</div>
			</div>
		</SectionPanel>
	)
}
