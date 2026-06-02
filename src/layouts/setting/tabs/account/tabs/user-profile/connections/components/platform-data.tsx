import { FaGithub } from 'react-icons/fa'
import type { Platform } from './platform-config'
import GoogleCalendar from '@/assets/google-calendar.png'

export const PLATFORM_CONFIGS: Omit<Platform, 'connected' | 'isLoading'>[] = [
	{
		id: 'google',
		name: 'Google Calendar',
		description: 'Connect Google services to access Calendar and Google Meet sessions',
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
			'Direct access to Google Calendar',
			'Show and smart reminders for upcoming events and meetings',
		],
		permissions: ['View calendar through Google Calendar'],
		isOptionalPermissions: true,
	},
	{
		id: 'github',
		name: 'GitHub',
		description: 'Connect GitHub to view repositories, commits, and project activity',
		bgColor: 'bg-gray-800',
		isActive: false,
		icon: <FaGithub size={20} className="text-white" />,
		features: [],
		permissions: [],
	},
]
