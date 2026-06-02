import { useEffect, useState } from 'react'
import { FaCog } from 'react-icons/fa'
import { getFromStorage } from '@/common/storage'
import { callEvent, listenEvent } from '@/common/utils/call-event'
import { Button } from '@/components/button/button'
import { WidgetTabKeys } from '@/layouts/widgets-settings/constant/tab-keys'
import { type WigiPadDateSetting, WigiPadDateType } from './date-setting.interface'
import { GregorianDate } from './dates/gregorian.date'

export function DateDisplay() {
	const [wigiPadDateSettings, setWigiPadDateSettings] =
		useState<WigiPadDateSetting | null>(null)
	useEffect(() => {
		async function load() {
			const wigiPadDateFromStore = await getFromStorage('wigiPadDate')
			if (wigiPadDateFromStore) {
				setWigiPadDateSettings({ dateType: WigiPadDateType.Gregorian })
			} else {
				setWigiPadDateSettings({
					dateType: WigiPadDateType.Gregorian,
				})
			}
		}

		const event = listenEvent('wigiPadDateSettingsChanged', () => {
			setWigiPadDateSettings({ dateType: WigiPadDateType.Gregorian })
		})

		load()

		return () => {
			event()
		}
	}, [])

	if (!wigiPadDateSettings) {
		return null
	}

	const onClickSettings = () => {
		callEvent('openWidgetsSettings', { tab: WidgetTabKeys.wigiPad })
	}

	return (
		<div
			className={
				'relative flex flex-col items-center justify-center gap-0.5 p-1 overflow-hidden text-center transition-all duration-500 rounded-xl group'
			}
		>
			<div className="absolute inset-0 z-20 group">
				<Button
					onClick={onClickSettings}
					size="xs"
					className="m-1.5 h-5 w-5 p-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 !border-none !shadow-none transition-all duration-300 delay-200"
				>
					<FaCog size={12} className="text-content" />
				</Button>
			</div>

			<GregorianDate />
		</div>
	)
}
