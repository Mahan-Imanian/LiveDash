import { useEffect, useState } from 'react'
import Analytics from '@/analytics'
import { getFromStorage, setToStorage } from '@/common/storage'
import { callEvent } from '@/common/utils/call-event'
import { CheckBoxWithDescription } from '@/components/checkbox-description.component'
import { ItemSelector } from '@/components/item-selector'
import { type ClockSettings, ClockType } from './clock-setting.interface'

const CLOCK_OPTIONS = [
	{
		key: 'digital',
		label: 'Digital clock',
		description: 'Show the clock as numbers',
		value: ClockType.Digital as const,
	},
	{
		key: 'analog',
		label: 'Analog clock',
		description: 'Show the clock with hands',
		value: ClockType.Analog as const,
	},
]

export function ClockSetting() {
	const [clockSettings, setClockSettings] = useState<ClockSettings>({
		clockType: ClockType.Digital,
		showSeconds: true,
		showTimeZone: true,
		useSelectedFont: true,
	})

	useEffect(() => {
		async function loadClock() {
			const stored = await getFromStorage('clock')
			if (stored) setClockSettings(stored)
		}
		loadClock()
	}, [])

	const updateClockSettings = (updater: (prev: ClockSettings) => ClockSettings) => {
		setClockSettings((prev) => {
			const newSettings = updater(prev)
			handleSave(newSettings)
			return newSettings
		})
	}

	const handleSave = async (settings: ClockSettings) => {
		callEvent('wigiPadClockSettingsChanged', settings)
		await setToStorage('clock', settings)
		Analytics.event(`wigipad_clock_settings_${settings.clockType}_save`)
	}

	const onSelectType = (type: ClockType) => {
		updateClockSettings((prev) => ({ ...prev, clockType: type }))
	}

	const onToggleSeconds = () => {
		Analytics.event(
			`wigipad_clock_settings_${!clockSettings.showSeconds ? 'enable' : 'disable'}_show_seconds`
		)
		updateClockSettings((prev) => ({ ...prev, showSeconds: !prev.showSeconds }))
	}

	const onToggleTimeZone = () => {
		Analytics.event(
			`wigipad_clock_settings_${!clockSettings.showTimeZone ? 'enable' : 'disable'}_show_time_zone`
		)
		updateClockSettings((prev) => ({ ...prev, showTimeZone: !prev.showTimeZone }))
	}

	const onToggleUseSelectedFont = () => {
		Analytics.event(
			`wigipad_clock_settings_${!clockSettings.useSelectedFont ? 'enable' : 'disable'}_use_selected_font`
		)
		updateClockSettings((prev) => ({
			...prev,
			useSelectedFont: !prev.useSelectedFont,
		}))
	}

	return (
		<div className="space-y-3">
			<div>
				<p className="mb-3 text-sm text-muted">Choose the clock display type:</p>
				<div className="flex gap-2">
					{CLOCK_OPTIONS.map((option) => (
						<ItemSelector
							key={option.key}
							isActive={clockSettings.clockType === option.value}
							onClick={() => onSelectType(option.value)}
							label={option.label}
							description={option.description}
							className="flex-1 text-center"
						/>
					))}
				</div>
			</div>

			<div className="px-1 space-y-2">
				<CheckBoxWithDescription
					isEnabled={clockSettings.showSeconds}
					onToggle={onToggleSeconds}
					title="Show s"
					description="Show seconds on the digital clock"
				/>

				<CheckBoxWithDescription
					isEnabled={clockSettings.showTimeZone}
					onToggle={onToggleTimeZone}
					title="Show time zone"
					description="Show time zone name under the clock"
				/>

				<CheckBoxWithDescription
					isEnabled={clockSettings.useSelectedFont ?? false}
					onToggle={onToggleUseSelectedFont}
					title="Use selected font"
					description="Use the selected font for the clock"
				/>
			</div>
		</div>
	)
}
