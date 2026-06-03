import { getMainClient } from '@/services/api'
import { useQuery } from '@tanstack/react-query'

export interface FetchedReligiousTimeData {
	azan_sobh: string
	tolu_aftab: string
	azan_zohr: string
	ghorub_aftab: string
	azan_maghreb: string
	nimeshab: string
}

interface Prop {
	day: number
	month: number
	lat?: number
	lon?: number
}
function fallbackPrayerTimes(): FetchedReligiousTimeData {
	return {
		azan_sobh: '05:14',
		tolu_aftab: '06:47',
		azan_zohr: '13:08',
		ghorub_aftab: '19:29',
		azan_maghreb: '19:47',
		nimeshab: '00:28',
	}
}

export const useReligiousTime = (op: Prop, enabled: boolean) => {
	const key = ['religiousTime', op.day, op.month]
	if (op.lon && op.lat) {
		key.push(`${op.lat}-${op.lon}`)
	}

	return useQuery({
		queryKey: key,
		queryFn: async () => {
			try {
				const client = await getMainClient()
				const { data: result } = await client.get<FetchedReligiousTimeData>(
					'/date/owghat',
					{
						params: {
							day: op.day,
							month: op.month,
							lat: op.lat || undefined,
							lon: op.lon || undefined,
						},
					}
				)
				return result
			} catch {
				return fallbackPrayerTimes()
			}
		},
		enabled,
	})
}
