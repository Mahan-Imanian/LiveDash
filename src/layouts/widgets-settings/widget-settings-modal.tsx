import type { JSX } from 'react'
import { MdPets } from 'react-icons/md'
import { TbApps, TbCalendarUser, TbCurrencyDollar, TbNews } from 'react-icons/tb'
import { TiWeatherCloudy } from 'react-icons/ti'
import { VscSettings } from 'react-icons/vsc'
import Analytics from '@/analytics'
import { callEvent } from '@/common/utils/call-event'
import Modal from '@/components/modal'
import { TabItem, TabManager } from '@/components/tab-manager'
import { PetSettings } from '../livedash-card/pets/setting/pet-setting'
import { RssFeedSetting } from '../widgets/news/rss-feed-setting'
import { WeatherSetting } from '../widgets/weather/weather-setting'
import { WigiArzSetting } from '../widgets/wigiArz/wigiArz-setting'
import { WigiPadSetting } from '../widgets/wigiPad/wigiPad-setting'
import { WidgetTabKeys } from './constant/tab-keys'
import { ManageWidgets } from './manage-widgets/manage-widgets'

interface WidgetSettingsModalProps {
	isOpen: boolean
	onClose: () => void
	selectedTab: string | null
}
const tabs: TabItem[] = [
	{
		parentName: 'Manage widgets',
		children: [
			{
				label: 'Manage widgets',
				element: <ManageWidgets />,
				value: WidgetTabKeys.widget_management,
				icon: <TbApps size={20} />,
			},
			{
				label: 'LivePad',
				element: <WigiPadSetting />,
				value: WidgetTabKeys.wigiPad,
				icon: <TbCalendarUser size={20} />,
			},
			{
				label: 'Live Rates',
				element: <WigiArzSetting />,
				value: WidgetTabKeys.wigiArz,
				icon: <TbCurrencyDollar size={20} />,
			},
			{
				label: 'Live News',
				element: <RssFeedSetting />,
				value: WidgetTabKeys.news_settings,
				icon: <TbNews size={20} />,
			},
			{
				label: 'Widget Weather',
				element: <WeatherSetting />,
				value: WidgetTabKeys.weather_settings,
				icon: <TiWeatherCloudy size={20} />,
			},
			{
				label: 'Pet',
				value: WidgetTabKeys.Pet,
				icon: <MdPets size={20} />,
				element: <PetSettings />,
			},
		],
	},
]

export function WidgetSettingsModal({
	isOpen,
	onClose,
	selectedTab,
}: WidgetSettingsModalProps) {
	function onClickSettings() {
		onClose()
		callEvent('openSettings')
		Analytics.event('open_settings_from_widgets_settings_modal')
	}

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Widget settings"
			size="xl"
			direction="ltr"
			closeOnBackdropClick={true}
		>
			<TabManager
				tabs={tabs}
				tabOwner="widgets-settings"
				defaultTab={selectedTab || WidgetTabKeys.widget_management}
				direction="ltr"
			>
				<button
					className={`relative  items-center flex gap-3 px-4 py-3 rounded-full transition-all duration-200 ease-in-out justify-start cursor-pointer whitespace-nowrap active:scale-[0.98] text-muted hover:bg-base-300 w-42`}
					onClick={() => {
						onClickSettings()
					}}
				>
					<VscSettings size={20} className="text-muted" />
					<span className="text-sm font-light">Settings</span>
				</button>
			</TabManager>
		</Modal>
	)
}
