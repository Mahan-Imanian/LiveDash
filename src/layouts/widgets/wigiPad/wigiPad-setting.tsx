import { SectionPanel } from '@/components/section-panel'
import { WidgetSettingWrapper } from '@/layouts/widgets-settings/widget-settings-wrapper'
import { ClockSetting } from './clock-display/clock-setting'
import { WigiPadDateSettingsModal } from './date-display/date-setting'

export function WigiPadSetting() {
	return (
		<WidgetSettingWrapper>
			<SectionPanel title="Date settings" size="sm">
				<WigiPadDateSettingsModal />
			</SectionPanel>
			<SectionPanel title="Clock settings" size="sm">
				<ClockSetting />
			</SectionPanel>
		</WidgetSettingWrapper>
	)
}
