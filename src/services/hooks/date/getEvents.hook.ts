import { getMainClient } from '@/services/api'

export interface FetchedEvent {
	id: string
	isHoliday: boolean
	title: string
	day: number
	month: number
	icon: string | null // e.g. https://.../icon.png|gif|jpg
}

export interface FetchedAllEvents {
	regionalEvents: FetchedEvent[]
	gregorianEvents: FetchedEvent[]
	hijriEvents: FetchedEvent[]
}

async function getEvents(): Promise<FetchedAllEvents> {
	const client = await getMainClient()
	const { data } = await client.get<FetchedAllEvents>('/date/events')

	return {
		regionalEvents: data?.regionalEvents ?? [],
		gregorianEvents: data?.gregorianEvents ?? [],
		hijriEvents: data?.hijriEvents ?? [],
	}
}

export { getEvents }
