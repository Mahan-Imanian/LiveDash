import { ItemSelector } from '@/components/item-selector'
import { SectionPanel } from '@/components/section-panel'
import { useAppearanceSetting } from '@/context/appearance.context'

export function ContentAlignmentSettings() {
	const { contentAlignment, setContentAlignment, ui } = useAppearanceSetting()
	if (ui === 'SIMPLE') return null
	return (
		<SectionPanel title="Layout settings" delay={0.3} size="sm">
			<div className={`space-y-3`}>
				<p className="text-xs text-muted">Vertical content position</p>
				<div className="flex gap-3">
					<ItemSelector
						isActive={contentAlignment === 'center'}
						onClick={() => setContentAlignment('center')}
						label="Center"
						key="center"
						className="w-1/2"
						description="Content is centered on the page."
					/>
					<ItemSelector
						isActive={contentAlignment === 'top'}
						onClick={() => setContentAlignment('top')}
						label="Top"
						key="top"
						className="w-1/2"
						description="Content is aligned to the top of the page."
					/>
				</div>
			</div>
		</SectionPanel>
	)
}
