import { useState, useEffect } from 'react'
import { MdApps, MdOutlinePrivacyTip } from 'react-icons/md'
import { TbApps } from 'react-icons/tb'
import {
	VscColorMode,
	VscInfo,
	VscMegaphone,
	VscPaintcan,
	VscRecordKeys,
	VscSettingsGear,
} from 'react-icons/vsc'
import Analytics from '@/analytics'
import { callEvent } from '@/common/utils/call-event'
import Modal from '@/components/modal'
import { type TabItem, TabManager } from '@/components/tab-manager'
import { UpdateReleaseNotesModal } from '@/components/UpdateReleaseNotesModal'
import { AboutUsTab } from './tabs/about-us/about-us'
import { AppearanceSettingTab } from './tabs/appearance/appearance'
import { GeneralSettingTab } from './tabs/general/general'
import { PrivacySettings } from './tabs/privacy/privacy-settings'
import { ShortcutsTab } from './tabs/shortcuts/shortcuts'
import { WallpaperSetting } from './tabs/wallpapers/wallpapers'
import { BiUserCircle } from 'react-icons/bi'
import { AccountTab } from './tabs/account/account'
import { FiGift, FiUsers } from 'react-icons/fi'
import { AllFriendsTab, RewardsTab } from './tabs/account/tabs'
import { RiApps2AiLine } from 'react-icons/ri'
import { Connections } from './tabs/account/tabs/user-profile/connections/connections'
import { ConnectionPlatformsTab } from './tabs/account/tabs/connection/connectionsTab'

interface SettingModalProps {
	isOpen: boolean
	onClose: () => void
	selectedTab: string | null
}
const tabs: TabItem[] = [
	{
		parentName: 'User account',
		needAuth: true,
		children: [
			{
				label: 'My profile',
				value: 'profile',
				icon: <BiUserCircle size={20} />,
				element: <AccountTab />,
			},
			{
				label: 'Platforms',
				value: 'platforms',
				icon: <RiApps2AiLine size={20} />,
				element: <ConnectionPlatformsTab />,
			},
			{
				label: 'Missions and rewards',
				value: 'tasks',
				icon: <FiGift size={20} />,
				element: <RewardsTab />,
			},
			{
				label: 'Friends',
				value: 'friends',
				icon: <FiUsers size={20} />,
				element: <AllFriendsTab />,
			},
		],
	},
	{
		parentName: 'Settings',
		children: [
			{
				label: 'General',
				value: 'general',
				icon: <VscSettingsGear size={20} />,
				element: <GeneralSettingTab />,
			},

			{
				label: 'Privacy',
				value: 'access',
				icon: <MdOutlinePrivacyTip size={20} />,
				element: <PrivacySettings key="privacy" />,
			},
			{
				label: 'Appearance',
				value: 'appearance',
				icon: <VscColorMode size={20} />,
				element: <AppearanceSettingTab />,
			},
			{
				label: 'Wallpapers',
				value: 'wallpapers',
				icon: <VscPaintcan size={20} />,
				element: <WallpaperSetting />,
			},
			{
				label: 'Shortcuts',
				value: 'shortcuts',
				icon: <VscRecordKeys size={20} />,
				element: <ShortcutsTab />,
			},
		],
	},
	{
		parentName: 'LiveDash',
		children: [
			{
				label: 'About us',
				value: 'about',
				icon: <VscInfo size={20} />,
				element: <AboutUsTab />,
			},
		],
	},
]
export const SettingModal = ({ isOpen, onClose, selectedTab }: SettingModalProps) => {
	const [isUpdateModalOpen, setUpdateModalOpen] = useState(false)

	function openWidgetSettings() {
		onClose()
		Analytics.event('open_widgets_settings_from_settings_modal')
		callEvent('openWidgetsSettings')
	}

	useEffect(() => {
		if (isOpen) {
			Analytics.event('open_settings_modal', {
				selected_tab: selectedTab,
			})
		}
	}, [isOpen])

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size="xl"
			title="Settings"
			direction="ltr"
		>
			<TabManager
				tabOwner="setting"
				tabs={tabs}
				defaultTab="general"
				selectedTab={selectedTab}
				direction="ltr"
			>
				<div className="flex flex-row gap-1 sm:flex-col">
					<button
						className={`relative items-center  flex gap-3 px-4 py-3 rounded-full transition-all duration-200 ease-in-out justify-start cursor-pointer whitespace-nowrap active:scale-[0.98] text-muted hover:bg-base-300 w-42`}
						onClick={() => openWidgetSettings()}
					>
						<TbApps size={20} className="text-muted" />
						<span className="text-sm font-light">Manage widgets</span>
					</button>
					<button
						className={`relative  items-center flex gap-3 px-4 py-3 rounded-full transition-all duration-200 ease-in-out justify-start cursor-pointer whitespace-nowrap active:scale-[0.98] text-muted hover:bg-base-300 w-42`}
						onClick={() => setUpdateModalOpen(true)}
					>
						<VscMegaphone size={20} />
						<span className="text-sm font-light">Recent changes</span>
					</button>
				</div>
			</TabManager>

			<UpdateReleaseNotesModal
				isOpen={isUpdateModalOpen}
				onClose={() => setUpdateModalOpen(false)}
				counterValue={null}
			/>
		</Modal>
	)
}
