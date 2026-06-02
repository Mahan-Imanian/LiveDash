import { useQuery } from '@tanstack/react-query'
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

export function useGetEvents() {
	return useQuery<FetchedAllEvents>({
		queryKey: ['date-events'],
		queryFn: getEvents,
		staleTime: 24 * 60 * 60 * 1000,
		gcTime: 7 * 24 * 60 * 60 * 1000,
	})
}

export { getEvents }
