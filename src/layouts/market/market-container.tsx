import { useState } from 'react'
import { FaPaintBrush } from 'react-icons/fa'
import { FaPhotoFilm } from 'react-icons/fa6'
import Analytics from '@/analytics'
import { TabNavigation } from '@/components/tab-navigation'
import { useAuth } from '@/context/auth.context'
import { UserCoin } from '../setting/tabs/account/components/user-coin'
import { MarketWallpaper } from './marketWallpaper'
import { MarketOtherItems } from './other-items'

export function MarketContainer() {
	const { isAuthenticated, user } = useAuth()
	const [activeTab, setActiveTab] = useState('other')

	const tabs = [
		{
			id: 'other',
			label: 'Personalization',
			icon: <FaPaintBrush />,
			element: <MarketOtherItems />,
		},
		{
			id: 'wallpapers',
			label: 'Wallpapers',
			icon: <FaPhotoFilm />,
			element: <MarketWallpaper />,
		},
	]

	const handleTabChange = (tabValue: string) => {
		setActiveTab(tabValue)
		Analytics.event(`market_select_tab_${tabValue}`)
	}

	return (
		<div dir="ltr" className="flex flex-col gap-4 h-[80vh] overflow-hidden p-1">
			<div className="relative overflow-hidden border shadow-sm rounded-3xl bg-base-100/80 border-base-300/70">
				<div className="absolute inset-0 pointer-events-none bg-linear-to-br from-primary/15 via-transparent to-secondary/10" />
				<div className="relative flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
					<div className="min-w-0">
						<p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">LiveDash Store</p>
						<h2 className="mt-1 text-xl font-black tracking-tight text-content">Make the dashboard yours</h2>
						<p className="mt-1 text-xs font-medium text-muted">Themes, titles, fonts, and wallpapers designed for a cleaner new tab.</p>
					</div>
					{isAuthenticated && (
						<div className="flex items-center shrink-0">
							<UserCoin coins={user?.coins || 0} title="LiveCoin balance" />
						</div>
					)}
				</div>
			</div>

			<div className="flex flex-row items-center justify-between w-full">
				<TabNavigation
					activeTab={activeTab}
					onTabClick={(value) => handleTabChange(value)}
					tabs={tabs}
					tabMode="sample"
					size="medium"
				/>
			</div>

			<div className="relative flex-1 overflow-x-hidden overflow-y-auto rounded-3xl custom-scrollbar">
				{tabs.map(({ id, element }) => (
					<div
						key={id}
						className={`absolute inset-0 transition-all duration-300 ease-out ${
							activeTab === id
								? 'opacity-100 translate-y-0 z-10'
								: 'opacity-0 translate-y-4 z-0 pointer-events-none'
						}`}
					>
						{activeTab === id && <div className="h-full p-1">{element}</div>}
					</div>
				))}
			</div>
		</div>
	)
}
