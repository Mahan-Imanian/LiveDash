import { FaGithub } from 'react-icons/fa'
import type { Platform } from './platform-config'
import GoogleCalendar from '@/assets/google-calendar.png'

export const PLATFORM_CONFIGS: Omit<Platform, 'connected' | 'isLoading'>[] = [
	{
		id: 'google',
		name: 'DashLivein',
		description: 'DashLiveGoogle Services DashLiveCalendar DashLive',
		bgColor: '',
		isActive: true,
		icon: (
			<img
				src={GoogleCalendar}
				alt="Google Calendar"
				className={`w-8 h-8 rounded-sm`}
			/>
		),
		features: [
			'DashLiveCalendar DashLive',
			'DashLive',
		],
		permissions: ['DashLiveCalendar (DashLivein)'],
		isOptionalPermissions: true,
	},
	{
		id: 'github',
		name: 'DashLive‌DashLive',
		description: 'DashLive‌DashLive‌DashLive‌DashLive',
		bgColor: 'bg-gray-800',
		isActive: false,
		icon: <FaGithub size={20} className="text-white" />,
		features: [],
		permissions: [],
	},
]
