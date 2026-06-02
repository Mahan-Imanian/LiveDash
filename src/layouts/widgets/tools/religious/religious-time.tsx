import { useEffect } from 'react'
import { FiClock, FiMoon, FiSun, FiSunrise, FiSunset } from 'react-icons/fi'
import { useReligiousTime } from '@/services/hooks/date/getReligiousTime.hook'
import { useAuth } from '@/context/auth.context'

const DAILY_ZIKRS = [
	{ day: 'Saturday', zikr: 'Ya Rabb al-Alamin', meaning: 'Lord of the worlds' },
	{ day: 'Sunday', zikr: 'Ya Dhal Jalal wal Ikram', meaning: 'Lord of majesty and honor' },
	{ day: 'Monday', zikr: 'Ya Qadi al-Hajat', meaning: 'Fulfiller of needs' },
	{ day: 'Tuesday', zikr: 'Ya Arham ar-Rahimin', meaning: 'Most merciful of the merciful' },
	{ day: 'Wednesday', zikr: 'Ya Hayyu Ya Qayyum', meaning: 'The living, the self-sustaining' },
	{ day: 'Thursday', zikr: 'La ilaha illa Allah al-Malik al-Haqq al-Mubin', meaning: 'There is no deity but God' },
	{ day: 'Friday', zikr: 'Allahumma salli ala Muhammad wa Ali Muhammad', meaning: 'Bless Muhammad and the family of Muhammad' },
]

export function ReligiousTime({ currentDate }: { currentDate: any }) {
	const { isAuthenticated, user } = useAuth()
	const day = currentDate.date()
	const month = currentDate.month() + 1
	const weekDay = currentDate.format('dddd')

	const {
		data: religiousTimeData,
		isLoading: loading,
		refetch,
	} = useReligiousTime(
		{
			day,
			month,
			lat: user?.city?.id ? undefined : 50.1109,
			lon: user?.city?.id ? undefined : 8.6821,
		},
		true
	)

	useEffect(() => {
		if (isAuthenticated && user?.city?.id) {
			refetch()
		}
	}, [user?.city?.id, isAuthenticated, refetch])

	const dailyZikr = DAILY_ZIKRS.find((item) => item.day === weekDay)

	const prayerTimeBoxes = [
		{ title: 'Fajr', value: religiousTimeData?.azan_sobh, icon: FiClock },
		{ title: 'Sunrise', value: religiousTimeData?.tolu_aftab, icon: FiSunrise },
		{ title: 'Dhuhr', value: religiousTimeData?.azan_zohr, icon: FiSun },
		{ title: 'Sunset', value: religiousTimeData?.ghorub_aftab, icon: FiSunset },
		{ title: 'Maghrib', value: religiousTimeData?.azan_maghreb, icon: FiClock },
		{ title: 'Midnight', value: religiousTimeData?.nimeshab, icon: FiMoon },
	]

	return (
		<div className="flex flex-col w-full gap-3 p-1 overflow-hidden select-none">
			{loading ? (
				<div className="grid grid-cols-3 gap-2">
					{[...Array(6)].map((_, i) => (
						<div
							key={i}
							className="h-20 bg-base-200/50 rounded-[1.5rem] animate-pulse"
						/>
					))}
				</div>
			) : (
				<>
					<div className="grid grid-cols-3 gap-2">
						{prayerTimeBoxes.map((box, index) => (
							<div
								key={index}
								className="flex flex-col items-center justify-center p-3 border rounded-2xl bg-content border-content"
							>
								<div className="mb-1 text-primary/70">
									<box.icon size={18} />
								</div>
								<span className="text-[8px] font-black opacity-60 mb-0.5 whitespace-nowrap uppercase">
									{box.title}
								</span>
								<span className="text-[12px] font-black text-content">
									{box.value}
								</span>
							</div>
						))}
					</div>

					{dailyZikr && (
						<div className="flex flex-col items-center gap-1 p-2 border bg-content border-content rounded-2xl">
							<div className="flex items-center gap-1.5 mb-0.5">
								<div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
								<span className="text-[9px] font-black text-primary-content">
									Daily zikr for {weekDay}
								</span>
							</div>
							<div className="text-[14px] font-black text-content text-center leading-tight">
								{dailyZikr.zikr}
							</div>
							<div className="text-[10px] font-bold text-muted text-center truncate w-full px-2">
								{dailyZikr.meaning}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	)
}
