import { CheckBoxWithDescription } from '@/components/checkbox-description.component'

interface RetouchFilterProps {
	isEnabled: boolean
	onToggle: () => void
}

export function RetouchFilter({ isEnabled, onToggle }: RetouchFilterProps) {
	return (
		<CheckBoxWithDescription
			isEnabled={isEnabled}
			onToggle={onToggle}
			title="Filter Image"
			description="When enabled, your wallpaper becomes darker."
		/>
	)
}
